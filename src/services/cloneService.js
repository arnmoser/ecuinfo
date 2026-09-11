import { uid } from '../utils.js';
import { supabase } from './supabase.js';
import { state } from '../state.js';

export async function cloneSystemModule(systemModule) {

  if (!systemModule.isSystem) return;

  const newId = uid('mod');

  let newPhotoPath = null;

  if (systemModule.photo_path) {

    const originalPath = systemModule.photo_path.replace(/^system\//, '');

    // SEGURANÇA: photo_path vem do banco; barra traversal e paths absolutos
    // antes de usar como chave do Storage.
    if (
      originalPath.includes('..') ||
      originalPath.startsWith('/') ||
      !/^[A-Za-z0-9 _\-/]+\.[A-Za-z0-9]{2,5}$/.test(originalPath)
    ) {
      throw new Error('photo_path do módulo do sistema é inválido.');
    }

    const { data, error } = await supabase.storage
      .from('ecu-system')
      .download(originalPath);

    if (error) throw error;

    const fileExt = originalPath.split('.').pop();

    newPhotoPath = `${state.user.id}/${state.currentProjectId}/${newId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('ecu_images')
      .upload(newPhotoPath, data, {
        upsert: true
      });

    if (uploadError) throw uploadError;
  }

  const cloned = {
    id: newId,
    name: systemModule.name + ' (Clone)',
    notes: systemModule.notes,
    photo: '',
    photo_path: newPhotoPath,
    marks: [],
    isSystem: false
  };

  state.modules.push(cloned);

  return cloned;
}
