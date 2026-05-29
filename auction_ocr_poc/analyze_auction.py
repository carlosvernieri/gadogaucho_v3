import cv2
import easyocr
import os
import subprocess
import json

def download_segment(url, start_time, duration, output_path):
    print(f"Baixando segmento de {start_time}s por {duration}s...")
    # Usa yt-dlp para baixar um pequeno trecho
    # --download-sections "*10:00-10:30" é um recurso novo do yt-dlp
    cmd = [
        "yt-dlp",
        "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "--download-sections", f"*{start_time}-{start_time + duration}",
        "--force-overwrites",
        "-o", output_path,
        url
    ]
    subprocess.run(cmd, check=True)

def process_video(video_path):
    print("Iniciando processamento de OCR com GPU...")
    # Inicializa o EasyOCR com suporte a GPU
    reader = easyocr.Reader(['pt'], gpu=True)
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    interval = int(fps * 3) # Processa a cada 3 segundos
    
    count = 0
    results = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if count % interval == 0:
            height, width, _ = frame.shape
            
            # Corta o rodapé (últimos 15% da tela)
            roi = frame[int(height * 0.82):height, 0:width]
            
            # Opcional: Pré-processamento para melhorar OCR
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            
            # OCR
            ocr_result = reader.readtext(gray, detail=0)
            
            timestamp = count / fps
            if ocr_result:
                line = " | ".join(ocr_result)
                print(f"[{timestamp:.1f}s]: {line}")
                results.append({"time": timestamp, "text": line})
        
        count += 1
        
    cap.release()
    return results

if __name__ == "__main__":
    VIDEO_URL = "https://www.youtube.com/watch?v=YhtKxcOQjqQ"
    TEMP_VIDEO = "segmento_teste.mp4"
    
    # Baixar 30 segundos a partir dos 15 minutos (900s)
    # onde geralmente o leilão já está em ritmo constante
    try:
        download_segment(VIDEO_URL, 900, 30, TEMP_VIDEO)
        data = process_video(TEMP_VIDEO)
        
        with open("resultados_ocr.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        print("\nProcessamento concluído. Resultados salvos em 'resultados_ocr.json'.")
    except Exception as e:
        print(f"Erro: {e}")
