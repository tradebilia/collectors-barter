from collections import deque
from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/pasted_file_B5sgpJ_image.png')
target = Path('/home/ubuntu/webdev-static-assets/music-title-original-transparent.png')
image = Image.open(source).convert('RGBA')
pixels = image.load()
width, height = image.size
queue = deque()
visited = bytearray(width * height)

for x in range(width):
    queue.append((x, 0))
    queue.append((x, height - 1))
for y in range(height):
    queue.append((0, y))
    queue.append((width - 1, y))

def is_background(r, g, b, a):
    return a > 0 and r >= 242 and g >= 242 and b >= 242 and max(r, g, b) - min(r, g, b) <= 8

while queue:
    x, y = queue.popleft()
    index = y * width + x
    if visited[index]:
        continue
    visited[index] = 1
    r, g, b, a = pixels[x, y]
    if not is_background(r, g, b, a):
        continue
    pixels[x, y] = (r, g, b, 0)
    if x > 0:
        queue.append((x - 1, y))
    if x + 1 < width:
        queue.append((x + 1, y))
    if y > 0:
        queue.append((x, y - 1))
    if y + 1 < height:
        queue.append((x, y + 1))

target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, 'PNG', optimize=True)
print(target)

