from pathlib import Path
import urllib.request,json,re,hashlib,concurrent.futures,xml.etree.ElementTree as ET
BASE=Path('/workspace/scratch/design-assets')
PIN='f12b0de177fbc2a6795e99be065887e72b237123'
ICONS='house search book-open zap map layers building-2 chart-no-axes-combined clipboard-list list-checks shield-alert refresh-cw settings menu panel-right-close panel-right-open chevron-down chevron-left sun moon star x user log-out accessibility eye eye-off arrow-up-right download calendar clock check triangle-alert info database file-text chevrons-left-right'.split()
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=45) as r:return r.read()
for p in ['fonts/heebo','icons/lucide']:(BASE/p).mkdir(parents=True,exist_ok=True)
font_css_url='https://fonts.googleapis.com/css2?family=Heebo:wght@100..900&display=swap'
css=fetch(font_css_url).decode()
(BASE/'fonts/heebo/google-fonts-source.css').write_text(css)
font_jobs=[]; local_css=[]
for subset,rule in re.findall(r'/\* ([^*]+) \*/\s*(@font-face\s*\{.*?\})',css,re.S):
 if subset not in ['hebrew','latin','latin-ext']: continue
 url=re.search(r'url\(([^)]+)\)',rule).group(1)
 name=f'heebo-{subset}-variable.woff2'
 font_jobs.append((url,BASE/'fonts/heebo'/name))
 local_css.append(f'/* {subset} */\n'+rule.replace(url,'./'+name))
(BASE/'fonts/heebo/heebo.css').write_text('\n\n'.join(local_css)+'\n')
jobs=font_jobs+[
 ('https://raw.githubusercontent.com/google/fonts/main/ofl/heebo/OFL.txt',BASE/'fonts/heebo/OFL.txt'),
 (f'https://raw.githubusercontent.com/lucide-icons/lucide/{PIN}/LICENSE',BASE/'icons/lucide/LICENSE')
]+[(f'https://raw.githubusercontent.com/lucide-icons/lucide/{PIN}/icons/{n}.svg',BASE/'icons/lucide'/f'{n}.svg') for n in ICONS]
manifest=[]
def save(job):
 url,path=job; raw=fetch(url); data=raw
 if path.suffix=='.svg':
  data=re.sub(r'width="24"','width="20"',raw.decode(),count=1)
  data=re.sub(r'height="24"','height="20"',data,count=1).encode()
  root=ET.fromstring(data)
  assert root.attrib.get('viewBox')=='0 0 24 24',(path,root.attrib)
  assert root.attrib.get('stroke-width')=='2',(path,root.attrib)
 path.write_bytes(data)
 return {'path':str(path.relative_to(BASE)),'source':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for entry in pool.map(save,jobs):manifest.append(entry)
# Keep exact SVG inner markup in a compact, framework-neutral map for inline rendering.
markup={}
for name in ICONS:
 data=(BASE/'icons/lucide'/f'{name}.svg').read_text()
 markup[name]=re.sub(r'^.*?<svg[^>]*>|</svg>\s*$','',data,flags=re.S).strip()
(BASE/'icons/lucide/paths.json').write_text(json.dumps(markup,ensure_ascii=False,indent=2)+'\n')
(BASE/'manifest.json').write_text(json.dumps({'lucide_revision':PIN,'google_fonts_css':font_css_url,'files':manifest},indent=2)+'\n')
print(json.dumps({'icons':len(ICONS),'font_files':len(font_jobs),'downloaded_bytes':sum(x['bytes'] for x in manifest),'directory':str(BASE)}))
