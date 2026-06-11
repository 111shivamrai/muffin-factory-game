import re

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/index.js', 'r') as f:
    content = f.read()

# Let's search for keywords that would be on the landing page of Muffin Factory Pro
keywords = [
    "Simulation Laboratory", 
    "Operations & Supply Chain", 
    "Enter Room", 
    "Operator Console",
    "Instructor Console",
    "Join Team",
    "Create Room",
    "Enter Factory",
    "Console Access",
    "Muffin Factory Pro"
]

results = []
for kw in keywords:
    matches = [m.start() for m in re.finditer(re.escape(kw), content, re.IGNORECASE)]
    results.append(f"Keyword '{kw}': {len(matches)} matches")
    for idx, pos in enumerate(matches[:5]):
        snippet = content[max(0, pos - 300):min(len(content), pos + 500)]
        results.append(f"  Match {idx+1} at {pos}:\n{snippet}\n{'-'*80}")

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/extracted_snippets.txt', 'w') as f_out:
    f_out.write('\n'.join(results))

print("Extraction complete. Snippets written to extracted_snippets.txt.")
