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