import re

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/vicinity.js', 'r') as f:
    content = f.read()

# Look for definitions of D like const D={...} or var D={...}
# Let's search around places where D.sans or D.ink is used
matches = [m.start() for m in re.finditer(r'\bconst D\s*=\s*\{|\bvar D\s*=\s*\{', content)]
print(f"Found {len(matches)} matches for D definitions")
for idx, pos in enumerate(matches):
    snippet = content[max(0, pos - 100):min(len(content), pos + 1000)]
    print(f"Match {idx+1} at {pos}:\n{snippet}\n")
