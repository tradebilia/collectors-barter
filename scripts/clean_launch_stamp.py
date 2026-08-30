from PIL import Image

source = Image.open('/home/ubuntu/webdev-static-assets/launching-soon-navy.png').convert('RGBA')
pixels = source.load()
for y in range(source.height):
    for x in range(source.width):
        r, g, b, a = pixels[x, y]
        # The generated transparency preview was baked into the PNG as neutral
        # white/gray checkerboard pixels. Remove only near-neutral bright pixels;
        # the warm parchment tones have visibly different RGB channels.
        if max(r, g, b) - min(r, g, b) <= 8 and (r + g + b) / 3 >= 145:
            pixels[x, y] = (r, g, b, 0)

bbox = source.getchannel('A').getbbox()
if bbox:
    source = source.crop(bbox)
source.save('/home/ubuntu/webdev-static-assets/launching-soon-navy-clean.png', optimize=True)
print(source.size)
