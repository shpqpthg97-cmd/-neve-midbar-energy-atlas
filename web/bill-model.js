/* Annual comparison. All inputs on the same VAT basis, period and meter scope. */
(function(root){
const fields=['consumption','energyBefore','chargesBefore','chargesAfter','extraOpex'];
function summarize(rows){
 if(!rows.length||rows.some(r=>!r.result||r.result.missing))return {error:'scenario_incomplete'};
 const required=['directSavings','batterySavings','exportRevenue','pvOpex','batteryOpex'];
 if(rows.some(r=>required.some(k=>!Number.isFinite(r.result[k])||r.result[k]<0)||!Number.isFinite(r.result.storageRevenue??0)||(r.result.storageRevenue??0)<0))return {error:'scenario_incomplete'};
 const sum=k=>rows.reduce((n,r)=>n+(r.result[k]??0),0);
 const directSavings=sum('directSavings'),batterySavings=sum('batterySavings');
 const electricitySavings=directSavings+batterySavings,exportRevenue=sum('exportRevenue'),storageRevenue=sum('storageRevenue');
 const sales=exportRevenue+storageRevenue,opex=sum('pvOpex')+sum('batteryOpex'),gross=electricitySavings+sales;
 return {directSavings,batterySavings,electricitySavings,exportRevenue,storageRevenue,sales,opex,gross,net:gross-opex};
}
function compare(input,rows){
 const missing=fields.filter(k=>input[k]==null||input[k]===''||!Number.isFinite(Number(input[k]))||Number(input[k])<0);
 if(missing.length)return {missing};
 const summary=summarize(rows);if(summary.error)return summary;
 const sum=k=>rows.reduce((n,r)=>n+Number(r.result[k]||0),0);
 const consumed=sum('direct')+rows.reduce((n,r)=>n+(r.mode==='export'?0:r.result.discharge),0);
 const avoided=summary.electricitySavings;
 if(consumed>Number(input.consumption)+1e-6)return {error:'consumption_exceeded',consumed};
 if(avoided>Number(input.energyBefore)+1e-6)return {error:'energy_bill_exceeded',avoided};
 const before=Number(input.energyBefore)+Number(input.chargesBefore);
 const energyAfter=Math.max(0,Number(input.energyBefore)-avoided);
 const after=energyAfter+Number(input.chargesAfter);
 const reduction=before-after,sales=summary.sales;
 const opex=summary.opex+Number(input.extraOpex);
 return {before,after,energyAfter,reduction,avoided,sales,opex,benefit:reduction+sales-opex,consumed,gridKwhAfter:Number(input.consumption)-consumed};
}
const api={fields,summarize,compare};root.EnergyBill=api;if(typeof module==='object')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
