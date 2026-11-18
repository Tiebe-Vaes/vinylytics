from pathlib import Path
import re, copy, hashlib, json
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[1]
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
font=TTFont(REPO/'node_modules/@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff')
glyphs=font.getGlyphSet(); cmap=font.getBestCmap(); upem=font['head'].unitsPerEm

def outline(el, inherited=None):
    attrs=dict(inherited or {}); attrs.update(el.attrib)
    for child in list(el):
        if child.tag==f'{{{NS}}}text':
            a=dict(attrs); a.update(child.attrib)
            value=''.join(child.itertext())
            size=float(a.get('font-size','200')); scale=size/upem
            spacing=float(a.get('letter-spacing','0'))
            pen=SVGPathPen(glyphs); cursor=0
            for char in value:
                name=cmap[ord(char)]
                glyphs[name].draw(TransformPen(pen,(1,0,0,1,cursor,0)))
                cursor+=font['hmtx'][name][0]+spacing/scale
            g=ET.Element(f'{{{NS}}}g',{'aria-label':value})
            t=child.get('transform','')
            g.set('transform',f'{t} translate({a.get("x","0")} {a.get("y","0")}) scale({scale} {-scale})'.strip())
            if child.get('fill'): g.set('fill',child.get('fill'))
            ET.SubElement(g,f'{{{NS}}}path',{'d':pen.getCommands()})
            el.insert(list(el).index(child),g); el.remove(child)
        else: outline(child,attrs)

# Retain the first independent ticket experiment before developing Claude's tonearm idea.
source=ROOT/'03-side-a'
archive=ROOT/'explorations'/'die-cut-ticket'
archive.mkdir(parents=True,exist_ok=True)
for p in source.glob('*.svg'):
    dest=archive/p.name
    if not dest.exists(): dest.write_bytes(p.read_bytes())
arm='<path d="M48 80H144L272 336L208 368Z"/><path d="M384 96H448L288 384H224Z"/><path fill-rule="evenodd" d="M480 96a64 64 0 1 1-128 0 64 64 0 1 1 128 0ZM440 96a24 24 0 1 0-48 0 24 24 0 1 0 48 0Z"/><path d="M208 336H304V416H208Z"/>'
for kind in ['icon','lockup']:
    tree=ET.parse(source/f'{kind}.svg'); root=tree.getroot()
    icon=root.find(f'{{{NS}}}g[@id="icon"]')
    for child in list(icon):icon.remove(child)
    for child in ET.fromstring(f'<g xmlns="{NS}">{arm}</g>'):icon.append(child)
    root.find(f'{{{NS}}}title').text=f'Vinylytics - Needle V {kind}'
    root.find(f'{{{NS}}}desc').text='The V becomes a tonearm: a pivot at one end, a cartridge at the other. One flat ink.'
    tree.write(source/f'{kind}.svg',encoding='utf-8',xml_declaration=False)

for directory in ['01-sleeve-cut','02-catalogue','03-side-a']:
    for p in (ROOT/directory).glob('*.svg'):
        tree=ET.parse(p); root=tree.getroot(); outline(root)
        root.find(f'{{{NS}}}title').text='Vinylytics - '+directory[3:].replace('-',' ').title()+' '+p.stem
        tree.write(p,encoding='utf-8',xml_declaration=False)

def svg(directory,kind,color='currentColor',box=None,cls=''):
    r=ET.parse(ROOT/directory/f'{kind}.svg').getroot()
    r.set('color',color); r.set('class',cls)
    if box:r.set('viewBox',box)
    # Embedded instances need unique accessible IDs.
    r.attrib.pop('aria-labelledby',None); r.set('aria-label',directory[3:]+' '+kind)
    for child in list(r):
        if child.tag in [f'{{{NS}}}title',f'{{{NS}}}desc']:r.remove(child)
    for el in r.iter():el.attrib.pop('id',None)
    return ET.tostring(r,encoding='unicode')

