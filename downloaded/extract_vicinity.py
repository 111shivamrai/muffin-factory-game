with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/index.js', 'r') as f:
    content = f.read()

start = 1100000
end = 1250000
chunk = content[start:end]

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/vicinity.js', 'w') as f_out:
    f_out.write(chunk)

print("Vicinity written to vicinity.js.")
