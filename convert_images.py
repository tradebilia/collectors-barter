from PIL import Image
import os

images = [
    '/home/ubuntu/collectors-barter/client/public/images/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp',
    '/home/ubuntu/collectors-barter/client/public/images/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp',
    '/home/ubuntu/collectors-barter/client/public/images/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp',
    '/home/ubuntu/collectors-barter/client/public/images/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp'
]

for img_path in images:
    if img_path.endswith('.webp'):
        # They are already webp, but let's see if we can optimize them further or just confirm their state
        # Actually, let's just make sure we have clean names without the hashes for easier maintenance
        base = os.path.basename(img_path)
        name = base.split('-background-')[0]
        new_path = f"/home/ubuntu/collectors-barter/client/public/images/{name}-bg.webp"
        img = Image.open(img_path)
        img.save(new_path, 'WEBP', quality=80)
        print(f"Optimized: {new_path}")

