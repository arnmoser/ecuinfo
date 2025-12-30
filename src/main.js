import { supabase } from './services/supabase.js';
import { state } from './state.js';
import { handleAuthEvent } from './authController.js';
import { showLoginScreen, setupLoginForm } from './ui-login.js';
import { setupLogout } from './ui-logout.js';

function boot() {
  showLoginScreen();
  setupLoginForm();

  supabase.auth.onAuthStateChange((event, session) => {
    handleAuthEvent(event, session);
  });

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      state.user = data.session.user;
    }
  });
}

boot();