concepts=[
('01-sleeve-cut','01','Sleeve Cut','The sleeve is the signature.','A square sleeve with a V cut out of its face. The simplest silhouette; the story lives in what is missing.','Straight, tightly set capitals.','The most direct fit for the sleeve collection.','64 160 900 200','32 172 960 170'),
('02-catalogue','02','Catalogue','Filed under: your obsessions.','A V that turns into an L-shaped shelf foot. A typographic imprint for a growing personal catalogue.','A stepped baseline and a short catalogue rule.','The most typographic and editorial direction.','20 98 940 240','42 168 950 180'),
('03-side-a','03','Needle V','You played it. We kept receipts.','Claude’s tonearm idea, reduced to a single ink: a pivot, an arm and a cartridge form a V.','Staggered VINYL / YTICS; a single line in the lockup.','The clearest music cue, with a more detailed tiny icon.','40 0 880 500','20 116 980 240')]
cards=[]
for d,n,name,kicker,desc,type_note,verdict,wm_box,lock_box in concepts:
    sizes=''.join(f'<div class="sample"><span style="width:{s}px;height:{s}px">{svg(d,"icon")}</span><small>{s} px</small></div>' for s in [16,24,32])
    cards.append(f'''<article><div class="cardhead"><span>VNL / {n}</span><span>ONE INK</span></div>
    <div class="hero">{svg(d,'icon',cls='heroicon')}</div>
    <h2>{name}</h2><p class="kicker">{kicker}</p>
    <div class="proof paper"><span class="label">WORDMARK</span><div class="wordmark">{svg(d,'wordmark',box=wm_box)}</div><span class="label">HORIZONTAL LOCKUP</span><div class="lockup">{svg(d,'lockup',box=lock_box)}</div></div>
    <div class="proof dark"><span class="label">REVERSED / ONE COLOUR</span><div class="lockup">{svg(d,'lockup',box=lock_box)}</div><div class="sizes">{sizes}</div></div>
    <div class="proof paper"><span class="label">ACTUAL SIZE / INK ON PAPER</span><div class="sizes">{sizes}</div></div>
    <div class="proof blue"><span class="label">SPOT INK FIELD</span><div class="lockup">{svg(d,'lockup',box=lock_box)}</div></div>
    <div class="notes"><p>{desc}</p><p>{type_note}</p><p class="verdict">{verdict}</p><a href="{d}/icon.svg">Icon SVG</a> / <a href="{d}/wordmark.svg">Wordmark SVG</a> / <a href="{d}/lockup.svg">Lockup SVG</a></div></article>''')
