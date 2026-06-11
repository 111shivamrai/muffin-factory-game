import re

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/vicinity.js', 'r') as f:
    content = f.read()

# Let's search for some patterns
keywords = ["room", "team", "code", "join", "operator", "password", "email", "sign in", "login", "register"]
results = []
for kw in keywords:
    matches = [m.start() for m in re.finditer(re.escape(kw), content, re.IGNORECASE)]
    results.append(f"Keyword '{kw}': {len(matches)} matches")
    for idx, pos in enumerate(matches[:3]):
        snippet = content[max(0, pos - 150):min(len(content), pos + 250)]
        results.append(f"  Match {idx+1} at {pos}:\n{snippet}\n{'-'*60}")

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/vicinity_search.txt', 'w') as f_out:
    f_out.write('\n'.join(results))

print("Search complete. Results written to vicinity_search.txt.")
