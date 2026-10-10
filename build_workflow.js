const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const original=JSON.parse(fs.readFileSync('original-workflow.json','utf8'));
const w=structuredClone(original),lib=fs.readFileSync('adapters.js','utf8');
const sourceCode=w.nodes.find(n=>n.name==='Company sources').parameters.jsCode;
const sources=vm.runInNewContext(sourceCode.replace(/return sources[\s\S]*$/,'sources;')).map(s=>({company:s.company,ats:'pending',enabled:false,api_url:'',careers_url:'',page_size:100,status:'needs_adapter',notes:''}));
function set(name,data){Object.assign(sources.find(s=>s.company===name),data);}
function enable(name,data){set(name,{enabled:true,status:'live_listing_verified',verified_on:'2026-10-09',...data});}
for(const [company,token] of [['Lyft','lyft'],['DoorDash','doordashusa'],['Databricks','databricks'],['Figma','figma'],['Affirm','affirm'],['Cloudflare','cloudflare'],['LG','lgelectronics']])enable(company,{ats:'greenhouse',api_url:`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,careers_url:`https://job-boards.greenhouse.io/${token}`,fixture:company==='LG'?'LG-greenhouse':token});
const wd=[['Optiv','optiv.wd5','optiv','Optiv_Careers'],['Jabil','jabil.wd5','jabil','Jabil_Careers'],['Highmark','highmarkhealth.wd1','highmarkhealth','highmark'],['Humana','humana.wd5','humana','Humana_External_Career_Site'],['U-Haul','uhaul.wd1','uhaul','UhaulJobs'],['Epiq','epiqsystems.wd503','epiqsystems','Epiq_Careers'],['Samsung','sec.wd3','sec','Samsung_Careers'],['Topgolf','topgolf.wd501','topgolf','TopgolfCareers'],['Amcor','amcor.wd5','amcor','Amcor_External_Career_Site'],['Thermo Fisher Scientific','thermofisher.wd5','thermofisher','ThermoFisherCareers'],["Saint Luke's",'saintlukes.wd1','saintlukes','saintlukeshealthcareers'],['Freddie Mac','freddiemac.wd5','freddiemac','External']];
for(const [company,host,tenant,site] of wd)enable(company,{ats:'workday',api_url:`https://${host}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,careers_url:`https://${host}.myworkdayjobs.com/en-US/${site}`,page_size:20,fixture:company==="Saint Luke's"?'SaintLukes':company==='Freddie Mac'?'Freddie-api':company,notes:'Full detail retrieval enabled. Some Workday boards cap search results at 2,000; coverage report flags this.'});
enable('AbbVie',{ats:'smartrecruiters',board:'AbbVie',api_url:'https://api.smartrecruiters.com/v1/companies/AbbVie/postings',careers_url:'https://careers.abbvie.com/',fixture:'AbbVie'});
for(const [company,host,site] of [['BNY','eofe','BNY-Careers'],['CBIZ','ebez','CX_1']])enable(company,{ats:'oracle',site,api_url:`https://${host}.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions`,careers_url:`https://${host}.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/${site}`,page_size:25,fixture:company+'-api'});
enable('BJC HealthCare',{ats:'jibe',api_url:'https://jobs.bjc.org/api/jobs',careers_url:'https://jobs.bjc.org/jobs',fixture:'BJC-api'});
enable('Amazon',{ats:'amazon',api_url:'https://www.amazon.jobs/en/search.json',careers_url:'https://www.amazon.jobs',fixture:'Amazon',notes:'Public search reports at most 10,000 results. Coverage report flags possible cap; newest jobs are fetched first.'});
for(const [company,host,path,career] of [['TikTok','api.lifeattiktok.com','tiktok','lifeattiktok.com'],['ByteDance','jobs.bytedance.com','en','joinbytedance.com']])enable(company,{ats:'bytedance',api_url:`https://${host}/api/v1/public/supplier/search/job/posts`,careers_url:`https://${career}/search`,headers:{'website-path':path,'Accept-Language':'en-US',Origin:`https://${career}`},fixture:company+'-api'});
const adpQuery='cid=7fda5c87-512f-4538-a009-52effd9fc43c&ccId=19000101_000001&lang=en_US';
enable('nbkc bank',{ats:'adp',api_url:'https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions?'+adpQuery,careers_url:'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?'+adpQuery,fixture:'nbkc-api',detail_fixture:'nbkc-detail'});
const ukg='https://psionline.rec.pro.ukg.net/PSI1500PSIL/JobBoard/287b933d-50bd-4acb-b709-75def54bf55f';
enable('PSI Services',{ats:'ukg',api_url:ukg+'/JobBoardView/LoadSearchResults',careers_url:ukg,page_size:50,fixture:'PSI-api',detail_fixture:'PSI-detail'});
enable('Google',{ats:'google',api_url:'https://www.google.com/about/careers/applications/jobs/results/',careers_url:'https://www.google.com/about/careers/applications/jobs/results/',page_size:20,fixture:'Google',notes:'Public search HTML data parser; schema changes surface as errors.'});
enable('Staples',{ats:'staples',api_url:'https://careers.staples.com/en/search-jobs',careers_url:'https://careers.staples.com',page_size:15,fixture:'Staples',detail_fixture:'Staples-detail'});
enable('Godrej',{ats:'notice',api_url:'https://www.godrejamericas.com/careers.html',careers_url:'https://www.godrejamericas.com/careers.html',fixture:'Godrej',status:'no_open_positions_notice',notes:'US scope: Godrej Americas. Monitors the explicit no-open-positions notice; any change requires review, not automatic job extraction.'});
set('FMA Logistics',{status:'needs_company_website',notes:'User will provide the website. Do not substitute a different logistics employer.'});
set('Sterling Bank & Trust',{careers_url:'https://www.everbank.com/about/careers',status:'successor_adapter_pending',notes:'Acquired by EverBank April 1, 2025. Current careers portal https://myjobs.adp.com/everbank/cx uses ADP Recruiting Management; its adapter is not yet verified.'});
set('Meta',{careers_url:'https://www.metacareers.com/jobsearch/',status:'custom_adapter_pending',notes:'Career page verified; browser-rendered job search has no validated collector in this export.'});
set('Whirlpool',{careers_url:'https://jobs.whirlpool.com/careers',status:'endpoint_blocked',notes:'Eightfold public careers endpoint returned HTTP 403 during verification. Needs a supported feed or compatible collector.'});
for (const company of ['FMA Logistics', 'Sterling Bank & Trust', 'Meta', 'Whirlpool']) {
  const source = sources.find(s => s.company === company);
  Object.assign(source, { enabled: false, ats: 'excluded', status: 'excluded_by_user', notes: 'Intentionally excluded at the user’s request on October 9, 2026. No setup action required.' });
}
fs.writeFileSync('company-sources.json',JSON.stringify(sources,null,2)+'\n');
function node(name){return w.nodes.find(n=>n.name===name);}
function add(name,type,parameters,position){const n={id:crypto.randomUUID(),name,type:'n8n-nodes-base.'+type,typeVersion:type==='code'?2:type==='httpRequest'?4.2:type==='merge'?3.2:type==='stickyNote'?1:2.2,parameters,position};w.nodes.push(n);return n;}
function code(name,js,position,shared=false){return add(name,'code',{jsCode:(shared?lib+'\n':'')+js},position);}
function connect(from,to,index=0,output=0){w.connections[from]??={main:[]};w.connections[from].main[output]??=[];w.connections[from].main[output].push({node:to,type:'main',index});}
function reset(from){w.connections[from]={main:[]};}
function http(name,position,detail=false){const n=add(name,'httpRequest',{method:detail?'GET':'={{ $json.method }}',url:detail?'={{ $json.detail_url }}':'={{ $json.url }}',sendHeaders:true,specifyHeaders:'json',jsonHeaders:detail?'={{ JSON.stringify({Accept:"application/json,text/html", "User-Agent":"Mozilla/5.0"}) }}':'={{ JSON.stringify($json.headers) }}',...(!detail?{sendBody:'={{ $json.method === "POST" }}',contentType:'json',specifyBody:'json',jsonBody:'={{ JSON.stringify($json.body) }}'}:{}),options:{timeout:30000,batching:{batch:{batchSize:4,batchInterval:250}},response:{response:{responseFormat:'text',outputPropertyName:'body',fullResponse:true,neverError:true}}}},position);n.onError='continueRegularOutput';n.retryOnFail=true;n.maxTries=3;n.waitBetweenTries=2000;return n;}
node('Company sources').parameters.jsCode='// Every company remains visible, including sources that still need setup.\nconst sources = '+JSON.stringify(sources,null,2)+';\nreturn sources.map(source=>({json:source}));';
node('Company sources').position=[-1000,-400];
const removed=new Set(['Fetch careers API','Normalize ATS jobs','HTTP Request','Code in JavaScript','HTTP Request1','temp count']);
w.nodes=w.nodes.filter(n=>!removed.has(n.name));for(const name of removed)delete w.connections[name];
for(const c of Object.values(w.connections))for(const output of c.main||[])for(let i=output.length-1;i>=0;i--)if(removed.has(output[i].node))output.splice(i,1);
reset('Company sources');
code('Enabled source requests',`return $input.all().flatMap((item,i)=>item.json.enabled?[{json:requestFor(item.json),pairedItem:{item:i}}]:[]);`,[-760,-400],true);
connect('Company sources','Enabled source requests');
code('Source setup report',`return $input.all().map((item,i)=>({json:{company:item.json.company,status:item.json.status,enabled:item.json.enabled,careers_url:item.json.careers_url,notes:item.json.notes},pairedItem:{item:i}}));`,[-760,-100]);connect('Company sources','Source setup report');
http('Fetch first source pages',[-520,-400]);connect('Enabled source requests','Fetch first source pages');
code('Plan source pages',`const out=[];\nfor(let i=0;i<$input.all().length;i++){\n const s=$('Enabled source requests').itemMatching(i).json.source;\n try{const data=listing(s,bodyOf($input.all()[i].json));const pageSize=data.jobs.length||s.page_size;\n const pages=Math.max(1,Math.ceil(data.total/pageSize));\n if(pages>500)throw new Error('Source exceeds 500-page guard: '+pages+' pages; refine source before enabling');\n out.push({json:{kind:'plan_status',company:s.company,status:'planned',total:data.total,pages,warning:s.ats==='workday'&&data.total>=2000?'Workday may cap results at 2000':s.ats==='amazon'&&data.total>=10000?'Amazon may cap results at 10000':''},pairedItem:{item:i}});\n for(let page=0;page<pages;page++)out.push({json:{...requestFor({...s,page_size:pageSize},page),expected_total:data.total,expected_pages:pages},pairedItem:{item:i}});\n }catch(e){out.push({json:{kind:'plan_status',company:s.company,status:'error',error:e.message},pairedItem:{item:i}});}\n}\nreturn out;`,[-280,-400],true);connect('Fetch first source pages','Plan source pages');
code('First page failures',`return $input.all().filter(x=>x.json.kind==='plan_status');`,[-40,-100]);connect('Plan source pages','First page failures');
code('Page requests',`return $input.all().flatMap((x,i)=>x.json.kind==='request'?[{json:x.json,pairedItem:{item:i}}]:[]);`,[-40,-400]);connect('Plan source pages','Page requests');
http('Fetch all source pages',[200,-400]);connect('Page requests','Fetch all source pages');
code('Normalize company pages',`const out=[];\nfor(let i=0;i<$input.all().length;i++){const req=$('Page requests').itemMatching(i).json;const s=req.source;\n try{const data=listing(s,bodyOf($input.all()[i].json));let malformed=0;\n for(const j of data.jobs){try{out.push({json:normalize(s,j),pairedItem:{item:i}});}catch(e){malformed++;}}\n out.push({json:{kind:'page_status',company:s.company,page:req.page,status:malformed?'partial':'ok',jobs:data.jobs.length,malformed,expected_pages:req.expected_pages,expected_total:req.expected_total},pairedItem:{item:i}});\n }catch(e){out.push({json:{kind:'page_status',company:s.company,page:req.page,status:'error',error:e.message,expected_pages:req.expected_pages},pairedItem:{item:i}});}\n}\nreturn out;`,[440,-400],true);connect('Fetch all source pages','Normalize company pages');
code('Source coverage report',`const records=$input.all().map(x=>x.json);const plans=$('Plan source pages').all().map(x=>x.json).filter(x=>x.kind==='plan_status');\nreturn $('Company sources').all().map(({json:s})=>{const plan=plans.find(p=>p.company===s.company);const pages=records.filter(p=>p.kind==='page_status'&&p.company===s.company);const jobs=records.filter(p=>p.kind==='job'&&p.company===s.company);const unique=new Set(jobs.map(j=>j.job_key)).size;const errors=pages.filter(p=>p.status!=='ok');let status=!s.enabled?s.status:plan?.status==='error'?'error':errors.length?'partial':pages.length!==(plan?.pages||0)?'partial':plan?.warning?'partial':unique<(plan?.total||0)&&!['staples','notice'].includes(s.ats)?'partial':'ok';\nreturn {json:{company:s.company,status,enabled:s.enabled,pages_expected:plan?.pages||0,pages_received:pages.length,unique_jobs:unique,reported_total:plan?.total??null,warning:plan?.warning||'',errors:[plan?.error,...errors.map(e=>e.error||'Malformed job records')].filter(Boolean),careers_url:s.careers_url,notes:s.notes}};});`,[680,-100]);connect('Normalize company pages','Source coverage report');
// Apply title rules before detail requests; location checks run after full details.
const originalFilter=node('Title & US prefilter').parameters.jsCode;
code('Engineering title candidates',`const seen=new Set();\nconst items=$input.all().flatMap((x,i)=>{if(x.json.kind!=='job'||seen.has(x.json.job_key))return [];seen.add(x.json.job_key);return [{json:x.json,pairedItem:{item:i}}];});\n`+originalFilter.replace('const jobs = $input.all();','const jobs = items;').replace('    isUSLocation(location)','    true'),[680,-400]);connect('Normalize company pages','Engineering title candidates');
code('Description batch',`const jobs=$input.all().map(x=>x.json);return [{json:{kind:'description_batch',jobs,needs_detail:jobs.some(j=>Boolean(j.detail_url))}}];`,[920,-400]);connect('Engineering title candidates','Description batch');
add('Needs full description','if',{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:crypto.randomUUID(),leftValue:'={{ $json.needs_detail }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},[1160,-400]);connect('Description batch','Needs full description');
code('Description requests',`return $input.first().json.jobs.filter(j=>j.detail_url).map(j=>({json:j,pairedItem:{item:0}}));`,[1400,-480]);connect('Needs full description','Description requests',0,0);
http('Fetch full descriptions',[1640,-480],true);connect('Description requests','Fetch full descriptions');
code('Enrich full descriptions',`return $input.all().map((item,i)=>{const job=$('Description requests').itemMatching(i).json;try{return {json:enrich(job,bodyOf(item.json)),pairedItem:{item:i}};}catch(e){return {json:{kind:'detail_error',company:job.company,job_key:job.job_key,apply_url:job.apply_url,error:e.message},pairedItem:{item:i}};}});`,[1880,-480],true);connect('Fetch full descriptions','Enrich full descriptions');
code('Description failures',`return $input.all().filter(x=>x.json.kind==='detail_error');`,[1640,-160]);connect('Enrich full descriptions','Description failures');
code('Combine complete descriptions',`const ready=$('Description batch').first().json.jobs.filter(j=>!j.detail_url);const enriched=$input.all().map(x=>x.json).filter(j=>j.kind==='job');return [...ready,...enriched].map(json=>({json}));`,[2120,-400]);connect('Needs full description','Combine complete descriptions',0,1);connect('Enrich full descriptions','Combine complete descriptions');
node('Title & US prefilter').parameters.jsCode=originalFilter.replace('const jobs = $input.all();',`const jobs = $input.all().filter(x=>x.json.kind==='job' && x.json.description);`).replace('    isUSLocation(location)',`    (Array.isArray(job.country_codes) && job.country_codes.some(c=>/^(US|USA|United States(?: of America)?)$/i.test(c)) || (job.locations||[location]).some(isUSLocation))`);
connect('Combine complete descriptions','Title & US prefilter');node('Title & US prefilter').position=[2360,-400];
// Keep the existing Children's Mercy branch, scoring, email, and tables.
node('Every 30 minutes').position=[-1240,-640];node('Merge').position=[2120,-580];
for(const n of w.nodes)if(['Only unseen IDs','Gemini eligibility scoring','Parse AI decisions','Keep qualified jobs','Build Email Digest','Gmail new-job alert','Prepare saved record','Save notified job','Keep rejected jobs','Upsert row(s)'].includes(n.name))n.position=[n.position[0]+1240,n.position[1]];
add('Coverage and setup notes','stickyNote',{content:'## Expanded company monitoring\n35 companies retained. See Source setup report and Source coverage report.\n30 job collectors + Godrej Americas no-open-positions check.\nExcluded by request: FMA Logistics, Sterling/EverBank, Meta, Whirlpool. No setup action required.\nFull descriptions are fetched before scoring. Failed descriptions are excluded and reported.\nPublic endpoint checks and local parser tests are complete; run manually in n8n before enabling.\nWorkday/Amazon may cap search results; see coverage warnings.',height:330,width:620},[-1000,-1030]);
// Use a fresh table consistently; never carry an instance-specific table ID into the export.
for (const n of w.nodes) if (n.type === 'n8n-nodes-base.dataTable') {
  n.parameters.dataTableId = {__rl:true, mode:'name', value:'monitored_jobs_expanded'};
}
// Isolate raw listing responses in a sequential, embedded page sub-workflow.
// Only title candidates and compact coverage records return to the parent.
const pageHttp=structuredClone(node('Fetch all source pages'));
pageHttp.name='Fetch one page';pageHttp.position=[260,0];
const normalizePage=node('Normalize company pages').parameters.jsCode.replace("$('Page requests').itemMatching(i)","$('Page input').itemMatching(i)");
const filterPage=node('Engineering title candidates').parameters.jsCode;
const compactPage=normalizePage.replace('return out;',`const statuses=out.filter(x=>x.json.kind==='page_status');
for(const item of statuses)item.json.job_keys=out.filter(x=>x.json.kind==='job' && x.pairedItem.item===item.pairedItem.item).map(x=>x.json.job_key);
const candidates=(function($input){${filterPage}})({all:()=>out});
for(const item of candidates)item.pairedItem=out.find(x=>x.json.kind==='job' && x.json.job_key===item.json.job_key).pairedItem;
return [...statuses,...candidates];`);
const worker={name:'Fetch and filter one source page',active:false,nodes:[
 {id:crypto.randomUUID(),name:'Page input',type:'n8n-nodes-base.executeWorkflowTrigger',typeVersion:1,parameters:{},position:[0,0]},
 pageHttp,
 {id:crypto.randomUUID(),name:'Return candidates and coverage',type:'n8n-nodes-base.code',typeVersion:2,parameters:{jsCode:compactPage},position:[520,0]}
],connections:{'Page input':{main:[[{node:'Fetch one page',type:'main',index:0}]]},'Fetch one page':{main:[[{node:'Return candidates and coverage',type:'main',index:0}]]}},settings:{executionOrder:'v1',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false,saveExecutionProgress:false}};
const pageExecutor=node('Fetch all source pages');
pageExecutor.type='n8n-nodes-base.executeWorkflow';pageExecutor.typeVersion=1.3;
pageExecutor.parameters={source:'parameter',workflowJson:JSON.stringify(worker),mode:'once',options:{waitForSubWorkflow:true}};
delete pageExecutor.retryOnFail;delete pageExecutor.maxTries;delete pageExecutor.waitBetweenTries;
delete pageExecutor.onError;
const pageLoop=add('Loop source pages','splitInBatches',{batchSize:4,options:{reset:false}},[180,-620]);
pageLoop.typeVersion=3;
reset('Page requests');connect('Page requests','Loop source pages');
// v3 output 0 is done; output 1 is loop. Normalize errors before returning
// each worker result so the done output contains only compact job/status data.
connect('Loop source pages','Fetch all source pages',0,1);
reset('Normalize company pages');connect('Normalize company pages','Loop source pages');
connect('Loop source pages','Source coverage report',0,0);
connect('Loop source pages','Engineering title candidates',0,0);
node('Normalize company pages').parameters.jsCode=`return $input.all().map((item,i)=>{
 if(item.json.kind)return {json:item.json,pairedItem:{item:i}};
 const req=$('Page requests').itemMatching(i).json;
 return {json:{kind:'page_status',company:req.source.company,page:req.page,status:'error',error:String(item.json.error||'Page worker failed'),expected_pages:req.expected_pages},pairedItem:{item:i}};
});`;
node('Source coverage report').parameters.jsCode=node('Source coverage report').parameters.jsCode.replace('new Set(jobs.map(j=>j.job_key)).size','new Set(pages.flatMap(p=>p.job_keys||[])).size');
// Fetch and parse descriptions inside bounded child executions as well.
const detailHttp=structuredClone(node('Fetch full descriptions'));
detailHttp.name='Fetch description batch';detailHttp.position=[260,0];
detailHttp.parameters.options.batching.batch.batchSize=2;
const detailCode=node('Enrich full descriptions').parameters.jsCode.replace("$('Description requests').itemMatching(i)","$('Description input').itemMatching(i)");
const detailWorker={name:'Fetch and parse description batch',active:false,nodes:[
 {id:crypto.randomUUID(),name:'Description input',type:'n8n-nodes-base.executeWorkflowTrigger',typeVersion:1,parameters:{},position:[0,0]},
 detailHttp,
 {id:crypto.randomUUID(),name:'Parse description batch',type:'n8n-nodes-base.code',typeVersion:2,parameters:{jsCode:detailCode},position:[520,0]}
],connections:{'Description input':{main:[[{node:'Fetch description batch',type:'main',index:0}]]},'Fetch description batch':{main:[[{node:'Parse description batch',type:'main',index:0}]]}},settings:structuredClone(worker.settings)};
const detailExecutor=node('Fetch full descriptions');
detailExecutor.type='n8n-nodes-base.executeWorkflow';detailExecutor.typeVersion=1.3;
detailExecutor.parameters={source:'parameter',workflowJson:JSON.stringify(detailWorker),mode:'once',options:{waitForSubWorkflow:true}};
for(const key of ['retryOnFail','maxTries','waitBetweenTries','onError'])delete detailExecutor[key];
const detailLoop=add('Loop description batches','splitInBatches',{batchSize:2,options:{reset:false}},[1420,-700]);detailLoop.typeVersion=3;
reset('Description requests');connect('Description requests','Loop description batches');
connect('Loop description batches','Fetch full descriptions',0,1);
node('Enrich full descriptions').parameters.jsCode='return $input.all(); // Parsing occurs inside the description worker.';
reset('Enrich full descriptions');connect('Enrich full descriptions','Loop description batches');
connect('Loop description batches','Description failures',0,0);
connect('Loop description batches','Combine complete descriptions',0,0);
node('Coverage and setup notes').parameters.content+='\nListing batches: 4 pages. Description batches: 2 jobs. Embedded workers return parsed results only. Worker crashes stop execution; ordinary HTTP failures remain diagnostic records. No second import required.';
w.name='US Engineering Job Monitor — 30 Minutes (expanded company sources)';w.active=false;delete w.id;delete w.versionId;delete w.meta;w.pinData={};w.settings.timezone='America/Chicago';
fs.writeFileSync('US Engineering Job Monitor - expanded company sources.json',JSON.stringify(w,null,2)+'\n');
console.log(JSON.stringify({companies:sources.length,jobCollectors:sources.filter(s=>s.enabled&&s.ats!=='notice').length,noticeChecks:sources.filter(s=>s.ats==='notice').length,excluded:sources.filter(s=>!s.enabled).map(s=>s.company),nodes:w.nodes.length}));
