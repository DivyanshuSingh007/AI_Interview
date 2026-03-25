import sys
import re

lines = open("out.txt", encoding="utf-8", errors="replace").readlines()

out = []
for l in lines:
    l = l.rstrip()
    # Encode to ascii, replacing non-ascii chars
    l_safe = l.encode("ascii", errors="replace").decode("ascii")
    out.append(l_safe)

with open("result_clean.txt", "w", encoding="ascii") as f:
    f.write("\n".join(out))

print("Written result_clean.txt with", len(out), "lines")
