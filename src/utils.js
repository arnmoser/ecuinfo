/* utils.js - Funções auxiliares */
export function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

export function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function normalizeWhatsApp(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return '+' + cleaned;
}

export function isValidWhatsApp(phone) {
  const regex = /^\+[1-9]\d{10,14}$/;
  return regex.test(phone);
}

/* =====================================================
   SEGURANÇA: validação de upload e de importação
   ===================================================== */

// MIME allowlist para fotos de ECU (nunca confie em file.name / file.type crus)
export const IMAGE_UPLOAD_ALLOWLIST = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMPORT_JSON_BYTES = 25 * 1024 * 1024; // 25 MB

function matchesMagicBytes(bytes, mime) {
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }
  if (mime === 'image/png') {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
  }
  if (mime === 'image/webp') {
    // RIFF....WEBP
    return bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

/**
 * Valida um arquivo de imagem antes do upload.
 * Checa MIME (allowlist), tamanho e magic bytes reais do conteúdo.
 * Retorna { ok, ext, mime } ou { ok: false, error }.
 */
export async function validateImageFile(file) {
  if (!file || typeof file.size !== 'number') {
    return { ok: false, error: 'Arquivo inválido.' };
  }

  const ext = IMAGE_UPLOAD_ALLOWLIST[file.type];
  if (!ext) {
    return { ok: false, error: 'Tipo de arquivo não permitido. Envie JPG, PNG ou WEBP.' };
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return { ok: false, error: 'Imagem excede o limite de 10 MB.' };
  }

  let header;
  try {
    header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  } catch {
    return { ok: false, error: 'Não foi possível ler o arquivo.' };
  }

  if (!matchesMagicBytes(header, file.type)) {
    return { ok: false, error: 'O conteúdo do arquivo não corresponde a uma imagem válida.' };
  }

  return { ok: true, ext, mime: file.type };
}

function isFiniteNumberInRange(v, min, max) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isSafeText(v, maxLen) {
  return typeof v === 'string' && v.length <= maxLen;
}

/**
 * Valida o schema de um JSON importado antes de injetar no state.
 * Retorna { ok: true } ou { ok: false, error }.
 */
export function validateImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Formato inválido: raiz deve ser um objeto.' };
  }
  if (!Array.isArray(parsed.modules)) {
    return { ok: false, error: 'Formato inválido: modules ausente.' };
  }
  if (parsed.modules.length > 500) {
    return { ok: false, error: 'Arquivo com módulos demais (máx. 500).' };
  }

  for (const mod of parsed.modules) {
    if (!mod || typeof mod !== 'object') return { ok: false, error: 'Módulo inválido.' };
    if (!isSafeText(String(mod.id ?? ''), 120) || !mod.id) return { ok: false, error: 'ID de módulo inválido.' };
    if (mod.name !== undefined && !isSafeText(mod.name, 200)) return { ok: false, error: 'Nome de módulo muito longo.' };
    if (mod.notes !== undefined && !isSafeText(mod.notes, 20000)) return { ok: false, error: 'Notas muito longas.' };
    if (mod.photo !== undefined && !isSafeText(mod.photo, MAX_IMPORT_JSON_BYTES)) return { ok: false, error: 'Foto embutida excede o limite.' };
    if (mod.photo_path !== undefined && mod.photo_path !== null && !isSafeText(mod.photo_path, 500)) {
      return { ok: false, error: 'photo_path inválido.' };
    }
    if (mod.marks !== undefined) {
      if (!Array.isArray(mod.marks) || mod.marks.length > 2000) {
        return { ok: false, error: 'Marcações inválidas.' };
      }
      for (const mk of mod.marks) {
        if (!mk || typeof mk !== 'object') return { ok: false, error: 'Marcação inválida.' };
        if (!isFiniteNumberInRange(mk.x, 0, 1) || !isFiniteNumberInRange(mk.y, 0, 1)) {
          return { ok: false, error: 'Coordenada de marcação fora do intervalo 0–1.' };
        }
        for (const k of ['width', 'height']) {
          if (mk[k] !== undefined && !isFiniteNumberInRange(mk[k], 0, 1)) {
            return { ok: false, error: 'Dimensão de marcação inválida.' };
          }
        }
        for (const k of ['title', 'label', 'description']) {
          if (mk[k] !== undefined && !isSafeText(mk[k], 5000)) {
            return { ok: false, error: 'Texto de marcação muito longo.' };
          }
        }
      }
    }
  }

  return { ok: true };
}

/** Escapa texto para interpolação segura em HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}