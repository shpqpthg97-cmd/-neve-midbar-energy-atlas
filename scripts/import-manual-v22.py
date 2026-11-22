"""Import individually reviewed UI observations, never nearest-point joins."""
import copy
import html
import json
import math
import shutil
from pathlib import Path
from osgeo import osr

ROOT = Path(__file__).resolve().parents[1]
read = lambda p: json.loads((ROOT / p).read_text())
def save(p, value):
    (ROOT / p).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

raw = read('sources/manual-energy-v22/observations.json')
schools = {r['SEMEL_MOSAD']: r for r in read('web/data.json')}
roofs = read('web/energy/roofs.json')
canopies = read('web/energy/canopies.json')
source_url = raw['source_url']
day = raw['observed_on']
methods = {
    '618785': 'חיפוש נקודת העניין בית ספר ביר אלמשאש אבו עמאר (שבט) במפת המקור; זיהוי המתחם והחצר בתצלום האוויר, והצלבה עם רשומת משרד החינוך 618785. כל פוליגון נבחר בנפרד בתוך המתחם, ונבדל מהגג המזרחי שכבר נשמר. השיוך המנהלי המקורי במאגר החינוך נשמר.',
    '618165': 'חיפוש נקודת העניין בית ספר אל אעצם אל מוסתאקבל אבו תלול במפת המקור; בחירת גגות נפרדים סביב החצר הראשית ובתוך המתחם, והצלבה עם רשומת משרד החינוך 618165. הגג הצפוני והגג הדרומי שכבר נשמרו לא נספרו שוב. מבנים סמוכים מחוץ למתחם לא שויכו.',
    '618199': 'חיפוש נקודת העניין בית ספר חסין אל הוושלה קסר א-סיר במפת המקור; הצלבה עם מיקום משרד החינוך של 618199 ועם המתחם שכבר זוהה. נבחרו פוליגונים נפרדים בתוך אותו מתחם, בנוסף לאגף המערבי שנשמר קודם. אין כאן שיוך לפי דמיון השם למוסד במתחם אחר.',
}
osr.UseExceptions()
src, dst = osr.SpatialReference(), osr.SpatialReference()
src.ImportFromProj4('+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-48,55,52,0,0,0,0 +units=m +no_defs')
dst.ImportFromEPSG(4326)
dst.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
tx = osr.CoordinateTransformation(src, dst)

def coordinates(r):
    r['lon'], r['lat'], _ = tx.TransformPoint(r['x'], r['y'])
    r['coordinate_conversion'] = 'ITM to WGS84; same projection and datum as institution markers'

def evidence(r, parent, screenshot, fields):
    # Full screenshots remain with the source audit. Compact factual transcripts
    # are served in the authenticated app to keep the Worker within its limit.
    target = ROOT / 'sources/manual-energy-v22' / screenshot
    if not target.exists():
        shutil.copy2(Path('/workspace/shared') / screenshot, target)
    e = html.escape
    rows = ''.join('<tr><th>' + e(label) + '</th><td>' + e('לא נמסר' if r.get(key) is None else ('מגרש ספורט' if key == 'type' and r[key] == 'sport' else str(r[key]))) + '</td></tr>' for label, key in fields)
    report = 'energy/manual-' + r['id'] + '.html'
    content = f'''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(r['name'])} — תיעוד בדיקה</title><style>body{{font:17px/1.7 system-ui,sans-serif;background:#f1f5f4;color:#173f48;margin:0;padding:28px}}main{{max-width:780px;margin:auto;background:white;padding:28px;border-radius:18px}}h1{{font-size:26px}}table{{border-collapse:collapse;width:100%}}th,td{{text-align:right;padding:8px;border-bottom:1px solid #dce7e6}}a{{color:#006d77}}aside{{background:#fff5dc;padding:16px;border-radius:10px}}small{{color:#52636a}}</style><main><a href="../index.html">חזרה למערכת</a><h1>{e(r['name'])}</h1><p>תיעוד בדיקה ידנית — תמלול נתונים שנקראו בכרטיס מפת האנרגיה, ולא תדפיס רשמי או מדידה הנדסית.</p><p>מוסד: <b>{e(schools[parent]['SHEM_MOSAD'])}</b> · סמל {e(parent)}<br>תאריך בדיקה: {day} · שנת נתוני המקור: {raw['source_year']}<br>נקודת לחיצה ברשת ישראל החדשה: X {r['x']} / Y {r['y']}. זו נקודה בתוך השטח שנבדק, לא מרכז מדוד או מתאר גבולות.</p><table>{rows}</table><h2>בסיס השיוך</h2><p>{e(r.get('institution_match', {}).get('method', r.get('match_status', '')))}</p><aside>{e(r['notes'])}<br>השיוך טעון אימות בשטח ובדיקת זכויות. יש לבדוק אפשרות חיבור לרשת החשמל.</aside><p><a href="{e(source_url)}" target="_blank" rel="noopener">פתיחת מפת האנרגיה הממשלתית</a></p><small>מקור הנתונים: משרד האנרגיה והתשתיות והמרכז למיפוי ישראל. נתוני המקור אינם בבעלות מפתח המערכת. הערכים נשמרו כפי שנמסרו; אין להסיק מערך חסר שהוא אפס.</small></main></html>'''
    (ROOT / 'web' / report).write_text(content)
    return report

