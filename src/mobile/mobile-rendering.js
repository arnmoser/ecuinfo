/* src/mobile/mobile-rendering.js - Enhanced Mobile Rendering Logic */
import { state, getCurrentModule } from '../state.js';
import { supabase } from '../services/supabase.js';
import { showMobileDetailView } from './mobile-ui.js';

export function renderMobileModuleList() {
    const listEl = document.getElementById('mobileModuleList');
    const searchInput = document.getElementById('mobileModuleSearch');

    if (!listEl) return;

    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    listEl.innerHTML = '';

    if (!state.modules || state.modules.length === 0) {
        listEl.innerHTML = '<div style="color: #6e7a75; text-align: center; padding: 40px 20px;">Nenhum módulo encontrado.</div>';
        return;
    }

    state.modules.forEach(mod => {
        // Filter logic
        const matchesName = (mod.name || '').toLowerCase().includes(q);
        const matchesMark = mod.marks && mod.marks.some(mk => (mk.label || '').toLowerCase().includes(q) || (mk.title || '').toLowerCase().includes(q));

        if (q && !(matchesName || matchesMark)) return;

        // Create card with SaaS styling
        const li = document.createElement('li');
        li.className = 'mobile-module-card';

        const h3 = document.createElement('h3');
        h3.textContent = mod.name || '(sem nome)';

        const p = document.createElement('p');
        p.textContent = (mod.marks || []).length + ' marcações vinculadas';

        li.appendChild(h3);
        li.appendChild(p);

        // Click action -> transition to detail view
        li.addEventListener('click', () => {
            state.currentModuleId = mod.id;
            // Do not mutate document dirty state (read-only mode)
            renderMobileCurrentModule();
            showMobileDetailView();
        });

        listEl.appendChild(li);
    });
}

