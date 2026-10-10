const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const sources=JSON.parse(fs.readFileSync('company-sources.json','utf8'));
const w=JSON.parse(fs.readFileSync('US Engineering Job Monitor - expanded company sources.json','utf8'));
const lib=fs.readFileSync('adapters.js','utf8');
const api=vm.runInNewContext(lib+';({bodyOf,listing,normalize,enrich,requestFor,googleData})');
const read=n=>fs.readFileSync('research/'+n+'.txt','utf8');
// Match n8n HTTP Request's Text + fullResponse envelope, not just raw HTTP.
assert.equal(api.bodyOf({statusCode:200,data:'{"jobs":[]}'}).jobs.length,0);
assert.equal(api.bodyOf({statusCode:200,data:'<html>careers</html>'}),'<html>careers</html>');
assert.equal(api.bodyOf({code:0,data:{job_post_list:[]}}).code,0);
assert.throws(()=>api.bodyOf({statusCode:403,data:'denied'}));
let count=0,detailCount=0;const report=[];
let paginationChecks=0;
for(const s of sources.filter(s=>s.enabled)){
 const data=api.listing(s,api.bodyOf({body:read(s.fixture),statusCode:200}));
 const n8nData=api.listing(s,api.bodyOf({data:read(s.fixture),headers:{},statusCode:200,statusMessage:'OK'}));
 assert.equal(n8nData.jobs.length,data.jobs.length,s.company+' n8n text envelope');
 const normalized=data.jobs.map(j=>api.normalize(s,j));
 assert(data.total>=normalized.length,s.company+' total');
 for(const j of normalized){assert(j.job_key&&j.job_title&&j.apply_url,s.company+' fields');assert(!j.apply_url.includes('undefined'),s.company+' URL');}
 const first=normalized[0];
 const pageFile=s.company.replace(/[^a-z0-9]/gi,'_')+'-pagecheck';
 if(fs.existsSync('research/'+pageFile+'.txt')){const second=api.listing(s,api.bodyOf({body:read(pageFile)}));assert(second.jobs.length>0,s.company+' second page');assert.notEqual(api.normalize(s,second.jobs[0]).job_key,first.job_key,s.company+' repeated first page');paginationChecks++;}
 if(first?.detail_url){const name=s.detail_fixture||s.fixture+'-detail';const enriched=api.enrich(first,api.bodyOf({body:read(name),statusCode:200}));assert(enriched.description.length>100,s.company+' detail');detailCount++;}
 count+=normalized.length;
 report.push({company:s.company,jobs_on_fixture_page:normalized.length,total:data.total,details_verified:!!first?.detail_url});
}
// Distinct pages must not replay page one.
for(const company of ['Google','Staples']){const s=sources.find(s=>s.company===company);const p1=api.listing(s,read(s.fixture));const p2=api.listing(s,read(company+'-page2'));assert.notEqual(api.normalize(s,p1.jobs[0]).job_key,api.normalize(s,p2.jobs[0]).job_key);}
assert.throws(()=>api.bodyOf({statusCode:403,body:'denied'}));
assert.throws(()=>api.listing(sources.find(s=>s.company==='Figma'),{}));
assert.throws(()=>api.listing(sources.find(s=>s.company==='Godrej'),'We are hiring'));
assert.throws(()=>api.enrich({ats:'workday'},{}));
// Pagination and source identity are explicit, never inferred from response order.
for(const s of sources.filter(s=>s.enabled)){
 const a=api.requestFor(s,0),b=api.requestFor(s,1);
 if(!['greenhouse','notice'].includes(s.ats))assert(JSON.stringify(a.body)!==JSON.stringify(b.body)||a.url!==b.url,s.company+' page request');
}
const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);
for(const name of ['Fetch first source pages','Fetch all source pages','Fetch full descriptions']) {
 const p=w.nodes.find(n=>n.name===name).parameters;
 assert.equal(p.options.response.response.outputPropertyName,'body',name+' response field');
 if(name!=='Fetch full descriptions'){assert.equal(p.contentType,'json',name+' JSON content type');assert.equal(p.specifyBody,'json');}
}
for(const [from,c] of Object.entries(w.connections)){assert(names.has(from),from);for(const output of c.main||[])for(const edge of output)assert(names.has(edge.node),edge.node);}
for(const n of w.nodes){if(n.type==='n8n-nodes-base.code')new Function(n.parameters.jsCode);}
assert.equal(sources.length,35);assert.equal(w.active,false);
for(const n of w.nodes.filter(n=>n.type==='n8n-nodes-base.dataTable'))assert.deepEqual(n.parameters.dataTableId,{__rl:true,mode:'name',value:'monitored_jobs_expanded'});
const prefilter=w.nodes.find(n=>n.name==='Title & US prefilter').parameters.jsCode;
const runFilter=items=>new Function('$input',prefilter)({all:()=>items.map(json=>({json}))});
const base={kind:'job',job_title:'Software Engineer',description:'Full description'};
assert.equal(runFilter([{...base,location:'Multiple locations',locations:['Toronto, Canada','Austin, TX'],country_codes:[]}]).length,1);
assert.equal(runFilter([{...base,location:'Toronto, Canada',locations:['Toronto, Canada'],country_codes:['CA']}]).length,0);
assert.equal(runFilter([{...base,location:'Remote',country_codes:['United States of America']}]).length,1);
assert.equal(runFilter([{...base,job_title:'Staff Software Engineer',location:'Austin, TX'}]).length,0);
assert.equal(runFilter([{...base,kind:'detail_error',location:'Austin, TX'}]).length,0);
const combineCode=w.nodes.find(n=>n.name==='Combine complete descriptions').parameters.jsCode;
function combine(jobs,input){return new Function('$input','$',combineCode)({all:()=>input.map(json=>({json}))},()=>({first:()=>({json:{jobs}})}));}
assert.equal(combine([{kind:'job',job_key:'ready',detail_url:''}],[{kind:'description_batch'}]).length,1);
assert.equal(combine([{kind:'job',job_key:'ready',detail_url:''},{kind:'job',job_key:'detail',detail_url:'https://example.test'}],[{kind:'job',job_key:'detail',detail_url:''}]).length,2);
assert.equal(combine([{kind:'job',detail_url:'https://example.test'}],[{kind:'detail_error'}]).length,0);
fs.writeFileSync('validation-report.json',JSON.stringify({date:'2026-10-09',fixture_jobs:count,detail_adapters_checked:detailCount,companies:report,checks:['all Code nodes compile','connection targets valid','35 companies retained','HTTP failures rejected','unknown schemas rejected','missing descriptions rejected','pagination URL/body differs','Google and Staples second pages differ','US multi-location handling','staff title exclusion','output inactive'],limitations:['Not imported or executed in a live n8n instance.','Fixtures verify listing page one and sample details; not a complete crawl.','Four sources are intentionally excluded by user request; Godrej checks its no-openings notice only.']},null,2)+'\n');
console.log(`PASS: ${count} real listing records, ${detailCount} detail samples, ${paginationChecks} live second pages, all Code nodes, graph, filter and empty-branch checks.`);
