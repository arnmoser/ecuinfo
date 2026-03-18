import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthMode, mapAuthError, signInWithEmail, signUpNewUser } from '../services/authClient';
import { runPendingCheckoutIfAny } from '../services/billingClient';

type AuthPageProps = {
  mode: AuthMode;
};

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptLegal, setAcceptLegal] = useState(false);

  const title = useMemo(() => (isRegister ? 'Create your ECU Info account' : 'Sign in to ECU Info'), [isRegister]);

  const submitLabel = busy ? (isRegister ? 'Creating account...' : 'Signing in...') : isRegister ? 'Create account' : 'Sign in';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    try {
      setBusy(true);
      if (isRegister) {
        const passwordConfirm = String(formData.get('passwordConfirm') ?? '');
        const whatsapp = String(formData.get('whatsapp') ?? '');
        const marketing = formData.get('whatsappMarketing') === 'on';

        if (password !== passwordConfirm) {
          setError('Passwords do not match.');
          return;
        }

        if (!acceptLegal) {
          setError('You need to accept Terms and Privacy Policy to register.');
          return;
        }

        await signUpNewUser(email, password, whatsapp, marketing);
        setMessage('Account created successfully. Redirecting to app...');
      } else {
        await signInWithEmail(email, password);
        setMessage('Login successful. Redirecting to app...');
      }

      const redirectedToCheckout = await runPendingCheckoutIfAny();
      if (!redirectedToCheckout) {
        setTimeout(() => navigate('/app'), 250);
      }
    } catch (submitError) {
      setError(mapAuthError(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <p className="kicker">{isRegister ? '7-day trial' : 'Welcome back'}</p>
        <h1>{title}</h1>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>Email</span>
            <input required name="email" type="email" placeholder="you@workshop.com" />
          </label>
          <label>
            <span>Password</span>
            <input required minLength={6} name="password" type="password" placeholder="At least 6 characters" />
          </label>

          {isRegister && (
            <>
              <label>
                <span>Confirm password</span>
                <input required minLength={6} name="passwordConfirm" type="password" placeholder="Confirm password" />
              </label>
              <label>
                <span>WhatsApp</span>
                <input required name="whatsapp" type="tel" placeholder="e.g. +55 47 99999-9999" />
              </label>
              <label className="checkbox-row">
                <input name="whatsappMarketing" type="checkbox" />
                <span>Allow ECU Info news on WhatsApp</span>
              </label>
              <label className="checkbox-row">
                <input checked={acceptLegal} onChange={(e) => setAcceptLegal(e.target.checked)} type="checkbox" />
                <span>
                  I agree with <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>.
                </span>
              </label>
            </>
          )}

          {error && <p className="feedback error">{error}</p>}
          {message && <p className="feedback success">{message}</p>}

          <button disabled={busy} type="submit" className="btn btn-primary auth-submit">
            {submitLabel}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create one now'}</Link>
        </p>
      </div>
    </section>
  );
}
