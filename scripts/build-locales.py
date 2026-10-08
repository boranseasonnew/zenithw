"""Mark static, site-owned text for translation; never walk live visitor/media data."""
from pathlib import Path
from html.parser import HTMLParser
import html, json, re, time

root = Path(__file__).resolve().parents[1]
frontend = root / 'frontend'
catalog = json.loads((frontend / 'locales/en.json').read_text(encoding='utf-8'))
void = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
blocked = {'script','style','svg','code','pre'}
class Markup(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source=source; self.stack=[]; self.nodes=[]
        self.offsets=[0]
        for line in source.splitlines(keepends=True): self.offsets.append(self.offsets[-1]+len(line))
    def handle_starttag(self, tag, attrs):
        line,column=self.getpos(); start=self.offsets[line-1]+column
        attributes=dict(attrs)
        node={'start':start,'raw':self.get_starttag_text(),'fields':{},'children':0,'tag':tag,'blocked':tag in blocked or any(item['blocked'] for item in self.stack)}
        if self.stack:self.stack[-1]['children']+=1
        # Previously recorded source text remains authoritative on rebuilds.
        if attributes.get('data-l10n'):node['fields']=json.loads(attributes['data-l10n'])
        if not node['blocked']:
            for key in ['alt','title','placeholder','aria-label']:
                value=attributes.get(key,'')
                if value.strip() in catalog:node['fields'].setdefault(key,value)
            if tag=='meta' and (attributes.get('name') in ['description','twitter:title','twitter:description'] or attributes.get('property') in ['og:title','og:description']):
                value=attributes.get('content','')
                if value.strip() in catalog:node['fields'].setdefault('content',value)
        self.nodes.append(node)
        if tag not in void:self.stack.append(node)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in void:self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for index in range(len(self.stack)-1,-1,-1):
            if self.stack[index]['tag']==tag:
                self.stack=self.stack[:index];break
    def handle_data(self, value):
        if not self.stack:return
        node=self.stack[-1];key='text:'+str(node['children']);node['children']+=1
        if not node['blocked'] and value.strip() in catalog:node['fields'].setdefault(key,value)
    def handle_comment(self,value):
        if self.stack:self.stack[-1]['children']+=1
    def result(self):
        output=self.source
        for node in reversed(self.nodes):
            if not node['fields']:continue
            raw=re.sub(r'\sdata-l10n="[^"]*"','',node['raw'])
            close=raw.rfind('/>') if raw.endswith('/>') else raw.rfind('>')
            attribute=html.escape(json.dumps(node['fields'],ensure_ascii=False,separators=(',',':')),quote=True)
            replacement=raw[:close]+' data-l10n="'+attribute+'"'+raw[close:]
            start=node['start'];output=output[:start]+replacement+output[start+len(node['raw']):]
        return output

count=0
for path in frontend.rglob('*.html'):
    source=path.read_text(encoding='utf-8')
    parser=Markup(source);parser.feed(source);output=parser.result()
    if 'site-language.js' not in output and not re.search(r'/cache-assets/site-language\.[a-f0-9]+\.js',output):
        output=output.replace('<head>','<head>\n<link rel="stylesheet" href="/site-language.css">\n<script src="/site-language.js"></script>',1)
    output=output.replace('version.js?v=15.1','version.js?v=15.2')
    if output!=source:
        # Windows file scanners can briefly reject an otherwise writable file.
        for attempt in range(6):
            try:
                path.write_text(output,encoding='utf-8')
                break
            except OSError as error:
                if error.errno!=22 or attempt==5:raise
                time.sleep(.1)
    count+=1
print(f'Localized static text and language controls across {count} pages.')
