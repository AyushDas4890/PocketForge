"""Build a reflowable EPUB 3 (with EPUB2 toc.ncx) from a PocketForge manuscript.

Usage: python scripts/layout/build-epub.py [projects/<slug>]
Reads manuscript/*.md, assets/, output/book.html (next steps), output/cover.png.
Writes output/ebook.epub only. Never edits manuscript/ or assets/.
"""
import html, io, os, re, sys, uuid, zipfile, datetime
from xml.dom import minidom
from PIL import Image

import json
if len(sys.argv) < 2:
    sys.exit('usage: python scripts/layout/build-epub.py projects/<slug>')
ROOT = os.path.abspath(sys.argv[1])
MS = os.path.join(ROOT, 'manuscript')
OUT = os.path.join(ROOT, 'output', 'ebook.epub')

_bj = os.path.join(ROOT, 'book.json')
BOOK = json.load(open(_bj, encoding='utf8')) if os.path.exists(_bj) else {}
_front = [l for l in open(os.path.join(MS, '00-front.md'), encoding='utf8').read().splitlines() if l.strip()]
TITLE = BOOK.get('title') or _front[0].lstrip('# ').strip()
SUBTITLE = BOOK.get('subtitle') or _front[1].lstrip('# ').strip()
FULL_TITLE = f"{TITLE}: {SUBTITLE}"
AUTHOR = BOOK.get('author') or re.sub(r'^By\s+', '', _front[2]).strip()
LANG = BOOK.get('lang', 'en-US')
MASCOT = BOOK.get('mascot', 'the guide character')
YEAR = BOOK.get('year', datetime.date.today().year)
BOOK_ID = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, "pocketforge/" + os.path.basename(ROOT)))
PRINT_NOTE = "Prefer to print? The printable worksheet pack has a full-page version."

CSS = """
body{font-family:serif;color:#233046;line-height:1.5;margin:0 4%;}
h1,h2,h3,h4{font-family:sans-serif;color:#233046;line-height:1.25;page-break-after:avoid;}
h1{font-size:1.6em;color:#2F7F79;margin:1em 0 .6em;}
h2{font-size:1.3em;margin:1.4em 0 .5em;border-bottom:2px solid #F2C57C;padding-bottom:.15em;}
h3{font-size:1.12em;margin:1.2em 0 .4em;} h4{font-size:1em;margin:1em 0 .3em;}
p{margin:0 0 .8em;}
a{color:#2F7F79;}
sup{font-size:.7em;line-height:0;}
blockquote{margin:1em 0;padding:.6em .9em;border-left:4px solid #2F7F79;background:#FFF8EC;}
blockquote.outcome{font-style:italic;}
.box{border:2px solid #2F7F79;background:#FFF8EC;padding:.7em .9em;margin:1.2em 0;page-break-inside:avoid;}
.box.example{border-color:#F2C57C;}
.box-label{font-family:sans-serif;font-weight:bold;color:#2F7F79;margin:0 0 .4em;font-size:.95em;}
.box.example .box-label{color:#233046;}
.print-note{font-size:.85em;font-style:italic;}
table{border-collapse:collapse;width:100%;margin:.6em 0;font-size:.9em;}
th,td{border:1px solid #233046;padding:.35em .4em;text-align:left;vertical-align:top;}
th{background:#2F7F79;color:#FFFFFF;font-family:sans-serif;}
td{height:1.4em;}
div.figure{margin:1em 0;text-align:center;page-break-inside:avoid;}
div.figure img{max-width:100%;height:auto;}
p.caption{font-size:.85em;font-style:italic;text-align:center;margin-top:.3em;}
div.pose{text-align:left;margin:.5em 0;}
div.pose img{width:22%;max-width:140px;height:auto;}
div.scene img{max-width:100%;}
.title-page{text-align:center;margin-top:20%;}
.title-page h1{font-size:2em;}
.title-page .sub{font-size:1.1em;font-style:italic;}
.title-page .author{margin-top:2em;font-family:sans-serif;font-weight:bold;}
ol.toc, ul.toc{list-style:none;padding-left:0;} ol.toc li{margin:.4em 0;}
.small{font-size:.85em;}
ol.endnotes li{margin-bottom:.5em;word-wrap:break-word;}
hr{border:0;border-top:1px solid #F2C57C;margin:1.5em 0;}
"""

