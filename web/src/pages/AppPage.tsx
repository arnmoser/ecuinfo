import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../services/authClient';
import { AppModule, SelectionImportDraft, SelectionPreset, fetchMergedModules, getModulePhotoUrl, saveUserModules } from '../services/appDataClient';

export function AppPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState<AppModule[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [selectedMarkIds, setSelectedMarkIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [pendingPresetImports, setPendingPresetImports] = useState<SelectionImportDraft[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [placingMode, setPlacingMode] = useState(false);
  const [draggingMarkId, setDraggingMarkId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridStep, setGridStep] = useState(0.01);
  const [axisLock, setAxisLock] = useState<'none' | 'x' | 'y'>('none');
  const [marquee, setMarquee] = useState<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    additive: boolean;
  } | null>(null);
  const [dragInteraction, setDragInteraction] = useState<{
    markId: string;
    mode: 'move' | 'resize';
    handle?: 'nw' | 'ne' | 'sw' | 'se';
    groupInitial: { id: string; x: number; y: number }[];
    startClientX: number;
    startClientY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialType: string;
  } | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const presetImportInputRef = useRef<HTMLInputElement | null>(null);

  function createId(prefix: string) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.round(Math.random() * 100000)}`;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setBusy(true);
        setError(null);
        const session = await getSession();
        if (!session?.user?.id) {
          navigate('/login');
          return;
        }
        const merged = await fetchMergedModules();
        if (!mounted) return;
        setProjectId(merged.projectId);
        setModules(merged.modules);
        setSelectedId(merged.modules[0]?.id ?? null);
        const firstMarkId = merged.modules[0]?.marks?.[0]?.id ?? null;
        setSelectedMarkId(firstMarkId);
        setSelectedMarkIds(firstMarkId ? [firstMarkId] : []);
      } catch (loadError) {
        if (loadError instanceof Error) setError(loadError.message);
        else setError('Unable to load modules now.');
      } finally {
        if (mounted) setBusy(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((mod) => {
      const notes = (mod.notes ?? '').toLowerCase();
      const title = (mod.name ?? '').toLowerCase();
      const markText = (mod.marks ?? [])
        .map((mark) => `${mark.title ?? ''} ${mark.label ?? ''} ${mark.description ?? ''}`.toLowerCase())
        .join(' ');
      return title.includes(query) || notes.includes(query) || markText.includes(query);
    });
  }, [modules, search]);

  const selectedModule = useMemo(() => modules.find((mod) => mod.id === selectedId) ?? null, [modules, selectedId]);
  const selectedMark = useMemo(
    () => selectedModule?.marks?.find((mark) => mark.id === selectedMarkId) ?? null,
    [selectedModule, selectedMarkId]
  );
  const selectedMarks = useMemo(() => {
    if (!selectedModule) return [];
    const ids = selectedMarkIds.length ? selectedMarkIds : selectedMarkId ? [selectedMarkId] : [];
    const idSet = new Set(ids);
    return (selectedModule.marks ?? []).filter((mark) => idSet.has(mark.id));
  }, [selectedModule, selectedMarkId, selectedMarkIds]);
  const positionedMarks = useMemo(
    () => (selectedModule?.marks ?? []).filter((mark) => typeof mark.x === 'number' && typeof mark.y === 'number'),
    [selectedModule]
  );
  const selectionPresets = useMemo(() => selectedModule?.selection_presets ?? [], [selectedModule]);
  const selectableMarks = useMemo(
    () =>
      (selectedModule?.marks ?? []).map((mark) => ({
        id: mark.id,
        label: getMarkReference(mark) || mark.id
      })),
    [selectedModule]
  );
  const visibleMarks = useMemo(() => {
    if (!selectedModule) return [];
    const query = search.trim().toLowerCase();
    if (!query) return selectedModule.marks ?? [];
    return (selectedModule.marks ?? []).filter((mark) => {
      const text = `${mark.title ?? ''} ${mark.label ?? ''} ${mark.description ?? ''}`.toLowerCase();
      return text.includes(query);
    });
  }, [selectedModule, search]);
  const visibleMarkSlice = useMemo(() => visibleMarks.slice(0, 24), [visibleMarks]);
  const moduleImportDrafts = useMemo(() => selectedModule?.selection_import_drafts ?? [], [selectedModule]);
  const pendingImportPreview = useMemo(() => {
    const markMap = new Map((selectedModule?.marks ?? []).map((mark) => [mark.id, getMarkReference(mark) || mark.id]));
    const enabledDrafts = pendingPresetImports.filter((item) => item.enabled !== false);
    const nextPresets = pendingPresetImports
      .filter((item) => item.enabled !== false)
      .map((item) => {
        const mappedIds = Object.values(item.mappings).filter((id) => id.length > 0);
        const allIds = Array.from(new Set([...item.base_mark_ids, ...mappedIds]));
        if (!allIds.length) return null;
        const resolvedMarks = allIds.map((id) => ({ id, label: markMap.get(id) ?? id }));
        return {
          draft_id: item.id,
          name: item.name,
          resolved_count: allIds.length,
          unresolved_count: item.unmatched_titles.filter((title) => !(item.mappings[title] ?? '').length).length,
          resolved_marks: resolvedMarks
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const totalMarks = nextPresets.reduce((sum, item) => sum + item.resolved_count, 0);
    return {
      total_enabled: enabledDrafts.length,
      total_presets: nextPresets.length,
      total_marks: totalMarks,
      items: nextPresets
    };
  }, [pendingPresetImports, selectedModule]);

  useEffect(() => {
    let active = true;
    async function loadPhoto() {
      if (!selectedModule) {
        setPhotoUrl('');
        return;
      }
      const url = await getModulePhotoUrl(selectedModule);
      if (active) setPhotoUrl(url);
    }
    void loadPhoto();
    return () => {
      active = false;
    };
  }, [selectedModule]);

  useEffect(() => {
    setPresetName('');
    setEditingPresetId(null);
    setPendingPresetImports(moduleImportDrafts);
  }, [moduleImportDrafts, selectedId]);

  function persistPendingPresetImports(next: SelectionImportDraft[], markDirty = true) {
    setPendingPresetImports(next);
    if (!selectedModule || selectedModule.isSystem) return;
    setModules((current) =>
      current.map((mod) =>
        mod.id === selectedModule.id ? { ...mod, selection_import_drafts: next } : mod
      )
    );
    if (markDirty) {
      setDirty(true);
      setSaveMessage(null);
    }
  }

  function setModuleField(field: 'name' | 'notes', value: string) {
    if (!selectedModule || selectedModule.isSystem) return;
    setModules((current) =>
      current.map((mod) => (mod.id === selectedModule.id ? { ...mod, [field]: value } : mod))
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function createModule() {
    const newModule: AppModule = {
      id: createId('mod_user'),
      name: 'New module',
      notes: '',
      photo: '',
      photo_path: null,
      marks: [],
      selection_import_drafts: [],
      isSystem: false
    };
    setModules((current) => [newModule, ...current]);
    setSelectedId(newModule.id);
    setSelectedMarkId(null);
    setSelectedMarkIds([]);
    setDirty(true);
    setSaveMessage(null);
  }

  function deleteModule() {
    if (!selectedModule || selectedModule.isSystem) return;
    setModules((current) => {
      const next = current.filter((mod) => mod.id !== selectedModule.id);
      const nextSelected = next[0] ?? null;
      setSelectedId(nextSelected?.id ?? null);
      const nextMarkId = nextSelected?.marks?.[0]?.id ?? null;
      setSelectedMarkId(nextMarkId);
      setSelectedMarkIds(nextMarkId ? [nextMarkId] : []);
      return next;
    });
    setDirty(true);
    setSaveMessage(null);
  }

  function setMarkField(field: 'title' | 'description', value: string) {
    if (!selectedModule || selectedModule.isSystem || !selectedMark) return;
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedModule.id) return mod;
        return {
          ...mod,
          marks: (mod.marks ?? []).map((mark) => (mark.id === selectedMark.id ? { ...mark, [field]: value } : mark))
        };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function selectAllVisibleMarks() {
    if (!selectedModule || selectedModule.isSystem) return;
    const ids = visibleMarkSlice.map((mark) => mark.id);
    if (!ids.length) return;
    setSelectedMarkId(ids[0]);
    setSelectedMarkIds(ids);
  }

  function invertVisibleSelection() {
    if (!selectedModule || selectedModule.isSystem) return;
    const visibleIds = visibleMarkSlice.map((mark) => mark.id);
    if (!visibleIds.length) return;
    const current = new Set(selectedMarkIds.length ? selectedMarkIds : selectedMarkId ? [selectedMarkId] : []);
    const inverted = visibleIds.filter((id) => !current.has(id));
    if (!inverted.length) {
      setSelectedMarkId(null);
      setSelectedMarkIds([]);
      return;
    }
    setSelectedMarkId(inverted[0]);
    setSelectedMarkIds(inverted);
  }

  function getMarkReference(mark: NonNullable<AppModule['marks']>[number]) {
    return (mark.title || mark.label || '').trim();
  }

  function buildPresetPayload(markIds: string[]) {
    const uniqueIds = Array.from(new Set(markIds));
    const markMap = new Map((selectedModule?.marks ?? []).map((mark) => [mark.id, mark]));
    const markTitles = uniqueIds
      .map((id) => {
        const mark = markMap.get(id);
        return mark ? getMarkReference(mark) : '';
      })
      .filter((value) => value.length > 0);
    return {
      mark_ids: uniqueIds,
      mark_titles: Array.from(new Set(markTitles))
    };
  }

  function resolvePresetMarkIds(preset: SelectionPreset) {
    const marks = selectedModule?.marks ?? [];
    const byId = new Set(preset.mark_ids.filter((id) => marks.some((mark) => mark.id === id)));
    if (byId.size > 0) return Array.from(byId);
    const titleSet = new Set((preset.mark_titles ?? []).map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0));
    if (titleSet.size === 0) return [];
    const byTitle = marks
      .filter((mark) => titleSet.has(getMarkReference(mark).toLowerCase()))
      .map((mark) => mark.id);
    return Array.from(new Set(byTitle));
  }

  function analyzePresetImport(preset: SelectionPreset) {
    const marks = selectedModule?.marks ?? [];
    const validById = new Set(preset.mark_ids.filter((id) => marks.some((mark) => mark.id === id)));
    const titleLookup = new Map(
      marks.map((mark) => [getMarkReference(mark).trim().toLowerCase(), mark.id]).filter(([title]) => title.length > 0)
    );
    const incomingTitles = Array.from(
      new Set((preset.mark_titles ?? []).map((value) => value.trim()).filter((value) => value.length > 0))
    );
    const unmatchedTitles: string[] = [];
    for (const title of incomingTitles) {
      const match = titleLookup.get(title.toLowerCase());
      if (match) validById.add(match);
      else unmatchedTitles.push(title);
    }
    return {
      base_mark_ids: Array.from(validById),
      unmatched_titles: unmatchedTitles
    };
  }

  function saveSelectionPreset() {
    if (!selectedModule || selectedModule.isSystem || selectedMarkIds.length === 0) return;
    const name = presetName.trim() || `Selection ${selectionPresets.length + 1}`;
    const payload = buildPresetPayload(selectedMarkIds);
    const existing = selectionPresets.find((preset) => preset.name.toLowerCase() === name.toLowerCase());

    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedModule.id) return mod;
        const presets = mod.selection_presets ?? [];
        if (existing) {
          return {
            ...mod,
            selection_presets: presets.map((preset) =>
              preset.id === existing.id ? { ...preset, ...payload, name } : preset
            )
          };
        }
        return {
          ...mod,
          selection_presets: [...presets, { id: createId('preset'), name, ...payload }]
        };
      })
    );
    setPresetName(name);
    setEditingPresetId(existing?.id ?? null);
    setDirty(true);
    setSaveMessage(null);
  }

  function beginRenamePreset(presetId: string) {
    const preset = selectionPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setPresetName(preset.name);
    setEditingPresetId(preset.id);
  }

  function renameSelectionPreset() {
    if (!selectedModule || selectedModule.isSystem || !editingPresetId) return;
    const name = presetName.trim();
    if (!name) return;
    setModules((current) =>
      current.map((mod) =>
        mod.id === selectedModule.id
          ? {
              ...mod,
              selection_presets: (mod.selection_presets ?? []).map((preset) =>
                preset.id === editingPresetId ? { ...preset, name } : preset
              )
            }
          : mod
      )
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function applySelectionPreset(presetId: string) {
    if (!selectedModule) return;
    const preset = selectionPresets.find((item) => item.id === presetId);
    if (!preset) return;
    const validIds = resolvePresetMarkIds(preset);
    if (!validIds.length) return;
    setSelectedMarkId(validIds[0]);
    setSelectedMarkIds(validIds);
  }

  function deleteSelectionPreset(presetId: string) {
    if (!selectedModule || selectedModule.isSystem) return;
    setModules((current) =>
      current.map((mod) =>
        mod.id === selectedModule.id
          ? { ...mod, selection_presets: (mod.selection_presets ?? []).filter((preset) => preset.id !== presetId) }
          : mod
      )
    );
    if (editingPresetId === presetId) {
      setEditingPresetId(null);
      setPresetName('');
    }
    setDirty(true);
    setSaveMessage(null);
  }

  function moveSelectionPreset(presetId: string, direction: 'up' | 'down') {
    if (!selectedModule || selectedModule.isSystem) return;
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedModule.id) return mod;
        const presets = [...(mod.selection_presets ?? [])];
        const index = presets.findIndex((preset) => preset.id === presetId);
        if (index < 0) return mod;
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= presets.length) return mod;
        const [item] = presets.splice(index, 1);
        presets.splice(target, 0, item);
        return { ...mod, selection_presets: presets };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function duplicateSelectionPreset(presetId: string) {
    if (!selectedModule || selectedModule.isSystem) return;
    const source = selectionPresets.find((preset) => preset.id === presetId);
    if (!source) return;
    const duplicated = {
      ...source,
      id: createId('preset'),
      name: `${source.name} copy`
    };
    setModules((current) =>
      current.map((mod) =>
        mod.id === selectedModule.id ? { ...mod, selection_presets: [...(mod.selection_presets ?? []), duplicated] } : mod
      )
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function exportSelectionPresets() {
    if (!selectedModule) return;
    const payload = {
      module_id: selectedModule.id,
      module_name: selectedModule.name,
      presets: selectionPresets.map((preset) => ({ ...preset, ...buildPresetPayload(preset.mark_ids) }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selection-presets-${selectedModule.id}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importSelectionPresetsFromFile(file: File) {
    if (!selectedModule || selectedModule.isSystem) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { presets?: SelectionPreset[] };
        const incoming = Array.isArray(parsed.presets) ? parsed.presets : [];
        const analyzed = incoming
          .filter((preset) => typeof preset.name === 'string' && Array.isArray(preset.mark_ids))
          .map((preset) => {
            const details = analyzePresetImport(preset);
            return {
              id: createId('preset'),
              name: preset.name.trim() || 'Imported preset',
              enabled: true,
              ...details,
              mappings: Object.fromEntries(details.unmatched_titles.map((title) => [title, '']))
            };
          });

        if (!analyzed.length) return;
        persistPendingPresetImports(analyzed);
      } catch {
        setError('Invalid preset file format.');
      }
    };
    reader.readAsText(file);
  }

  function setPendingPresetMapping(presetId: string, title: string, markId: string) {
    const next = pendingPresetImports.map((item) =>
      item.id === presetId
        ? {
            ...item,
            mappings: {
              ...item.mappings,
              [title]: markId
            }
          }
        : item
    );
    persistPendingPresetImports(next);
  }

  function setPendingPresetEnabled(presetId: string, enabled: boolean) {
    const next = pendingPresetImports.map((item) =>
      item.id === presetId ? { ...item, enabled } : item
    );
    persistPendingPresetImports(next);
  }

  function setAllPendingPresetsEnabled(enabled: boolean) {
    const next = pendingPresetImports.map((item) => ({ ...item, enabled }));
    persistPendingPresetImports(next);
  }

  function autoMapByContains(mappings: Record<string, string>, unmatchedTitles: string[]) {
    const next = { ...mappings };
    for (const title of unmatchedTitles) {
      if (next[title]) continue;
      const query = title.trim().toLowerCase();
      if (!query) continue;
      const candidates = selectableMarks.filter((mark) => {
        const label = mark.label.trim().toLowerCase();
        return label.includes(query) || query.includes(label);
      });
      if (candidates.length === 1) {
        next[title] = candidates[0].id;
      }
    }
    return next;
  }

  function autoMapPendingPresetByContains(presetId: string) {
    const next = pendingPresetImports.map((item) =>
      item.id === presetId
        ? {
            ...item,
            mappings: autoMapByContains(item.mappings, item.unmatched_titles)
          }
        : item
    );
    persistPendingPresetImports(next);
  }

  function autoMapAllPendingPresetsByContains() {
    const next = pendingPresetImports.map((item) => ({
        ...item,
        mappings: autoMapByContains(item.mappings, item.unmatched_titles)
      }));
    persistPendingPresetImports(next);
  }

  function applyPendingPresetImports() {
    if (!selectedModule || selectedModule.isSystem || pendingPresetImports.length === 0) return;
    const normalized = pendingImportPreview.items.map((item) => ({
      id: createId('preset'),
      name: item.name,
      ...buildPresetPayload(item.resolved_marks.map((mark) => mark.id))
    }));
    if (!normalized.length) return;
    const appliedDraftIds = new Set(pendingImportPreview.items.map((item) => item.draft_id));
    setModules((current) =>
      current.map((mod) =>
        mod.id === selectedModule.id
          ? { ...mod, selection_presets: [...(mod.selection_presets ?? []), ...normalized] }
          : mod
      )
    );
    const remaining = pendingPresetImports.filter((item) => !appliedDraftIds.has(item.id));
    persistPendingPresetImports(remaining, false);
    setDirty(true);
    setSaveMessage(null);
  }

  function selectMark(markId: string, additive = false) {
    setSelectedMarkId(markId);
    setSelectedMarkIds((current) => {
      if (!additive) return [markId];
      if (current.includes(markId)) {
        const next = current.filter((id) => id !== markId);
        return next.length ? next : [markId];
      }
      return [...current, markId];
    });
  }

  function setMarkType(value: string) {
    if (!selectedModule || selectedModule.isSystem || !selectedMark) return;
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedModule.id) return mod;
        return {
          ...mod,
          marks: (mod.marks ?? []).map((mark) =>
            mark.id === selectedMark.id
              ? {
                  ...mark,
                  type: value,
                  width: value === 'text' ? mark.width ?? 0.24 : mark.width,
                  height: value === 'text' ? mark.height ?? 0.16 : mark.height
                }
              : mark
          )
        };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function createMark() {
    if (!selectedModule || selectedModule.isSystem) return;
    const newMark = {
      id: createId('mark'),
      type: 'point',
      title: 'New mark',
      description: '',
      x: 0.5,
      y: 0.5
    };

    setModules((current) =>
      current.map((mod) => (mod.id === selectedModule.id ? { ...mod, marks: [newMark, ...(mod.marks ?? [])] } : mod))
    );
    setSelectedMarkId(newMark.id);
    setSelectedMarkIds([newMark.id]);
    setDirty(true);
    setSaveMessage(null);
  }

  function createTextMark() {
    if (!selectedModule || selectedModule.isSystem) return;
    const newMark = {
      id: createId('mark'),
      type: 'text',
      title: 'Text box',
      description: '',
      x: 0.5,
      y: 0.5,
      width: 0.24,
      height: 0.16
    };

    setModules((current) =>
      current.map((mod) => (mod.id === selectedModule.id ? { ...mod, marks: [newMark, ...(mod.marks ?? [])] } : mod))
    );
    setSelectedMarkId(newMark.id);
    setSelectedMarkIds([newMark.id]);
    setDirty(true);
    setSaveMessage(null);
  }

  function clamp01(value: number) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function snap(value: number) {
    if (!snapEnabled) return value;
    if (!Number.isFinite(gridStep) || gridStep <= 0) return value;
    return Math.round(value / gridStep) * gridStep;
  }

  function clampTextRect(x: number, y: number, width: number, height: number) {
    const minSize = 0.05;
    const nextWidth = Math.max(minSize, Math.min(1, width));
    const nextHeight = Math.max(minSize, Math.min(1, height));
    const halfW = nextWidth / 2;
    const halfH = nextHeight / 2;
    return {
      x: Math.min(1 - halfW, Math.max(halfW, x)),
      y: Math.min(1 - halfH, Math.max(halfH, y)),
      width: nextWidth,
      height: nextHeight
    };
  }

  function setMarkCoordinate(axis: 'x' | 'y', value: number) {
    if (!selectedModule || selectedModule.isSystem || !selectedMark) return;
    const normalized = clamp01(value);
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedModule.id) return mod;
        return {
          ...mod,
          marks: (mod.marks ?? []).map((mark) => (mark.id === selectedMark.id ? { ...mark, [axis]: normalized } : mark))
        };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function updateMarkPosition(markId: string, x: number, y: number) {
    if (!selectedId) return;
    const nextX = clamp01(snap(x));
    const nextY = clamp01(snap(y));
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedId || mod.isSystem) return mod;
        return {
          ...mod,
          marks: (mod.marks ?? []).map((mark) => (mark.id === markId ? { ...mark, x: nextX, y: nextY } : mark))
        };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function updateTextMarkRect(markId: string, patch: { x?: number; y?: number; width?: number; height?: number }) {
    if (!selectedId) return;
    const snappedPatch = {
      ...patch,
      x: typeof patch.x === 'number' ? clamp01(snap(patch.x)) : patch.x,
      y: typeof patch.y === 'number' ? clamp01(snap(patch.y)) : patch.y,
      width: typeof patch.width === 'number' ? Math.max(0.05, clamp01(snap(patch.width))) : patch.width,
      height: typeof patch.height === 'number' ? Math.max(0.05, clamp01(snap(patch.height))) : patch.height
    };
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedId || mod.isSystem) return mod;
        return {
          ...mod,
          marks: (mod.marks ?? []).map((mark) => (mark.id === markId ? { ...mark, ...snappedPatch } : mark))
        };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function setMarkSize(axis: 'width' | 'height', value: number) {
    if (!selectedModule || selectedModule.isSystem || !selectedMark) return;
    const normalized = clamp01(value);
    updateTextMarkRect(selectedMark.id, { [axis]: Math.max(0.05, normalized) });
  }

  function normalizeMarkPatch(mark: NonNullable<AppModule['marks']>[number], patch: { x?: number; y?: number; width?: number; height?: number }) {
    const currentX = mark.x ?? 0.5;
    const currentY = mark.y ?? 0.5;
    if (mark.type === 'text') {
      const next = clampTextRect(
        typeof patch.x === 'number' ? snap(patch.x) : currentX,
        typeof patch.y === 'number' ? snap(patch.y) : currentY,
        typeof patch.width === 'number' ? snap(patch.width) : mark.width ?? 0.24,
        typeof patch.height === 'number' ? snap(patch.height) : mark.height ?? 0.16
      );
      return next;
    }
    return {
      x: typeof patch.x === 'number' ? clamp01(snap(patch.x)) : currentX,
      y: typeof patch.y === 'number' ? clamp01(snap(patch.y)) : currentY
    };
  }

  function updateSelectedMarks(mapPatch: (mark: NonNullable<AppModule['marks']>[number]) => { x?: number; y?: number; width?: number; height?: number }) {
    if (!selectedModule || selectedModule.isSystem || selectedMarks.length < 2) return;
    const selectedSet = new Set(selectedMarks.map((mark) => mark.id));
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedModule.id) return mod;
        return {
          ...mod,
          marks: (mod.marks ?? []).map((mark) => {
            if (!selectedSet.has(mark.id)) return mark;
            const patch = mapPatch(mark);
            return { ...mark, ...normalizeMarkPatch(mark, patch) };
          })
        };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  function getBounds(mark: NonNullable<AppModule['marks']>[number]) {
    const width = mark.type === 'text' ? mark.width ?? 0.24 : 0;
    const height = mark.type === 'text' ? mark.height ?? 0.16 : 0;
    const x = mark.x ?? 0.5;
    const y = mark.y ?? 0.5;
    return {
      width,
      height,
      x,
      y,
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
      bottom: y + height / 2
    };
  }

  function alignSelected(direction: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') {
    if (selectedMarks.length < 2) return;
    const rects = selectedMarks.map((mark) => ({ id: mark.id, ...getBounds(mark) }));
    const target =
      direction === 'left'
        ? Math.min(...rects.map((rect) => rect.left))
        : direction === 'hcenter'
          ? rects.reduce((sum, rect) => sum + rect.x, 0) / rects.length
          : direction === 'right'
            ? Math.max(...rects.map((rect) => rect.right))
            : direction === 'top'
              ? Math.min(...rects.map((rect) => rect.top))
              : direction === 'vcenter'
                ? rects.reduce((sum, rect) => sum + rect.y, 0) / rects.length
                : Math.max(...rects.map((rect) => rect.bottom));

    updateSelectedMarks((mark) => {
      const rect = getBounds(mark);
      if (direction === 'left') return { x: target + rect.width / 2 };
      if (direction === 'hcenter') return { x: target };
      if (direction === 'right') return { x: target - rect.width / 2 };
      if (direction === 'top') return { y: target + rect.height / 2 };
      if (direction === 'vcenter') return { y: target };
      return { y: target - rect.height / 2 };
    });
  }

  function distributeSelected(axis: 'horizontal' | 'vertical') {
    if (selectedMarks.length < 3) return;
    const sorted = [...selectedMarks].sort((a, b) => (axis === 'horizontal' ? (a.x ?? 0.5) - (b.x ?? 0.5) : (a.y ?? 0.5) - (b.y ?? 0.5)));
    const first = axis === 'horizontal' ? sorted[0].x ?? 0.5 : sorted[0].y ?? 0.5;
    const last = axis === 'horizontal' ? sorted[sorted.length - 1].x ?? 0.5 : sorted[sorted.length - 1].y ?? 0.5;
    const step = (last - first) / (sorted.length - 1);
    const mapById = new Map(sorted.map((mark, index) => [mark.id, first + step * index]));

    updateSelectedMarks((mark) => {
      const value = mapById.get(mark.id);
      if (typeof value !== 'number') return {};
      return axis === 'horizontal' ? { x: value } : { y: value };
    });
  }

  function getDragSelection(markId: string) {
    const current = selectedMarkIds.length ? selectedMarkIds : selectedMarkId ? [selectedMarkId] : [];
    return current.includes(markId) ? current : [markId];
  }

  function getMarqueeRectNormalized() {
    if (!marquee?.active) return null;
    const stage = previewStageRef.current;
    if (!stage) return null;
    const bounds = stage.getBoundingClientRect();
    const x1 = clamp01((marquee.startClientX - bounds.left) / bounds.width);
    const y1 = clamp01((marquee.startClientY - bounds.top) / bounds.height);
    const x2 = clamp01((marquee.currentClientX - bounds.left) / bounds.width);
    const y2 = clamp01((marquee.currentClientY - bounds.top) / bounds.height);
    return {
      left: Math.min(x1, x2),
      right: Math.max(x1, x2),
      top: Math.min(y1, y2),
      bottom: Math.max(y1, y2)
    };
  }

  function isMarkInsideMarquee(mark: NonNullable<AppModule['marks']>[number], rect: { left: number; right: number; top: number; bottom: number }) {
    const x = mark.x ?? 0.5;
    const y = mark.y ?? 0.5;
    if (mark.type !== 'text') {
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }
    const width = mark.width ?? 0.24;
    const height = mark.height ?? 0.16;
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    return right >= rect.left && left <= rect.right && bottom >= rect.top && top <= rect.bottom;
  }

  function placeMarkAtPoint(clientX: number, clientY: number, target: HTMLDivElement) {
    if (!selectedModule || selectedModule.isSystem) return;
    const bounds = target.getBoundingClientRect();
    const x = clamp01((clientX - bounds.left) / bounds.width);
    const y = clamp01((clientY - bounds.top) / bounds.height);
    const placed = {
      id: createId('mark'),
      type: 'point',
      title: 'Point mark',
      description: '',
      x,
      y
    };

    setModules((current) =>
      current.map((mod) => (mod.id === selectedModule.id ? { ...mod, marks: [placed, ...(mod.marks ?? [])] } : mod))
    );
    setSelectedMarkId(placed.id);
    setSelectedMarkIds([placed.id]);
    setDirty(true);
    setSaveMessage(null);
    setPlacingMode(false);
  }

  useEffect(() => {
    if (!marquee?.active || placingMode) return;
    const onPointerMove = (event: PointerEvent) => {
      setMarquee((current) => {
        if (!current?.active) return current;
        return {
          ...current,
          currentClientX: event.clientX,
          currentClientY: event.clientY
        };
      });
    };

    const onPointerUp = () => {
      const rect = getMarqueeRectNormalized();
      setMarquee((current) => {
        if (!current?.active) return null;
        const area = Math.abs(current.currentClientX - current.startClientX) * Math.abs(current.currentClientY - current.startClientY);
        if (rect && selectedModule && area > 16) {
          const hitIds = (selectedModule.marks ?? [])
            .filter((mark) => isMarkInsideMarquee(mark, rect))
            .map((mark) => mark.id);
          if (hitIds.length) {
            setSelectedMarkId(hitIds[0]);
            if (current.additive) {
              setSelectedMarkIds((existing) => Array.from(new Set([...existing, ...hitIds])));
            } else {
              setSelectedMarkIds(hitIds);
            }
          } else if (!current.additive) {
            setSelectedMarkId(null);
            setSelectedMarkIds([]);
          }
        }
        return null;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [marquee, placingMode, selectedModule]);

  useEffect(() => {
    if (!dragInteraction || placingMode) return;
    const onPointerMove = (event: PointerEvent) => {
      const stage = previewStageRef.current;
      if (!stage) return;
      const bounds = stage.getBoundingClientRect();
      let dx = (event.clientX - dragInteraction.startClientX) / bounds.width;
      let dy = (event.clientY - dragInteraction.startClientY) / bounds.height;
      if (axisLock === 'x') dy = 0;
      if (axisLock === 'y') dx = 0;

      if (dragInteraction.mode === 'move' || dragInteraction.initialType !== 'text') {
        if (dragInteraction.groupInitial.length > 1 && selectedModule && !selectedModule.isSystem) {
          const groupMap = new Map(dragInteraction.groupInitial.map((item) => [item.id, item]));
          setModules((current) =>
            current.map((mod) => {
              if (mod.id !== selectedModule.id) return mod;
              return {
                ...mod,
                marks: (mod.marks ?? []).map((mark) => {
                  const base = groupMap.get(mark.id);
                  if (!base) return mark;
                  return {
                    ...mark,
                    ...normalizeMarkPatch(mark, {
                      x: base.x + dx,
                      y: base.y + dy
                    })
                  };
                })
              };
            })
          );
          setDirty(true);
          setSaveMessage(null);
          return;
        }
        updateMarkPosition(dragInteraction.markId, dragInteraction.initialX + dx, dragInteraction.initialY + dy);
        return;
      }

      const initialLeft = dragInteraction.initialX - dragInteraction.initialWidth / 2;
      const initialRight = dragInteraction.initialX + dragInteraction.initialWidth / 2;
      const initialTop = dragInteraction.initialY - dragInteraction.initialHeight / 2;
      const initialBottom = dragInteraction.initialY + dragInteraction.initialHeight / 2;

      let left = initialLeft;
      let right = initialRight;
      let top = initialTop;
      let bottom = initialBottom;

      if (dragInteraction.handle === 'nw' || dragInteraction.handle === 'sw') {
        left = clamp01(initialLeft + dx);
      }
      if (dragInteraction.handle === 'ne' || dragInteraction.handle === 'se') {
        right = clamp01(initialRight + dx);
      }
      if (dragInteraction.handle === 'nw' || dragInteraction.handle === 'ne') {
        top = clamp01(initialTop + dy);
      }
      if (dragInteraction.handle === 'sw' || dragInteraction.handle === 'se') {
        bottom = clamp01(initialBottom + dy);
      }

      const width = right - left;
      const height = bottom - top;
      const clamped = clampTextRect(left + width / 2, top + height / 2, width, height);
      updateTextMarkRect(dragInteraction.markId, clamped);
    };
    const onPointerUp = () => {
      setDraggingMarkId(null);
      setDragInteraction(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragInteraction, placingMode, selectedId, axisLock, gridStep, snapEnabled]);

  useEffect(() => {
    if (!selectedModule || selectedModule.isSystem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        selectAllVisibleMarks();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModule, visibleMarkSlice, selectedMarkIds, selectedMarkId]);

  useEffect(() => {
    if (!selectedModule || selectedModule.isSystem || !selectedMark) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }

      event.preventDefault();
      const step = event.shiftKey ? 0.02 : 0.005;
      let deltaX = 0;
      let deltaY = 0;
      if (event.key === 'ArrowLeft') deltaX = -step;
      if (event.key === 'ArrowRight') deltaX = step;
      if (event.key === 'ArrowUp') deltaY = -step;
      if (event.key === 'ArrowDown') deltaY = step;
      if (axisLock === 'x') deltaY = 0;
      if (axisLock === 'y') deltaX = 0;

      if (selectedMarks.length > 1) {
        updateSelectedMarks((mark) => ({
          x: (mark.x ?? 0.5) + deltaX,
          y: (mark.y ?? 0.5) + deltaY
        }));
        return;
      }

      if (selectedMark.type === 'text') {
        const next = clampTextRect((selectedMark.x ?? 0.5) + deltaX, (selectedMark.y ?? 0.5) + deltaY, selectedMark.width ?? 0.24, selectedMark.height ?? 0.16);
        updateTextMarkRect(selectedMark.id, next);
        return;
      }
      updateMarkPosition(selectedMark.id, (selectedMark.x ?? 0.5) + deltaX, (selectedMark.y ?? 0.5) + deltaY);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedMark, selectedModule, axisLock, selectedMarks]);

  function deleteMark() {
    if (!selectedModule || selectedModule.isSystem || !selectedMark) return;
    setModules((current) =>
      current.map((mod) => {
        if (mod.id !== selectedModule.id) return mod;
        const nextMarks = (mod.marks ?? []).filter((mark) => mark.id !== selectedMark.id);
        const nextMarkId = nextMarks[0]?.id ?? null;
        setSelectedMarkId(nextMarkId);
        setSelectedMarkIds(nextMarkId ? [nextMarkId] : []);
        return { ...mod, marks: nextMarks };
      })
    );
    setDirty(true);
    setSaveMessage(null);
  }

  async function saveChanges() {
    try {
      setSaving(true);
      setError(null);
      const nextProjectId = await saveUserModules(projectId, modules);
      setProjectId(nextProjectId);
      setDirty(false);
      setSaveMessage('Changes saved successfully.');
    } catch (saveError) {
      if (saveError instanceof Error) setError(saveError.message);
      else setError('Unable to save project now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-page">
      <header className="app-page-header">
        <div>
          <p className="kicker">Editor migration</p>
          <h1>Native React App Workspace</h1>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            window.location.href = '/legacy-app.html';
          }}
        >
          Open Legacy Editor
        </button>
      </header>
      <div className="app-toolbar">
        <button type="button" className="btn btn-secondary" onClick={createModule}>
          New module
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!selectedModule || selectedModule.isSystem}
          onClick={deleteModule}
        >
          Delete module
        </button>
        <button type="button" className="btn btn-primary app-save-btn" disabled={saving || !dirty} onClick={saveChanges}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <label className="app-toolbar-option">
          <input type="checkbox" checked={snapEnabled} onChange={(event) => setSnapEnabled(event.target.checked)} />
          <span>Snap</span>
        </label>
        <label className="app-toolbar-option">
          <span>Grid</span>
          <select className="app-input app-inline-select" value={gridStep} onChange={(event) => setGridStep(Number(event.target.value))}>
            <option value={0.02}>2%</option>
            <option value={0.01}>1%</option>
            <option value={0.005}>0.5%</option>
          </select>
        </label>
        <label className="app-toolbar-option">
          <span>Axis</span>
          <select
            className="app-input app-inline-select"
            value={axisLock}
            onChange={(event) => setAxisLock(event.target.value as 'none' | 'x' | 'y')}
          >
            <option value="none">Free</option>
            <option value="x">X only</option>
            <option value="y">Y only</option>
          </select>
        </label>
        {saveMessage && <p className="feedback success">{saveMessage}</p>}
      </div>

      <div className="app-grid">
        <aside className="app-sidebar">
          <input
            className="app-search"
            placeholder="Search modules and marks..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {busy && <p className="muted">Loading modules...</p>}
          {error && <p className="feedback error">{error}</p>}
          <ul className="app-module-list">
            {filteredModules.map((mod) => (
              <li key={mod.id}>
                <button
                  type="button"
                  className={mod.id === selectedId ? 'app-module-item active' : 'app-module-item'}
                  onClick={() => {
                    setSelectedId(mod.id);
                    const nextMarkId = mod.marks?.[0]?.id ?? null;
                    setSelectedMarkId(nextMarkId);
                    setSelectedMarkIds(nextMarkId ? [nextMarkId] : []);
                  }}
                >
                  <strong>{mod.name}</strong>
                  <span>{mod.isSystem ? 'System module' : 'My module'}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <article className="app-main">
          {!selectedModule && !busy && <p className="muted">No modules found yet.</p>}
          {selectedModule && (
            <>
              <h2>{selectedModule.isSystem ? 'System module (read-only)' : 'Editable module'}</h2>
              <div className="app-edit-grid">
                <label>
                  <span>Module name</span>
                  <input
                    className="app-input"
                    value={selectedModule.name}
                    onChange={(event) => setModuleField('name', event.target.value)}
                    disabled={selectedModule.isSystem}
                  />
                </label>
                <label>
                  <span>Technical notes</span>
                  <textarea
                    className="app-textarea"
                    value={selectedModule.notes ?? ''}
                    onChange={(event) => setModuleField('notes', event.target.value)}
                    disabled={selectedModule.isSystem}
                  />
                </label>
              </div>
              {photoUrl ? (
                <div
                  ref={previewStageRef}
                  className={marquee?.active ? 'app-preview-stage selecting' : placingMode ? 'app-preview-stage placing' : 'app-preview-stage'}
                  tabIndex={0}
                  onPointerDown={(event) => {
                    if (placingMode || selectedModule.isSystem) return;
                    if (event.button !== 0) return;
                    setMarquee({
                      active: true,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      currentClientX: event.clientX,
                      currentClientY: event.clientY,
                      additive: event.ctrlKey || event.metaKey || event.shiftKey
                    });
                  }}
                  onClick={(event) => {
                    if (!placingMode) return;
                    placeMarkAtPoint(event.clientX, event.clientY, event.currentTarget);
                  }}
                >
                  <img src={photoUrl} alt={selectedModule.name} className="app-preview-image" />
                  <div className="app-mark-overlay">
                    {positionedMarks.map((mark) => (
                      mark.type === 'text' ? (
                        <div
                          key={mark.id}
                          className={
                            selectedMarkIds.includes(mark.id) || mark.id === selectedMarkId
                              ? draggingMarkId === mark.id
                                ? 'app-text-mark active dragging'
                                : 'app-text-mark active'
                              : draggingMarkId === mark.id
                                ? 'app-text-mark dragging'
                                : 'app-text-mark'
                          }
                          style={{
                            left: `${((mark.x ?? 0.5) - (mark.width ?? 0.24) / 2) * 100}%`,
                            top: `${((mark.y ?? 0.5) - (mark.height ?? 0.16) / 2) * 100}%`,
                            width: `${(mark.width ?? 0.24) * 100}%`,
                            height: `${(mark.height ?? 0.16) * 100}%`
                          }}
                          onPointerDown={(event) => {
                            if (placingMode || selectedModule.isSystem) return;
                            event.preventDefault();
                            event.stopPropagation();
                            const additive = event.ctrlKey || event.metaKey || event.shiftKey;
                            if (additive) {
                              selectMark(mark.id, true);
                              return;
                            }
                            const dragSelection = getDragSelection(mark.id);
                            setSelectedMarkId(mark.id);
                            setSelectedMarkIds(dragSelection);
                            setDraggingMarkId(mark.id);
                            setDragInteraction({
                              markId: mark.id,
                              mode: 'move',
                              groupInitial: (selectedModule.marks ?? [])
                                .filter((item) => dragSelection.includes(item.id))
                                .map((item) => ({ id: item.id, x: item.x ?? 0.5, y: item.y ?? 0.5 })),
                              startClientX: event.clientX,
                              startClientY: event.clientY,
                              initialX: mark.x ?? 0.5,
                              initialY: mark.y ?? 0.5,
                              initialWidth: mark.width ?? 0.24,
                              initialHeight: mark.height ?? 0.16,
                              initialType: 'text'
                            });
                          }}
                        >
                          <span className="app-text-mark-label">{mark.title || mark.label || 'Text'}</span>
                          {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              className={`app-text-handle ${handle}`}
                              onPointerDown={(event) => {
                                if (placingMode || selectedModule.isSystem) return;
                                event.preventDefault();
                                event.stopPropagation();
                                selectMark(mark.id, event.ctrlKey || event.metaKey || event.shiftKey);
                                setDraggingMarkId(mark.id);
                                setDragInteraction({
                                  markId: mark.id,
                                  mode: 'resize',
                                  handle,
                                  groupInitial: [{ id: mark.id, x: mark.x ?? 0.5, y: mark.y ?? 0.5 }],
                                  startClientX: event.clientX,
                                  startClientY: event.clientY,
                                  initialX: mark.x ?? 0.5,
                                  initialY: mark.y ?? 0.5,
                                  initialWidth: mark.width ?? 0.24,
                                  initialHeight: mark.height ?? 0.16,
                                  initialType: 'text'
                                });
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <button
                          key={mark.id}
                          type="button"
                          className={
                            selectedMarkIds.includes(mark.id) || mark.id === selectedMarkId
                              ? draggingMarkId === mark.id
                                ? 'app-point active dragging'
                                : 'app-point active'
                              : draggingMarkId === mark.id
                                ? 'app-point dragging'
                                : 'app-point'
                          }
                          style={{ left: `${(mark.x ?? 0.5) * 100}%`, top: `${(mark.y ?? 0.5) * 100}%` }}
                          onPointerDown={(event) => {
                            if (placingMode || selectedModule.isSystem) return;
                            event.preventDefault();
                            event.stopPropagation();
                            const additive = event.ctrlKey || event.metaKey || event.shiftKey;
                            if (additive) {
                              selectMark(mark.id, true);
                              return;
                            }
                            const dragSelection = getDragSelection(mark.id);
                            setSelectedMarkId(mark.id);
                            setSelectedMarkIds(dragSelection);
                            setDraggingMarkId(mark.id);
                            setDragInteraction({
                              markId: mark.id,
                              mode: 'move',
                              groupInitial: (selectedModule.marks ?? [])
                                .filter((item) => dragSelection.includes(item.id))
                                .map((item) => ({ id: item.id, x: item.x ?? 0.5, y: item.y ?? 0.5 })),
                              startClientX: event.clientX,
                              startClientY: event.clientY,
                              initialX: mark.x ?? 0.5,
                              initialY: mark.y ?? 0.5,
                              initialWidth: mark.width ?? 0.24,
                              initialHeight: mark.height ?? 0.16,
                              initialType: mark.type ?? 'point'
                            });
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectMark(mark.id, event.ctrlKey || event.metaKey || event.shiftKey);
                          }}
                        >
                          {mark.title?.slice(0, 1) || mark.label?.slice(0, 1) || '•'}
                        </button>
                      )
                    ))}
                    {marquee?.active && (() => {
                      const stage = previewStageRef.current;
                      if (!stage) return null;
                      const bounds = stage.getBoundingClientRect();
                      const x1 = ((marquee.startClientX - bounds.left) / bounds.width) * 100;
                      const y1 = ((marquee.startClientY - bounds.top) / bounds.height) * 100;
                      const x2 = ((marquee.currentClientX - bounds.left) / bounds.width) * 100;
                      const y2 = ((marquee.currentClientY - bounds.top) / bounds.height) * 100;
                      return (
                        <div
                          className="app-marquee"
                          style={{
                            left: `${Math.min(x1, x2)}%`,
                            top: `${Math.min(y1, y2)}%`,
                            width: `${Math.abs(x2 - x1)}%`,
                            height: `${Math.abs(y2 - y1)}%`
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="app-image-placeholder">No reference image available</div>
              )}
              <div className="app-mark-block">
                <div className="app-mark-header">
                  <h3>Marks ({visibleMarkSlice.length}/{selectedModule.marks?.length ?? 0})</h3>
                  <div className="app-mark-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={visibleMarkSlice.length === 0}
                      onClick={selectAllVisibleMarks}
                    >
                      Select visible
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={visibleMarkSlice.length === 0}
                      onClick={invertVisibleSelection}
                    >
                      Invert visible
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 2}
                      onClick={() => alignSelected('left')}
                    >
                      Align left
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 2}
                      onClick={() => alignSelected('hcenter')}
                    >
                      Align center
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 2}
                      onClick={() => alignSelected('right')}
                    >
                      Align right
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 2}
                      onClick={() => alignSelected('top')}
                    >
                      Align top
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 2}
                      onClick={() => alignSelected('vcenter')}
                    >
                      Align middle
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 2}
                      onClick={() => alignSelected('bottom')}
                    >
                      Align bottom
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 3}
                      onClick={() => distributeSelected('horizontal')}
                    >
                      Distribute H
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedMarks.length < 3}
                      onClick={() => distributeSelected('vertical')}
                    >
                      Distribute V
                    </button>
                    <button
                      type="button"
                      className={placingMode ? 'btn btn-primary' : 'btn btn-secondary'}
                      disabled={selectedModule.isSystem || !photoUrl}
                      onClick={() => setPlacingMode((value) => !value)}
                    >
                      {placingMode ? 'Cancel placement' : 'Place on image'}
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={selectedModule.isSystem} onClick={createMark}>
                      New mark
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={selectedModule.isSystem} onClick={createTextMark}>
                      New text box
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={selectedModule.isSystem || !selectedMark}
                      onClick={deleteMark}
                    >
                      Delete mark
                    </button>
                  </div>
                </div>
                <div className="app-presets">
                  <input
                    ref={presetImportInputRef}
                    type="file"
                    accept="application/json"
                    className="app-hidden-input"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) importSelectionPresetsFromFile(file);
                      event.target.value = '';
                    }}
                  />
                  <input
                    className="app-input app-preset-input"
                    placeholder="Selection preset name"
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    disabled={selectedModule.isSystem}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={selectedModule.isSystem || selectedMarkIds.length === 0}
                    onClick={saveSelectionPreset}
                  >
                    Save preset
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={selectedModule.isSystem || !editingPresetId || !presetName.trim()}
                    onClick={renameSelectionPreset}
                  >
                    Rename preset
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={selectionPresets.length === 0} onClick={exportSelectionPresets}>
                    Export presets
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={selectedModule.isSystem}
                    onClick={() => presetImportInputRef.current?.click()}
                  >
                    Import presets
                  </button>
                  <ul className="app-preset-list">
                    {selectionPresets.map((preset, index) => (
                      <li key={preset.id}>
                        <button type="button" className="btn btn-secondary" onClick={() => applySelectionPreset(preset.id)}>
                          {preset.name}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={selectedModule.isSystem}
                          onClick={() => beginRenamePreset(preset.id)}
                        >
                          Edit name
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={selectedModule.isSystem}
                          onClick={() => duplicateSelectionPreset(preset.id)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={selectedModule.isSystem || index === 0}
                          onClick={() => moveSelectionPreset(preset.id, 'up')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={selectedModule.isSystem || index === selectionPresets.length - 1}
                          onClick={() => moveSelectionPreset(preset.id, 'down')}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={selectedModule.isSystem}
                          onClick={() => deleteSelectionPreset(preset.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  {pendingPresetImports.length > 0 && (
                    <div className="app-import-conflicts">
                      <h4>Imported presets pending review</h4>
                      <div className="app-import-preview-meta">
                        <span>Selected {pendingImportPreview.total_enabled}/{pendingPresetImports.length}</span>
                        <span>Will create {pendingImportPreview.total_presets} presets</span>
                        <span>Resolved marks {pendingImportPreview.total_marks}</span>
                      </div>
                      <div className="app-import-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setAllPendingPresetsEnabled(true)}>
                          Select all
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setAllPendingPresetsEnabled(false)}>
                          Select none
                        </button>
                      </div>
                      <ul className="app-import-conflict-list">
                        {pendingPresetImports.map((item) => (
                          <li key={item.id}>
                            {(() => {
                              const mapped = Object.values(item.mappings).filter((id) => id.length > 0);
                              const resolved = Array.from(new Set([...item.base_mark_ids, ...mapped])).length;
                              const unresolved = item.unmatched_titles.filter((title) => !(item.mappings[title] ?? '').length).length;
                              return (
                                <div className="app-import-summary">
                                  <label className="app-import-toggle">
                                    <input
                                      type="checkbox"
                                      checked={item.enabled !== false}
                                      onChange={(event) => setPendingPresetEnabled(item.id, event.target.checked)}
                                    />
                                    <span>Apply</span>
                                  </label>
                                  <strong>{item.name}</strong>
                                  <span>Resolved {resolved}</span>
                                  <span>Unresolved {unresolved}</span>
                                  <button type="button" className="btn btn-secondary" onClick={() => autoMapPendingPresetByContains(item.id)}>
                                    Auto map contains
                                  </button>
                                </div>
                              );
                            })()}
                            {item.unmatched_titles.map((title) => (
                              <label key={title}>
                                <span>{title}</span>
                                <select
                                  className="app-input app-inline-select"
                                  value={item.mappings[title] ?? ''}
                                  onChange={(event) => setPendingPresetMapping(item.id, title, event.target.value)}
                                >
                                  <option value="">Skip</option>
                                  {selectableMarks.map((mark) => (
                                    <option key={mark.id} value={mark.id}>
                                      {mark.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}
                          </li>
                        ))}
                      </ul>
                      <div className="app-import-preview-list">
                        {pendingImportPreview.items.map((item) => (
                          <article key={`preview_${item.draft_id}`} className="app-import-preview-item">
                            <strong>{item.name}</strong>
                            <span>{item.resolved_count} marks</span>
                            <p>{item.resolved_marks.map((mark) => mark.label).join(', ')}</p>
                          </article>
                        ))}
                      </div>
                      <div className="app-import-actions">
                        <button type="button" className="btn btn-secondary" onClick={autoMapAllPendingPresetsByContains}>
                          Auto map all
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={pendingImportPreview.total_presets === 0}
                          onClick={applyPendingPresetImports}
                        >
                          Apply imports
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => persistPendingPresetImports([])}>
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="app-mark-editor-grid">
                  <ul className="app-mark-list">
                    {visibleMarkSlice.map((mark) => (
                      <li key={mark.id}>
                        <button
                          type="button"
                          className={selectedMarkIds.includes(mark.id) || mark.id === selectedMarkId ? 'app-mark-item active' : 'app-mark-item'}
                          onClick={(event) => selectMark(mark.id, event.ctrlKey || event.metaKey || event.shiftKey)}
                        >
                          {mark.title || mark.label || 'Untitled mark'}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {selectedMark ? (
                    <div className="app-mark-form">
                      <label>
                        <span>Mark type</span>
                        <select
                          className="app-input"
                          value={selectedMark.type ?? 'point'}
                          onChange={(event) => setMarkType(event.target.value)}
                          disabled={selectedModule.isSystem}
                        >
                          <option value="point">Point</option>
                          <option value="text">Text box</option>
                        </select>
                      </label>
                      <label>
                        <span>Mark title</span>
                        <input
                          className="app-input"
                          value={selectedMark.title ?? ''}
                          onChange={(event) => setMarkField('title', event.target.value)}
                          disabled={selectedModule.isSystem}
                        />
                      </label>
                      <label>
                        <span>Mark description</span>
                        <textarea
                          className="app-textarea"
                          value={selectedMark.description ?? ''}
                          onChange={(event) => setMarkField('description', event.target.value)}
                          disabled={selectedModule.isSystem}
                        />
                      </label>
                      <div className="app-coordinates">
                        <label>
                          <span>X</span>
                          <input
                            className="app-input"
                            type="number"
                            min={0}
                            max={1}
                            step={0.001}
                            value={Number(selectedMark.x ?? 0.5)}
                            onChange={(event) => setMarkCoordinate('x', Number(event.target.value))}
                            disabled={selectedModule.isSystem}
                          />
                        </label>
                        <label>
                          <span>Y</span>
                          <input
                            className="app-input"
                            type="number"
                            min={0}
                            max={1}
                            step={0.001}
                            value={Number(selectedMark.y ?? 0.5)}
                            onChange={(event) => setMarkCoordinate('y', Number(event.target.value))}
                            disabled={selectedModule.isSystem}
                          />
                        </label>
                        {selectedMark.type === 'text' && (
                          <>
                            <label>
                              <span>Width</span>
                              <input
                                className="app-input"
                                type="number"
                                min={0.05}
                                max={1}
                                step={0.001}
                                value={Number(selectedMark.width ?? 0.24)}
                                onChange={(event) => setMarkSize('width', Number(event.target.value))}
                                disabled={selectedModule.isSystem}
                              />
                            </label>
                            <label>
                              <span>Height</span>
                              <input
                                className="app-input"
                                type="number"
                                min={0.05}
                                max={1}
                                step={0.001}
                                value={Number(selectedMark.height ?? 0.16)}
                                onChange={(event) => setMarkSize('height', Number(event.target.value))}
                                disabled={selectedModule.isSystem}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="muted">Select a mark to view details.</p>
                  )}
                </div>
                <p className="app-hint">Tip: drag points/boxes directly. Multi-selected marks move together on drag. Use arrow keys to nudge selected marks, Shift+Arrow for larger steps.</p>
                <p className="app-hint">Selection: Ctrl/⌘+click toggles marks, Ctrl/⌘+A selects visible marks, and drag on empty image area creates a marquee box.</p>
                <p className="app-hint">Preset import tries mark id first, then title matching, with auto-map-by-contains and manual mapping options.</p>
                <p className="app-hint">Import mapping drafts are saved per module and restored when you return.</p>
                <p className="app-hint">Preview shows exactly which presets and marks will be created; apply uses only checked drafts.</p>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
