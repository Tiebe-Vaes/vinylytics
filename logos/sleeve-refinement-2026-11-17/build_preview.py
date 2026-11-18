from pathlib import Path
import xml.etree.ElementTree as E
import copy,re
R=Path(__file__).resolve().parent
O=R.parent/'vinyl-study-2026-11-17'/'01-sleeve'
NS='http://www.w3.org/2000/svg';E.register_namespace('',NS)
body='''<defs><clipPath id="record-reveal"><path d="M344 64H512V448H344Z"/></clipPath></defs>
<g id="record" clip-path="url(#record-reveal)">
<circle cx="360" cy="256" r="136" fill="#0f0f10" stroke="#eeebe4" stroke-width="6"/>
<circle cx="360" cy="256" r="100" fill="none" stroke="#2a2826" stroke-width="6"/>
<circle cx="360" cy="256" r="48" fill="#d9a21b"/>
<circle cx="360" cy="256" r="16" fill="#0f0f10"/>
</g>
<g id="sleeve"><path d="M32 112H320V400H32Z" fill="#1f4fd8"/>
<path d="M72 168H136L176 272L216 168H280L208 344H144Z" fill="#bf3a22"/></g>'''
icon=f'<svg xmlns="{NS}" viewBox="0 0 512 512" role="img" aria-label="Vinylytics - Uit de hoes in Claude’s kleuren"><title>Vinylytics - Uit de hoes, kleurstudie 01</title><g id="icon">{body}</g></svg>'
(R/'icon-colour.svg').write_text(icon,encoding='utf-8')
(R/'icon-mono.svg').write_bytes((O/'icon.svg').read_bytes())
(R/'wordmark.svg').write_bytes((O/'wordmark.svg').read_bytes())
lock=E.parse(O/'lockup.svg').getroot()
ig=lock.find(f'{{{NS}}}g[@id="icon"]')
for el in list(ig):ig.remove(el)
for el in E.fromstring(f'<g xmlns="{NS}">{body}</g>'):ig.append(copy.deepcopy(el))
lock.set('color','#0f0f10');E.ElementTree(lock).write(R/'lockup-colour.svg',encoding='utf-8')
(R/'lockup-mono.svg').write_bytes((O/'lockup.svg').read_bytes())
serial=0
def svg(file,box=None,colour=None):
 global serial
 serial+=1;r=E.parse(R/file).getroot()
 if box:r.set('viewBox',box)
 if colour:r.set('color',colour)
 for el in list(r):
  if el.tag in [f'{{{NS}}}title',f'{{{NS}}}desc']:r.remove(el)
 r.attrib.pop('aria-labelledby',None)
 s=E.tostring(r,encoding='unicode')
 for id in re.findall(r' id="([^"]+)"',s):s=s.replace(f'id="{id}"',f'id="p{serial}-{id}"').replace(f'url(#{id})',f'url(#p{serial}-{id})')
 return s

def sizes(file,color=None):return '<div class="sizes">'+''.join(f'<div><span style="width:{n}px;height:{n}px">{svg(file,colour=color)}</span><small>{n} px</small></div>' for n in [16,24,32])+'</div>'
proofs=[]
for cls,title,textcolor in [('light','KLEUR / LICHT','#0f0f10'),('dark','KLEUR / DONKER','#eeebe4')]:
 proofs.append(f'<article class="{cls}"><label>{title}</label><div class="hero">{svg("icon-colour.svg")}</div><div class="lock">{svg("lockup-colour.svg","20 176 980 172",textcolor)}</div>{sizes("icon-colour.svg")}</article>')
