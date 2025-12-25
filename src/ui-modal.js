import { saveToStorage } from './storage.js';
import { renderMarks } from './rendering.js';
import { btnSaveProject } from './dom.js';
import { state } from './state.js';

export function syncSaveButton(){
  if (!btnSaveProject) return;
  btnSaveProject.disabled = !state.dirty;
}

export function openTextMarkModal(mark){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h3');
  title.textContent = 'Editar Marcação';

  const labelTitle = document.createElement('label');
  labelTitle.textContent = 'Título';

  const inputTitle = document.createElement('input');
  inputTitle.value = mark.title || '';

  const labelDesc = document.createElement('label');
  labelDesc.textContent = 'Descrição';

  const inputDesc = document.createElement('textarea');
  inputDesc.value = mark.description || '';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancelar';
  cancel.onclick = () => overlay.remove();

  const save = document.createElement('button');
  save.textContent = 'Salvar';
  save.className = 'primary';

  save.onclick = () => {
    mark.title = inputTitle.value;
    mark.description = inputDesc.value;
    state.dirty = true;
    syncSaveButton();
    btnSaveProject.disabled = false;
    renderMarks();
    overlay.remove();
  };

  actions.append(cancel, save);
  modal.append(title, labelTitle, inputTitle, labelDesc, inputDesc, actions);
  overlay.append(modal);
  document.body.appendChild(overlay);

  inputTitle.focus();
}