images = {}  # src abs path -> epub href


def add_image(abs_path, kind):
    if abs_path in images:
        return images[abs_path]
    if not os.path.exists(abs_path):
        raise FileNotFoundError(abs_path)
    base = os.path.splitext(os.path.basename(abs_path))[0]
    sub = {'pose': 'pose-', 'scene': 'scene-', 'figure': 'fig-', 'photo': 'photo-', 'art': 'art-'}[kind]
    ext = '.jpg' if kind in ('photo', 'art') else '.png'
    href = f"images/{sub}{base}{ext}"
    images[abs_path] = href
    return href


def process_image(abs_path, href):
    im = Image.open(abs_path)
    maxw = 500 if '/pose-' in href else 1200
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    if href.endswith('.jpg'):
        im.convert('RGB').save(buf, 'JPEG', quality=82, optimize=True, progressive=True)
    else:
        im.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def esc(s):
    return html.escape(s, quote=False)


class Notes:
    def __init__(self):
        self.n = 0
        self.entries = []  # (global n, chapter title, text, chapter file)
        self.counter = {}

    def chapter(self, fname, title, defs):
        self.cur = {}
        self.cfile, self.ctitle, self.defs = fname, title, defs

    def ref(self, key):
        if key not in self.cur:
            self.n += 1
            self.cur[key] = self.n
            text = re.sub(r'\s*\(research/[^)]*\)\s*$', '', self.defs[key])
            self.entries.append((self.n, self.ctitle, text, self.cfile))
        n = self.cur[key]
        self.counter[n] = self.counter.get(n, 0) + 1
        rid = f"ref{n}" if self.counter[n] == 1 else f"ref{n}-{self.counter[n]}"
        return f'<sup><a epub:type="noteref" id="{rid}" href="endnotes.xhtml#note{n}">{n}</a></sup>'


notes = Notes()


def inline(s):
    out = esc(s)
    out = re.sub(r'\[\^(\w+)\]', lambda m: notes.ref(m.group(1)), out)
    out = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2">\1</a>', out)
    out = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', out)
    out = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', out)
    out = re.sub(r'`([^`]+)`', r'<code>\1</code>', out)
    return out


def pose_html(name):
    href = add_image(os.path.join(ROOT, 'assets', 'character', 'poses', name + '.png'), 'pose')
    label = name.replace('-', ' ')
    return f'<div class="pose"><img src="{href}" alt="{esc(MASCOT)}, the book\'s guide character, {esc(label)}"/></div>'


POSE_RE = re.compile(r'\[POSE:([\w-]+)\]\s*')


def split_poses(text):
    poses = POSE_RE.findall(text)
    return poses, POSE_RE.sub('', text).strip()