proofs.append(f'<article class="dark"><label>MONOCHROOM / TER VERGELIJKING</label><div class="hero">{svg("icon-mono.svg",colour="#eeebe4")}</div><div class="lock">{svg("lockup-mono.svg","20 176 980 172","#eeebe4")}</div>{sizes("icon-mono.svg","#eeebe4")}</article>')
css='''@font-face{font-family:Big;src:url('../../node_modules/@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff2');font-weight:900}@font-face{font-family:Archivo;src:url('../../node_modules/@fontsource/archivo/files/archivo-latin-400-normal.woff2')}*{box-sizing:border-box}body{margin:0;background:#eeebe4;color:#0f0f10;font:14px/1.5 Archivo,Arial,sans-serif}main{max-width:1440px;margin:auto;padding:28px}header{border-top:7px solid;padding-top:14px}h1{font:900 52px/.95 Big,Impact,sans-serif;text-transform:uppercase;margin:12px 0}p{margin:10px 0}small,label,.meta{font-size:11px;letter-spacing:.04em}.palette{display:flex;gap:20px;flex-wrap:wrap;padding:16px 0 24px}.palette span{display:flex;align-items:center;gap:8px}.chip{width:18px;height:18px;display:inline-block}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}article{padding:20px;min-width:0;border:1px solid #4a4642}.light{background:#eeebe4;color:#0f0f10}.dark{background:#0f0f10;color:#eeebe4}.hero{height:280px;display:flex;align-items:center;justify-content:center}.hero svg{width:260px;height:260px}.lock{height:90px;display:flex;align-items:center}.lock svg{width:100%;height:74px}.sizes{display:flex;justify-content:space-around;align-items:end;padding-top:24px}.sizes>div{display:flex;flex-direction:column;align-items:center;gap:10px}.sizes span,.sizes svg{display:block}.sizes svg{width:100%;height:100%}footer{border-top:3px solid;margin-top:28px;padding-top:12px}.reference{display:flex;gap:20px;align-items:center}.reference img{width:88px;height:88px}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:3px solid #1f4fd8;outline-offset:4px}@media(max-width:900px){main{padding:20px}.grid{gap:14px}article{padding:12px}.hero{height:220px}.hero svg{width:100%;max-width:220px}h1{font-size:44px}}@media(max-width:650px){.grid{grid-template-columns:1fr}.hero{height:260px}.hero svg{width:250px;height:250px}.palette{gap:12px}.reference{align-items:start}}'''
html=f'''<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vinylytics - Uit de hoes, Claude-kleuren</title><style>{css}</style></head><body><main><header><div class="meta">VINYLYTICS / GEKOZEN RICHTING 01 / KLEURSTUDIE 01</div><h1>Uit de hoes. In kleur.</h1><p>Your Spotify history, pressed as records.</p></header><div class="palette"><span><i class="chip" style="background:#1f4fd8"></i>Cobalt #1f4fd8</span><span><i class="chip" style="background:#bf3a22"></i>Vermiljoen #bf3a22</span><span><i class="chip" style="background:#d9a21b"></i>Mosterd #d9a21b</span><span><i class="chip" style="background:#0f0f10"></i>Inktzwart #0f0f10</span></div><section class="grid" aria-label="Kleur en monochroom">{''.join(proofs)}</section><footer><div class="reference"><img src="../iterations/iteration-5.svg" alt="Claude’s oorspronkelijke kleurenmockup"><div><p><b>Optie 1 met de kleuren van Claude’s mockup.</b><br>Kobaltblauwe hoes, vermiljoenrode V, zwarte plaat en mosterdgeel label. Een dunne off-white rand houdt de vinyl zichtbaar op donker.</p><p><a href="icon-colour.svg">Icoon SVG</a> · <a href="lockup-colour.svg">Lockup SVG</a> · <a href="../vinyl-study-2026-11-17/preview.html">Vorige opties</a></p></div></div><p>De monochrome versie behoudt de uitgesneden V. De kleine proeven zijn echte 16 / 24 / 32 px. Nog een kleurstudie: na jouw akkoord volgen de definitieve SVG-, favicon- en PNG-exports.</p></footer></main></body></html>'''
(R/'preview.html').write_text(html,encoding='utf-8')
print('Created colour refinement + retained mono versions; previous rounds untouched.')
