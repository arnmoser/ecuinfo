/* src/mobile/mobile-ui.js - Mobile Core Controller */
import { state } from '../state.js';
import { renderMobileModuleList } from './mobile-rendering.js';

// Configuration
const MOBILE_BREAKPOINT = 768;

// DOM Elements
const body = document.body;
const mobileAppContainer = document.getElementById('mobile-app');
const listView = document.getElementById('mobile-list-view');
const detailView = document.getElementById('mobile-detail-view');
const backBtn = document.getElementById('mobileBackBtn');
const searchInput = document.getElementById('mobileModuleSearch');

// Modal Elements
const imageModal = document.getElementById('mobile-image-modal');
const modalCloseBtn = document.getElementById('mobileModalCloseBtn');
const modalImg = document.getElementById('mobileModalImg');
const modalMarksLayer = document.getElementById('mobileModalMarksLayer');

// Mark Info Modal Elements
const markInfoModal = document.getElementById('mobile-mark-info-modal');
const markInfoCloseBtn = document.getElementById('mobileMarkInfoCloseBtn');
const markInfoTitle = document.getElementById('mobileMarkInfoTitle');
const markInfoDesc = document.getElementById('mobileMarkInfoDesc');


// Internal State
let currentMobileView = 'list'; // 'list' | 'detail'
let isMobileMode = false;

// Zoom State
let currentZoom = 1;
let minZoom = 1;
let maxZoom = 5;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;
let initialPinchDistance = null;
let initialPinchZoom = 1;

let modalStageEl = document.querySelector('.mobile-modal-stage');

// ======================================
// 1. View Toggling Logic
// ======================================
export function showMobileDetailView() {
  currentMobileView = 'detail';
  const lv = document.getElementById('mobile-list-view');
  const dv = document.getElementById('mobile-detail-view');
  if (lv && dv) {
    lv.classList.remove('active');

    // Brute-force reverse
    lv.style.visibility = 'hidden';
    lv.style.opacity = '0';
    lv.style.pointerEvents = 'none';
    lv.style.zIndex = '1';

    // small timeout to allow display flex to apply before opacity transition
    setTimeout(() => {
      dv.classList.add('active');
      dv.style.visibility = 'visible';
      dv.style.opacity = '1';
      dv.style.pointerEvents = 'auto';
      dv.style.zIndex = '10';
    }, 10);
  }
}

export function showMobileListView() {
  currentMobileView = 'list';
  const lv = document.getElementById('mobile-list-view');
  const dv = document.getElementById('mobile-detail-view');
  if (lv && dv) {
    dv.classList.remove('active');
    dv.style.visibility = 'hidden';
    dv.style.opacity = '0';
    dv.style.pointerEvents = 'none';
    dv.style.zIndex = '1';

    setTimeout(() => {
      lv.classList.add('active');
      lv.style.visibility = 'visible';
      lv.style.opacity = '1';
      lv.style.pointerEvents = 'auto';
      lv.style.zIndex = '10';
    }, 10);
    // Remove active module silently
    state.currentModuleId = null;
  }
}

// Global exposure for infallible HTML inline binding
window.goBackToMobileList = () => {
  showMobileListView();
};

// ======================================
// 2. Modal Logic (Expanded Image)
// ======================================
export function openMobileImageModal() {
  if (!imageModal) return;

  // Clone the src from the thumbnail to the modal
  const thumbImg = document.getElementById('mobileStageImg');
  if (thumbImg && thumbImg.src && thumbImg.src !== window.location.href) {
    modalImg.src = thumbImg.src;

    const drawModalMarks = () => {
      requestAnimationFrame(() => {
        const mod = state.modules.find(m => m.id === state.currentModuleId);
        // We reuse the exact same strict percentage->pixel calculation logic for the modal!
        import('./mobile-rendering.js').then(({ renderMobileMarksStrict }) => {
          renderMobileMarksStrict(mod, modalImg, modalMarksLayer);
        });
      });
    };

    // We must wait for the modal image to calculate natural widths if it's new
    modalImg.onload = drawModalMarks;

    // Fallback: If image was cached, onload won't fire. Draw marks if it's already complete.
    if (modalImg.complete && modalImg.src) {
      drawModalMarks();
    }
  }

  // Reset Zoom/Pan on open
  currentZoom = 1;
  panX = 0;
  panY = 0;
  applyZoomPan();

  imageModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Lock background scroll
}

