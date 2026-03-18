import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSession, supabase } from '../services/authClient';

const MAX_ATTEMPTS = 15;

export function SuccessPage() {
  const [message, setMessage] = useState('Só um instante, estamos reativando sua conta...');
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const authChannel = new BroadcastChannel('ecuinfo-auth-channel');

    const intervalId = window.setInterval(async () => {
      attempts += 1;
      const session = await getSession();

      if (session?.user?.id) {
        const { data: access } = await supabase
          .from('account_access')
          .select('has_access')
          .eq('owner_user_id', session.user.id)
          .single();

        if (access?.has_access) {
          window.clearInterval(intervalId);
          authChannel.postMessage({ type: 'RELOAD_STATUS' });
          setMessage('Sua conta está ativa! Redirecionando...');
          setLoading(false);
          window.setTimeout(() => {
            window.location.href = '/legacy-app.html';
          }, 1000);
          return;
        }
      }

      if (attempts >= MAX_ATTEMPTS) {
        window.clearInterval(intervalId);
        setLoading(false);
        setShowActions(true);
        setMessage(
          'Sua conta será ativada em breve. O processo pode levar alguns minutos. Se o acesso não for liberado, entre em contato com nosso suporte.'
        );
      }
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
      authChannel.close();
    };
  }, []);

  return (
    <section className="status-page status-success">
      <div className="status-card">
        <span className="status-icon">✓</span>
        <h1>Pagamento aprovado!</h1>
        <p>{message}</p>
        {loading && <div className="status-spinner" />}
        {showActions && (
          <div className="status-actions">
            <Link to="/app" className="btn btn-primary status-primary">
              Ir para o App
            </Link>
          </div>
        )}
      </div>
      <footer className="legal-footer">
        <Link to="/terms">Termos de Uso</Link>
        <Link to="/privacy">Política de Privacidade</Link>
      </footer>
    </section>
  );
}
