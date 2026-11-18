from pathlib import Path
import copy, re
import xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parent
OLD=ROOT.parent/'label-study-2026-11-17'
NS='http://www.w3.org/2000/svg'; E.register_namespace('',NS)
def circle(cx,cy,r):
 return f'M{cx+r} {cy}a{r} {r} 0 1 0 {-2*r} 0a{r} {r} 0 1 0 {2*r} 0Z'
def ring(cx,cy,a,b):return circle(cx,cy,a)+circle(cx,cy,b)
def path(d):return f'<path fill-rule="evenodd" d="{d}"/>'
# Separate exposed record and sleeve with a 24-unit knockout gutter.
disc=path(circle(360,256,136)+ring(360,256,108,92)+circle(360,256,48))+path(circle(360,256,16))
sleeve=path('M32 112H320V400H32Z M72 168H136L176 272L216 168H280L208 344H144Z')
a=f'<defs><clipPath id="exposed"><path d="M344 64H512V448H344Z"/></clipPath></defs><g clip-path="url(#exposed)">{disc}</g>{sleeve}'
# Knock out a generous clearance around the tonearm before printing the arm.
platter=path(circle(256,320,168)+ring(256,320,132,116)+circle(256,320,62))+path(circle(256,320,16))
b=f'<defs><mask id="arm-clearance" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><path d="M0 0H512V512H0Z" fill="white"/><path d="M88 64 256 256 424 64" fill="none" stroke="black" stroke-width="80" stroke-linejoin="miter"/><path d="M216 236H296V292H216Z" fill="black"/></mask></defs><g mask="url(#arm-clearance)">{platter}</g><path d="M88 64 256 256 424 64" fill="none" stroke="currentColor" stroke-width="40" stroke-linejoin="miter"/>{path(ring(424,64,40,16))}<path d="M232 244H280V276H232Z"/>'
c=path(circle(256,256,208)+ring(256,256,180,164)+circle(256,256,112))+path('M184 176H232L256 240L280 176H328L280 304H232Z '+circle(256,256,14))
concepts=[('01-sleeve','Uit de hoes','Een era om vast te pakken.','De vinyl schuift uit een vierkante hoes met uitgesneden V. De plaat en hoes blijven gescheiden door een stevige strook negatieve ruimte.',a),('02-tonearm','V als toonarm','Je draaide het. Vaak ook.','De plaat staat centraal; de V wordt een toonarm boven het label. Dit bouwt verder op Claude’s oorspronkelijke schets.',b),('03-imprint','Labelstempel','Jouw geschiedenis. Eigen persing.','Een volwaardige vinyl als compact labelstempel: groef, rond label en een V met het middengat erin.',c)]
wm=E.parse(OLD/'01-sleeve-cut'/'wordmark.svg').getroot()
wm_group=wm.find(f'{{{NS}}}g[@id="wordmark"]')
base_lock=E.parse(OLD/'01-sleeve-cut'/'lockup.svg').getroot()
text_group=base_lock.find(f'{{{NS}}}g[@id="wordmark"]')
for i,(folder,name,kicker,desc,body) in enumerate(concepts,1):
 d=ROOT/folder;d.mkdir(exist_ok=True)
 icon=f'<svg xmlns="{NS}" viewBox="0 0 512 512" color="#1f4fd8" fill="currentColor" role="img" aria-labelledby="title desc"><title id="title">Vinylytics - {name}</title><desc id="desc">{desc}</desc><g id="icon">{body}</g></svg>'
 (d/'icon.svg').write_text(icon,encoding='utf-8')
 (d/'wordmark.svg').write_bytes((OLD/'01-sleeve-cut'/'wordmark.svg').read_bytes())
 lock=E.Element(f'{{{NS}}}svg',{'viewBox':'0 0 1024 512','color':'#1f4fd8','fill':'currentColor','role':'img','aria-label':'Vinylytics - '+name+' lockup'})
 E.SubElement(lock,f'{{{NS}}}title').text='Vinylytics - '+name+' lockup'
 ig=E.SubElement(lock,f'{{{NS}}}g',{'id':'icon','transform':'translate(24 176) scale(.3125)'})
 ir=E.fromstring(icon)
 for child in ir.find(f'{{{NS}}}g[@id="icon"]'):ig.append(copy.deepcopy(child))
 lock.append(copy.deepcopy(text_group));E.ElementTree(lock).write(d/'lockup.svg',encoding='utf-8')
serial=0
def svg(folder,kind,box=None,cls=''):
 global serial
 serial+=1
 r=E.parse(ROOT/folder/f'{kind}.svg').getroot();r.set('color','currentColor');r.set('class',cls)
 r.attrib.pop('aria-labelledby',None);r.set('aria-label',folder+' '+kind)
 if box:r.set('viewBox',box)
 for el in list(r):
  if el.tag in [f'{{{NS}}}title',f'{{{NS}}}desc']:r.remove(el)
 s=E.tostring(r,encoding='unicode')
 ids=re.findall(r' id="([^"]+)"',s)
 for old in ids:
  s=s.replace(f'id="{old}"',f'id="p{serial}-{old}"').replace(f'url(#{old})',f'url(#p{serial}-{old})')
 return s
