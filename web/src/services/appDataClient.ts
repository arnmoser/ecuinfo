import { supabase } from './authClient';

export type ModuleMark = {
  id: string;
  title?: string;
  label?: string;
  description?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type SelectionPreset = {
  id: string;
  name: string;
  mark_ids: string[];
  mark_titles?: string[];
};

export type SelectionImportDraft = {
  id: string;
  name: string;
  enabled?: boolean;
  base_mark_ids: string[];
  unmatched_titles: string[];
  mappings: Record<string, string>;
};

export type AppModule = {
  id: string;
  name: string;
  notes?: string;
  photo?: string;
  photo_path?: string | null;
  marks?: ModuleMark[];
  selection_presets?: SelectionPreset[];
  selection_import_drafts?: SelectionImportDraft[];
  isSystem: boolean;
};

export type FetchMergedModulesResult = {
  projectId: string | null;
  modules: AppModule[];
};

function normalizeModulesFromProject(projectData: unknown) {
  const payload = (projectData && typeof projectData === 'object' ? projectData : {}) as {
    modules?: AppModule[];
  };
  return Array.isArray(payload.modules) ? payload.modules : [];
}

function mergeSystemModules(
  systemModules: {
    id: string;
    slug: string;
    name: string;
    notes?: string;
    description?: string;
    photo_path?: string | null;
    marks?: ModuleMark[];
  }[],
  userModules: AppModule[]
) {
  const normalizedSystem = systemModules.map((mod) => ({
    id: `mod_sys_${mod.slug}`,
    name: mod.name,
    notes: mod.notes || mod.description || '',
    photo: '',
    photo_path: mod.photo_path ? `system/${mod.photo_path}` : null,
    marks: mod.marks || [],
    isSystem: true
  }));

  return [
    ...normalizedSystem,
    ...userModules.map((mod) => ({
      ...mod,
      isSystem: false
    }))
  ];
}

export async function fetchMergedModules() {
  const { data: projectRows, error: projectError } = await supabase
    .from('projects')
    .select('id, data, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (projectError) throw projectError;
  const latestProject = projectRows?.[0];
  const userModules = normalizeModulesFromProject(latestProject?.data);

  const { data: systemModules, error: systemError } = await supabase.from('system_modules').select('*').order('name');
  if (systemError) throw systemError;

  return {
    projectId: latestProject?.id ?? null,
    modules: mergeSystemModules(systemModules ?? [], userModules)
  } satisfies FetchMergedModulesResult;
}

function sanitizeUserModules(modules: AppModule[]) {
  return modules
    .filter((mod) => !mod.isSystem)
    .map((mod) => {
      const clean = structuredClone(mod) as AppModule & { originalSystemId?: string };
      delete clean.isSystem;
      delete clean.originalSystemId;
      if (clean.photo_path && clean.photo_path.length > 5) {
        clean.photo = '';
      }
      return clean;
    });
}

export async function saveUserModules(projectId: string | null, modules: AppModule[], projectName = 'Projeto React') {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error('User is not authenticated.');
  }

  const payload = {
    version: 1,
    modules: sanitizeUserModules(modules)
  };

  if (!projectId) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        data: payload
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      name: projectName,
      data: payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getModulePhotoUrl(mod: AppModule) {
  if (!mod.photo_path) return mod.photo ?? '';

  const isSystem = mod.isSystem;
  const bucket = isSystem ? 'ecu-system' : 'ecu_images';
  const cleanedPath = isSystem ? String(mod.photo_path).replace(/^system\//, '') : String(mod.photo_path).replace(/^\/+/, '');

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanedPath, 3600);
  if (error || !data?.signedUrl) return mod.photo ?? '';
  return data.signedUrl;
}
