const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const files=fs.readdirSync('web',{recursive:true}).filter(f=>/\.(json|geojson)$/.test(f)),datasets=new Map();
function geometry(g){if(!g)return;if(g.type==='GeometryCollection')return g.geometries.forEach(geometry);function coordinates(c){assert(Array.isArray(c));if(typeof c[0]==='number'){assert(c.length>=2&&c.slice(0,2).every(Number.isFinite));assert(c.slice(2).every(v=>v===null||Number.isFinite(v)));assert(c[0]>=-180&&c[0]<=180);assert(c[1]>=-90&&c[1]<=90)}else c.forEach(coordinates)}coordinates(g.coordinates)}
function evidence(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(/^(evidence|label_evidence)$/.test(k)&&typeof x==='string'&&!/^https?:/.test(x))assert(fs.existsSync(path.join('web',x)),x);else if(x&&typeof x==='object')evidence(x)}}
for(const f of files){const d=JSON.parse(fs.readFileSync(path.join('web',f)));datasets.set(f,d);evidence(d);if(d.type==='FeatureCollection')d.features.forEach(f=>geometry(f.geometry))}
const edu=datasets.get('data.json'),sports=datasets.get('sports.json'),roofs=datasets.get('energy/roofs.json'),canopies=datasets.get('energy/canopies.json');
for(const [rows,key]of [[edu,'SEMEL_MOSAD'],[sports,'מספר זיהוי'],[roofs,'id'],[canopies,'id']])assert.equal(new Set(rows.map(r=>r[key])).size,rows.length);
assert(edu.every(r=>r.SHEM_RASHUT==='נווה מדבר'));assert(sports.every(r=>r['רשות מקומית']==='נווה מדבר'&&r['בעלי המתקן']==='נווה מדבר'));
for(const r of [...roofs,...canopies]){assert(Number.isFinite(r.lat)&&Number.isFinite(r.lon));for(const k of ['potential_kw','annual_generation_kwh','available_solar_m2'])assert(r[k]===null||(Number.isFinite(r[k])&&r[k]>=0))}
const html=fs.readFileSync('web/index.html','utf8');for(const match of html.matchAll(/(?:src|href)="([^"#?]+)"/g)){const s=match[1];if(!/^(https?:|\/)/.test(s))assert(fs.existsSync(path.join('web',s)),s)}
console.log(`Passed ${files.length} JSON/GeoJSON datasets, geographic coordinates, council filters, record uniqueness, evidence files and local page dependencies. Data provenance/age remain unchanged.`);
