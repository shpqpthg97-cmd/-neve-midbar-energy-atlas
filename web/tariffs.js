/* Official reference rates; applicability and site size must be verified. */
(function(root){
const sources={general:'https://www.iec.co.il/content/tariffs/contentpages/businesselectricitytariff',touz:'https://www.iec.co.il/content/tariffs/contentpages/taozb-namuch',solar:'https://www.gov.il/BlobFolder/policy/70103/he/Files_Hachlatot_70103.pdf',storage:'https://www.gov.il/BlobFolder/generalpage/tarriffbook/he/Files_netunei_hasmal_sefer_tariff_01_2026.pdf',system:'https://www.gov.il/BlobFolder/policy/78206/he/Files_Hachlatot_72608_reshumot.pdf'};
const rates={general:.5383,summer:{off:.4273,peak:1.4596,months:4},winter:{off:.3952,peak:.972,months:3},transition:{off:.388,peak:.4202,months:5}};
const valid=x=>x!==''&&x!=null&&Number.isFinite(Number(x))&&Number(x)>=0;
function weighted(key){return ['summer','winter','transition'].reduce((s,k)=>s+rates[k][key]*rates[k].months,0)/12}
function bandTotal(kw){let t=0,previous=0;for(const [end,rate]of [[15,.48],[100,.3731],[300,.3437],[630,.2844]]){t+=Math.max(0,Math.min(kw,end)-previous)*rate;previous=end}return t}
function feedIn(addedAc,priorAc){if(!valid(addedAc)||!valid(priorAc)||+addedAc<=0||+addedAc+(+priorAc)>630)return null;return (bandTotal(+addedAc+(+priorAc))-bandTotal(+priorAc))/addedAc}
function storagePeak(totalAc,base){if(!valid(totalAc)||+totalAc<=0||+totalAc>630||!valid(base))return null;const values=totalAc<=300?[1.3424,.932,.3721]:[1.2011,.8339,.3329];return (Math.max(base,values[0])*4+Math.max(base,values[1])*3+Math.max(base,values[2])*5)/12}
function storageRate(totalAc,base,peakKwh,termsConfirmed){const thresholdPassed=valid(totalAc)&&+totalAc>0&&peakKwh/totalAc>800;return {rate:termsConfirmed&&thresholdPassed?storagePeak(totalAc,base):base,thresholdPassed,bonusApplied:!!termsConfirmed&&thresholdPassed,peakPerKw:totalAc>0?peakKwh/totalAc:null}}
const api={sources,rates,weighted,feedIn,storagePeak,storageRate};root.EnergyTariffs=api;if(typeof module==='object')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
