import {
  renderModuleList,
  renderCurrentModule
} from './rendering.js';
import { applyTransform, setupStagePanZoom } from './stage.js';
import { setupMarkCreationEvents } from './marks.js';
import { setupGlobalEvents } from './events.js';
import { handleResize } from './mobile/mobile-ui.js';

export function initUI() {
  document.getElementById('toolPoint')?.classList.add('active');

  renderModuleList();
  renderCurrentModule();
  applyTransform();

  setupGlobalEvents();
  setupStagePanZoom();
  setupMarkCreationEvents();

  // Evaluate the screen width and auto-boot Mobile mode if on phone
  handleResize();
}
