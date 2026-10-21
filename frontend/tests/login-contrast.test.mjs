import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/input.css', import.meta.url), 'utf8');
const login = readFileSync(new URL('../src/features/Auth/Login.jsx', import.meta.url), 'utf8');
const notice = login.match(/<p className="([^"]+)">\s*ورود فقط برای اعضای مجاز/);

function luminance(hex) {
  const rgb = hex.match(/\w{2}/g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

for (const [theme, selector] of [['light', '@theme {'], ['dark', '.dark {']]) {
  test(`login notice meets 4.5:1 text contrast in ${theme} theme`, () => {
    assert.ok(notice, 'The visible login notice must exist');
    const token = notice[1].match(/\btext-(text\w+)/)?.[1];
    assert.ok(token, 'The notice must use a known text color');
    const palette = css.slice(css.indexOf(selector)).match(/\{([^}]+)\}/s)[1];
    const color = (name) => {
      const match = palette.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
      assert.ok(match, `Missing ${name} in ${theme} palette`);
      return luminance(match[1]);
    };
    const foreground = color(token);
    const background = color('Background');
    const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    assert.ok(contrast >= 4.5, `Notice contrast is ${contrast.toFixed(3)}:1; required 4.5:1`);
  });
}