export function closeMobileImageModal() {
  if (!imageModal) return;
  imageModal.classList.remove('active');
  document.body.style.overflow = '';
}

// ======================================
// 2.2 Mark Info Modal Logic
// ======================================
export function openMobileMarkInfoModal(mark) {
  const infoModal = document.getElementById('mobile-mark-info-modal');
  if (!infoModal) return;

  const infoTitle = document.getElementById('mobileMarkInfoTitle');
  const infoDesc = document.getElementById('mobileMarkInfoDesc');
  const infoCloseBtn = document.getElementById('mobileMarkInfoCloseBtn');

  if (infoTitle) infoTitle.textContent = mark.title || 'Marcação';
  if (infoDesc) infoDesc.textContent = mark.description || 'Nenhuma descrição detalhada disponível.';

  // Dynamically attach robust event listeners to the Close Button
  if (infoCloseBtn) {
    infoCloseBtn.onclick = closeMobileMarkInfoModal;
    infoCloseBtn.ontouchstart = (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeMobileMarkInfoModal();
    };
  }

  infoModal.classList.add('active');
}

export function closeMobileMarkInfoModal() {
  const infoModal = document.getElementById('mobile-mark-info-modal');
  if (infoModal) infoModal.classList.remove('active');
}


// ======================================
// 2.5 Zoom & Pan Mechanics
// ======================================
function applyZoomPan() {
  if (!modalStageEl) {
    modalStageEl = document.querySelector('.mobile-modal-stage');
  }
  if (!modalStageEl) return;

  // Constrain Pan so user doesn't drag image completely off screen
  // (Simple constraint, can be refined based on image actual size vs viewport later)
  modalStageEl.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
}

function getPinchDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

function setupZoomEvents() {
  const panZoomContainer = document.getElementById('mobileModalPanZoom');
  if (!panZoomContainer) return;

  // Touch Events for Mobile (Pinch & Pan)
  panZoomContainer.addEventListener('touchstart', (e) => {
    // If the user is touching a mark, let the mark handle it. Don't start panning.
    if (e.target.closest('.text-mark-rect') || e.target.closest('[style*="border-radius: 50%"]')) {
      return;
    }

    if (e.touches.length === 2) {
      // Start Pinch
      isPanning = false;
      initialPinchDistance = getPinchDistance(e.touches);
      initialPinchZoom = currentZoom;
    } else if (e.touches.length === 1) {
      // Start Pan
      isPanning = true;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    }
  }, { passive: false });

  panZoomContainer.addEventListener('touchmove', (e) => {
    if (e.target.closest('.text-mark-rect') || e.target.closest('[style*="border-radius: 50%"]')) {
      return;
    }

    // Only intercept if we are actively doing something with the image
    if (currentZoom > 1 || e.touches.length === 2) {
      e.preventDefault(); // Stop default browser zooming/scrolling on this layer
    } else {
      return; // Let native scroll happen if zoom is 1x and using 1 finger
    }

    if (e.touches.length === 2 && initialPinchDistance) {
      // Pinching
      const currentDistance = getPinchDistance(e.touches);
      const scaleDelta = currentDistance / initialPinchDistance;
      let newZoom = initialPinchZoom * scaleDelta;

      currentZoom = Math.min(Math.max(newZoom, minZoom), maxZoom);
      applyZoomPan();
    } else if (e.touches.length === 1 && isPanning && currentZoom > 1) {
      // Panning only allowed when zoomed in
      panX = e.touches[0].clientX - startX;
      panY = e.touches[0].clientY - startY;
      applyZoomPan();
    }
  }, { passive: false });

  panZoomContainer.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = null;
    }
    if (e.touches.length === 0) {
      isPanning = false;
    }
  });

  // Mouse wheel for Desktop simulation & testing
  panZoomContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.05;
    const delta = e.deltaY > 0 ? -1 : 1;
    let newZoom = currentZoom + (delta * zoomSensitivity);
    currentZoom = Math.min(Math.max(newZoom, minZoom), maxZoom);
    applyZoomPan();
  }, { passive: false });
}


