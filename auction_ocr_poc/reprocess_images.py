import os
import glob
import easyocr
import json
import re

def parse_auction_data(text_list):
    # Filtra ruídos comuns e 'VENDIDO!'
    text_list = [t for t in text_list if "VENDIDO" not in t.upper() and len(t.strip()) > 1]
    
    data = {
        "Lote": "",
        "Animal": "",
        "Vendedor_Origem": "",
        "Preço": "",
        "Média": ""
    }
    
    full_text = " | ".join(text_list)
    
    # 1. Encontra Lote e Animal por índice
    lote_idx = -1
    for i, t in enumerate(text_list):
        if re.search(r'Lote\s*\d+', t, re.IGNORECASE):
            lote_idx = i
            data["Lote"] = re.search(r'Lote\s*(\d+)', t, re.IGNORECASE).group(1)
            break
            
    if lote_idx != -1 and lote_idx + 1 < len(text_list):
        data["Animal"] = text_list[lote_idx + 1]
    
    # 2. Preço e Média
    precos = re.findall(r'R[\$S]\s*([\d\.,]+)', full_text, re.IGNORECASE)
    if len(precos) >= 1:
        data["Preço"] = precos[0]
    if len(precos) >= 2:
        data["Média"] = precos[1]

    # 3. Vendedor
    if lote_idx != -1:
        for i in range(lote_idx + 2, len(text_list)):
            t = text_list[i]
            if not re.search(r'R[\$S]', t, re.IGNORECASE) and not re.search(r'^\d', t):
                data["Vendedor_Origem"] = t
                break
                
    return data

def main():
    print("Iniciando reprocessamento com EasyOCR (GPU ativada)...")
    reader = easyocr.Reader(['pt'], gpu=True)
    
    output_dir = r"outputs\leilao_santa_ursula_2026_05_01_3"
    images = glob.glob(os.path.join(output_dir, "lote_*_final.png"))
    
    print(f"Encontradas {len(images)} imagens para reprocessar.")
    
    results_list = []
    
    for i, img_path in enumerate(images):
        print(f"[{i+1}/{len(images)}] Processando {os.path.basename(img_path)}...")
        raw_text = reader.readtext(img_path, detail=0)
        parsed_data = parse_auction_data(raw_text)
        
        # O Timestamp_Video original é perdido, mas podemos adicionar a screenshot
        parsed_data["screenshot"] = os.path.basename(img_path)
        
        # Para manter o Lote original caso o OCR falhe um pouco:
        lote_match = re.search(r'lote_(\d+)_final', img_path)
        if lote_match and not parsed_data["Lote"]:
            parsed_data["Lote"] = lote_match.group(1)
            
        results_list.append(parsed_data)
        
    result_json_path = os.path.join(output_dir, "process_result.json")
    with open(result_json_path, "w", encoding="utf-8") as f:
        json.dump(results_list, f, ensure_ascii=False, indent=4)
        
    print(f"Reprocessamento concluído! Arquivo salvo em {result_json_path}")

if __name__ == "__main__":
    main()
