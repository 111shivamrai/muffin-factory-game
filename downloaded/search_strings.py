import re

with open('/Users/shivamrai/.gemini/antigravity/scratch/muffin-mega-factory/downloaded/index.js', 'r') as f:
    content = f.read()

# Let's search for strings like "Enter Factory", "Console Access", or similar patterns
print("Length of file:", len(content))

# Look for uppercase or lowercase phrases related to factory, team, login
queries = ["factory", "console", "operator", "room", "muffin", "login", "register"]
for q in queries:
    matches = [m.start() for m in re.finditer(q, content, re.IGNORECASE)]
    print(f"Occurrences of '{q}': {len(matches)}")
    if matches:
        # Print a snippet from the first match
        start = max(0, matches[0] - 100)
        end = min(len(content), matches[0] + 200)
        print(f"Snippet for '{q}': {content[start:end]}\n")
