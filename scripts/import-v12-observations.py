"""Preserve additional individually observed GovMap features and evidence."""
import json, shutil
from pathlib import Path
from osgeo import osr
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text())
def save(p,x):(R/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
src,dst=osr.SpatialReference(),osr.SpatialReference()
src.ImportFromProj4('+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-48,55,52,0,0,0,0 +units=m +no_defs')
dst.ImportFromEPSG(4326);dst.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
tx=osr.CoordinateTransformation(src,dst)
roof=dict(next(r for r in read('dist/energy/roofs.json') if r['education_id']=='618165'))
roof.update(id='roof-618165-193154-566471',name='גג אלמסתקבל — אגף דרומי',x=193154,y=566471,roof_area_m2=181,existing_panels_m2=None,available_solar_m2=120,potential_kw=17,annual_generation_kwh=30430,solar_hours_kwh_per_kw_year=1908)
roof['institution_match']={**roof['institution_match'],'evidence':'energy/roof-mustaqbal-south.jpg','method':'זיהוי מתחם בית ספר אל אעצם אל מוסתאקבל בחיפוש המקור; פוליגון גג דרומי נפרד בתוך אותו מתחם. נדרשים אימות שטח וזכויות.'}
roof.pop('distance_from_education_point_m',None)
canopies=[]
for id,parent,name,kind,x,y,area,free,kw,annual,evidence,sport in [
 ('mustaqbal-court','618165','מגרש קטרגל במתחם אלמסתקבל','sport',193212,566543,855,512,73,130670,'canopy-mustaqbal.jpg','861R1105790'),
 ('aatsam-b-court','618355','מגרש ספורט במתחם אל אעצם ב׳','sport',193615,566389,601,352,50,89500,'canopy-aatsam-court.jpg',None),
 ('aatsam-b-parking','618355','שטח המסווג כחניה ליד אל אעצם ב׳','parking',193666,566354,795,216,31,55490,'canopy-aatsam-parking.jpg',None)]:
  row=dict(id=id,parent_education_id=parent,name=name,type=kind,x=x,y=y,area_m2=area,available_solar_m2=free,potential_kw=kw,annual_generation_kwh=annual,realization_percent=40 if kind=='parking' else 80,yield_kwh_per_kw=1790,locality='אבו תלול',locality_code='1375',source_year=2025,retrieved_at='2026-11-14',source_url='https://www.govmap.gov.il/sites/energy/index.html?map=solar_panels',evidence='energy/'+evidence,match_status='שיוך למתחם לפי שם המוסד במפה ותצלום האוויר — נדרש אימות בשטח וזכויות',notes='נקודת בדיקה בתוך שטח במפת המקור, לא מתאר מדוד. הפוטנציאל נשמר בנפרד מגגות המוסד. לא הוכחה בעלות או אפשרות הקמת קירוי.')
  if sport:row.update(sport_id=sport,notes=row['notes']+' הותאם למתקן הקטרגל 861R1105790 לפי שם בית הספר ונקודת הדיווח במרחק כ-11 מטר מנקודת הבדיקה.')
  if parent=='618355':row.update(gush_reported='100151',parcel_reported='1')
  if kind=='parking':row['notes']+=' סיווג המקור הוא חניון ציבורי אף שבתצלום נראה משטח משחק; נדרש בירור סיווג, שימוש ושיוך בשטח לפני תכנון.'
  canopies.append(row)
for r in [roof,*canopies]:
 r['lon'],r['lat'],_=tx.TransformPoint(r['x'],r['y'])
 r['coordinate_conversion']='ITM to WGS84; same projection and datum as institution markers'
 evidence=r.get('evidence',r.get('institution_match',{}).get('evidence'))
 shutil.copy2(Path('/workspace/shared/neve-energy-v12')/Path(evidence).name,R/'dist'/evidence)
save('sources/official-2026-11-14/additional-govmap-observations.json',{'roof':roof,'canopies':canopies})
for path,rows in [('dist/energy/roofs.json',[roof]),('dist/energy/canopies.json',canopies)]:
 old={r['id']:r for r in read(path)};old.update({r['id']:r for r in rows});save(path,list(old.values()))
for name in ['iec-touz-observed.txt','iec-general-observed.txt']:
 shutil.copy2(Path('/workspace/shared/neve-energy-v12')/name,R/'sources/official-2026-11-14'/name)
print('Added one roof and three canopy observations with source evidence')
