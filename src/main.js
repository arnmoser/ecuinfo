import { supabase } from './services/supabase.js';
import { state } from './state.js';
import { handleAuthEvent } from './authController.js';
import { showLoginScreen, setupAuthForms } from './ui-login.js';
import { setupLogout } from './ui-logout.js';

function boot() {
  showLoginScreen();
  setupAuthForms();

  supabase.auth.onAuthStateChange((event, session) => {
    handleAuthEvent(event, session);
  });

}

boot();
