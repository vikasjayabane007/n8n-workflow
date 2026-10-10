// Shared pure parsers, embedded in the n8n Code nodes by build_workflow.js.
function clean(v) {
  return String(v || '').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n))
    .replace(/\s+/g,' ').trim();
}
function bodyOf(response) {
  if (response.error) throw new Error(typeof response.error==='string'?response.error:JSON.stringify(response.error));
  if (response.statusCode && (response.statusCode<200 || response.statusCode>=300)) throw new Error('HTTP '+response.statusCode);
  // n8n Text responses use the configured output field (default: data),
  // even when Include Response Headers and Status is enabled.
  const b=response.body ?? (typeof response.data === 'string' ? response.data : response);
  if(typeof b==='string' && /^[\s]*[\[{]/.test(b)) return JSON.parse(b);
  return b;
}
function googleData(html) {
  for(const m of String(html).matchAll(/AF_initDataCallback\(\{key:[\s\S]*?data:([\s\S]*?), sideChannel:/g)) {
    let d;try{d=JSON.parse(m[1]);}catch{continue;}
    if(Array.isArray(d?.[0]) && Number.isFinite(d[2]) && Number.isFinite(d[3]) && (!d[0].length || (typeof d[0][0]?.[0]==='string' && Array.isArray(d[0][0]?.[9]))))return d;
  }
  throw new Error('Google search data not found; page format may have changed');
}
function listing(s,b) {
  let jobs,total;
  switch(s.ats) {
    case 'greenhouse':jobs=b.jobs;total=jobs?.length;break;
    case 'workday':jobs=b.jobPostings;total=b.total;break;
    case 'smartrecruiters':jobs=b.content;total=b.totalFound;break;
    case 'oracle':jobs=b.items?.[0]?.requisitionList;total=b.items?.[0]?.TotalJobsCount;break;
    case 'jibe':jobs=b.jobs?.map(j=>j.data);total=b.count;break;
    case 'amazon':if(b.error)throw new Error(String(b.error));jobs=b.jobs;total=b.hits;break;
    case 'bytedance':if(b.code!==0)throw new Error(b.message || 'Career API error');jobs=b.data?.job_post_list;total=b.data?.count;break;
    case 'adp':jobs=b.jobRequisitions;total=b.meta?.totalNumber;break;
    case 'ukg':jobs=b.opportunities;total=b.totalCount;break;
    case 'google': {const d=googleData(b);jobs=d[0];total=d[2];break;}
    case 'staples': {
      const html=String(b); jobs=[];
      for(const m of html.matchAll(/<a\b[^>]*href="([^"\s]+\/job\/[^"\s]+)"[^>]*data-job-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        jobs.push({id:m[2],url:'https://careers.staples.com'+m[1],title:clean(m[3].match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]),location:clean(m[3].match(/class="job-location"[^>]*>([\s\S]*?)<\/span>/)?.[1])});
      }
      const pages=Number(html.match(/class="pagination-current"[^>]*max="(\d+)"/)?.[1]);
      if(!jobs.length || !pages)throw new Error('Staples listing format changed or no verifiable pagination');
      total=pages*s.page_size;break;
    }
    case 'notice': {
      if(!/currently we don.t have any open positions/i.test(clean(b)))throw new Error('Careers page changed: review new openings and add an adapter');
      jobs=[];total=0;break;
    }
    default:throw new Error('Unsupported adapter '+s.ats);
  }
  if(!Array.isArray(jobs)||!Number.isFinite(Number(total))||Number(total)<0)throw new Error('Invalid listing schema for '+s.company);
  return {jobs,total:Number(total)};
}
function requestFor(s,page=0) {
  let url=s.api_url, body={}, method='GET';const offset=page*s.page_size;
  const add=(q)=>{url+=(url.includes('?')?'&':'?')+q;};
  switch(s.ats) {
    case 'workday':method='POST';body={limit:s.page_size,offset,searchText:'',appliedFacets:{}};break;
    case 'smartrecruiters':add('limit='+s.page_size+'&offset='+offset);break;
    case 'oracle':add('onlyData=true&expand=requisitionList&finder='+encodeURIComponent('findReqs;siteNumber='+s.site+',limit='+s.page_size+',offset='+offset));break;
    case 'jibe':add('page='+(page+1)+'&limit='+s.page_size);break;
    case 'amazon':add('offset='+offset+'&result_limit='+s.page_size+'&sort=recent');break;
    case 'bytedance':method='POST';body={keyword:'',limit:s.page_size,offset};break;
    case 'adp':add('$top='+s.page_size+'&$skip='+offset);break;
    case 'ukg':method='POST';body={opportunitySearch:{Top:s.page_size,Skip:offset,QueryString:'',OrderBy:[{Value:'postedDateDesc',PropertyName:'PostedDate',Ascending:false}]}};break;
    case 'google':add('page='+(page+1));break;
    case 'staples':add('p='+(page+1));break;
  }
  return {kind:'request',source:s,page,url,method,body,headers:{Accept:'application/json,text/html','User-Agent':'Mozilla/5.0',...(s.headers||{})}};
}
function normalize(s,j) {
  let id,title,location,url,description='',posted='',detail='',countries=[],locations=[];
  switch(s.ats) {
    case 'greenhouse':id=j.id;title=j.title;location=j.location?.name;url=j.absolute_url;description=j.content;posted=j.first_published||'';break;
    case 'workday':id=j.externalPath;title=j.title;location=j.locationsText;url=s.careers_url+j.externalPath;detail=s.api_url.replace(/\/jobs$/,'')+j.externalPath;break;
    case 'smartrecruiters':id=j.id;title=j.name;location=[j.location?.city,j.location?.region,j.location?.country].filter(Boolean).join(', ');countries=[j.location?.country];url='https://jobs.smartrecruiters.com/'+s.board+'/'+j.id;detail='https://api.smartrecruiters.com/v1/companies/'+s.board+'/postings/'+j.id;posted=j.releasedDate;break;
    case 'oracle':id=j.Id;title=j.Title;location=j.PrimaryLocation;countries=[j.PrimaryLocationCountry];url=s.careers_url+'/job/'+j.Id;detail=s.api_url.replace('recruitingCEJobRequisitions','recruitingCEJobRequisitionDetails')+'?onlyData=true&expand=all&finder='+encodeURIComponent('ById;Id='+j.Id+',siteNumber='+s.site);posted=j.PostedDate;break;
    case 'jibe':id=j.req_id||j.slug;title=j.title;location=[j.city,j.state,j.country].filter(Boolean).join(', ');countries=[j.country];url=j.apply_url||s.careers_url+'/'+j.slug;description=j.description;posted=j.create_date||'';break;
    case 'amazon':id=j.id_icims||j.id;title=j.title;location=j.location;countries=[j.country_code];url='https://www.amazon.jobs'+j.job_path;description=[j.description,j.basic_qualifications,j.preferred_qualifications].join('\n');posted=j.posted_date;break;
    case 'bytedance':id=j.id;title=j.title;{let p=j.city_info;const parts=[];while(p){parts.push(p.en_name||p.name);p=p.parent;}location=parts.join(', ');if(parts.length)countries=[parts[parts.length-1]];}url=s.careers_url+'/'+j.id;description=[j.description,j.requirement].join('\n');break;
    case 'adp':id=j.itemID;title=j.requisitionTitle;locations=(j.requisitionLocations||[]).map(l=>l.nameCode?.shortName||[l.address?.cityName,l.address?.countrySubdivisionLevel1?.codeValue,l.address?.countryCode].filter(Boolean).join(', '));location=locations.join('; ');posted=j.postDate;{const ext=j.customFieldGroup?.stringFields?.find(f=>f.nameCode?.codeValue==='ExternalJobID')?.stringValue;url=s.careers_url+'&jobId='+encodeURIComponent(ext||id);}detail=s.api_url.replace('/job-requisitions?','/job-requisitions/'+encodeURIComponent(id)+'?');break;
    case 'ukg':id=j.Id;title=j.Title;locations=(j.Locations||[]).map(l=>[l.Address?.City,l.Address?.State?.Name,l.Address?.Country?.Name].filter(Boolean).join(', '));countries=(j.Locations||[]).map(l=>l.Address?.Country?.Code);location=locations.join('; ');url=s.careers_url+'/OpportunityDetail?opportunityId='+id;detail=url;posted=j.PostedDate;break;
    case 'google':id=j[0];title=j[1];locations=(j[9]||[]).map(l=>l[0]);countries=(j[9]||[]).map(l=>l[5]);location=locations.join('; ');url=s.careers_url+id;description=[j[3]?.[1],j[4]?.[1],j[10]?.[1],j[15]?.[1]].filter(Boolean).join('\n');posted=j[12]?.[0]?new Date(j[12][0]*1000).toISOString():'';break;
    case 'staples':id=j.id;title=j.title;location=j.location;url=j.url;detail=url;break;
    default:throw new Error('No job parser for '+s.ats);
  }
  if(!id||!title||!/^https:\/\//.test(url||''))throw new Error('Job is missing its ID, title or HTTPS application URL');
  return {kind:'job',job_key:s.company+':'+s.ats+':'+id,company:s.company,ats:s.ats,job_title:title,location:location||'',locations:locations.length?locations:[location||''],country_codes:countries.filter(Boolean),apply_url:url,posted_date:posted||'',updated_at:j.updated_at||'',description:clean(description).slice(0,13000),detail_url:detail,first_seen:new Date().toISOString(),match_score:0,sponsorship_status:'not_specified',reason:'',notified:false};
}
function jsonLdJobs(html) {
  const found=[];
  function walk(x){if(!x||typeof x!=='object')return;if(x['@type']==='JobPosting'||x['@type']?.includes?.('JobPosting'))found.push(x);for(const v of Object.values(x))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);}
  for(const m of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]));}catch{}}
  return found;
}
function embeddedObject(html,marker) {
  const start=String(html).indexOf(marker);if(start<0)throw new Error('Embedded job detail not found');
  const text=String(html).slice(start+marker.length).trimStart();let depth=0,quoted=false,escaped=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(text.slice(0,i+1));}
  throw new Error('Incomplete embedded detail JSON');
}
function enrich(job,b) {
  let description='',posted=job.posted_date,location=job.location,locations=job.locations,countries=job.country_codes;
  switch(job.ats){
    case 'workday':{const d=b.jobPostingInfo;if(!d?.jobDescription)throw new Error('Workday detail missing description');description=d.jobDescription;posted=d.startDate||posted;locations=[d.location,...(d.additionalLocations||[])].filter(Boolean);location=locations.join('; ');countries=[typeof d.country==='object'?(d.country.descriptor||d.country.id):d.country].filter(Boolean);break;}
    case 'smartrecruiters':{const d=b.jobAd?.sections;if(!d)throw new Error('SmartRecruiters detail missing jobAd');description=Object.values(d).map(x=>x.text||'').join('\n');break;}
    case 'oracle':{const d=b.items?.[0];if(!d)throw new Error('Oracle detail missing item');description=[d.ExternalDescriptionStr,d.ExternalQualificationsStr,d.ExternalResponsibilitiesStr].filter(Boolean).join('\n');break;}
    case 'adp':description=b.requisitionDescription||b.requisitionDescriptionText||b.jobDescription||'';if(typeof description==='object')description=description.formattedDescription||description.textValue||'';break;
    case 'ukg':{const d=embeddedObject(b,'new US.Opportunity.CandidateOpportunityDetail(');description=d.Description;posted=d.PostedDate||posted;break;}
    case 'staples':{const d=jsonLdJobs(b)[0];if(!d)throw new Error('JobPosting structured description not found');description=d.description;posted=d.datePosted||posted;break;}
    default:throw new Error('Unsupported job details '+job.ats);
  }
  description=clean(description);if(!description)throw new Error('Empty full job description');
  return {...job,description:description.slice(0,13000),location,locations,country_codes:countries,posted_date:posted,detail_url:''};
}
