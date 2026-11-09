"""Make 1500 px JPG print copies (chNN.jpg) of chapter-opener art. Needs Pillow.
usage: python scripts/extras/hf-print-copies.py projects/<slug>
"""
import glob, os, sys
from PIL import Image

d = os.path.join(sys.argv[1], 'assets', 'higgsfield')
for f in sorted(glob.glob(os.path.join(d, 'ch[0-9]*.png'))):
    im = Image.open(f).convert('RGB')
    im = im.resize((1500, round(im.height * 1500 / im.width)), Image.LANCZOS)
    im.save(f[:-4] + '.jpg', quality=86, optimize=True)
    print('wrote', f[:-4] + '.jpg')
