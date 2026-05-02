import easyocr
print("Iniciando EasyOCR...")
reader = easyocr.Reader(['pt'], gpu=True) # Agora usa GPU MX150 configurada
print("Reader inicializado.")
results = reader.readtext('screenshot_1.png', detail=0)
print(f"Resultados: {results}")
