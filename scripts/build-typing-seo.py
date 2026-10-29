"""Build Type's two real UI languages without loading its interactive runtime."""
from pathlib import Path
from html.parser import HTMLParser
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / 'frontend'
ORIGIN = json.loads((ROOT / 'shared/site-config.json').read_text(encoding='utf-8'))['origin']
COPY = json.loads((ROOT / 'shared/typing-seo.json').read_text(encoding='utf-8'))
runtime = (FRONTEND / 'typing-i18n.js').read_text(encoding='utf-8')
ENGLISH, _ = json.JSONDecoder().raw_decode(runtime.split('const english=', 1)[1])


class EnglishHTML(HTMLParser):
    """Translate only checked-in text and labels, preserving scripts and source markup."""
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.stack, self.patches = source, [], []
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))

    def position(self):
        line, column = self.getpos()
        return self.offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()
        blocked = tag in {'script', 'style', 'svg', 'code', 'pre'} or any(self.stack)
        if not blocked:
            def label(match):
                value = html.unescape(match[2])
                return match[1] + '="' + html.escape(ENGLISH.get(value, value), quote=True) + '"'
            translated = re.sub(r'(aria-label|placeholder|title)="([^"]*)"', label, raw)
            if translated != raw:
                start = self.position()
                self.patches.append((start, start + len(raw), translated))
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(blocked)

    def handle_startendtag(self, tag, attrs):
        depth = len(self.stack)
        self.handle_starttag(tag, attrs)
        self.stack = self.stack[:depth]

    def handle_endtag(self, tag):
        if self.stack:
            self.stack.pop()

    def handle_data(self, text):
        key = text.strip()
        if any(self.stack) or key not in ENGLISH:
            return
        start = self.position() + len(text) - len(text.lstrip())
        self.patches.append((start, start + len(key), html.escape(ENGLISH[key], quote=False)))

    def result(self):
        source = self.source
        for start, end, replacement in sorted(self.patches, reverse=True):
            source = source[:start] + replacement + source[end:]
        return source


def write(path, source):
    if path.exists() and path.read_text(encoding='utf-8') == source:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source, encoding='utf-8', newline='\n')


source = (FRONTEND / 'typing.html').read_text(encoding='utf-8')
source = re.sub(r'\s*<!-- generated typing intro -->[\s\S]*?<!-- end generated typing intro -->', '', source)
source = re.sub(r'\s*<!-- generated typing help -->[\s\S]*?<!-- end generated typing help -->', '', source)
for language in ['tr', 'en']:
    copy = COPY[language]
    output = source
    if language == 'en':
        parser = EnglishHTML(output)
        parser.feed(output)
        output = parser.result()
    output = re.sub(r'<html\b[^>]*>', '<html lang="' + language + '" data-theme="dark" data-typing-language="' + language + '">', output, count=1)
    output = re.sub(r'<title>.*?</title>', '<title>' + html.escape(copy['title']) + '</title>', output, count=1)
    output = re.sub(r'<meta name="description"[^>]*>', '<meta name="description" content="' + html.escape(copy['description'], quote=True) + '">', output, count=1)
    end = output.index('</head>')
    head = output[:end]
    head = re.sub(r'\s*<!-- generated SEO metadata -->[\s\S]*?<!-- end generated SEO metadata -->', '', head)
    head = re.sub(r'\s*<!-- generated typing SEO -->[\s\S]*?<!-- end generated typing SEO -->', '', head)
    head = re.sub(r'\s*<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>', '', head)
    canonical = ORIGIN + copy['path']
    alternates = '\n'.join('<link rel="alternate" hreflang="' + code + '" href="' + ORIGIN + COPY[code]['path'] + '">' for code in ['tr', 'en'])
    graph = {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': 'Zenith Type', 'url': canonical,
             'description': copy['description'], 'inLanguage': language, 'applicationCategory': 'EducationalApplication',
             'operatingSystem': 'Web browser', 'isAccessibleForFree': True}
    metadata = '\n<!-- generated typing SEO -->\n<link rel="stylesheet" href="/typing-seo.css">\n<link rel="canonical" href="' + canonical + '">\n' + alternates
    metadata += '\n<link rel="alternate" hreflang="x-default" href="' + ORIGIN + COPY['en']['path'] + '">'
    for key, value in [('og:type', 'website'), ('og:title', copy['title']), ('og:description', copy['description']), ('og:url', canonical), ('og:locale', 'tr_TR' if language == 'tr' else 'en_US'), ('og:image', ORIGIN + '/zenithw.png')]:
        metadata += '\n<meta property="' + key + '" content="' + html.escape(value, quote=True) + '">'
    metadata += '\n<script type="application/ld+json">' + json.dumps(graph, ensure_ascii=False).replace('<', '\\u003c') + '</script>\n<!-- end generated typing SEO -->\n'
    output = head.rstrip() + metadata + output[end:]
    intro = '\n<!-- generated typing intro --><div class="typing-intro chrome"><h1>' + html.escape(copy['heading']) + '</h1><p>' + html.escape(copy['lead']) + '</p></div><!-- end generated typing intro -->'
    output = re.sub(r'(<section id="typing-page"[^>]*>)', lambda match: match[1] + intro, output, count=1)
    help_block = '\n<!-- generated typing help --><details class="typing-help chrome"><summary>' + html.escape(copy['help']) + '</summary><p>' + html.escape(copy['steps']) + '</p><h2>' + html.escape(copy['measurement']) + '</h2><p>' + html.escape(copy['formula']) + '</p><p>' + html.escape(copy['practice']) + '</p><nav aria-label="' + ('Sayfa dili' if language == 'tr' else 'Page language') + '"><a href="/typing" lang="tr" hreflang="tr">Türkçe</a> · <a href="/en/typing" lang="en" hreflang="en">English</a> · <a href="' + ('/' if language == 'tr' else '/en/') + '">' + html.escape(copy['home']) + '</a></nav></details><!-- end generated typing help -->\n'
    output = output.replace('\n</section>\n<section class="rank-page"', help_block + '</section>\n<section class="rank-page"', 1)
    write(FRONTEND / ('typing.html' if language == 'tr' else 'en/typing.html'), output)

# The general site builder owns the other eight-language routes. Keep Type's two
# actual languages in that same sitemap without advertising untranslated copies.
sitemap = (FRONTEND / 'sitemap.xml').read_text(encoding='utf-8')
entries = re.findall(r'  <url>.*?</url>', sitemap)
entries = [entry for entry in entries if not any('<loc>' + ORIGIN + COPY[lang]['path'] + '</loc>' in entry for lang in ['tr', 'en'])]
for lang in ['tr', 'en']:
    entry = '  <url><loc>' + ORIGIN + COPY[lang]['path'] + '</loc><lastmod>' + COPY['updated'] + '</lastmod>'
    for code, path in [('tr', COPY['tr']['path']), ('en', COPY['en']['path']), ('x-default', COPY['en']['path'])]:
        entry += '<xhtml:link rel="alternate" hreflang="' + code + '" href="' + ORIGIN + path + '"/>'
    entries.append(entry + '</url>')
write(FRONTEND / 'sitemap.xml', sitemap[:sitemap.index('  <url>')] + '\n'.join(sorted(entries)) + '\n</urlset>\n')
print('Type SEO generated: /typing and /en/typing, static text, reciprocal alternates and sitemap entries.')
