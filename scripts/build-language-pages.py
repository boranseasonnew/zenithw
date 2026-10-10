"""Render reviewed, site-owned translations as crawlable static language pages."""
from pathlib import Path
from html.parser import HTMLParser
import html,json,re,time
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
FRONTEND=ROOT/'frontend'
CONFIG=json.loads((ROOT/'shared/site-config.json').read_text(encoding='utf-8'))
ORIGIN=CONFIG['origin']
LANGUAGES=['tr','en','de','fr','ru','vi','zh','ja']
CATALOGS={lang:json.loads((FRONTEND/f'locales/{lang}.json').read_text(encoding='utf-8')) for lang in LANGUAGES}
HTML_LANG=lambda lang:'zh-CN' if lang=='zh' else lang
LOCALES={'tr':'tr_TR','en':'en_US','de':'de_DE','fr':'fr_FR','ru':'ru_RU','vi':'vi_VN','zh':'zh_CN','ja':'ja_JP'}
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
BLOCKED={'script','style','svg','code','pre'}
def write(path,content):
    if path.exists() and path.read_text(encoding='utf-8')==content:return
    path.parent.mkdir(parents=True,exist_ok=True)
    for attempt in range(20):
        try:path.write_text(content,encoding='utf-8',newline='\n');break
        except OSError:
            if attempt==19:raise
            time.sleep(.1)
def translate(value,lang):
    key=value.strip()
    english=CATALOGS['en'].get(key,key) if lang!='tr' else key
    result=CATALOGS[lang].get(english,CATALOGS[lang].get(key))
    return value if result is None else value[:len(value)-len(value.lstrip())]+result+value[len(value.rstrip()):]
def markup_key(value):
    value=re.sub(r'\sdata-l10n="[^"]*"','',value)
    value=re.sub(r'href="/(?:en/|de/|fr/|ru/|vi/|zh/|ja/)?downloads#(android|windows)"',lambda m:'href="/'+('app' if m[1]=='android' else 'pc-app')+'"',value)
    value=re.sub(r'(href="/(?:app|pc-app))\.html(?=")',r'\1',value)
    return html.unescape(value).strip()
MARKUP_CATALOGS={lang:{markup_key(key):(key,value) for key,value in catalog.items() if '<a ' in key and key==key.strip()} for lang,catalog in CATALOGS.items()}
def language_path(route,lang):
    return route if lang=='tr' else '/'+lang+('/' if route=='/' else route)
def route_for(path):
    name=path.relative_to(FRONTEND).as_posix()
    return '/'+re.sub(r'\.html$','',re.sub(r'(^|/)index\.html$',r'\1',name))