def md_blocks(lines, chap_num=None):
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        st = line.strip()
        if not st or st == '---':
            if st == '---':
                out.append('<hr/>')
            i += 1
            continue
        m = re.match(r':::(worksheet|example)\s*(.*)$', st)
        if m:
            kind, label = m.group(1), m.group(2).strip()
            j = i + 1
            inner = []
            while j < len(lines) and lines[j].strip() != ':::':
                inner.append(lines[j]); j += 1
            body = md_blocks(inner, chap_num)
            if kind == 'worksheet':
                out.append(f'<div class="box worksheet"><p class="box-label">Worksheet: {inline(label)}</p>'
                           f'<p class="print-note">{PRINT_NOTE}</p>{body}</div>')
            else:
                out.append(f'<div class="box example"><p class="box-label">Hypothetical example</p>{body}</div>')
            i = j + 1
            continue
        m = re.match(r'(#{1,6})\s+(.*)$', st)
        if m:
            lvl = min(len(m.group(1)) + (0 if len(m.group(1)) == 1 else 0), 6)
            out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>')
            i += 1
            continue
        m = re.match(r'\[SCENE:(.*)\]$', st)
        if m:
            import glob
            cands = sorted(glob.glob(os.path.join(ROOT, 'assets', 'character', 'scenes', f'ch{chap_num:02d}-*.png')))
            href = add_image(cands[0], 'scene')
            desc = m.group(1).replace('the mascot', MASCOT)
            out.append(f'<div class="figure scene"><img src="{href}" alt="Illustration: {html.escape(desc)}"/></div>')
            i += 1
            continue
        if POSE_RE.fullmatch(st):
            out.append(pose_html(POSE_RE.match(st).group(1)))
            i += 1
            continue
        m = re.match(r'!\[(.*?)\]\(([^)]+)\)$', st)
        if m:
            alt, src = m.group(1), m.group(2)
            ap = os.path.normpath(os.path.join(MS, src))
            kind = 'photo' if '/photos/' in src else 'figure'
            href = add_image(ap, kind)
            fig = f'<div class="figure"><img src="{href}" alt="{html.escape(alt)}"/>'
            if i + 1 < len(lines) and re.match(r'^\*.*\*$', lines[i + 1].strip()):
                fig += f'<p class="caption">{inline(lines[i + 1].strip()[1:-1])}</p>'
                i += 1
            out.append(fig + '</div>')
            i += 1
            continue
        if st.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                rows.append(lines[i].strip()); i += 1
            cells = [[c.strip() for c in r.strip('|').split('|')] for r in rows]
            t = '<table>'
            if len(cells) > 1 and all(re.fullmatch(r':?-+:?', c) for c in cells[1]):
                t += '<thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in cells[0]) + '</tr></thead>'
                cells = cells[2:]
            t += '<tbody>' + ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in cells) + '</tbody></table>'
            out.append(t)
            continue
        if st.startswith('>'):
            q = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                q.append(lines[i].strip()[1:].strip()); i += 1
            poses, text = split_poses(' '.join(q))
            cls = ' class="outcome"' if text.startswith('After this chapter') else ''
            out.append(f'<blockquote{cls}>' + ''.join(pose_html(p) for p in poses) + f'<p>{inline(text)}</p></blockquote>')
            continue
        m = re.match(r'(\d+\.|[-*])\s+', st)
        if m:
            tag = 'ol' if m.group(1)[0].isdigit() else 'ul'
            items = []
            while i < len(lines) and re.match(r'\s*(\d+\.|[-*])\s+', lines[i]):
                items.append(re.sub(r'^\s*(\d+\.|[-*])\s+', '', lines[i])); i += 1
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + f'</{tag}>')
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r'(#|\||>|:::|!\[|\[SCENE:|---$|\d+\.\s|[-*]\s)', lines[i].strip()) \
                and not POSE_RE.fullmatch(lines[i].strip()):
            para.append(lines[i].strip()); i += 1
        poses, text = split_poses(' '.join(para))
        out.extend(pose_html(p) for p in poses)
        if text:
            out.append(f'<p>{inline(text)}</p>')
    return '\n'.join(out)


