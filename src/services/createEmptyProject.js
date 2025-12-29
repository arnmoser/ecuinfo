// services/createEmptyProject.js
import { state } from '../state.js';
import { uid } from '../utils.js';

export function createEmptyProject() {
  const moduleId = uid('mod');

  state.modules = [
    {
      id: moduleId,
      name: 'Novo Projeto',
      notes:
        'Clique em "Adicionar Foto" para carregar imagem.\n' +
        'Use ferramenta Ponto/Texto para marcar.',
      photo: '',
      marks: []
    }
  ];

  state.currentModuleId = moduleId;
  state.currentProjectId = null; // ainda não salvo no Supabase
  state.dirty = true;
}
