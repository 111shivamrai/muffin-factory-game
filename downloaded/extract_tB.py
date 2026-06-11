with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/vicinity.js', 'r') as f:
    content = f.read()

# Let's search for "function tB" or "tB(" and grab around it
import re

# find function tB
matches = [m.start() for m in re.finditer(r'function tB\b', content)]
print("tB matches:", len(matches))
for idx, pos in enumerate(matches):
    print(f"Match {idx+1} at {pos}:")
    # Let's extract the next 5000 characters
    snippet = content[pos:pos+12000]
    with open(f'/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/extracted_tB.js', 'w') as f_out:
        f_out.write(snippet)
    print("Written to extracted_tB.js")
