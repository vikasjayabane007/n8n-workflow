import pathlib,re,json
root=pathlib.Path(__file__).parent
cfg=[]
for name in ['TikTok','ByteDance']:
 s=(root/'research'/f'{name}.txt').read_text(encoding='utf-8')
 for i,u in enumerate(dict.fromkeys(re.findall(r'<script[^>]+src="([^"]+)"',s))):
  if '/chunks/' in u:cfg.append([f'{name}-js-{i}',u,None])
s=(root/'research'/'LG-search.txt').read_text(encoding='utf-8')
print('LG scripts', re.findall(r'<script[^>]+src=[\"\x27]([^\"\x27]+)',s))
cfg += [['nbkc-api','https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions?cid=7fda5c87-512f-4538-a009-52effd9fc43c&ccId=19000101_000001&lang=en_US&$top=500',None],['EverBank-jobs','https://myjobs.adp.com/everbank/cx',None]]
(root/'probe4.json').write_text(json.dumps(cfg),encoding='utf-8')
