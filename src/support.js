/* support.js - Links de suporte (WhatsApp) com fail-closed.
 * Elementos com [data-support] ganham href do WhatsApp configurado em
 * SUPPORT_WHATSAPP. Se não configurado, os elementos são ocultados
 * (nunca exibe link quebrado).
 */
import { SUPPORT_WHATSAPP, SUPPORT_MESSAGE } from './constants.js';

export function getSupportUrl() {
  if (!SUPPORT_WHATSAPP || !/^\d{10,15}$/.test(SUPPORT_WHATSAPP)) return null;
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`;
}

export function applySupportLinks(root = document) {
  const url = getSupportUrl();
  root.querySelectorAll('[data-support]').forEach((el) => {
    if (!url) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    if (el.tagName === 'A') {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
    }
  });
}
