import { uid } from '../utils.js';
import { supabase } from './supabase.js';
import { state } from '../state.js';

export async function cloneSystemModule(systemModule) {

  if (!systemModule.isSystem) return;

  const newId = uid('mod');

  let newPhotoPath = null;

  if (systemModule.photo_path) {

    const originalPath = systemModule.photo_path.replace(/^system\//, '');

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
