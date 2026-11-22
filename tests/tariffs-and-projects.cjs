const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../web/tariffs.js'),M=require('../web/energy-model.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
near(T.feedIn(15,0),.48);near(T.feedIn(100,0),(15*.48+85*.3731)/100);
near(T.feedIn(85,15),.3731);near(T.feedIn(200,100),.3437);near(T.feedIn(330,300),.2844);
assert.equal(T.feedIn(631,0),null);assert.equal(T.feedIn(10,625),null);assert.equal(T.feedIn(10,''),null);assert.equal(T.feedIn(0,0),null);
assert.equal(T.storageRate(100,.4,80000,true).bonusApplied,false);assert.equal(T.storageRate(100,.4,80001,true).bonusApplied,true);assert.equal(T.storageRate(100,.4,90000,false).rate,.4);
assert(T.storagePeak(100,.48)>=.48);assert.equal(T.storagePeak(700,.35),null);
near(T.weighted('peak'),(1.4596*4+.972*3+.4202*5)/12);assert(T.weighted('peak')<T.rates.summer.peak);
const a={realization:100,yield:1700,directShare:30,buy:.5,sell:.3,peak:1,batteryHours:4,dod:90,rte:90,cycles:300,powerRatio:1,chargeHours:4,dischargeHours:4,peakLoadYield:1500,pvCost:4000,batteryCost:1000,powerCost:500,extraCost:500,pvOm:1.5,batteryOm:1.5,wear:.05};
const assets=[{id:'edu:1',name:'roof',kw:41,annual:73390},{id:'canopy:1',name:'court',kw:73,annual:130670}];
const ctx={formFields:[],EnergyTariffs:T,EnergyModel:M,financeMarkup(){return ''},renderFinance(){},renderTerritory(){},territoryState:{assumptions:a},scopedCanopies:[{id:'1',parent_education_id:'1'}],linkedAssets:()=>assets,selectedAsset:()=>null};vm.createContext(ctx);vm.runInContext(fs.readFileSync('web/finance-official.js','utf8'),ctx);
let rows=vm.runInContext('rateInputs();scenarioRows()',ctx);near(rows[0].sellRate,T.feedIn(114/1.3,0));near(rows[0].sellRate,rows[1].sellRate);
rows=vm.runInContext("tariffState.mode='export';tariffState.terms=true;scenarioRows()",ctx);
near(rows[0].storageRate,rows[1].storageRate);for(const {result:r}of rows){assert.equal(r.batterySavings,0);near(r.net,r.directSavings+r.exportRevenue+r.storageRevenue-r.pvOpex-r.batteryOpex);near(r.generation,r.direct+r.exported+r.discharge+r.losses)}
const raw=JSON.parse(fs.readFileSync('web/energy/grid-checks.json')),edu=JSON.parse(fs.readFileSync('web/data.json')),roofs=JSON.parse(fs.readFileSync('web/energy/roofs.json')),checks=JSON.parse(fs.readFileSync('web/energy/roof-checks.json'));
assert.equal(new Set(raw.records.map(r=>r.asset_id)).size,raw.records.length);
for(const r of raw.records){if(r.status==='mapped'){assert(r.points.length);for(const p of r.points){assert.equal(p.status,'mapped');assert.equal(p.matches.length,1);assert(p.query_url.includes('geometry='));assert(p.query_url.includes('inSR=2039'))}}else assert(!r.ratings)}
for(const e of edu){const r=raw.records.find(r=>r.asset_id==='edu:'+e.SEMEL_MOSAD);assert(r);if(e.RAMAT_DIYUK_MIKUM==='נמוכה'&&!roofs.some(x=>x.education_id===e.SEMEL_MOSAD)&&!checks.some(x=>x.education_id===e.SEMEL_MOSAD&&x.x))assert.equal(r.status,'missing_precise_location')}
const najah=raw.records.find(r=>r.asset_id==='edu:611152');assert.deepEqual(najah.ratings.POTENTIALITY_TO_CONNECT_D_LV,['גבוהה מאוד']);assert.deepEqual(najah.ratings.POTENTIALITY_TO_CONNECT_D_MV,['נמוכה מאוד']);
console.log('Passed progressive rates/P0, strict storage threshold, seasonal weighting, shared-campus rate, no double-counted storage income, point provenance and missing-location tests.');
