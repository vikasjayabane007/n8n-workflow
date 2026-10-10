const fs=require('fs'),vm=require('vm');
const a=vm.runInNewContext(fs.readFileSync('adapters.js','utf8')+';({requestFor,bodyOf,listing,normalize})');
const ss=JSON.parse(fs.readFileSync('company-sources.json','utf8')),checks=[];
for(const s of ss.filter(s=>s.enabled)){
 const data=a.listing(s,a.bodyOf({body:fs.readFileSync('research/'+s.fixture+'.txt','utf8')}));
 if(data.total>data.jobs.length){const req=a.requestFor({...s,page_size:data.jobs.length},1);checks.push([s.company.replace(/[^a-z0-9]/gi,'_')+'-pagecheck',req.url,req.method==='POST'?req.body:null,req.headers]);}
 if(['TikTok','ByteDance','Google','BJC HealthCare'].includes(s.company)){const j=a.normalize(s,data.jobs[0]);checks.push([s.company.replace(/[^a-z0-9]/gi,'_')+'-applycheck',j.apply_url,null]);}
}
fs.writeFileSync('pagination-checks.json',JSON.stringify(checks,null,2));
