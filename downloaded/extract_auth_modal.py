with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/vicinity.js', 'r') as f:
    content = f.read()

pos = 84324
snippet = content[max(0, pos - 4000):min(len(content), pos + 6000)]

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/extracted_auth_modal.js', 'w') as f_out:
    f_out.write(snippet)

print("Auth modal extracted to extracted_auth_modal.js.")
