/* Pure, shared calculations. Source estimates are never measured production. */
(function (root) {
  'use strict';
  const fields = ['roof_area_m2', 'available_solar_m2', 'potential_kw', 'annual_generation_kwh', 'existing_panels_m2'];
  const towns = {'1375':'אבו תלול','1342':'אבו קרינאת','1347':'קסר א-סר','1348':'ביר הדאג׳'};
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  function metric(rows, key) {
    const known = rows.filter(row => number(row[key]));
    return {value:known.length ? known.reduce((sum,row)=>sum+row[key],0) : null, known:known.length, total:rows.length, complete:rows.length>0 && known.length===rows.length};
  }
  const metrics = rows => Object.fromEntries(fields.map(key=>[key,metric(rows,key)]));
  const ratio = (a,b,multiplier=1) => a.complete && b.complete && b.value>0 ? multiplier*a.value/b.value : null;
  function unique(rows) {
    const byId = new Map(), conflicts = new Set(); let duplicates=0;
    for(const row of rows) {
      if(!row?.id) continue;
      if(byId.has(row.id)) { duplicates++; if(JSON.stringify(byId.get(row.id))!==JSON.stringify(row)) conflicts.add(row.id); }
      else byId.set(row.id,row);
    }
    return {rows:[...byId.values()].filter(row=>!conflicts.has(row.id)),duplicates,conflicts:[...conflicts]};
  }
  function location(school, rows) {
    const normalized = rows.map(row=>{
      if(towns[row.locality_code]) return towns[row.locality_code];
      const s=String(row.locality||'').trim().replace(/[׳']/g,'');
      if(s==='ביר הדאג')return towns['1348'];
      if(/^(קסר|קצר) א.?סר$/.test(s))return towns['1347'];
      if(s==='אבו קרינאת'||s==='אבו קורינאת')return towns['1342'];
      if(s==='אבו תלול')return towns['1375'];
      return row.locality?.trim() || towns[school.SEMEL_ISHUV_PNIM] || school.ISV_SHEM_ISHUV || 'ללא שיוך';
    });
    const names=[...new Set(normalized)];
    return names.length===1 ? names[0] : 'שיוך מרחבי לבירור';
  }
  function sourceGap(row) {
    return number(row.potential_kw) && row.potential_kw>0 && number(row.annual_generation_kwh) && number(row.solar_hours_kwh_per_kw_year) && Math.abs(row.potential_kw*row.solar_hours_kwh_per_kw_year-row.annual_generation_kwh)>.5;
  }
  const zero = row => !!row.quality_flag || (row.potential_kw===0 && row.annual_generation_kwh===0);
  function build(education, roofs, canopies=[]) {
    const schools=education.filter(row=>row.TEUR_TAT_SUG_MISGERET==='בית ספר'&&row.SHEM_RASHUT==='נווה מדבר');
    const schoolMap=new Map(schools.map(row=>[String(row.SEMEL_MOSAD),row]));
    const roofUnique=unique(roofs),canopyUnique=unique(canopies);
    const eligible=roofUnique.rows.filter(row=>schoolMap.has(String(row.education_id)));
    const ids=new Set(eligible.map(row=>String(row.education_id)));
    const related=canopyUnique.rows.filter(row=>ids.has(String(row.parent_education_id)));
    const rows=[...ids].map(id=>{
      const school=schoolMap.get(id), rr=eligible.filter(row=>String(row.education_id)===id), cc=related.filter(row=>String(row.parent_education_id)===id), m=metrics(rr);
      return {id,name:school.SHEM_MOSAD,town:location(school,rr),administrativeTown:school.ISV_SHEM_ISHUV,school,roofs:rr,canopies:cc,metrics:m,
        annual:m.annual_generation_kwh.value,kw:m.potential_kw.value,
        availableRatio:ratio(m.available_solar_m2,m.roof_area_m2,100),specificYield:ratio(m.annual_generation_kwh,m.potential_kw),
        zeroCount:rr.filter(zero).length,sourceGapCount:rr.filter(sourceGap).length,
        missingPanelCount:rr.filter(row=>!number(row.existing_panels_m2)).length,
        coreIncomplete:fields.slice(0,4).some(key=>!m[key].complete),
        sourceYears:[...new Set(rr.map(row=>row.source_year).filter(Boolean))].sort(),
        dates:[...new Set(rr.map(row=>row.retrieved_at).filter(Boolean))].sort()};
    });
    return {rows,schoolCount:schoolMap.size,missingSchoolCount:schoolMap.size-rows.length,
      duplicates:roofUnique.duplicates,conflicts:roofUnique.conflicts,
      excluded:roofUnique.rows.length-eligible.length,canopyConflicts:canopyUnique.conflicts};
  }
  function select(rows, filters={}) {
    const query=String(filters.query||'').trim().toLocaleLowerCase('he');
    const chosen=rows.filter(row=>(!filters.town||row.town===filters.town)&&(!query||`${row.name} ${row.id} ${row.town} ${row.administrativeTown}`.toLocaleLowerCase('he').includes(query))&&
      (!filters.focus||filters.focus==='all'||(filters.focus==='zero'&&row.zeroCount>0)||(filters.focus==='canopies'&&row.canopies.length>0)||(filters.focus==='panels'&&row.missingPanelCount>0)));
    const key={annual:'annual',capacity:'kw',roofs:'roofs'}[filters.sort||'annual'];
    return chosen.sort((a,b)=>{
      if(filters.sort==='name')return a.name.localeCompare(b.name,'he');
      const av=key==='roofs'?a.roofs.length:a[key],bv=key==='roofs'?b.roofs.length:b[key];
      return (bv??-1)-(av??-1)||a.name.localeCompare(b.name,'he');
    });
  }
  function summarize(rows, topCount=3) {
    const roofs=rows.flatMap(row=>row.roofs),canopies=rows.flatMap(row=>row.canopies), m=metrics(roofs);
    const ranked=[...rows].sort((a,b)=>(b.annual??-1)-(a.annual??-1)||a.name.localeCompare(b.name,'he'));
    const limit=Math.max(0,Math.min(ranked.length,Math.trunc(Number(topCount)||0)));
    const top=ranked.slice(0,limit),tm=metrics(top.flatMap(row=>row.roofs));
    const groups=[...new Set(rows.map(row=>row.town))].map(town=>{const group=rows.filter(row=>row.town===town),g=metrics(group.flatMap(row=>row.roofs));return {town,schools:group.length,roofCount:group.reduce((s,row)=>s+row.roofs.length,0),metrics:g,share:ratio(g.annual_generation_kwh,m.annual_generation_kwh,100)};}).sort((a,b)=>(b.metrics.annual_generation_kwh.value??-1)-(a.metrics.annual_generation_kwh.value??-1));
    return {schoolCount:rows.length,roofCount:roofs.length,metrics:m,ranked,groups,top,topMetrics:tm,topShare:ratio(tm.annual_generation_kwh,m.annual_generation_kwh,100),
      specificYield:ratio(m.annual_generation_kwh,m.potential_kw),availableRatio:ratio(m.available_solar_m2,m.roof_area_m2,100),
      canopyCount:canopies.length,canopySchools:rows.filter(row=>row.canopies.length).length,canopyKw:metric(canopies,'potential_kw'),canopyAnnual:metric(canopies,'annual_generation_kwh'),
      zeroCount:roofs.filter(zero).length,sourceGapCount:roofs.filter(sourceGap).length,missingPanelCount:roofs.filter(row=>!number(row.existing_panels_m2)).length,
      dates:[...new Set(roofs.map(row=>row.retrieved_at).filter(Boolean))].sort(),years:[...new Set(roofs.map(row=>row.source_year).filter(Boolean))].sort()};
  }
  function csv(rows) {
    const headers=['סמל מוסד','שם מוסד','יישוב במפת הגגות','יישוב במאגר החינוך','גגות משויכים','שטח גגות מ״ר','שטח מתאים מ״ר','פוטנציאל kW','אומדן ייצור קוט״ש לשנה','תפוקה מחושבת קוט״ש לשנה ל-kW','אחוז שטח מתאים','גגות בערכי אפס לבירור','גגות ללא שטח לוחות קיימים','גגות עם פער במדדי המקור','קירויים נלווים (בנפרד)','הספק קירויים kW (בנפרד)','שנות מקור','תאריכי שליפה','שלמות מדדי הליבה','מגבלות'];
    const cell=value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const body=rows.map(row=>[row.id,row.name,row.town,row.administrativeTown,row.roofs.length,row.metrics.roof_area_m2.value,row.metrics.available_solar_m2.value,row.kw,row.annual,row.specificYield,row.availableRatio,row.zeroCount,row.missingPanelCount,row.sourceGapCount,row.canopies.length,metric(row.canopies,'potential_kw').value,row.sourceYears.join(' | '),row.dates.join(' | '),row.coreIncomplete?'סכום חלקי — יש ערכים חסרים':'הערכים קיימים בגגות ששויכו','כיסוי גגות חלקי; אומדן מקור ולא מדידה או אישור. זכויות, חיבור, צריכה ומצב מתקן דורשים אימות.']);
    return '\ufeff'+[headers,...body].map(row=>row.map(cell).join(',')).join('\r\n');
  }
  const api={build,select,summarize,metric,ratio,csv,sourceGap};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NMSchoolEnergy=api;
})(typeof globalThis==='undefined'?this:globalThis);
