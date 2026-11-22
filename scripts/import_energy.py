"""Filter the official GovMap dashboard export. No inferred building records.
Usage: python scripts/import_energy.py /path/to/download.zip
Fetch the ZIP via the dashboard's Data control, then run this importer.
"""
import csv,io,json,sys,zipfile,datetime
from pathlib import Path
root=Path(__file__).resolve().parents[1]; out=root/'dist/energy';out.mkdir(exist_ok=True)
source=Path(sys.argv[1]);tables={}
with zipfile.ZipFile(source) as z:
 for group in ('BldgEnergyTBL.zip','CmplxEnergyTBL.zip'):
  tables[group]={}
  with zipfile.ZipFile(io.BytesIO(z.read(group))) as inner:
   for name in inner.namelist():
    if not name.endswith('.csv'):continue
    rows=list(csv.DictReader(io.StringIO(inner.read(name).decode('utf-8-sig'))))
    selected=[r for r in rows if r.get('סמל רשות')=='5568' and r.get('שם רשות מקומית')=='נווה מדבר']
    if not selected:continue
    tables[group][name]=selected
    with (out/(group.split('Energy')[0]+'_'+name)).open('w',encoding='utf-8-sig',newline='') as f:
     writer=csv.DictWriter(f,fieldnames=selected[0].keys());writer.writeheader();writer.writerows(selected)
old=json.loads((out/'summary.json').read_text())
old.update(tables=tables,retrieved_at=datetime.date.today().isoformat())
(out/'summary.json').write_text(json.dumps(old,ensure_ascii=False,indent=2))
print('Imported municipality 5568 only:',sum(len(v) for v in tables.values()),'tables')
