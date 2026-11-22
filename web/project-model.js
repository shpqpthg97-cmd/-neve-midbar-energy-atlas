(function(root){
 const stages=[['location','זיהוי ומדידה'],['rights','זכויות ומתחם'],['bills','חשמל וצריכה'],['existing','מתקנים והסכמים'],['surface','גג / קירוי'],['grid','בדיקת חיבור'],['permit','תכנון ובטיחות'],['business','כדאיות'],['procurement','תקציב והתקשרות'],['delivery','מסירה וניטור']];
 const riskIds=['rights','surface','grid','supply','fire','planning','economics','procurement','operations','grant'];
 const taskStates={not_started:'טרם התחיל',in_progress:'בטיפול',blocked:'חסום',done:'הושלם בדיווח'};
 const riskStates={not_checked:'טרם נבדק',monitoring:'במעקב',blocking:'חסם פעיל',resolved:'טופל',not_applicable:'לא רלוונטי'};
 const technologies={solar:'סולארי',storage:'אגירת אנרגיה',combined:'סולארי ואגירה',canopy:'קירוי סולארי'};
 const statuses={active:'פעיל',paused:'בהשהיה',completed:'הסתיים בדיווח'};
 function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
 function progress(p,date=today()){
  const tasks=p.payload?.tasks||{},risks=p.payload?.risks||{},done=stages.filter(([id])=>tasks[id]?.state==='done').length;
  const next=stages.find(([id])=>tasks[id]?.state!=='done');
  return{done,total:stages.length,percent:Math.round(done/stages.length*100),stage:next?.[1]||'מסירה הושלמה בדיווח',stageId:next?.[0]||'complete',blockedTasks:stages.filter(([id])=>tasks[id]?.state==='blocked').length,blockers:riskIds.filter(id=>risks[id]?.state==='blocking').length,unchecked:riskIds.filter(id=>!risks[id]||risks[id].state==='not_checked').length,late:p.status!=='completed'&&!!p.target_date&&p.target_date<date,lateTasks:stages.filter(([id])=>tasks[id]?.due&&tasks[id].due<date&&tasks[id].state!=='done').length};
 }
 function metrics(projects,date=today()){const rows=projects.map(p=>({p,m:progress(p,date)})),live=rows.filter(r=>r.p.status!=='completed');return{total:rows.length,active:rows.filter(r=>r.p.status==='active').length,paused:rows.filter(r=>r.p.status==='paused').length,completed:rows.filter(r=>r.p.status==='completed').length,late:live.filter(r=>r.m.late).length,blockers:live.reduce((n,r)=>n+r.m.blockers+r.m.blockedTasks,0),blockedProjects:live.filter(r=>r.m.blockers+r.m.blockedTasks>0).length,done:rows.reduce((n,r)=>n+r.m.done,0),tasks:rows.length*stages.length,percent:rows.length?Math.round(rows.reduce((n,r)=>n+r.m.done,0)/(rows.length*stages.length)*100):null}}
 root.NMProjects={stages,riskIds,taskStates,riskStates,technologies,statuses,today,progress,metrics};
})(globalThis);
