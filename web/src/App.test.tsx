import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { App } from './App';

jest.mock('./AppShell', () => ({
  AppShell: () => (
    <div data-testid="shell">
      <Outlet />
    </div>
  )
}));

jest.mock('./pages/LandingPage', () => ({
  LandingPage: () => <div data-testid="route-landing">landing</div>
}));
jest.mock('./pages/AppPage', () => ({
  AppPage: () => <div data-testid="route-app">app</div>
}));
jest.mock('./pages/AuthPage', () => ({
  AuthPage: ({ mode }: { mode: string }) => <div data-testid={`route-auth-${mode}`}>{mode}</div>
}));
jest.mock('./pages/PricingPage', () => ({
  PricingPage: () => <div data-testid="route-remarketing">remarketing</div>
}));
jest.mock('./pages/CancelPage', () => ({
  CancelPage: () => <div data-testid="route-cancel">cancel</div>
}));
jest.mock('./pages/SuccessPage', () => ({
  SuccessPage: () => <div data-testid="route-success">success</div>
}));
jest.mock('./pages/StatusPage', () => ({
  StatusPage: () => <div data-testid="route-status">status</div>
}));
jest.mock('./pages/PrivacyPage', () => ({
  PrivacyPage: () => <div data-testid="route-privacy">privacy</div>
}));
jest.mock('./pages/TermsPage', () => ({
  TermsPage: () => <div data-testid="route-terms">terms</div>
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App routes smoke', () => {
  it('routes /app to app page', () => {
    renderAt('/app');
    expect(screen.getByTestId('route-app')).toBeInTheDocument();
  });

  it('routes /login and /register to auth variants', () => {
    const loginView = renderAt('/login');
    expect(screen.getByTestId('route-auth-login')).toBeInTheDocument();
    loginView.unmount();
    renderAt('/register');
    expect(screen.getByTestId('route-auth-register')).toBeInTheDocument();
  });

  it('renders all static pages', () => {
    let view = renderAt('/remarketing');
    expect(screen.getByTestId('route-remarketing')).toBeInTheDocument();
    view.unmount();
    view = renderAt('/cancel');
    expect(screen.getByTestId('route-cancel')).toBeInTheDocument();
    view.unmount();
    view = renderAt('/success');
    expect(screen.getByTestId('route-success')).toBeInTheDocument();
    view.unmount();
    view = renderAt('/status');
    expect(screen.getByTestId('route-status')).toBeInTheDocument();
    view.unmount();
    view = renderAt('/privacy');
    expect(screen.getByTestId('route-privacy')).toBeInTheDocument();
    view.unmount();
    renderAt('/terms');
    expect(screen.getByTestId('route-terms')).toBeInTheDocument();
  });

  it('redirects root and unknown paths to landing', () => {
    const rootView = renderAt('/');
    expect(screen.getByTestId('route-landing')).toBeInTheDocument();
    rootView.unmount();
    renderAt('/not-found');
    expect(screen.getByTestId('route-landing')).toBeInTheDocument();
  });
});
