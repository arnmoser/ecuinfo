import {
  renderModuleList,
  renderCurrentModule
} from './rendering.js';
import { applyTransform, setupStagePanZoom } from './stage.js';
import { setupMarkCreationEvents } from './marks.js';
import { setupGlobalEvents } from './events.js';

export function initUI() {
  document.getElementById('toolPoint')?.classList.add('active');

  renderModuleList();
  renderCurrentModule();
  applyTransform();

  setupGlobalEvents();
  setupStagePanZoom();
  setupMarkCreationEvents();
}
