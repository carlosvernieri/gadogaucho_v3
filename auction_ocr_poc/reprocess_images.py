import os
import glob
import easyocr
import json
import re
import cv2

def extract_weight_from_text(text):
    if not text:
        return 0
    normalized = text.upper()
    match = re.search(r'\b([0-9OILI|BSZG]+)\s*(?:KG|K9|K[gG9]|K|G)\b', normalized)
    if match:
        raw_weight = match.group(1)
        clean_weight = raw_weight
        clean_weight = re.sub(r'[O]', '0', clean_weight)
        clean_weight = re.sub(r'[IL|]', '1', clean_weight)
        clean_weight = re.sub(r'[B]', '8', clean_weight)
        clean_weight = re.sub(r'[S]', '5', clean_weight)
        clean_weight = re.sub(r'[Z]', '2', clean_weight)
        clean_weight = re.sub(r'[G]', '6', clean_weight)
        try:
            val = int(clean_weight)
            if val > 0:
                return val
        except ValueError:
            pass
    return 0


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
        match_lotes_word = re.search(r'\blotes?\b', t, re.IGNORECASE)
        if match_lotes_word:
            lote_idx = i
            rest = t[match_lotes_word.end():].strip()
            lote_seq_match = re.match(r'^(?:\d+)(?:\s*(?:e|\+|a|\/|y|,|lotes?|\s)+\s*\d+)*', rest, re.IGNORECASE)
            if lote_seq_match:
                lote_raw = lote_seq_match.group(0)
                digits = re.findall(r'\d+', lote_raw)
                data["Lote"] = "_".join(digits)
            else:
                first_num_match = re.search(r'\d+', rest)
                if first_num_match:
                    data["Lote"] = first_num_match.group(0)
                else:
                    data["Lote"] = ""
            break
            
    if lote_idx != -1 and lote_idx + 1 < len(text_list):
        animal_text = text_list[lote_idx + 1]
        
        # Tenta extrair e corrigir o peso na string do Animal
        weight = extract_weight_from_text(animal_text)
        if weight > 0:
            match = re.search(r'\b([0-9OIl|iLBSZGBSZgG]+)\s*(?:KG|K9|K[gG9]|K|G)\b', animal_text, re.IGNORECASE)
            if match:
                animal_text = animal_text.replace(match.group(0), f"{weight}Kg")
        data["Animal"] = animal_text
        
    # Busca complementar: se o texto do animal não contiver peso (KG), varre a lista por um padrão de peso solto
    if data["Animal"] and "KG" not in data["Animal"].upper():
        for t in text_list:
            weight = extract_weight_from_text(t)
            if weight > 0:
                data["Animal"] += f" {weight}Kg"
                break
    
    # 2. Preço e Média (Classificação inteligente por faixas de valores)
    precos_raw = re.findall(r'R[\$S]\s*([\d\.,]+)', full_text, re.IGNORECASE)
    precos_numeric = []
    
    for p in precos_raw:
        try:
            # Converte para float (remove pontos de milhar, substitui vírgula decimal)
            p_clean = p.replace('.', '')
            if ',' in p_clean:
                p_clean = p_clean.replace(',', '.')
            val = float(p_clean)
            precos_numeric.append((val, p))
        except ValueError:
            continue
            
    # Classifica os candidatos por faixa de valor
    medias_candidates = [p_str for val, p_str in precos_numeric if 3.0 <= val < 100.0]
    precos_candidates = [p_str for val, p_str in precos_numeric if val >= 100.0]
    
    if precos_candidates:
        data["Preço"] = precos_candidates[0]
    if medias_candidates:
        data["Média"] = medias_candidates[0]
        
    # Fallback: Se não encontrar média com prefixo R$, busca por um decimal solto que pareça preço por kg
    if not data["Média"]:
        decimais = re.findall(r'\b(\d{1,2}[\.,]\d{2})\b', full_text)
        for d in decimais:
            try:
                val = float(d.replace(',', '.'))
                if 5.0 <= val < 100.0:
                    data["Média"] = d
                    break
            except ValueError:
                continue

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
            
            # Load and crop to bottom 25% to avoid background billboard text/fences
            img = cv2.imread(img_path)
            if img is not None:
                h, w, _ = img.shape
                roi = img[int(h*0.75):h, 0:w]
                raw_text = reader.readtext(roi, detail=0)
            else:
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
