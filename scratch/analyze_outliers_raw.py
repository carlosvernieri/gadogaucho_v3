import os
import easyocr
import re

def analyze_outliers():
    folder_name = "leilao_butia_2026_05_13_20"
    outputs_dir = os.path.join(os.path.dirname(__file__), "..", "auction_ocr_poc", "outputs", folder_name)
    
    # 5 Lotes que foram rejeitados por outlier
    outlier_lots = ["13", "17", "20", "58", "24"]
    
    reader = easyocr.Reader(['pt'], gpu=True)
    
    for lote in outlier_lots:
        img_name = f"lote_{lote.zfill(2)}_final.png"
        img_path = os.path.join(outputs_dir, img_name)
        
        if not os.path.exists(img_path):
            img_name = f"lote_{lote}_final.png"
            img_path = os.path.join(outputs_dir, img_name)
            if not os.path.exists(img_path):
                print(f"Imagem nao encontrada para o lote {lote}")
                continue
                
        print("="*60)
        print(f"OUTLIER: LOTE {lote} | Imagem: {img_name}")
        print("-"*60)
        
        raw_text = reader.readtext(img_path, detail=0)
        print("Texto cru detectado:")
        for idx, t in enumerate(raw_text):
            print(f"  [{idx}]: '{t}'")
            
        # Tenta extrair todos os padroes de preco com R$ ou RS
        full_text = " | ".join(raw_text)
        precos = re.findall(r'R[\$S]\s*([\d\.,]+)', full_text, re.IGNORECASE)
        print(f"\nPrecos encontrados pelo regex atual (R$): {precos}")
        
        # Vamos tentar achar qualquer valor numerico com ponto ou virgula que possa ser a media
        # Geralmente a media e um valor baixo (entre 8.00 e 20.00)
        numeros_decimais = re.findall(r'\b(\d{1,2}[\.,]\d{2})\b', full_text)
        print(f"Outros decimais candidatos a media (formato XX.XX): {numeros_decimais}")
        print("="*60 + "\n")

if __name__ == "__main__":
    analyze_outliers()
