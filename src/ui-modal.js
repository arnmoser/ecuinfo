import { btnSaveProject } from './dom.js';
import { state } from './state.js';

export function syncSaveButton(){
  if (!btnSaveProject) return;
  btnSaveProject.disabled = !state.dirty;
}
