// Suite executável: node --test supabase/tests/validators.test.mjs
// Cobre as correções de segurança de input/upload (sem dependências).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImportPayload,
  validateImageFile,
  escapeHtml,
  IMAGE_UPLOAD_ALLOWLIST,
  MAX_IMAGE_UPLOAD_BYTES
} from '../../src/utils.js';

const png = new File(
  [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0])],
  'foto.png', { type: 'image/png' }
);
const fakePng = new File(
  [new TextEncoder().encode('<svg onload=alert(1)>')],
  'evil.png', { type: 'image/png' }
);
const svgAsPng = new File(
  [new TextEncoder().encode('GIF89a...')],
  'a.gif', { type: 'image/gif' }
);

test('upload: PNG real passa', async () => {
  const r = await validateImageFile(png);
  assert.equal(r.ok, true);
  assert.equal(r.ext, 'png');
});

test('upload: conteúdo falso com MIME válido é barrado (magic bytes)', async () => {
  const r = await validateImageFile(fakePng);
  assert.equal(r.ok, false);
});

test('upload: GIF fora da allowlist é barrado', async () => {
  const r = await validateImageFile(svgAsPng);
  assert.equal(r.ok, false);
});

test('upload: limite 10 MB', () => {
  assert.equal(MAX_IMAGE_UPLOAD_BYTES, 10 * 1024 * 1024);
  assert.equal(IMAGE_UPLOAD_ALLOWLIST['image/svg+xml'], undefined);
});

test('import: payload válido passa', () => {
  assert.deepEqual(validateImportPayload({
    modules: [{ id: 'mod_1', name: 'ECU', marks: [{ x: 0.5, y: 0.2, title: 'CPU' }] }]
  }), { ok: true });
});

test('import: sem modules / tipo errado falha', () => {
  assert.equal(validateImportPayload({}).ok, false);
  assert.equal(validateImportPayload({ modules: 'x' }).ok, false);
});

test('import: coordenada fora de 0–1, NaN e Infinity falham', () => {
  assert.equal(validateImportPayload({ modules: [{ id: 'a', marks: [{ x: 2, y: 0 }] }] }).ok, false);
  assert.equal(validateImportPayload({ modules: [{ id: 'a', marks: [{ x: NaN, y: 0 }] }] }).ok, false);
  assert.equal(validateImportPayload({ modules: [{ id: 'a', marks: [{ x: 0, y: Infinity }] }] }).ok, false);
});

test('import: textos gigantes e arrays enormes falham', () => {
  assert.equal(validateImportPayload({ modules: [{ id: 'a', name: 'x'.repeat(201) }] }).ok, false);
  assert.equal(validateImportPayload({ modules: new Array(501).fill({ id: 'a' }) }).ok, false);
});

test('escapeHtml neutraliza tags', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
  );
});
