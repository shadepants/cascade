import os
import json
import urllib.request
from pathlib import Path

# Load ANTHROPIC_API_KEY from C:\Users\User\.env
env_path = Path(r"C:\Users\User\.env")
api_key = None
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("ANTHROPIC_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
                break

if not api_key:
    print("Error: ANTHROPIC_API_KEY not found in .env")
    exit(1)

file_path = Path(r"C:\Users\User\Repositories\cascade\tasks\005-engine-fidelity-research.md")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

prompt = f"""You are Claude, a senior technical architect. You are collaborating on a research document for a game named "Cascade".
Cascade is a browser-based, procedurally generated history simulator (inspired by Dwarf Fortress and Caves of Qud). It features a 128x128 grid, a 500-year heavy background simulation (pure TypeScript, zero engine overhead), and very text-heavy UIs (dialogue, causal graphs, lore logs).

Below is the current research document outlining open-source tilesets and comparing React/Canvas vs Godot.
Your task is to complete the final section: provide a "Steelman" argument for both paths.
1. Steelman React/Canvas: Why is sticking with React+Canvas (or upgrading to PixiJS) the definitively correct choice for *this specific type of game*?
2. Steelman Godot: Why is migrating to Godot the strategically superior choice? What long-term roadblocks will it save us from?

Do not wrap your output in markdown code blocks. Output exactly the markdown text to be appended under "### Claude's Analysis:".

Document Context:
{content}
"""

url = "https://api.anthropic.com/v1/messages"
headers = {
    "x-api-key": api_key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
}
data = {
    "model": "claude-opus-4-6",
    "max_tokens": 4096,
    "system": "You are a senior technical architect.",
    "thinking": {"type": "adaptive"},
    "messages": [
        {"role": "user", "content": prompt}
    ]
}

req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        
        claude_text = ""
        for block in res_data.get("content", []):
            if block.get("type") == "text":
                claude_text = block.get("text", "")
                break
        
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(claude_text + "\n")
        print("Successfully appended Claude's analysis.")
except urllib.error.HTTPError as e:
    print(f"API Error: {e.code} {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"General Error: {e}")