// ======================================
// 3. Viewport Detection & Isolation
// ======================================
function handleResize() {
  const width = window.innerWidth;
  const shouldBeMobile = width < MOBILE_BREAKPOINT;

  // Se estamos na tela de login, não aplicamos a lógica de esconder a main area ainda (o #app já está escondido de toda forma).
  // Mas vamos focar na lógica visual: se o usuário já logou (o #app não tem 'hidden'), ativamos a redcap Mobile
  const appContainer = document.getElementById('app');
  if (!appContainer || appContainer.classList.contains('hidden')) {
    // User is likely in login screen, don't force mobile UI yet. Let authController handle showing #app or #mobile-app later.
    return;
  }

  const mAppContainer = document.getElementById('mobile-app');

  if (shouldBeMobile && !isMobileMode) {
    // Entering mobile mode
    isMobileMode = true;
    document.body.classList.add('is-mobile');
    if (mAppContainer) mAppContainer.classList.add('active');

    // Ensure we are in list view initially or preserve state
    if (currentMobileView === 'list') {
      showMobileListView();
      renderMobileModuleList();
    }
  } else if (!shouldBeMobile && isMobileMode) {
    // Exiting mobile mode
    isMobileMode = false;
    document.body.classList.remove('is-mobile');
    if (mAppContainer) mAppContainer.classList.remove('active');
  }
}

// Event Listeners for Interaction
export function setupMobileEvents() {
  // Absolute Physical Coordinate Capture Listener for the Back Button (God-Mode Bypass)
  // This executes on the raw Capture Phase at the Window level before any other element can interfere.
  const handlePhysicalIntercept = (e) => {
    if (currentMobileView !== 'detail') return;

    const btn = document.getElementById('mobileBackBtn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Check if the physical screen touch falls inside the bounding box of the Back button
    // We add a generous 20px bleed padding to make it extremely easy to tap on all devices
    const bleed = 20;
    if (
      clientX >= (rect.left - bleed) &&
      clientX <= (rect.right + bleed) &&
      clientY >= (rect.top - bleed) &&
      clientY <= (rect.bottom + bleed)
    ) {
      // Force exit
      e.stopPropagation();
      showMobileListView();
    }
  };

  window.addEventListener('touchstart', handlePhysicalIntercept, { capture: true, passive: false });
  window.addEventListener('mousedown', handlePhysicalIntercept, { capture: true, passive: false });

  const sInput = document.getElementById('mobileModuleSearch');
  if (sInput) {
    sInput.addEventListener('input', () => {
      renderMobileModuleList();
    });
  }

  const mCloseBtn = document.getElementById('mobileModalCloseBtn');
  if (mCloseBtn) {
    mCloseBtn.addEventListener('click', closeMobileImageModal);
  }

  // Global resize listener
  window.addEventListener('resize', () => {
    handleResize();

    // Also recalculate marks if we are in detail view and a module is selected
    if (currentMobileView === 'detail' && state.currentModuleId) {
      import('./mobile-rendering.js').then(({ renderMobileCurrentModule }) => {
        renderMobileCurrentModule().catch(console.error);
      });
    }

    // Recalculate modal if open
    if (imageModal && imageModal.classList.contains('active')) {
      const mod = state.modules.find(m => m.id === state.currentModuleId);
      if (mod) {
        import('./mobile-rendering.js').then(({ renderMobileMarksStrict }) => {
          renderMobileMarksStrict(mod, modalImg, modalMarksLayer);
        }).catch(console.error);
      }
    }
  });

  // Setup Zoom Events
  setupZoomEvents();

  // Initial check (useful after login finishes)
}

// Initialize on load safely
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileEvents);
} else {
  setupMobileEvents();
}