class Translation(HTMLParser):
    def __init__(self,source,lang):
        super().__init__(convert_charrefs=True);self.source=source;self.lang=lang;self.stack=[];self.nodes=[];self.patches=[]
        self.offsets=[0]
        for line in source.splitlines(keepends=True):self.offsets.append(self.offsets[-1]+len(line))
    def position(self):
        line,col=self.getpos();return self.offsets[line-1]+col
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);raw=self.get_starttag_text();start=self.position()
        node={'tag':tag,'start':start,'raw':raw,'inner':start+len(raw),'blocked':tag in BLOCKED or any(n['blocked'] for n in self.stack),'fields':json.loads(a.get('data-l10n','{}')),'children':0}
        if self.stack:self.stack[-1]['children']+=1
        if not node['blocked']:
            for key in ['alt','title','placeholder','aria-label','content']:
                if key not in a:continue
                original=node['fields'].get(key,a[key]);value=translate(original,self.lang)
                if value!=a[key]:
                    raw=re.sub(r'(\b'+re.escape(key)+r'\s*=\s*)"[^"]*"',lambda m:m[1]+'"'+html.escape(value,quote=True)+'"',raw,count=1)
            if 'lang' in a and tag!='html':raw=re.sub(r'\blang="[^"]*"','lang="'+HTML_LANG(self.lang)+'"',raw)
        if raw!=node['raw']:self.patches.append((start,start+len(node['raw']),raw))
        self.nodes.append(node)
        if tag not in VOID:self.stack.append(node)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_endtag(self,tag):
        for index in range(len(self.stack)-1,-1,-1):
            if self.stack[index]['tag']==tag:
                node=self.stack[index];node['end']=self.position();self.stack=self.stack[:index];break
    def handle_data(self,value):
        if not self.stack:return
        node=self.stack[-1];key='text:'+str(node['children']);node['children']+=1
        if node['blocked']:return
        original=node['fields'].get(key,value);translated=translate(original,self.lang)
        if translated==value:return
        start=self.position();end=self.source.find('<',start)
        if end<0:end=len(self.source)
        self.patches.append((start,end,html.escape(translated,quote=False)))
    def handle_comment(self,value):
        if self.stack:self.stack[-1]['children']+=1
    def result(self):
        # Match reviewed whole paragraphs despite source link normalization or l10n annotations.
        groups=[]
        for node in self.nodes:
            if node['blocked'] or 'end' not in node or node['tag'] not in ['p','li','small']:continue
            inner=self.source[node['inner']:node['end']]
            original=node['fields'].get('html',inner)
            match=MARKUP_CATALOGS[self.lang].get(markup_key(original))
            if match:groups.append((node['inner'],node['end'],translate(match[0],self.lang),node,match[0]))
        groups.sort(key=lambda patch:(patch[0],-patch[1]));selected=[]
        for patch in groups:
            if not any(a<=patch[0] and b>=patch[1] for a,b,*_ in selected):selected.append(patch)
        patches=[p for p in self.patches if not any(a<=p[0] and b>=p[1] for a,b,*_ in selected)]
        for start,end,translated,node,key in selected:
            patches.append((start,end,translated))
            raw=re.sub(r'\sdata-l10n="[^"]*"','',node['raw'])
            fields={k:v for k,v in node['fields'].items() if not k.startswith('text:')};fields['html']=key
            close=raw.rfind('>');raw=raw[:close]+' data-l10n="'+html.escape(json.dumps(fields,ensure_ascii=False,separators=(',',':')),quote=True)+'"'+raw[close:]
            patches=[p for p in patches if p[0]!=node['start']]
            patches.append((node['start'],node['start']+len(node['raw']),raw))
        result=self.source
        for start,end,value in sorted(patches,reverse=True):result=result[:start]+value+result[end:]
        return result

