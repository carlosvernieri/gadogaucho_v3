import easyocr
import torch
print(f"EasyOCR version: {easyocr.__version__}")
print(f"Torch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"Device: {torch.cuda.get_device_name(0)}")
reader = easyocr.Reader(['pt'], gpu=True)
print("Reader initialized successfully")
