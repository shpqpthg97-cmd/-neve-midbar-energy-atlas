const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('web/energy.js','utf8').split('let energySummary=')[0],ctx);
const roofs=JSON.parse(fs.readFileSync('web/energy/roofs.json')),ids=new Set(JSON.parse(fs.readFileSync('web/data.json')).map(r=>r.SEMEL_MOSAD));
assert.equal(new Set(roofs.map(r=>r.id)).size,roofs.length);for(const r of roofs){assert(ids.has(r.education_id));assert(fs.existsSync('web/'+r.institution_match.evidence));assert(Number.isFinite(r.lon)&&Number.isFinite(r.lat));}
const q=ctx.institutionRoofEnergy(roofs,'648220');assert.equal(q.potential_kw,113);assert.equal(q.annual_generation_kwh,202270);assert.equal(q.roof_area_m2,2130);assert.equal(q.existing_panels_m2,498);
const birIds=['648287','618876','630087'];const bir=birIds.map(id=>ctx.institutionRoofEnergy(roofs,id));assert.equal(bir.reduce((v,r)=>v+r.potential_kw,0),325);assert.equal(bir.reduce((v,r)=>v+r.annual_generation_kwh,0),578825);
assert.equal(ctx.institutionRoofEnergy(roofs,'682633'),null);assert.equal(ctx.roofTotals([{potential_kw:1,annual_generation_kwh:null}]).annual_generation_kwh,null);
assert.equal(ctx.institutionRoofEnergy(roofs,'618819').potential_kw,90);
assert.equal(ctx.institutionRoofEnergy(roofs,'618355').potential_kw,57);
assert.equal(ctx.institutionRoofEnergy(roofs,'618355').annual_generation_kwh,102030);
assert.equal(ctx.institutionRoofEnergy(roofs,'600007').existing_panels_m2,null);
const canopies=JSON.parse(fs.readFileSync('web/energy/canopies.json'));
const parking=canopies.find(r=>r.id==='alnajah-school-parking');assert.equal(parking.type,'parking');assert.equal(parking.parent_education_id,'611152');assert.equal(parking.potential_kw,25);
assert.equal(ctx.institutionRoofEnergy(roofs,'611152').potential_kw,46); // Parking is a separate energy record.
for(const r of canopies){assert(ids.has(r.parent_education_id));assert(fs.existsSync('web/'+r.evidence));}
const primary=roofs.find(r=>r.education_id==='618728');
assert(Math.abs(primary.lon-34.983892605685206)<1e-7);assert(Math.abs(primary.lat-31.08097820087426)<1e-7); // Datum regression.
const checks=JSON.parse(fs.readFileSync('web/energy/roof-checks.json')),linked=new Set(roofs.map(r=>r.education_id));
assert.equal(new Set(checks.map(r=>r.education_id)).size,checks.length);
for(const c of checks){assert(ids.has(c.education_id));assert(!linked.has(c.education_id));if(c.evidence)assert(fs.existsSync('web/'+c.evidence));}
for(const r of JSON.parse(fs.readFileSync('web/data.json')).filter(r=>r.TEUR_TAT_SUG_MISGERET==='בית ספר'))assert(linked.has(r.SEMEL_MOSAD)||checks.some(c=>c.education_id===r.SEMEL_MOSAD));
console.log('Passed institution joins, evidence, school coverage, roof/parking separation, multi-roof sums, missing values and map datum regression.');
