/* analytics.js - Camada mínima de medição do funil.
 * Só carrega GA4/Meta quando os IDs estão configurados em constants.js.
 * Sem IDs: track() é no-op (nenhum script externo, nenhum dado sai).
 */
import { GA4_MEASUREMENT_ID, META_PIXEL_ID } from './constants.js';

let booted = false;

function injectScript(src, onload) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  if (onload) s.onload = onload;
  document.head.appendChild(s);
}

export function initAnalytics() {
  if (booted) return;
  booted = true;

  if (GA4_MEASUREMENT_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    injectScript(
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`,
      () => window.gtag('config', GA4_MEASUREMENT_ID)
    );
  }

  if (META_PIXEL_ID) {
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
}

/** Eventos de funil: sign_up (cadastro), purchase (pagamento confirmado). */
export function track(event, params = {}) {
  try {
    if (window.gtag && GA4_MEASUREMENT_ID) window.gtag('event', event, params);
    if (window.fbq && META_PIXEL_ID) {
      const fbEvent = event === 'purchase' ? 'Purchase' : event === 'sign_up' ? 'CompleteRegistration' : event;
      window.fbq('trackCustom', fbEvent, params);
    }
  } catch {
    // analytics nunca pode quebrar o app
  }
}
