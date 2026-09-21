import struct
import zlib
import os

BG = (30, 58, 95)
FG = (255, 255, 255)

def chunk(tag, data):
    c = struct.pack(">I", len(data)) + tag + data
    return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

def make(size):
    rows = bytearray()
    cx = cy = 0.5
    for y in range(size):
        rows.append(0)
        ny = (y + 0.5) / size
        for x in range(size):
            nx = (x + 0.5) / size
            in_bar = abs(ny - cy) < 0.11 and 0.18 < nx < 0.82
            in_plate = abs(ny - cy) < 0.22 and (0.125 < nx < 0.27 or 0.73 < nx < 0.875)
            c = FG if (in_bar or in_plate) else BG
            rows += bytes(c)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(rows), 9))
    png += chunk(b"IEND", b"")
    return png

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")
os.makedirs(out, exist_ok=True)
for s in (192, 512):
    path = os.path.join(out, f"icon-{s}.png")
    with open(path, "wb") as f:
        f.write(make(s))
    print("generated", path)