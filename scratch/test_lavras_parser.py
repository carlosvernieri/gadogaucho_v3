import cv2
import easyocr
import os
import re
import json

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

def parse_auction_data_lavras(text_list):
    """
    Parser específico para o leilão de Lavras do Sul (Parceria Remates).
    """
    text_list = [t for t in text_list if "VENDIDO" not in t.upper() and len(t.strip()) > 1]
    
    data = {
        "Lote": "",
        "Animal": "",
        "Vendedor_Origem": "",
        "Preço": "",
        "Média": ""
    }
    
    full_text = " | ".join(text_list)
    
    # 1. Extrair Lote
    # Procuramos por um número de 3 ou 4 dígitos que comece com 0 (ou O, corrigido para 0)
    for i, t in enumerate(text_list):
        t_clean = re.sub(r'[O]', '0', t.strip())
        t_clean = re.sub(r'[IL|]', '1', t_clean)
        t_digits = re.sub(r'\D', '', t_clean)
        # Se for um item de 3 ou 4 dígitos e começar com 0, é muito provável que seja o lote
        if len(t_digits) in [3, 4] and t_digits.startswith('0') and t_digits == t_clean:
            data["Lote"] = t_digits
            break
            
    # Se não encontrou pelo padrão com 0, tenta após a palavra "PARCERIA" ou "PARCE"
    if not data["Lote"]:
        for i, t in enumerate(text_list):
            if "PARCERIA" in t.upper() or "PARCE" in t.upper():
                if i + 1 < len(text_list):
                    candidate = text_list[i+1].strip()
                    clean_candidate = re.sub(r'\D', '', candidate)
                    if clean_candidate and len(clean_candidate) in [3, 4]:
                        data["Lote"] = clean_candidate
                        break

    # 2. Extrair Animal
    # Procura pela palavra LOTE e pega o item seguinte
    lote_word_idx = -1
    for i, t in enumerate(text_list):
        match_lote = re.search(r'\blotes?\b', t, re.IGNORECASE)
        if match_lote:
            lote_word_idx = i
            rest = t[match_lote.end():].strip()
            if rest:
                data["Animal"] = rest
            elif i + 1 < len(text_list):
                data["Animal"] = text_list[i+1].strip()
            break
            
    # Se o texto do animal não contiver peso, varre a lista por um padrão de peso
    if data["Animal"] and "KG" not in data["Animal"].upper():
        for t in text_list:
            weight = extract_weight_from_text(t)
            if weight > 0:
                data["Animal"] += f" {weight}Kg"
                break

    # 3. Extrair Preço (por cabeça) e Média (por kg)
    for i, t in enumerate(text_list):
        t_clean = t.strip()
        
        # Média (preço/kg) - geralmente tem "/kg" ou "kg"
        if any(k in t_clean.upper() for k in ["/KG", "IKG", "LKG", "/ KG", "/KG"]):
            match = re.search(r'([\d\.,]+)', t_clean)
            if match:
                data["Média"] = match.group(1)
                
        # Preço por cabeça - costuma estar após "RS" ou "R$"
        if t_clean.upper() in ["RS", "R$", "R$S"]:
            if i + 1 < len(text_list):
                next_t = text_list[i+1].strip()
                next_clean = re.sub(r'[\.,]', '', next_t)
                if next_clean.isdigit() and len(next_clean) in [3, 4, 5]:
                    data["Preço"] = next_t

    # Se não encontrou preço por cabeça, faz busca ampla por qualquer valor que pareça preço em milhares (ex: 3.800)
    if not data["Preço"]:
        for t in text_list:
            t_clean = t.strip()
            if re.match(r'^\d{1,2}[\.,]\d{3}$', t_clean):
                data["Preço"] = t_clean
                break

    # Fallback para Média se não encontrada com prefixo /kg
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

    # 4. Vendedor / Origem
    for t in text_list:
        t_clean = t.strip()
        if "VENDEDOR:" in t_clean.upper() or "CIDADE:" in t_clean.upper():
            data["Vendedor_Origem"] = t_clean
            break
            
    return data

def main():
    reader = easyocr.Reader(['pt'], gpu=True)
    scratch_dir = r"d:\antigravity\gadogaucho_v3\scratch"
    
    percentages = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    
    for pct in percentages:
        img_path = os.path.join(scratch_dir, f"frame_{pct}.png")
        if not os.path.exists(img_path):
            print(f"Skipping {img_path} (not found)")
            continue
            
        print(f"\n--- Testing Frame at {pct}% ---")
        img = cv2.imread(img_path)
        h, w, _ = img.shape
        
        # Test with the new ROI (bottom 35%)
        roi_y_start = int(h * 0.65)
        roi = img[roi_y_start:h, 0:w]
        
        results = reader.readtext(roi, detail=0)
        print("Raw OCR texts:")
        print("  ", results)
        
        parsed = parse_auction_data_lavras(results)
        print("Parsed data:")
        print(json.dumps(parsed, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
