import re

text = "22 Terneiros Inteiros méd. I9IKg"

def fix_weight_ocr(match):
    num_part = match.group(1)
    num_part = re.sub(r'[Il|iL]', '1', num_part)
    return num_part + match.group(2)

result = re.sub(r'([0-9Il|iL.,]+)(\s*kg\b)', fix_weight_ocr, text, flags=re.IGNORECASE)
print(f"Original: {text}")
print(f"Fixed: {result}")
