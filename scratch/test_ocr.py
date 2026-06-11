import cv2
import easyocr
import os

def test_image(reader, img_path):
    if not os.path.exists(img_path):
        print(f"Image not found: {img_path}")
        return
    
    img = cv2.imread(img_path)
    h, w, _ = img.shape
    
    # Crop bottom 25%
    roi = img[int(h*0.75):h, 0:w]
    
    txt_full = reader.readtext(img_path, detail=0)
    txt_roi = reader.readtext(roi, detail=0)
    
    print(f"\n===== {os.path.basename(img_path)} =====")
    print("Full Image:", txt_full)
    print("Bottom 25% ROI:", txt_roi)

def main():
    print("Initializing EasyOCR...")
    reader = easyocr.Reader(['pt'], gpu=True)
    
    base_dir = r"d:\antigravity\gadogaucho_v3\auction_ocr_poc\outputs\leilao_taquara_2026_06_10_29"
    test_image(reader, os.path.join(base_dir, "lote_02_final.png"))
    test_image(reader, os.path.join(base_dir, "lote_03_04_final.png"))
    test_image(reader, os.path.join(base_dir, "lote_16_final.png"))
    test_image(reader, os.path.join(base_dir, "lote_17_final.png"))

if __name__ == "__main__":
    main()
