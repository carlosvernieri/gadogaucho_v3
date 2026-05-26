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
        
    # Busca complementar: se o texto do animal não contiver peso (KG), varre a lista por um padrão de peso solto
    if data["Animal"] and "KG" not in data["Animal"].upper():
        for t in text_list:
            weight_match = re.search(r'\b(\d+|[0-9OIl|iL]+)\s*kg\b', t, re.IGNORECASE)
            if weight_match:
                data["Animal"] += f" {weight_match.group(0)}"
                break
    
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
    
    outputs_dir = os.path.join(os.path.dirname(__file__), "outputs")
    folders = [f for f in os.listdir(outputs_dir) if os.path.isdir(os.path.join(outputs_dir, f)) and f.startswith("leilao_")]
    
    print(f"Encontradas {len(folders)} pastas para reprocessar: {folders}")
    
    for folder in folders:
        output_dir = os.path.join(outputs_dir, folder)
        images = glob.glob(os.path.join(output_dir, "lote_*_final.png"))
        print(f"\nReprocessando {len(images)} imagens na pasta: {folder}")
        
        # Tenta carregar o JSON existente para preservar o Timestamp_Video
        existing_timestamps = {}
        result_json_path = os.path.join(output_dir, "process_result.json")
        if os.path.exists(result_json_path):
            try:
                with open(result_json_path, "r", encoding="utf-8") as f:
                    old_data = json.load(f)
                    for item in old_data:
                        screenshot = item.get("screenshot")
                        timestamp = item.get("Timestamp_Video")
                        if screenshot and timestamp:
                            existing_timestamps[screenshot] = timestamp
            except Exception as e:
                print(f"Erro ao ler JSON existente {result_json_path}: {e}")
                
        results_list = []
        
        for i, img_path in enumerate(images):
            img_name = os.path.basename(img_path)
            print(f"  [{i+1}/{len(images)}] Processando {img_name}...")
            raw_text = reader.readtext(img_path, detail=0)
            parsed_data = parse_auction_data(raw_text)
            
            # Restaura o Timestamp_Video ou deixa vazio
            parsed_data["Timestamp_Video"] = existing_timestamps.get(img_name, "")
            parsed_data["screenshot"] = img_name
            
            # Para manter o Lote original caso o OCR falhe um pouco:
            lote_match = re.search(r'lote_(\d+)_final', img_name)
            if lote_match and not parsed_data["Lote"]:
                parsed_data["Lote"] = lote_match.group(1)
                
            results_list.append(parsed_data)
            
        with open(result_json_path, "w", encoding="utf-8") as f:
            json.dump(results_list, f, ensure_ascii=False, indent=4)
            
        print(f"Reprocessamento concluído! Arquivo salvo em {result_json_path}")

if __name__ == "__main__":
    main()