style='''@font-face{font-family:Archivo;src:url('../../node_modules/@fontsource/archivo/files/archivo-latin-400-normal.woff2')}@font-face{font-family:Big;src:url('../../node_modules/@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff2');font-weight:900}*{box-sizing:border-box}body{margin:0;background:#eeebe4;color:#0f0f10;font-family:Archivo,Arial,sans-serif;font-size:14px;line-height:1.5}main{max-width:1600px;margin:auto;padding:32px}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:3px solid #1f4fd8;outline-offset:5px}header{border-top:8px solid #0f0f10;border-bottom:1px solid #0f0f10;padding:16px 0 24px}.meta,.label,.cardhead,small{font-size:11px;letter-spacing:.06em}.meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}h1{font-family:Big,Impact,sans-serif;font-size:clamp(54px,7vw,104px);font-weight:900;line-height:.92;letter-spacing:-.03em;margin:24px 0 16px;text-transform:uppercase}header p{margin:0;max-width:650px;font-size:16px}.intro{display:flex;justify-content:space-between;align-items:start;gap:24px;padding:20px 0 28px}.intro p{margin:0;max-width:600px}.intro b{color:#1f4fd8}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}article{min-width:0;border-top:3px solid #0f0f10}.cardhead{display:flex;justify-content:space-between;padding:12px 0}.hero{height:210px;display:flex;align-items:center;justify-content:center;color:#1f4fd8}.heroicon{width:180px;height:180px}h2{font-family:Big,Impact,sans-serif;font-weight:900;font-size:44px;line-height:1;margin:8px 0;text-transform:uppercase}.kicker{min-height:42px;margin:8px 0 20px}.proof{padding:16px;border-top:1px solid #0f0f10}.paper{background:#eeebe4;color:#0f0f10}.dark{background:#0f0f10;color:#eeebe4;border-color:#eeebe4}.blue{background:#1f4fd8;color:#eeebe4}.label{display:block}.wordmark{height:135px;display:flex;align-items:center}.wordmark svg{width:100%;max-height:115px}.lockup{height:80px;display:flex;align-items:center}.lockup svg{width:100%;max-height:74px}.sizes{display:flex;justify-content:space-around;align-items:end;padding-top:16px;gap:16px}.sample{display:flex;flex-direction:column;align-items:center;gap:12px}.sample span{display:block}.sample svg{display:block;width:100%;height:100%}small{white-space:nowrap}.notes{padding:8px 0 24px}.notes p{margin:12px 0}.verdict{font-weight:bold}.notes a{font-size:12px}footer{margin-top:40px;border-top:3px solid;padding:24px 0}footer h2{font-size:32px}.reference{display:flex;gap:24px;align-items:center;max-width:820px;margin:24px 0}.reference img{width:120px;height:120px;flex:none}.reference p{margin:8px 0}.fine{font-size:12px}.status{padding:16px;background:#0f0f10;color:#eeebe4}@media(max-width:900px){.grid{gap:16px}main{padding:20px}.proof{padding:12px}.hero{height:160px}.heroicon{width:140px;height:140px}h2{font-size:34px}.kicker{min-height:64px}}@media(max-width:650px){main{padding:20px}.grid{grid-template-columns:1fr;gap:32px}.intro{display:block}.intro p+p{margin-top:12px}.hero{height:200px}.heroicon{width:180px;height:180px}.kicker{min-height:0}.wordmark{height:130px}.reference{align-items:start;gap:16px}.reference img{width:88px;height:88px}}@media print{main{padding:0}.grid{gap:16px}.notes{font-size:12px}article{break-inside:avoid}}'''
html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vinylytics — three label studies</title><style>{style}</style></head><body><main><header><div class="meta"><span>VINYLYTICS / IDENTITY STUDIES</span><span>17 NOVEMBER 2026 / ROUND 01</span></div><h1>A label for<br>your listening life.</h1><p>Your Spotify history, pressed as records.</p></header><div class="intro"><p>Three directions. Same independent-label attitude.<br>Cobalt is the only spot ink. Every mark also works in one colour.</p><p><b>Choose a direction before refinement.</b><br>These are exploratory concepts, not final assets.</p></div><section class="grid" aria-label="Three logo concepts">{''.join(cards)}</section><footer><h2>From the earlier turntable sketch</h2><div class="reference"><img src="../iterations/iteration-5.svg" alt="Previous multicolour turntable with V-shaped tonearm"><div><p>The V-as-tonearm idea from Claude’s earlier sketch informs <b>03 / Needle V</b>. The platter, grooves and extra colours are removed so the sign can stand on its own.</p><p><a href="../preview.html">Open the previous preview</a> · <a href="explorations/die-cut-ticket/icon.svg">Earlier ticket exploration</a></p></div></div><p class="fine">Readability: 16 / 24 / 32 px samples above are actual CSS sizes. Inspect at 100% zoom. Needle V’s pivot hole is secondary detail at 16 px; its silhouette carries recognition. Wordmarks are for larger use; the icon alone serves tiny placements.</p><p class="status">Next: choose 01, 02 or 03, or name the elements to combine. Then refine, confirm and export standalone outlined SVGs, favicons and 32 / 180 / 512 px PNGs.</p><p class="fine">Big Shoulders Black lettering is outlined in every new concept SVG. Archivo is used for this review page. Previous concepts are preserved. No app integration.</p></footer></main></body></html>'''
(ROOT/'preview.html').write_text(html,encoding='utf-8')
print('Outlined 9 concept SVGs; created preview.html; retained ticket exploration.')
