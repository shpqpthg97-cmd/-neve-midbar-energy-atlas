"""Extract the council's four locality codes from the official dashboard ZIP.
The field labelled municipality in the statistical-area tables contains locality codes.
Localities validated against the council website and education source locality codes.
"""
from pathlib import Path
import csv,io,json,zipfile
root=Path(__file__).resolve().parents[1]
names={'1375':'אבו תלול','1342':'אבו קרינאת','1347':'קסר א-סר','1348':"ביר הדאג'"}
z=zipfile.ZipFile(root/'sources/govmap-energy-export-2026-11-10.zip')
b=zipfile.ZipFile(io.BytesIO(z.read('BldgEnergyTBL.zip')));c=zipfile.ZipFile(io.BytesIO(z.read('CmplxEnergyTBL.zip')))
def rows(zip,name):return list(csv.DictReader(io.StringIO(zip.read(name).decode('utf-8-sig'))))
general=rows(b,'generalRoofStatRegEnergyTBL.csv');detail=rows(b,'detailsRoofStatRegEnergyTBL.csv');canopy=rows(c,'generalRoofStatRegEnergyTBL.csv')
out={'source_url':'https://www.govmap.gov.il/sites/energy/index.html?map=dashboard','localities_source':'https://www.nevemidbar.org.il/about/localities/?tab=4','retrieved_at':'2026-11-10','source_year':2025,'units':{'area':'m2','power':'kW'},'localities':[]}
for code,name in names.items():
 g=[r for r in general if r['סמל רשות']==code];d=[r for r in detail if r['סמל רשות']==code];k=[r for r in canopy if r['סמל רשות']==code]
 assert len(g)==len(k)==1 and len(d)==20
 out['localities'].append({'code':code,'name':name,'source_name':g[0]['שם רשות מקומית'],'statistical_area_id':g[0]['אזור סטטיסטי'],'general':g[0],'roof_categories':d,'canopy_general':k[0]})
assert sum(int(next(r for r in l['roof_categories'] if r['סיווג שימוש']=='רשות מקומית')['מספר מבנים']) for l in out['localities'])==220
(root/'dist/energy/localities.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print([(l['name'],next(r['הספק פוטנציאל מוערך (KW)'] for r in l['roof_categories'] if r['סיווג שימוש']=='רשות מקומית')) for l in out['localities']])
