import concurrent.futures, json, pathlib, urllib.request, urllib.error, sys
ROOT=pathlib.Path(__file__).parent
def probe(s):
    name,url,body=s[:3]
    try:
        req=urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers={'User-Agent':'Mozilla/5.0','Accept':'application/json,text/html','Content-Type':'application/json', **(s[3] if len(s)>3 else {})})
        with urllib.request.urlopen(req,timeout=35) as r:
            data=r.read().decode('utf-8','replace')
            (ROOT/'research'/f'{name}.txt').write_text(data,encoding='utf-8')
            try:
                j=json.loads(data); summary={k:(len(v) if isinstance(v,list) else v) for k,v in j.items() if k in ['total','totalFound','jobs','jobPostings','content','positions','count']}
            except Exception: summary={'length':len(data)}
            return {'name':name,'url':r.url,'status':r.status,'summary':summary}
    except Exception as e: return {'name':name,'url':url,'error':str(e)}
if __name__=='__main__':
    (ROOT/'research').mkdir(exist_ok=True)
    sources=json.loads((ROOT/(sys.argv[1] if len(sys.argv)>1 else 'probe-config.json')).read_text(encoding='utf-8'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(probe,sources))
    (ROOT/('results-'+(sys.argv[1] if len(sys.argv)>1 else 'probe-config.json'))).write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(results,indent=2))
