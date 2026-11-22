import fs from 'node:fs';
export function projectCatalog(){
 const read=f=>JSON.parse(fs.readFileSync('web/'+f));const edu=read('data.json'),sports=read('sports.json'),roofs=read('energy/roofs.json'),canopies=read('energy/canopies.json');const codes=['1375','1342','1347','1348'];
 function sportCode(s){const t=[s['ישוב'],s['שכונה-רובע']].filter(Boolean).join(' ');if(/אבו תלול/.test(t))return '1375';if(/אבו (קו?רינאת|קרינאת)/.test(t))return '1342';if(/(?:קצר|קסר) א.?סר/.test(t))return '1347';if(/ביר הדאג/.test(t))return '1348';return 'unassigned'}
 const a=edu.map(r=>({id:'edu:'+r.SEMEL_MOSAD,key:'edu:'+r.SEMEL_MOSAD,name:r.SHEM_MOSAD,code:codes.includes(r.SEMEL_ISHUV_PNIM)?r.SEMEL_ISHUV_PNIM:roofs.find(x=>x.education_id===r.SEMEL_MOSAD)?.locality_code||'unassigned',locality:r.ISV_SHEM_ISHUV,kind:r.TEUR_TAT_SUG_MISGERET,group:'education'}));
 for(const r of sports.filter(r=>r['בעלי המתקן']==='נווה מדבר')){const c=canopies.find(c=>c.sport_id===r['מספר זיהוי']),id='sport:'+r['מספר זיהוי'];a.push({id,key:c?'canopy:'+c.id:id,name:r['שם המתקן']+(r['משרת בית ספר']?' — '+r['משרת בית ספר']:''),code:c?.locality_code||sportCode(r),locality:r['ישוב']||r['שכונה-רובע']||'לא נמסר',kind:r['סוג מתקן'],group:'sport'});if(r['חניה לרכבים']==='כן')a.push({id:'parking:'+r['מספר זיהוי'],key:'parking:'+r['מספר זיהוי'],name:'חניה נלווית — '+r['שם המתקן'],code:sportCode(r),locality:r['ישוב']||r['שכונה-רובע']||'לא נמסר',kind:'חניה מדווחת — נדרש אימות נפרד',group:'parking'})}
 for(const c of canopies)a.push({id:'canopy:'+c.id,key:'canopy:'+c.id,name:c.name,code:c.locality_code,locality:c.locality,kind:c.type==='parking'?'קירוי חניה':'קירוי מגרש',group:c.type==='parking'?'parking':'canopy'});
 return a;
}
