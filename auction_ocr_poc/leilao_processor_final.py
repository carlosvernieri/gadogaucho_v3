import cv2
import easyocr
import os
import re
import csv
import json
import glob
from datetime import datetime



def parse_auction_data(text_list):
    """
    Tenta estruturar os dados com base nos padrões visuais do leilão.
    """
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
        animal_text = text_list[lote_idx + 1]
        
        # Corrige comum erro de OCR: I, l, L, i em vez de 1 perto de números (ex: I80 kg -> 180 kg)
        def fix_weight_ocr(match):
            num_part = match.group(1)
            num_part = re.sub(r'[Il|iL]', '1', num_part)
            return num_part + match.group(2)
            
        animal_text = re.sub(r'([0-9Il|iL.,]+)(\s*kg\b)', fix_weight_ocr, animal_text, flags=re.IGNORECASE)
        data["Animal"] = animal_text
    
    # 2. Preço e Média (Procura por R$ ou RS seguido de números)
    precos = re.findall(r'R[\$S]\s*([\d\.,]+)', full_text, re.IGNORECASE)
    if len(precos) >= 1:
        data["Preço"] = precos[0]
    if len(precos) >= 2:
        data["Média"] = precos[1]

    # 3. Vendedor (Procura por nomes típicos ou pega o que vem depois do Animal/Preço)
    # Como heurística simples, vamos tentar pegar o item depois do animal que NÃO é preço
    if lote_idx != -1:
        for i in range(lote_idx + 2, len(text_list)):
            t = text_list[i]
            if not re.search(r'R[\$S]', t, re.IGNORECASE) and not re.search(r'^\d', t):
                data["Vendedor_Origem"] = t
                break
        
    return data

import argparse

def run_extraction(video_url, auction_id, output_dir):
    print(f"Iniciando processamento do leilao ID: {auction_id}")
    video_filename = f"video_{auction_id}.mp4"
    video_path = os.path.join(output_dir, video_filename)
    
    # 1. Download do vídeo se necessário
    if not os.path.exists(video_path):
        print(f"Baixando video do YouTube: {video_url}")
        # Tentamos baixar um formato MP4 direto para evitar necessidade de ffmpeg para merge
        cmd = [
            "yt-dlp",
            "-f", "bestvideo[height<=720][ext=mp4]/best[height<=720][ext=mp4]",
            "--force-overwrites",
            "-o", video_path,
            video_url
        ]
        try:
            subprocess.run(cmd, check=True)
        except Exception as e:
            print(f"Erro no download: {e}")
            return

    # 2. Inicializa EasyOCR com suporte a GPU NVIDIA (MX150)
    reader = easyocr.Reader(['pt'], gpu=True)
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Erro ao abrir o video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    last_lote = None
    last_valid_data = None
    last_valid_frame = None
    
    offers_found = []

    count = 0
    print("Loop de processamento iniciado. Analisando frames...")
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        
        if count % int(fps * 3) == 0:
            h, w, _ = frame.shape
            roi = frame[int(h*0.75):h, 0:w]
            results = reader.readtext(roi, detail=0)
            current_data = parse_auction_data(results)
            
            current_lote = current_data["Lote"]
            timestamp_str = str(datetime.fromtimestamp(count/fps).strftime('%H:%M:%S'))

            if current_lote and current_lote != last_lote:
                if last_lote is not None and last_valid_data:
                    img_name = f"lote_{last_lote}_final.png"
                    img_path = os.path.join(output_dir, img_name)
                    cv2.imwrite(img_path, last_valid_frame)
                    
                    last_valid_data["screenshot"] = img_name
                    offers_found.append(last_valid_data)
                    print(f"Lote {last_lote} detectado.")
                
                last_lote = current_lote
            
            if current_lote:
                current_data["Timestamp_Video"] = timestamp_str
                last_valid_data = current_data
                last_valid_frame = frame.copy()
        
        count += 1
        if count % 10000 == 0:
            print(f"Processando frame {count}...")

    # Salva o último
    if last_valid_data:
        if last_lote is not None:
            img_name = f"lote_{last_lote}_final.png"
            img_path = os.path.join(output_dir, img_name)
            cv2.imwrite(img_path, last_valid_frame)
            last_valid_data["screenshot"] = img_name
        offers_found.append(last_valid_data)

    cap.release()
    
    print("Iniciando reprocessamento das imagens extraidas para melhorar precisão dos dados...")
    final_results = []
    
    images = glob.glob(os.path.join(output_dir, "lote_*_final.png"))
    for i, img_path in enumerate(images):
        img_name = os.path.basename(img_path)
        print(f"[{i+1}/{len(images)}] Reprocessando {img_name}...")
        
        # Read the entire image to capture all data properly
        raw_text = reader.readtext(img_path, detail=0)
        parsed_data = parse_auction_data(raw_text)
        
        # Recuperar o timestamp do offers_found
        timestamp = ""
        for offer in offers_found:
            if offer.get("screenshot") == img_name:
                timestamp = offer.get("Timestamp_Video", "")
                break
                
        parsed_data["Timestamp_Video"] = timestamp
        parsed_data["screenshot"] = img_name
        
        # Garantir que o Lote não se perca se o OCR falhar na imagem inteira
        lote_match = re.search(r'lote_(\d+)_final', img_name)
        if lote_match and not parsed_data["Lote"]:
            parsed_data["Lote"] = lote_match.group(1)
            
        final_results.append(parsed_data)
    
    # Salva o resultado final em JSON para o Next.js ler
    result_json = os.path.join(output_dir, "process_result.json")
    with open(result_json, "w", encoding="utf-8") as f:
        json.dump(final_results, f, ensure_ascii=False, indent=4)
    
    print(f"Concluido! {len(final_results)} ofertas encontradas e reprocessadas.")

if __name__ == "__main__":
    import subprocess
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--date", default=datetime.now().strftime("%Y_%m_%d"))
    parser.add_argument("--name", default="santa_ursula", help="Nome da praca/leilao")
    args = parser.parse_args()

    output_base = os.path.join(os.path.dirname(__file__), "outputs")
    if not os.path.exists(output_base):
        os.makedirs(output_base)
        
    output_folder = os.path.join(output_base, f"leilao_{args.name}_{args.date}_{args.id}")
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    run_extraction(args.url, args.id, output_folder)