new_roofs = []
for observed in raw['roofs']:
    parent = observed['education_id']
    baseline = next(r for r in roofs if r['education_id'] == parent)
    r = copy.deepcopy(baseline)
    r.update(observed)
    r['id'] = f"roof-{parent}-{r['x']}-{r['y']}"
    r.update(retrieved_at=day, source_year=raw['source_year'], source_url=source_url)
    r['notes'] = 'נתונים שנקראו ידנית בכרטיס גג נפרד במפת המקור. ההספק והייצור נשמרו כפי שהוצגו, גם כאשר מכפלת ההספק בשעות השמש שונה מהייצור המדווח. שטח פאנלים קיימים לא נמסר בכרטיס ואינו מוגדר כאפס.'
    note = r.pop('observation_note', None)
    if note:
        r['notes'] += ' ' + note
        r['quality_flag'] = 'source_zero_values_require_review'
    r['institution_match'] = dict(method=methods[parent], status='שיוך לפי מפת המקור — נדרש אימות שטח', checked_at=day, scope='הגג שנבחר בלבד; זהו סבב השלמה חלקי, ולא אישור שכל גגות המוסד נבדקו')
    xy = [float(schools[parent]['X']), float(schools[parent]['Y'])]
    r['source_education_xy'] = xy
    r['distance_from_education_point_m'] = round(math.hypot(r['x']-xy[0], r['y']-xy[1]), 1)
    coordinates(r)
    r['institution_match']['evidence'] = evidence(r, parent, r['id']+'.jpg', [('שטח גג — מ״ר','roof_area_m2'),('שטח פאנלים קיימים — מ״ר','existing_panels_m2'),('שטח פנוי לסולארי — מ״ר','available_solar_m2'),('שעות שמש — קוט״ש לשנה לקילוואט','solar_hours_kwh_per_kw_year'),('הספק פוטנציאלי — kW','potential_kw'),('ייצור צפוי בשנה — קוט״ש','annual_generation_kwh')])
    new_roofs.append(r)

new_canopies = []
for observed in raw['canopies']:
    r = dict(observed)
    parent = r['parent_education_id']
    baseline = next(x for x in roofs if x['education_id'] == parent)
    r.update(locality=baseline['locality'], source_url=source_url, source_year=raw['source_year'], retrieved_at=day)
    if baseline.get('locality_code'):
        r['locality_code'] = baseline['locality_code']
    r['match_status'] = 'שיוך למתחם המוסד לפי נקודת העניין המזוהה ותצלום האוויר — נדרש אימות בשטח וזכויות'
    r['notes'] = 'סיווג המקור: מגרש ספורט. לא אומת כסוג מסוים של מגרש כדורגל ולא הוצלב למזהה במאגר הספורט. זוהי נקודת בדיקה במגרש, לא מתאר מדוד. שיוך למתחם לפי המפה אינו אימות בעלות המועצה. פוטנציאל הקירוי נשמר בנפרד מנתוני הגגות ואינו אישור להקמת קירוי.'
    if r.get('gush_reported'):
        r['notes'] += ' הגוש והחלקה הועתקו מכרטיס המקור ואינם אימות רישום.'
    coordinates(r)
    r['evidence'] = evidence(r, parent, 'canopy-'+r['id']+'.jpg', [('סוג שימוש במקור','type'),('שטח מגרש — מ״ר','area_m2'),('מקדם מימוש — %','realization_percent'),('שטח פנוי לקירוי — מ״ר','available_solar_m2'),('הספק פוטנציאלי — kW','potential_kw'),('שעות שמש — קוט״ש לשנה לקילוואט','yield_kwh_per_kw'),('ייצור צפוי בשנה — קוט״ש','annual_generation_kwh'),('גוש מדווח','gush_reported'),('חלקה מדווחת','parcel_reported')])
    new_canopies.append(r)

for filename, old, new in [('web/energy/roofs.json', roofs, new_roofs), ('web/energy/canopies.json', canopies, new_canopies)]:
    merged = {r['id']: r for r in old}
    merged.update({r['id']: r for r in new})
    save(filename, list(merged.values()))
print(json.dumps({'added_roofs':len(new_roofs),'added_canopies':len(new_canopies),'new_roof_kw':sum(r['potential_kw'] for r in new_roofs),'new_roof_kwh':sum(r['annual_generation_kwh'] for r in new_roofs)},ensure_ascii=False))
