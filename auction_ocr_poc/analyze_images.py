import cv2
import easyocr
import os
import json
import glob

def process_images(image_pattern):
    print("Iniciando processamento de OCR em imagens com GPU...")
    # Inicializa o EasyOCR com suporte a GPU
    reader = easyocr.Reader(['pt'], gpu=True)
    
    results = []
    image_files = glob.glob(image_pattern)
    
    for img_path in image_files:
        print(f"Processando: {img_path}")
        frame = cv2.imread(img_path)
        if frame is None:
            continue
            
        height, width, _ = frame.shape
        
        # Corta o rodapé (últimos 15% da tela)
        # Ajustado para screenshots de navegador que podem ter barras
        roi = frame[int(height * 0.80):height, 0:width]
        
        # OCR
        ocr_result = reader.readtext(roi, detail=0)
        
        if ocr_result:
            line = " | ".join(ocr_result)
            print(f"Resultado: {line}")
            results.append({"file": img_path, "text": line})
        else:
            print("Nenhum texto detectado no rodapé.")
            
    return results

if __name__ == "__main__":
    # O padrão de busca para os screenshots que o browser vai salvar
    IMAGE_PATTERN = "screenshot_*.png"
    
    try:
        data = process_images(IMAGE_PATTERN)
        
        with open("resultados_ocr_fotos.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        print("\nProcessamento concluído. Resultados salvos em 'resultados_ocr_fotos.json'.")
    except Exception as e:
        print(f"Erro: {e}")
