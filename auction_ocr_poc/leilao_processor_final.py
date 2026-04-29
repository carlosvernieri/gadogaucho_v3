import cv2
import easyocr
import os
import re
import csv
import json
from datetime import datetime

# Configurações
VIDEO_PATH = "video_leilao.mp4" # Altere para o caminho do seu arquivo caso seja diferente
LEILAO_ID = "YhtKxcOQjqQ"
DATA_LEILAO = "2026_04_23"
OUTPUT_DIR = f"leilao_santa_ursula_{DATA_LEILAO}_{LEILAO_ID}"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def parse_auction_data(text_list):
    """
    Tenta estruturar os dados com base nos padrões visuais do leilão.
    Exemplo esperado de text_list: ['Lote 62', '05 Vacas méd. 521Kg', 'Samuel Duarte - Glorinha/RS', 'R$ 5.050,00', 'À VISTA', 'R$ 9.69', 'MÉD./KG']
    """
    data = {
        "Lote": "",
        "Animal": "",
        "Vendedor_Origem": "",
        "Preço": "",
        "Média": ""
    }
    
    full_text = " | ".join(text_list)
    
    # 1. Lote
    lote_match = re.search(r'Lote\s*(\d+)', full_text, re.IGNORECASE)
    if lote_match:
        data["Lote"] = lote_match.group(1)
    
    # 2. Preço (Geralmente o primeiro valor monetário grande após o animal)
    # Procura por R$ seguido de números
    precos = re.findall(r'R\$\s*([\d\.,]+)', full_text)
    if len(precos) >= 1:
        data["Preço"] = precos[0]
    if len(precos) >= 2:
        data["Média"] = precos[1]

    # 3. Animal e Vendedor (Baseado na ordem da lista se o Lote foi o primeiro)
    if len(text_list) >= 2:
        # Se o primeiro item é o Lote, o segundo costuma ser o Animal
        if "Lote" in text_list[0]:
            data["Animal"] = text_list[1]
            if len(text_list) >= 3:
                data["Vendedor_Origem"] = text_list[2]
        else:
            # Caso o Lote não seja o primeiro da lista por algum erro de detecção
            data["Animal"] = text_list[0]
        
    return data

import argparse

def run_extraction(video_url, auction_id, output_dir):
    print(f"🚀 Iniciando processamento do leilão ID: {auction_id}")
    video_filename = f"video_{auction_id}.mp4"
    video_path = os.path.join(output_dir, video_filename)
    
    # 1. Download do vídeo se necessário
    if not os.path.exists(video_path):
        print(f"📥 Baixando vídeo do YouTube: {video_url}")
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
            print(f"❌ Erro no download: {e}")
            return

    # 2. Inicializa EasyOCR (Desativando GPU pois o sistema possui placa de vídeo AMD)
    reader = easyocr.Reader(['pt'], gpu=False)
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Erro ao abrir o vídeo.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    last_lote = None
    last_valid_data = None
    last_valid_frame = None
    
    offers_found = []

    count = 0
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
                    print(f"✅ Lote {last_lote} detectado.")
                
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
        offers_found.append(last_valid_data)

    cap.release()
    
    # Salva o resultado final em JSON para o Next.js ler
    result_json = os.path.join(output_dir, "process_result.json")
    with open(result_json, "w", encoding="utf-8") as f:
        json.dump(offers_found, f, ensure_ascii=False, indent=4)
    
    print(f"✨ Concluído! {len(offers_found)} ofertas encontradas.")

if __name__ == "__main__":
    import subprocess
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--date", default=datetime.now().strftime("%Y_%m_%d"))
    args = parser.parse_args()

    output_base = os.path.join(os.path.dirname(__file__), "outputs")
    if not os.path.exists(output_base):
        os.makedirs(output_base)
        
    output_folder = os.path.join(output_base, f"leilao_santa_ursula_{args.date}_{args.id}")
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    run_extraction(args.url, args.id, output_folder)

