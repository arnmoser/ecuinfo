/* dom.js - Seleção de elementos do DOM */
export const moduleListEl = document.getElementById('moduleList');
export const newModuleBtn = document.getElementById('newModuleBtn');
export const moduleNameInput = document.getElementById('moduleName');
export const moduleNotesInput = document.getElementById('moduleNotes');
export const photoInput = document.getElementById('photoInput');
export const stage = document.getElementById('stage');
export const stageImg = document.getElementById('stageImg');
export const marksLayer = document.getElementById('marksLayer');
export const toolPointBtn = document.getElementById('toolPoint');
export const toolTextBtn = document.getElementById('toolText');
export const exportBtn = document.getElementById('exportBtn');
export const importInput = document.getElementById('importInput');
export const moduleSearch = document.getElementById('moduleSearch');
export const quickSearch = document.getElementById('quickSearch');
export const deleteModuleBtn = document.getElementById('deleteModuleBtn');
export const moduleTpl = document.getElementById('moduleItemTpl');
export const markTpl = document.getElementById('markTpl');
// Elemento dinâmico para transformações
export const getStageContent = () => document.getElementById('stageContent');