def page(title, body, epub_type='bodymatter chapter'):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{LANG}" lang="{LANG}">
<head><meta charset="UTF-8"/><title>{esc(title)}</title><link rel="stylesheet" type="text/css" href="css/style.css"/></head>
<body><section epub:type="{epub_type}">
{body}
</section></body></html>
'''


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def split_defs(text):
    defs = {}
    body = []
    for ln in text.splitlines():
        m = re.match(r'\[\^(\w+)\]:\s*(.*)$', ln)
        if m:
            defs[m.group(1)] = m.group(2)
        else:
            body.append(ln)
    return body, defs


def main():
    sections = []  # (file, title, xhtml, epub_type, in_toc)
    front = read(os.path.join(MS, '00-front.md'))
    parts = re.split(r'^---\s*$', front, flags=re.M)
    copyright_md = next(p for p in parts if '## Copyright' in p)
    howto_md = next(p for p in parts if '## How to use' in p)

    title_body = (f'<div class="title-page"><h1>{esc(TITLE)}</h1><p class="sub">{esc(SUBTITLE)}</p>'
                  f'<p class="author">By {esc(AUTHOR)}</p></div><hr/>'
                  + md_blocks(copyright_md.replace('## Copyright and disclaimer', '### Copyright and disclaimer').splitlines()))
    sections.append(('title.xhtml', 'Title and copyright', title_body, 'frontmatter titlepage', True))
    sections.append(('contents.xhtml', 'Contents', None, 'frontmatter toc', True))
    sections.append(('how-to-use.xhtml', 'How to use this book',
                     md_blocks(howto_md.replace('## How to use this book', '# How to use this book').splitlines()),
                     'frontmatter preface', True))

    _chs = sorted(int(f[2:-3]) for f in os.listdir(MS) if re.fullmatch(r'ch\d+\.md', f))
    for n in _chs:
        body, defs = split_defs(read(os.path.join(MS, f'ch{n:02d}.md')))
        h = next(l for l in body if l.startswith('# '))
        title = h[2:].strip()
        # drop the manuscript's own Notes heading if it is left empty
        fname = f'ch{n:02d}.xhtml'
        notes.chapter(fname, title, defs)
        html_body = md_blocks(body, n)
        html_body = re.sub(r'<h2>(Notes|Endnotes|Sources)</h2>\s*$', '', html_body)
        art = os.path.join(ROOT, 'assets', 'higgsfield', f'ch{n:02d}.jpg')
        if os.path.exists(art):  # chapter-opening illustration after the chapter heading
            ahref = add_image(art, 'art')
            fig = f'<div class="figure art"><img src="{ahref}" alt="Chapter illustration"/></div>'
            html_body = re.sub(r'(</h1>)', r'\1' + fig, html_body, count=1)
        sections.append((fname, title, html_body, 'bodymatter chapter', True))

    book = read(os.path.join(ROOT, 'output', 'book.html'))
    m = re.search(r'<section class="front" id="next">(.*?)</section>', book, re.S)
    nx = m.group(1)
    nx = re.sub(r'<div class="tip left"><img[^>]*poses/([\w-]+)\.png"[^>]*>', lambda mm: pose_html(mm.group(1)) + '<div>', nx)
    nx = nx.replace('&nbsp;', '&#160;')
    sections.append(('next-steps.xhtml', 'Next steps', nx, 'backmatter conclusion', True))

    # endnotes
    en = ['<h1>Endnotes</h1><p class="small">Notes are listed by chapter, in the order they appear. Each gives the source, its URL and the date it was fetched. Sources marked vendor-reported come from a company, not a government or research body.</p>']
    cur = None
    for n, ct, text, cf in notes.entries:
        if ct != cur:
            if cur is not None:
                en.append('</ol>')
            en.append(f'<h3>{esc(ct)}</h3><ol class="endnotes" start="{n}">')
            cur = ct
        t = esc(text)
        t = re.sub(r'(https?://[^\s,]+)', lambda mm: f'<a href="{mm.group(1)}">{mm.group(1)}</a>', t)
        backs = [f'ref{n}'] + [f'ref{n}-{k}' for k in range(2, notes.counter[n] + 1)]
        bl = ' '.join(f'<a href="{cf}#{b}">&#8617;{"" if k == 0 else k + 1}</a>' for k, b in enumerate(backs))
        en.append(f'<li id="note{n}" epub:type="endnote">{t} {bl}</li>')
    en.append('</ol>')
    sections.append(('endnotes.xhtml', 'Endnotes', '\n'.join(en), 'backmatter endnotes', True))

    _cr = ''.join(f'<li>{c}</li>' for c in BOOK.get('epubCredits', []))
    _disc = esc(BOOK.get('disclaimer', ''))
    _about = esc(BOOK.get('about', 'was written by ' + AUTHOR + '.'))
    credits = (f'<h1>Credits</h1>\n<ul>\n{_cr}\n</ul>\n<h2>About</h2>\n'
               f'<p>{esc(TITLE)} {_about}</p>\n'
               + (f'<p class="small">{_disc}</p>' if _disc else ''))
    sections.append(('credits.xhtml', 'Credits', credits, 'backmatter acknowledgments', True))

    toc_items = [s for s in sections if s[0] not in ('title.xhtml',)]
    lis = ''.join(f'<li><a href="{f}">{(f"{i}. " if f.startswith("ch") else "")}{esc(t)}</a></li>'
                  for f, t, *_ in toc_items for i in [int(f[2:4]) if f.startswith('ch') else 0])
    contents_body = f'<h1>Contents</h1><ol class="toc">{lis}</ol>'
    sections[1] = ('contents.xhtml', 'Contents', contents_body, 'frontmatter toc', True)

    # nav
    nav_lis = ''.join(f'<li><a href="{f}">{esc(t)}</a></li>' for f, t, *_ in sections)
    nav = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{LANG}" lang="{LANG}">
<head><meta charset="UTF-8"/><title>Contents</title><link rel="stylesheet" type="text/css" href="css/style.css"/></head>
<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>{nav_lis}</ol></nav>
<nav epub:type="landmarks" hidden=""><h2>Landmarks</h2><ol>
<li><a epub:type="cover" href="cover.xhtml">Cover</a></li>
<li><a epub:type="toc" href="contents.xhtml">Contents</a></li>
<li><a epub:type="bodymatter" href="ch01.xhtml">Start reading</a></li>
</ol></nav></body></html>
'''
    ncx_pts = ''.join(f'<navPoint id="np{k}" playOrder="{k}"><navLabel><text>{esc(t)}</text></navLabel><content src="{f}"/></navPoint>'
                      for k, (f, t, *_) in enumerate(sections, 1))
    ncx = f'''<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="{LANG}">
<head><meta name="dtb:uid" content="{BOOK_ID}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>
<docTitle><text>{esc(FULL_TITLE)}</text></docTitle><docAuthor><text>{AUTHOR}</text></docAuthor>
<navMap>{ncx_pts}</navMap></ncx>
'''
    cover_xhtml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{LANG}" lang="{LANG}">