export async function renderMobileCurrentModule() {
    const mod = getCurrentModule();

    const titleEl = document.getElementById('mobileDetailTitle');
    const notesEl = document.getElementById('mobileNotesText');
    const imgEl = document.getElementById('mobileStageImg');
    const marksListEl = document.getElementById('mobileMarksList');
    const marksLayerEl = document.getElementById('mobileMarksLayer');

    if (!titleEl || !mod) return;

    // 1. Text & Info
    titleEl.textContent = mod.name || 'Módulo';
    notesEl.textContent = mod.notes || 'Nenhuma nota técnica adicionada.';
    notesEl.style.color = mod.notes ? '#d8dedb' : '#6e7a75';

    // 2. Clear previous marks & images immediately for clean transitions
    marksListEl.innerHTML = '';
    marksLayerEl.innerHTML = '';
    imgEl.src = '';
    imgEl.onload = null;
    imgEl.parentElement.querySelectorAll('.mobile-no-image').forEach(e => e.remove());

    // 3. Render textual Marks List
    if (mod.marks && mod.marks.length > 0) {
        mod.marks.forEach(mark => {
            const li = document.createElement('li');

            const titleSpan = document.createElement('div');
            titleSpan.className = 'mobile-mark-title';
            titleSpan.textContent = mark.title || mark.label || 'Marcação';

            const descSpan = document.createElement('div');
            descSpan.className = 'mobile-mark-desc';
            descSpan.textContent = mark.description || 'Sem descrição detalhada.';

            li.appendChild(titleSpan);
            li.appendChild(descSpan);

            marksListEl.appendChild(li);
        });
    } else {
        marksListEl.innerHTML = '<li style="color: #6e7a75; border: none; background: transparent; padding: 0;">Módulo não possui marcações.</li>';
    }

    // 4. Handle Visual Image & Pin Layer Safely
    const hasPhotoPath = Boolean(mod.photo_path);
    const hasLocalPhoto = Boolean(mod.photo);

    if (!hasPhotoPath && !hasLocalPhoto) {
        // Fallback Visual
        imgEl.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = 'mobile-no-image';
        fallback.innerHTML = '<i>📷</i><span>Nenhuma foto na ECU</span>';
        imgEl.parentElement.appendChild(fallback);
        return;
    }

    imgEl.style.display = 'block';

    // Define loading behavior - resilient to cache
    const drawMarks = () => {
        // Use requestAnimationFrame to let CSS paint the actual heights before we measure boxes
        requestAnimationFrame(() => {
            renderMobileMarksStrict(mod, imgEl, marksLayerEl);
        });
    };

    imgEl.onload = drawMarks;


    // Trigger Supabase fetch or use Local Base64
    if (hasPhotoPath) {
        try {
            let bucketName = mod.isSystem ? 'ecu-system' : 'ecu_images';
            let pathClean = mod.isSystem ? String(mod.photo_path).replace(/^system\//, '') : String(mod.photo_path).trim().replace(/^\/+/, '');

            const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(pathClean, 3600);
            if (!error && data?.signedUrl) {
                imgEl.src = data.signedUrl;
            } else {
                imgEl.src = mod.photo || '';
            }
        } catch (e) {
            imgEl.src = mod.photo || '';
        }
    } else {
        imgEl.src = mod.photo || '';
    }

    // Bind Expand Modal click freshly
    const thumbWrap = imgEl.parentElement;
    thumbWrap.onclick = () => {
        import('./mobile-ui.js').then(({ openMobileImageModal }) => {
            openMobileImageModal();
        });
    };

    // Fallback: If image was cached, onload won't fire. Draw marks if it's already complete.
    if (imgEl.complete && imgEl.src) {
        drawMarks();
    }
}

/**
 * Calculates and places marks based absolutely on the rendered physical dimensions of an image,
 * ensuring no logic breaks regardless of the wrapper's CSS width, letterboxing or resizing.
 */
export function renderMobileMarksStrict(mod, imgElement, layerElement) {
    if (!mod || !mod.marks || mod.marks.length === 0) return;
    if (!imgElement || !imgElement.complete || !imgElement.naturalWidth) return;

    layerElement.innerHTML = '';

    // Get the actual natural proportions of the image
    const naturalW = imgElement.naturalWidth;
    const naturalH = imgElement.naturalHeight;
    const imgRatio = naturalW / naturalH;

    // The wrapper (parentRect) dimensions.
    const parentRect = layerElement.parentElement.getBoundingClientRect();
    const parentW = parentRect.width;
    const parentH = parentRect.height;
    const parentRatio = parentW / parentH;

    let renderW, renderH, offsetX, offsetY;

    // object-fit: contain mathematical equivalent
    if (imgRatio > parentRatio) {
        // Image is wider than wrapper ratio -> Touches left/right, letterbox top/bottom
        renderW = parentW;
        renderH = parentW / imgRatio;
        offsetX = 0;
        offsetY = (parentH - renderH) / 2;
    } else {
        // Image is taller than wrapper ratio -> Touches top/bottom, letterbox left/right
        renderH = parentH;
        renderW = parentH * imgRatio;
        offsetX = (parentW - renderW) / 2;
        offsetY = 0;
    }

    mod.marks.forEach(mark => {
        const el = document.createElement('div');

        // Literal pixel offset from the wrapper edge, guaranteeing precision across all CSS models
        const pxLeft = offsetX + (mark.x * renderW);
        const pxTop = offsetY + (mark.y * renderH);

        if (mark.type === 'text') {
            el.className = 'text-mark-rect';
            el.style.position = 'absolute';
            el.style.border = '2px dashed #f28b3c';
            el.style.backgroundColor = 'rgba(242, 139, 60, 0.15)';
            el.style.borderRadius = '4px';

            el.style.left = `${pxLeft}px`;
            el.style.top = `${pxTop}px`;

            const pxW = (mark.width || 0.2) * renderW;
            const pxH = (mark.height || 0.15) * renderH;
            el.style.width = `${pxW}px`;
            el.style.height = `${pxH}px`;

        } else {
            // Pin Mark
            el.style.position = 'absolute';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.left = `${pxLeft}px`;
            el.style.top = `${pxTop}px`;

            const dot = document.createElement('div');
            dot.style.width = '14px';
            dot.style.height = '14px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = '#f28b3c';
            dot.style.boxShadow = '0 0 10px rgba(242, 139, 60, 0.6)';
            dot.style.border = '2px solid #000';

            el.appendChild(dot);
        }

        // Add interactive tap target for the Mark Info Modal
        el.style.cursor = 'pointer';
        el.style.pointerEvents = 'auto'; // Override the layer's pointer-events: none

        // Use a unified handler
        const handleMarkTap = (e) => {
            e.stopPropagation(); // Stop parent zoom modal from eating the click
            import('./mobile-ui.js').then(({ openMobileMarkInfoModal }) => {
                openMobileMarkInfoModal(mark);
            });
        };

        // Bind standard click (relying on modern mobile browsers handling tap -> click)
        el.addEventListener('click', handleMarkTap);

        layerElement.appendChild(el);
    });
}
