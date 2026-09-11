/* constants.js - Configurações e constantes */
export const STORAGE_KEY = 'mini_ecu_data_v1';
export const LAST_MODULE_KEY = 'mini_ecu_last_v1';
export const MARK_HOLD_TIME = 1000; // 2 segundos
export const HOLD_MOVE_TOLERANCE = 6; // px

export const LEGAL_DEFAULTS = {
  terms_version: '1.0',
  privacy_version: '1.0',
  terms_effective_at: '2026-01-01',
  privacy_effective_at: '2026-01-01'
};

export const LEGAL_STORAGE_KEY = 'ecuinfo_pending_legal_acceptance';

/* Suporte: número WhatsApp com DDI+DDD só dígitos (ex: '5547999999999').
 * Preencha para exibir os botões "Falar com suporte" (sucesso, remarketing,
 * tela de bloqueio e rodapé). Vazio = botões ficam ocultos. */
export const SUPPORT_WHATSAPP = '';

export const SUPPORT_MESSAGE = 'Olá! Preciso de ajuda com meu acesso ao ECU Info.';

/* Analytics: preencha para ativar (vazio = desativado, nada é carregado).
 * GA4: 'G-XXXXXXXXXX' | Meta Pixel: só dígitos (ex: '1234567890') */
export const GA4_MEASUREMENT_ID = '';
export const META_PIXEL_ID = '';
