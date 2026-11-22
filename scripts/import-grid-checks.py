"""Point-by-point lookup against the public layer used by IEC's published map.

No locality-centre points are treated as school locations. Preserve query
coordinates, response IDs, map date and the basis for each location.
"""
import json, urllib.request, urllib.parse, pathlib, collections, concurrent.futures

ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'sources/official-2026-11-14'
URL='https://services3.arcgis.com/IwBfWsA3Hiwd5dEw/arcgis/rest/services/LV_DAY/FeatureServer/3'
MAP='https://experience.arcgis.com/experience/50e8bc89f74449298c103615c2899697'
FIELDS=['POTENTIALITY_TO_CONNECT_D_LV','POTENTIALITY_TO_CONNECT_N_LV','POTENTIALITY_TO_CONNECT_D_MV','POTENTIALITY_TO_CONNECT_N_MV']
def read(name): return json.loads((ROOT/'dist'/name).read_text())
education=read('data.json');roofs=read('energy/roofs.json');checks=read('energy/roof-checks.json')
counts=collections.Counter((r['X'],r['Y']) for r in education)
records=[]
for r in education:
    sid=str(r['SEMEL_MOSAD']);rr=[x for x in roofs if x.get('education_id')==sid]
    cc=next((c for c in checks if c['education_id']==sid and c.get('x') and c.get('y')),None)
    if rr: points=[{'x':x['x'],'y':x['y'],'basis':'נקודה בתוך גג ששויך במפת המקור','roof_id':x['id']} for x in rr]
    elif cc:points=[{'x':cc['x'],'y':cc['y'],'basis':'נקודת מוסד שנבדקה במפה; טרם התקבל נתון גג'}]
    elif r['RAMAT_DIYUK_MIKUM']=='גבוהה מאוד' and counts[(r['X'],r['Y'])]==1:
        points=[{'x':float(r['X']),'y':float(r['Y']),'basis':'נקודת משרד החינוך ברמת דיוק גבוהה מאוד; נדרש אימות שטח'}]
    else:points=[]
    records.append({'asset_id':'edu:'+sid,'name':r['SHEM_MOSAD'],'points':points,'status':'pending' if points else 'missing_precise_location'})
for r in read('sports.json'):
    if r.get('בעלי המתקן')!='נווה מדבר':continue
    records.append({'asset_id':'sport:'+r['מספר זיהוי'],'name':r['שם המתקן'],'points':[{'x':float(r['ציר X']),'y':float(r['ציר Y']),'basis':'נקודת מתקן ספורט מדווחת משנת 2021; טרם אומתה במדידה'}],'status':'pending'})
for r in read('energy/canopies.json'):
    records.append({'asset_id':'canopy:'+r['id'],'name':r['name'],'points':[{'x':r['x'],'y':r['y'],'basis':'נקודת קירוי שנבדקה במפת האנרגיה'}],'status':'pending'})

cache=BASE/'grid-point-responses';cache.mkdir(exist_ok=True)
points=sorted({(p['x'],p['y']) for r in records for p in r['points']})
def query(pair):
    x,y=pair;fp=cache/(str(x)+'_'+str(y)+'.json')
    params={'f':'json','geometry':f'{x},{y}','geometryType':'esriGeometryPoint','inSR':2039,'spatialRel':'esriSpatialRelIntersects','outFields':','.join(['OBJECTID']+FIELDS),'returnGeometry':'false'}
    query_url=URL+'/query?'+urllib.parse.urlencode(params)
    if fp.exists():return pair,json.loads(fp.read_text())
    try:
        with urllib.request.urlopen(query_url,timeout=30) as response: result=json.load(response)
        payload={'query_url':query_url,'queried_at':'2026-11-14','result':result}
        if 'error' in result:raise ValueError(str(result['error']))
        fp.write_text(json.dumps(payload,ensure_ascii=False,indent=2));return pair,payload
    except Exception as e:return pair,{'error':str(e),'query_url':query_url,'queried_at':'2026-11-14'}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
    results=dict(ex.map(query,points))
for r in records:
    for p in r['points']:
        response=results[(p['x'],p['y'])];p['query_url']=response['query_url']
        if 'error' in response:p['status']='lookup_failed';p['error']=response['error'];continue
        features=response['result'].get('features',[])
        p['matches']=[f['attributes'] for f in features]
        p['status']='mapped' if len(features)==1 else 'boundary_ambiguous' if features else 'outside_coverage'
    if r['points']:r['status']='mapped' if all(p['status']=='mapped' for p in r['points']) else 'needs_review'
    if r['status']=='mapped':
        r['ratings']={f:sorted({p['matches'][0].get(f) for p in r['points']} - {None,''}) for f in FIELDS}
    r['checked_at']='2026-11-14';r['map_updated_at']='2026-10-18';r['source_url']=MAP
out={'source_url':MAP,'explanation_url':'https://www.iec.co.il/content/renewableenergy/contentpages/probabilitymap','layer_url':URL,'map_updated_at':'2026-10-18','checked_at':'2026-11-14','limitations':'הערכה ראשונית ברמת תחנת משנה לפי מגבלות הולכה; אינה בדיקת רשת החלוקה, סוג החיבור בפועל או תשובת מחלק. מיקום ברמת יישוב בלבד אינו משויך.','records':records}
(ROOT/'dist/energy/grid-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'point_queries':len(points),'records':len(records),'statuses':dict(collections.Counter(r['status'] for r in records))},ensure_ascii=False))
