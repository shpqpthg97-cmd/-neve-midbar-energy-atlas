const assert=require('node:assert/strict');
const {compare}=require('../web/bill-model.js');
const inputs={consumption:200000,energyBefore:100000,chargesBefore:5000,chargesAfter:7000,extraOpex:1000};
const rows=[{mode:'self',result:{direct:50000,discharge:10000,directSavings:30000,batterySavings:10000,exportRevenue:6000,storageRevenue:0,pvOpex:2000,batteryOpex:3000}}];
let b=compare(inputs,rows);assert.equal(b.before,105000);assert.equal(b.after,67000);assert.equal(b.reduction,38000);assert.equal(b.benefit,38000);assert.equal(b.gridKwhAfter,140000);
// Constant charges cancel; remaining bill is never subtracted twice.
assert.equal(compare({...inputs,chargesAfter:5000},rows).benefit,40000);
assert.equal(compare({...inputs,energyBefore:200000},rows).benefit,b.benefit);
assert.ok(compare({...inputs,energyBefore:''},rows).missing.includes('energyBefore'));
assert.equal(compare({...inputs,consumption:500},rows).error,'consumption_exceeded');
assert.equal(compare({...inputs,energyBefore:1000},rows).error,'energy_bill_exceeded');
assert.equal(compare(inputs,[]).error,'scenario_incomplete');
assert.equal(compare(inputs,[{result:{missing:['cost']}}]).error,'scenario_incomplete');
const ex=[{mode:'export',result:{...rows[0].result,batterySavings:0,storageRevenue:9000}}];
b=compare(inputs,ex);assert.equal(b.gridKwhAfter,150000);assert.equal(b.sales,15000);assert.equal(b.benefit,37000);
assert.equal(compare({...inputs,energyBefore:40000,chargesBefore:0,chargesAfter:0,extraOpex:0},rows).after,0);
console.log('Annual bill comparison: invariants, missing values, demand limits and export separation passed');

const {summarize}=require('../web/bill-model.js');
// Self-consumption and export are separate benefits; neither is added twice.
let summary=summarize(rows);assert.equal(summary.electricitySavings,40000);assert.equal(summary.sales,6000);assert.equal(summary.opex,5000);assert.equal(summary.gross,46000);assert.equal(summary.net,41000);
assert.equal(compare({...inputs,chargesAfter:inputs.chargesBefore,extraOpex:0},rows).benefit,summary.net);
summary=summarize(ex);assert.equal(summary.electricitySavings,30000);assert.equal(summary.sales,15000);assert.equal(summary.net,40000);assert.equal(summary.batterySavings,0);
const doubled=summarize([...rows,...rows]);assert.equal(doubled.net,82000);assert.equal(doubled.electricitySavings,80000);
assert.equal(summarize([]).error,'scenario_incomplete');assert.equal(summarize([{result:{missing:['buy']}}]).error,'scenario_incomplete');assert.equal(summarize([{result:{...rows[0].result,directSavings:NaN}}]).error,'scenario_incomplete');
console.log('Visible benefit summary: consumption savings, export/storage sales, scope totals and no double-counting passed');
