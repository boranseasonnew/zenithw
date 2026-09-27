import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../frontend/about-locales.js', import.meta.url), 'utf8');
const aboutFiles = [
  'about.html', 'about/community.html', 'about/credit.html', 'about/privacy.html', 'about/terms.html',
];
const readFrontend = path => readFileSync(new URL(`../frontend/${path}`, import.meta.url), 'utf8');

function loadLocale(language, page) {
  const document = {
    title: '',
    documentElement: {},
    body: { dataset: { aboutPage: page } },
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  const context = vm.createContext({
    COPY: { tr: {}, en: {} },
    document,
    navigator: { language, languages: [language] },
    window: {},
  });
  vm.runInContext(source, context);
  return { copy: context.COPY, document, window: context.window };
}

test('French and German browser preferences select translated About copy', () => {
  const french = loadLocale('fr-FR', 'about');
  assert.equal(french.window.ZW_ABOUT_LOCALE, 'fr');
  assert.equal(french.document.documentElement.lang, 'fr');
  assert.equal(french.copy.fr.title, 'À propos — ZenithW');
  assert.match(french.copy.fr.body, /espace multimédia indépendant/i);

  const german = loadLocale('de-DE', 'privacy');
  assert.equal(german.window.ZW_ABOUT_LOCALE, 'de');
  assert.equal(german.document.documentElement.lang, 'de');
  assert.equal(german.copy.de.title, 'Datenschutz — ZenithW');
  assert.match(german.copy.de.body, /Datenminimierung/);
});

test('About pages use automatic browser language without a manual switch', () => {
  for (const file of aboutFiles) {
    const html = readFrontend(file);
    assert.match(html, /about-locales\.js/, file);
    assert.doesNotMatch(html, /langSwitch|setPageLang\('/, file);
  }
  assert.match(source, /navigator\.languages/);
  assert.match(source, /'fr'/);
  assert.match(source, /'de'/);
});