def body_text(value):return html.unescape(re.sub(r'<[^>]+>','',value)).strip()
def metadata(source,route,lang):
    path=language_path(route,lang);canonical=ORIGIN+path
    source=re.sub(r'<html\b[^>]*>',f'<html lang="{HTML_LANG(lang)}" data-static-language="{lang}" data-localized-route="{route}">',source,count=1)
    title=body_text(re.search(r'<title[^>]*>(.*?)</title>',source,re.S)[1])
    description=html.unescape(re.search(r'<meta\b[^>]*name="description"[^>]*content="([^"]*)"',source)[1])
    heading=body_text(re.search(r'<h1[^>]*>(.*?)</h1>',source,re.S)[1])
    if route=='/downloads':
        title=translate('Download ZenithW',lang)+' | Windows & Android'
        description=translate('Your downloader. Your platform. Your choice.',lang)+f" Windows {CONFIG['windows']['version']} · Android {CONFIG['android']['version']}"
    elif route.startswith('/updates'):
        version=re.search(r'id="updBadge"[^>]*>(.*?)</span>',source,re.S)
        post=re.search(r'id="updPostTitle"[^>]*>(.*?)</h2>',source,re.S)
        intro=re.search(r'id="updIntro"[^>]*>\s*<p[^>]*>(.*?)</p>',source,re.S)
        if version and post:
            title=body_text(version[1])+' — '+body_text(post[1])+' — ZenithW'
            description=(title+'. '+body_text(intro[1]))[:220] if intro else title
    head_end=source.index('</head>');head=source[:head_end]
    head=re.sub(r'(<title\b[^>]*>).*?(</title>)',lambda m:re.sub(r'\sdata-l10n="[^"]*"','',m[1])+html.escape(title)+m[2],head,flags=re.S)
    head=re.sub(r'<meta\b[^>]*name="description"[^>]*>',lambda m:re.sub(r'\bcontent="[^"]*"','content="'+html.escape(description,quote=True)+'"',re.sub(r'\sdata-l10n="[^"]*"','',m[0])),head)
    head=re.sub(r'\s*<!-- generated SEO metadata -->.*?<!-- end generated SEO metadata -->','',head,flags=re.S)
    head=re.sub(r'\s*<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>','',head)
    head=re.sub(r'\s*<meta\s+(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>','',head)
    head=re.sub(r'\s*<script\s+type="application/ld\+json">.*?</script>','',head,flags=re.S)
    alternates='\n'.join(f'<link rel="alternate" hreflang="{HTML_LANG(other)}" href="{ORIGIN+language_path(route,other)}">' for other in LANGUAGES)
    alternates+=f'\n<link rel="alternate" hreflang="x-default" href="{ORIGIN+route}">'
    org={'@type':'Organization','@id':ORIGIN+'/#organization','name':'ZenithW','url':ORIGIN+'/','logo':ORIGIN+'/zenithw.png','sameAs':['https://github.com/boranseasonnew/zenithw','https://www.instagram.com/zenithwonline/']+([CONFIG['telegram']] if CONFIG['telegram'] else [])}
    website={'@type':'WebSite','@id':ORIGIN+'/#website','name':'ZenithW','url':ORIGIN+'/','inLanguage':[HTML_LANG(l) for l in LANGUAGES],'publisher':{'@id':org['@id']}}
    page={'@type':'TechArticle' if route.startswith('/guides/') else 'WebPage','@id':canonical+'#webpage','name':title,'description':description,'url':canonical,'inLanguage':HTML_LANG(lang),'isPartOf':{'@id':website['@id']}}
    if route.startswith('/guides/'):page['headline']=heading
    graph=[org,website,page]
    if route!='/':graph.append({'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':translate('Home',lang),'item':ORIGIN+language_path('/',lang)},{'@type':'ListItem','position':2,'name':heading,'item':canonical}]})
    if route=='/downloads':
        for platform in ['windows','android']:
            graph.append({'@type':'SoftwareApplication','@id':canonical+'#'+platform+'-app','name':'ZenithW '+platform.title(),'url':canonical+'#'+platform,'operatingSystem':CONFIG[platform]['requirements'],'softwareVersion':CONFIG[platform]['version'],'applicationCategory':'MultimediaApplication','isAccessibleForFree':True,'offers':{'@type':'Offer','price':'0','priceCurrency':'USD'},'publisher':{'@id':org['@id']}})
    elif route in ['/','/convert','/remux']:
        graph.append({'@type':'WebApplication','name':'ZenithW','url':canonical,'operatingSystem':'Web browser','applicationCategory':'MultimediaApplication','isAccessibleForFree':True,'offers':{'@type':'Offer','price':'0','priceCurrency':'USD'}})
    data=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    seo=f'\n<!-- generated SEO metadata -->\n<link rel="canonical" href="{canonical}">\n{alternates}\n'
    for key,value in [('og:type','article' if route.startswith('/guides/') else 'website'),('og:title',title),('og:description',description),('og:url',canonical),('og:site_name','ZenithW'),('og:locale',LOCALES[lang]),('og:image',ORIGIN+'/zenithw.png'),('og:image:alt','ZenithW')]:seo+=f'<meta property="{key}" content="{html.escape(value,quote=True)}">\n'
    for key,value in [('twitter:card','summary'),('twitter:title',title),('twitter:description',description),('twitter:image',ORIGIN+'/zenithw.png')]:seo+=f'<meta name="{key}" content="{html.escape(value,quote=True)}">\n'
    seo+=f'<script type="application/ld+json">{data}</script>\n<!-- end generated SEO metadata -->\n'
    return head.rstrip()+seo+source[head_end:]

# Legal terms are intentionally excluded until their translations receive a legal review.
BASE_ROUTES=['/','/downloads','/about','/about/community','/about/credit','/support','/updates','/guides','/convert','/remux']
sources={}
for route in BASE_ROUTES:
    path=FRONTEND/('index.html' if route=='/' else route[1:]+'.html');sources[route]=path.read_text(encoding='utf-8')
