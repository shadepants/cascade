import subprocess
try:
    subprocess.run(["git", "push", "origin", "fix-weaknesses", "--force"], check=True)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
