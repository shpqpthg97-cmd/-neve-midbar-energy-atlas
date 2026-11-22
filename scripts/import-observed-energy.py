"""Merge reviewed GovMap observations; never infer a roof from a nearby point.

Run with /usr/bin/python3 (GDAL/OSR) from the checkout. Raw observations and
screenshots are retained so every association remains independently reviewable.
"""
import json
import math
import shutil
from pathlib import Path
from osgeo import osr

ROOT = Path(__file__).resolve().parents[1]
DAY = '2026-11-14'
EVIDENCE = Path('/workspace/shared/neve-energy-v11')
read = lambda path: json.loads((ROOT / path).read_text())
def write(path, data):
    (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# Same datum conversion as the institution markers in dist/app.js.
osr.UseExceptions()
src, dst = osr.SpatialReference(), osr.SpatialReference()
src.ImportFromProj4('+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-48,55,52,0,0,0,0 +units=m +no_defs')
dst.ImportFromEPSG(4326)
dst.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
transform = osr.CoordinateTransformation(src, dst)

schools = {r['SEMEL_MOSAD']: r for r in read('dist/data.json')}
roofs = {r['id']: r for r in read('dist/energy/roofs.json')}
town_codes = {'אבו תלול': '1375', 'אבו קרינאת': '1342', 'קסר א-סר': '1347', 'ביר הדאג׳': '1348'}
observations = read(f'sources/roof-observations-{DAY}.json')
for raw in observations['rows']:
    r = dict(raw)
    school = schools[r['education_id']]
    for field in ['roof_area_m2', 'available_solar_m2', 'potential_kw', 'annual_generation_kwh']:
        assert isinstance(r[field], (int, float)) and r[field] >= 0
    evidence, method = r.pop('evidence'), r.pop('method')
    label = r.pop('label_evidence', None)
    for name in [evidence, label]:
        if name:
            assert (EVIDENCE / name).is_file(), name
            shutil.copy2(EVIDENCE / name, ROOT / 'dist/energy' / name)
    r.update({
        'id': f"roof-{r['education_id']}-{r['x']}-{r['y']}",
        'source_url': observations['source_url'], 'source_year': 2025,
        'retrieved_at': DAY, 'ownership': 'לא אומתה',
        'use_class': 'שם השימוש לא נמסר בכרטיס הגג',
        'location_method': 'נקודת בדיקה בתוך הגג במפת המקור; לא מרכז מדוד ולא פוליגון',
        'municipality_match': 'משויך למוסד ברשימת נווה מדבר; גבול וזכויות דורשים אימות',
        'notes': 'ערכי ההספק והייצור נשמרו כפי שדווחו במקור, גם כשמכפלת ההספק בשעות השמש שונה מהייצור המדווח. שדה חסר אינו אפס.',
        'institution_match': {'method': method, 'status': 'שיוך לפי מפת המקור — נדרש אימות שטח', 'checked_at': DAY, 'evidence': 'energy/' + evidence, 'scope': 'הגגות שנבדקו בלבד; ייתכנו גגות נוספים במוסד שטרם נבדקו'},
        'source_education_xy': [float(school['X']), float(school['Y'])],
    })
    if label:
        r['institution_match']['label_evidence'] = 'energy/' + label
    if r['locality'] in town_codes:
        r['locality_code'] = town_codes[r['locality']]
    r['distance_from_education_point_m'] = round(math.hypot(r['x']-float(school['X']), r['y']-float(school['Y'])), 1)
    roofs[r['id']] = r

canopies = {r['id']: r for r in read('dist/energy/canopies.json')}
for r in read(f'sources/canopy-observations-{DAY}.json'):
    assert r['parent_education_id'] in schools
    name = Path(r['evidence']).name
    assert (EVIDENCE / name).is_file()
    shutil.copy2(EVIDENCE / name, ROOT / r['evidence'].replace('energy/', 'dist/energy/', 1))
    canopies[r['id']] = r

# Repair earlier roof/canopy lon-lat values that omitted the datum transformation.
# Original observed ITM coordinates and their evidence are preserved unchanged.
for r in [*roofs.values(), *canopies.values()]:
    r['lon'], r['lat'], _ = transform.TransformPoint(r['x'], r['y'])
    r['coordinate_conversion'] = 'ITM to WGS84; same projection and datum as institution markers'

checks = {r['education_id']: r for r in read('dist/energy/roof-checks.json')}
for r in read(f'sources/roof-checks-{DAY}.json'):
    assert r['education_id'] in schools
    if r.get('evidence'):
        shutil.copy2(EVIDENCE / Path(r['evidence']).name, ROOT / 'dist' / r['evidence'])
    checks[r['education_id']] = r
linked = {r['education_id'] for r in roofs.values()}
checks = {k: v for k, v in checks.items() if k not in linked}
write('dist/energy/roofs.json', list(roofs.values()))
write('dist/energy/canopies.json', list(canopies.values()))
write('dist/energy/roof-checks.json', list(checks.values()))
print(json.dumps({'roof_records': len(roofs), 'linked_institutions': len(linked), 'canopies': len(canopies), 'unlinked_checks': len(checks)}))
