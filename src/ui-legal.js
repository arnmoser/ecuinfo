import { formatLegalDate } from './services/legalService.js';

function setLegalText(legalVersions) {
  const termsVersion = document.getElementById('legal-terms-version');
  const termsEffective = document.getElementById('legal-terms-effective');
  const privacyVersion = document.getElementById('legal-privacy-version');
  const privacyEffective = document.getElementById('legal-privacy-effective');

  if (termsVersion) termsVersion.textContent = legalVersions.terms_version || '-';
  if (termsEffective) termsEffective.textContent = formatLegalDate(legalVersions.terms_effective_at) || '-';
  if (privacyVersion) privacyVersion.textContent = legalVersions.privacy_version || '-';
  if (privacyEffective) privacyEffective.textContent = formatLegalDate(legalVersions.privacy_effective_at) || '-';
}

export function showLegalAcceptanceModal(legalVersions) {
  const overlay = document.getElementById('legal-modal-overlay');
  const checkbox = document.getElementById('legalAcceptCheckbox');
  const acceptBtn = document.getElementById('legalAcceptBtn');
  const logoutBtn = document.getElementById('legalLogoutBtn');

  if (!overlay || !checkbox || !acceptBtn || !logoutBtn) {
    console.error('[legal] Modal elements not found');
    return Promise.resolve(false);
  }

  setLegalText(legalVersions);

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  checkbox.checked = false;
  acceptBtn.disabled = true;

  const syncButton = () => {
    acceptBtn.disabled = !checkbox.checked;
  };

  return new Promise((resolve) => {
    checkbox.onchange = syncButton;

    acceptBtn.onclick = () => {
      acceptBtn.disabled = true;
      resolve(true);
    };

    logoutBtn.onclick = () => {
      resolve(false);
    };
  });
}

export function hideLegalAcceptanceModal() {
  const overlay = document.getElementById('legal-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}