cards=[]
for i,(folder,name,kicker,desc,_) in enumerate(concepts,1):
 sizes=''.join(f'<div><span style="width:{n}px;height:{n}px">{svg(folder,"icon")}</span><small>{n} px</small></div>' for n in [16,24,32])
 cards.append(f'<article><div class="number">0{i} / VINYL STUDY</div><div class="hero">{svg(folder,"icon")}</div><h2>{name}</h2><p class="kicker">{kicker}</p><div class="wordmark">{svg(folder,"wordmark","60 168 900 184")}</div><div class="light proof"><label>HORIZONTAAL / INKT OP LICHT</label><div class="lock">{svg(folder,"lockup","20 176 980 172")}</div><div class="sizes">{sizes}</div></div><div class="dark proof"><label>MONOCHROOM / LICHT OP INKT</label><div class="lock">{svg(folder,"lockup","20 176 980 172")}</div><div class="sizes">{sizes}</div></div><p class="desc">{desc}</p><div class="links"><a href="{folder}/icon.svg">Icoon SVG</a><a href="{folder}/wordmark.svg">Woordmerk SVG</a><a href="{folder}/lockup.svg">Lockup SVG</a></div></article>')
style='''@font-face{font-family:Big;src:url('../../node_modules/@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff2');font-weight:900}@font-face{font-family:Archivo;src:url('../../node_modules/@fontsource/archivo/files/archivo-latin-400-normal.woff2')}*{box-sizing:border-box}body{margin:0;background:#eeebe4;color:#0f0f10;font:14px/1.5 Archivo,Arial,sans-serif}main{max-width:1500px;margin:auto;padding:28px}header{border-top:7px solid;padding:12px 0 18px;border-bottom:1px solid;display:flex;justify-content:space-between;gap:24px;align-items:end}h1,h2{font-family:Big,Impact,sans-serif;font-weight:900;text-transform:uppercase;line-height:.95;margin:0}h1{font-size:52px;letter-spacing:-.015em}h2{font-size:38px;margin-top:10px}.meta,label,.number,small{font-size:11px;letter-spacing:.04em}.meta{margin-bottom:10px}header p{margin:8px 0 0}.round{font-size:12px;max-width:270px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;padding-top:24px}article{min-width:0}.number{border-bottom:1px solid;padding-bottom:8px}.hero{height:220px;display:flex;align-items:center;justify-content:center;color:#1f4fd8}.hero svg{width:210px;height:210px}.kicker{margin:8px 0 16px}.wordmark{height:60px;margin-bottom:16px}.wordmark svg{width:100%;height:100%}.proof{padding:12px 14px;border-top:1px solid}.light{background:#eeebe4;color:#0f0f10}.dark{background:#0f0f10;color:#eeebe4}label{display:block}.lock{height:70px;display:flex;align-items:center}.lock svg{width:100%;height:64px}.sizes{display:flex;justify-content:space-around;align-items:end;gap:16px;padding:4px 0 6px}.sizes>div{display:flex;flex-direction:column;align-items:center;gap:6px}.sizes span,.sizes svg{display:block}.sizes svg{width:100%;height:100%}small{white-space:nowrap}.desc{margin:18px 0;min-height:84px}.links{display:flex;flex-wrap:wrap;gap:12px;font-size:12px}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:3px solid #1f4fd8;outline-offset:4px}footer{border-top:3px solid;margin-top:32px;padding-top:16px;font-size:13px}footer p{margin:8px 0}.note{color:#1f4fd8}@media(max-width:900px){main{padding:20px}.grid{gap:16px}h1{font-size:44px}h2{font-size:30px}.hero{height:180px}.hero svg{width:170px;height:170px}.proof{padding:12px 8px}.kicker{min-height:42px}.desc{min-height:150px}}@media(max-width:650px){header{display:block}.round{max-width:none;margin-top:16px}.grid{grid-template-columns:1fr;gap:36px}.hero{height:240px}.hero svg{width:230px;height:230px}h2{font-size:42px}.kicker,.desc{min-height:0}.wordmark{height:70px}.proof{padding:16px}}'''
html=f'''<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vinylytics — Vinylrichtingen</title><style>{style}</style></head><body><main><header><div><div class="meta">VINYLYTICS / RONDE 02 / 17 NOV 2026</div><h1>Er moet een plaat in.</h1><p>Your Spotify history, pressed as records.</p></div><div class="round">Drie nieuwe richtingen met herkenbare vinyl.<br>Eén spotkleur. Geen grafiekjes.<br><b>Kies eerst; daarna verfijnen we.</b></div></header><section class="grid" aria-label="Drie vinylrichtingen">{''.join(cards)}</section><footer><p class="note"><b>Mijn voorkeur: 01 / Uit de hoes</b> verbindt de vinyl direct met de collectie eras. <b>02</b> is speelser en bouwt verder op het toonarmidee. <b>03</b> voelt het meest als een labelstempel.</p><p>De icoontjes staan hierboven op echte 16, 24 en 32 px. Bij 16 px zijn het middengat en de groef secundaire details; vergelijk vooral de hoofdsilhouetten. De woordmerken zijn al omgezet naar paden.</p><p><a href="../label-study-2026-11-17/preview.html">Vorige ronde zonder volledige vinyl</a> · <a href="../preview.html">Claude’s oorspronkelijke schetsen</a></p><p>Nog geen definitieve keuze of exports. Alle vorige ontwerpen zijn bewaard; de appcode is niet aangepast.</p></footer></main></body></html>'''
(ROOT/'preview.html').write_text(html,encoding='utf-8')
print('Created 9 SVGs + new round-two preview, preserving all earlier work.')
