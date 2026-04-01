import os, sys, webbrowser, pathlib, subprocess

BASE = pathlib.Path(__file__).parent
GUI  = BASE / "gui.html"
LAB  = BASE / "lab"
LAB_C= BASE / "lab.c"

def build_c():
    if not LAB.exists() or LAB_C.stat().st_mtime > LAB.stat().st_mtime:
        print("[HMS] Compiling lab.c...")
        r = subprocess.run(["gcc", "-O2", "-Wall", "-o", str(LAB), str(LAB_C), "-lm"])
        if r.returncode != 0:
            print("[HMS] Compilation failed. Please install gcc.")
            sys.exit(1)
        print("[HMS] Compiled OK.")

if LAB_C.exists():
    build_c()

url = GUI.as_uri()
print(f"[C Lab CMS] Opening: {url}")
webbrowser.open(url)