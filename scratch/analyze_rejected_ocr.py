import os
import json
import easyocr

def analyze_rejected(folder_name):
    outputs_dir = os.path.join(os.path.dirname(__file__), "..", "auction_ocr_poc", "outputs", folder_name)
    audit_file = os.path.join(outputs_dir, "audit_rejected.json")
    
    if not os.path.exists(audit_file):
        print(f"Arquivo de auditoria nao encontrado em: {audit_file}")
        return

    with open(audit_file, "r", encoding="utf-8") as f:
        rejected_lots = json.load(f)

    print(f"Analisando {len(rejected_lots)} lotes rejeitados para o leilao: {folder_name}\n")

    # Inicializar EasyOCR
    reader = easyocr.Reader(['pt'], gpu=True)

    for lot in rejected_lots[:5]: # Analisar os primeiros 5 para demonstracao
        lote_num = lot.get("Lote")
        screenshot = lot.get("screenshot")
        img_path = os.path.join(outputs_dir, screenshot)
        
        if not os.path.exists(img_path):
            print(f"Imagem nao encontrada: {img_path}")
            continue

        print("="*60)
        print(f"LOTE REJEITADO: #{lote_num} | Motivo: {lot.get('_audit_reason')}")
        print(f"Dados salvos no JSON original:")
        print(f"  Animal: '{lot.get('Animal')}'")
        print(f"  Vendedor: '{lot.get('Vendedor_Origem')}'")
        print(f"  Preco: '{lot.get('Preço')}'")
        print(f"  Media: '{lot.get('Média')}'")
        print("-"*60)
        
        # Executar OCR na imagem inteira
        raw_text_full = reader.readtext(img_path, detail=0)
        print("Texto cru detectado pela IA na IMAGEM INTEIRA:")
        for idx, text in enumerate(raw_text_full):
            print(f"  [{idx}]: '{text}'")

        # Executar OCR na regiao inferior (ROI do processamento de video)
        # O processador de video analisa apenas os 25% inferiores do frame para otimizar velocidade
        import cv2
        frame = cv2.imread(img_path)
        h, w, _ = frame.shape
        roi = frame[int(h*0.75):h, 0:w]
        raw_text_roi = reader.readtext(roi, detail=0)
        print("\nTexto cru detectado pela IA na regiao inferior (ROI 75% - 100%):")
        for idx, text in enumerate(raw_text_roi):
            print(f"  [{idx}]: '{text}'")
        print("="*60 + "\n")

if __name__ == "__main__":
    analyze_rejected("leilao_butia_2026_05_13_20")