for path in (FRONTEND/'guides').glob('*.html'):sources[route_for(path)]=path.read_text(encoding='utf-8')
for path in (FRONTEND/'updates').glob('*/index.html'):
    text=path.read_text(encoding='utf-8');canonical=re.search(r'rel="canonical"\s+href="([^"]+)"',text)
    if canonical and urlsplit(canonical[1]).path==route_for(path):sources[route_for(path)]=text
routes=set(sources)
for route in list(sources):
    if route.startswith('/guides'):
        english=FRONTEND/('en'+route+'.html')
        if english.exists():sources[route]=english.read_text(encoding='utf-8')

def navigation(source,lang):
    def replace(match):
        attr,value=match[1],html.unescape(match[2])
        if value.startswith(('https:','http:','data:','blob:','//','#','mailto:','javascript:')):return match[0]
        # Asset URLs must be rooted on pages below a language prefix.
        if attr in ['src','poster'] or (attr=='href' and re.search(r'\.(?:css|js|png|svg|ico|woff2?)(?:\?|$)',value)):
            return attr+'="'+('/'+value.lstrip('/') if value else value)+'"'
        parsed=urlsplit('/'+value.lstrip('/'));path=re.sub(r'^/(?:en|de|fr|ru|vi|zh|ja)(?=/|$)','',parsed.path) or '/'
        path=re.sub(r'\.html$','',path)
        if path in ['/app','/pc-app']:
            path='/downloads';fragment='android' if '/app'==re.sub(r'\.html$','',parsed.path) else 'windows'
        else:fragment=parsed.fragment
        if path not in routes:return match[0]
        result=language_path(path,lang)+('?' +parsed.query if parsed.query else '')+('#'+fragment if fragment else '')
        return attr+'="'+html.escape(result,quote=True)+'"'
    return re.sub(r'\b(href|src|poster)="([^"]*)"',replace,source)

for route,source in sources.items():
    for lang in LANGUAGES:
        parser=Translation(source,lang);parser.feed(source);output=metadata(navigation(parser.result(),lang),route,lang)
        filename=('index.html' if route=='/' else route[1:]+'.html')
        if route.endswith('/'):filename=route[1:]+'index.html'
        destination=FRONTEND/(filename if lang=='tr' else lang+'/'+filename)
        write(destination,output)
# A single list also powers safe counterpart navigation; it contains only generated routes.
write(ROOT/'shared/localized-routes.json',json.dumps(sorted(routes),indent=2)+'\n')
language_script=FRONTEND/'site-language.js';runtime=language_script.read_text(encoding='utf-8')
runtime=re.sub(r'/\* generated localized routes \*/\s*const localizedRoutes = new Set\([^;]*\);','/* generated localized routes */\n  const localizedRoutes = new Set('+json.dumps(sorted(routes),ensure_ascii=False)+');',runtime)
write(language_script,runtime)
# Reconstruct the sitemap from real, self-canonical HTML, then add mutual language alternates.
old=(FRONTEND/'sitemap.xml').read_text(encoding='utf-8')
dates=dict(re.findall(r'<url>\s*<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>',old))
entries={}
for path in FRONTEND.rglob('*.html'):
    source=path.read_text(encoding='utf-8')
    if re.search(r'name="robots"[^>]*content="[^"]*noindex',source):continue
    route=route_for(path)
    if route in ['/app','/pc-app']:continue
    match=re.search(r'rel="canonical"\s+href="([^"]+)"',source)
    if not match or match[1]!=ORIGIN+route:continue
    url=match[1];entry=f'  <url><loc>{html.escape(url)}</loc>'
    if url in dates:entry+='<lastmod>'+dates[url]+'</lastmod>'
    for lang,destination in re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"',source):entry+=f'<xhtml:link rel="alternate" hreflang="{lang}" href="{html.escape(destination,quote=True)}"/>'
    entries[url]=entry+'</url>'
write(FRONTEND/'sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+'\n'.join(entries[k] for k in sorted(entries))+'\n</urlset>\n')
print(f'Static language output: {len(routes)} routes × 8 languages, {len(entries)} self-canonical sitemap URLs. Legal content retains its existing canonical.')