<head><meta charset="UTF-8"/><title>Cover</title><style>body{{margin:0;padding:0;text-align:center;background:#FFFFFF;}} img{{max-width:100%;max-height:100%;}}</style></head>
<body><section epub:type="cover"><img src="images/cover.jpg" alt="Cover: {esc(FULL_TITLE)} by {AUTHOR}"/></section></body></html>
'''
    # cover image
    cim = Image.open(os.path.join(ROOT, 'output', 'cover.png')).convert('RGB')
    if cim.size != (1600, 2560):
        cim = cim.resize((1600, 2560), Image.LANCZOS)
    cb = io.BytesIO(); cim.save(cb, 'JPEG', quality=88, optimize=True, progressive=True)

    files = {}  # epub path (under OEBPS) -> bytes
    files['css/style.css'] = CSS.encode()
    files['cover.xhtml'] = cover_xhtml.encode()
    files['nav.xhtml'] = nav.encode()
    files['toc.ncx'] = ncx.encode()
    files['images/cover.jpg'] = cb.getvalue()
    for f, t, body, et, _ in sections:
        files[f] = page(t, body, et).encode('utf-8')
    for ap, href in images.items():
        files[href] = process_image(ap, href)

    mt = {'.xhtml': 'application/xhtml+xml', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ncx': 'application/x-dtbncx+xml'}
    manifest, ids = [], {}
    for k, p in enumerate(sorted(files)):
        iid = 'cover-image' if p == 'images/cover.jpg' else ('nav' if p == 'nav.xhtml' else ('ncx' if p == 'toc.ncx' else f'i{k}'))
        ids[p] = iid
        props = ' properties="cover-image"' if p == 'images/cover.jpg' else (' properties="nav"' if p == 'nav.xhtml' else '')
        manifest.append(f'<item id="{iid}" href="{p}" media-type="{mt[os.path.splitext(p)[1]]}"{props}/>')
    spine = ['<itemref idref="%s" linear="yes"/>' % ids['cover.xhtml']] + [f'<itemref idref="{ids[f]}"/>' for f, *_ in sections]
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    opf = f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="{LANG}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">{BOOK_ID}</dc:identifier>
<dc:title id="t1">{esc(TITLE)}</dc:title>
<meta refines="#t1" property="title-type">main</meta>
<dc:title id="t2">{esc(SUBTITLE)}</dc:title>
<meta refines="#t2" property="title-type">subtitle</meta>
<dc:creator id="a1">{AUTHOR}</dc:creator>
<meta refines="#a1" property="role" scheme="marc:relators">aut</meta>
<dc:language>{LANG}</dc:language>
<dc:rights>Copyright © {YEAR} {esc(AUTHOR)}. All rights reserved.</dc:rights>
<meta property="dcterms:modified">{now}</meta>
<meta name="cover" content="cover-image"/>
</metadata>
<manifest>
{chr(10).join(manifest)}
</manifest>
<spine toc="ncx">
{chr(10).join(spine)}
</spine>
<guide><reference type="cover" title="Cover" href="cover.xhtml"/><reference type="toc" title="Contents" href="contents.xhtml"/><reference type="text" title="Start" href="ch01.xhtml"/></guide>
</package>
'''
    container = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>
'''
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, 'w') as z:
        z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        z.writestr('META-INF/container.xml', container, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr('OEBPS/content.opf', opf, compress_type=zipfile.ZIP_DEFLATED)
        for p in sorted(files):
            z.writestr('OEBPS/' + p, files[p], compress_type=zipfile.ZIP_STORED if p.endswith(('.png', '.jpg')) else zipfile.ZIP_DEFLATED)
    print(f'wrote {OUT} {os.path.getsize(OUT)/1e6:.2f} MB; sections={len(sections)} images={len(images)}+cover notes={notes.n}')
    validate(OUT)


def validate(path):
    import posixpath, urllib.parse
    errs = []
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        if infos[0].filename != 'mimetype' or infos[0].compress_type != zipfile.ZIP_STORED or z.read('mimetype') != b'application/epub+zip':
            errs.append('mimetype not first/stored/correct')
        if infos[0].extra:
            errs.append('mimetype has extra field')
        names = set(z.namelist())
        opf = minidom.parseString(z.read('OEBPS/content.opf'))
        hrefs = ['OEBPS/' + it.getAttribute('href') for it in opf.getElementsByTagName('item')]
        for h in hrefs:
            if h not in names:
                errs.append('manifest missing ' + h)
        for n in names:
            if n.startswith('OEBPS/') and n != 'OEBPS/content.opf' and n not in hrefs:
                errs.append('not in manifest ' + n)
        ids = {}
        for h in hrefs:
            if h.endswith(('.xhtml', '.ncx')):
                try:
                    d = minidom.parseString(z.read(h))
                except Exception as e:
                    errs.append(f'XML parse {h}: {e}'); continue
                ids[h] = {el.getAttribute('id') for el in d.getElementsByTagName('*') if el.hasAttribute('id')}
        links = 0
        for h in ids:
            d = minidom.parseString(z.read(h))
            for tag, attr in (('a', 'href'), ('img', 'src'), ('link', 'href'), ('content', 'src')):
                for el in d.getElementsByTagName(tag):
                    v = el.getAttribute(attr)
                    if not v or re.match(r'^[a-z]+:', v):
                        continue
                    links += 1
                    fp, _, frag = v.partition('#')
                    tgt = posixpath.normpath(posixpath.join(posixpath.dirname(h), urllib.parse.unquote(fp))) if fp else h
                    if tgt not in names:
                        errs.append(f'{h}: missing target {v}')
                    elif frag and frag not in ids.get(tgt, set()):
                        errs.append(f'{h}: missing anchor {v}')
    print(f'validation: {len(names)} entries, {len(hrefs)} manifest items, {len(ids)} XML docs parsed, {links} internal links checked, errors={len(errs)}')
    for e in errs:
        print('  ERROR', e)
    return errs


if __name__ == '__main__':
    main()
