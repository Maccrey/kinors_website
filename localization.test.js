import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const supportedMatch = appSource.match(/const supported=\[([^\]]+)\];/);
assert.ok(supportedMatch, 'supported language list exists');
const supported = [...supportedMatch[1].matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
const catalogSource = appSource.slice(0, appSource.indexOf('\nconst supported='));
const sandbox = {};
vm.runInNewContext(`${catalogSource}\nglobalThis.__translations = translations;`, sandbox);
const translations = sandbox.__translations;

const htmlTranslationKeys = (attribute) =>
  [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map((match) => match[1]);

 test('every visible and accessibility translation key exists for all site languages', () => {
  const keys = new Set([
    ...htmlTranslationKeys('data-i18n'),
    ...htmlTranslationKeys('data-i18n-aria-label'),
    ...htmlTranslationKeys('data-i18n-alt'),
  ]);
  for (const lang of supported) {
    assert.ok(translations[lang], `translation catalog exists: ${lang}`);
    for (const key of keys) {
      assert.ok(Object.hasOwn(translations[lang], key), `${lang} is missing ${key}`);
    }
  }
});

test('the family sample dashboard metric names use localized copy keys', () => {
  for (const key of ['phone.activity', 'phone.sleep', 'phone.meal']) {
    assert.match(html, new RegExp(`<div class="mini-row"><span data-i18n="${key}">`));
  }
});

test('menu button has localized open and close states with expanded semantics', () => {
  assert.match(html, /id="mobileMenuButton"[^>]*aria-expanded="false"[^>]*data-i18n-aria-label="a11y\.openMenu"/);
  assert.match(appSource, /a11y\.closeMenu/);
  assert.match(appSource, /setAttribute\('aria-expanded',String\(open\)\)/);
});

test('parent and family section labels are translated outside English', () => {
  const expected = {
    ko: ['부모님을 위해', '가족을 위해'],
    zh: ['为父母', '为家人'],
    ja: ['親御さん向け', 'ご家族向け'],
    th: ['สำหรับคุณพ่อคุณแม่', 'สำหรับครอบครัว'],
    vi: ['Dành cho cha mẹ', 'Dành cho gia đình'],
  };
  for (const [lang, [parents, family]] of Object.entries(expected)) {
    assert.equal(translations[lang]['why.eyebrow'], parents);
    assert.equal(translations[lang]['family.eyebrow'], family);
  }
});
