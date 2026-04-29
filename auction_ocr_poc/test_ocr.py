import easyocr
print("Iniciando EasyOCR...")
reader = easyocr.Reader(['pt'], gpu=False) # Tenta CPU primeiro para garantir que não é erro de driver
print("Reader inicializado.")
results = reader.readtext('screenshot_1.png', detail=0)
print(f"Resultados: {results}")
