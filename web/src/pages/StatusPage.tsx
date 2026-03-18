import { Link } from 'react-router-dom';

export function StatusPage() {
  return (
    <section className="status-page status-neutral">
      <div className="status-card">
        <span className="status-icon">ⓘ</span>
        <h1>Status da assinatura</h1>
        <p>Use esta página para navegar rapidamente para assinatura, login ou aplicação.</p>
        <div className="status-actions">
          <Link to="/remarketing" className="btn btn-primary status-primary">
            Ver planos
          </Link>
          <Link to="/app" className="btn btn-secondary status-secondary">
            Abrir app
          </Link>
          <Link to="/login" className="btn btn-secondary status-secondary">
            Fazer login
          </Link>
        </div>
      </div>
      <footer className="legal-footer">
        <Link to="/terms">Termos de Uso</Link>
        <Link to="/privacy">Política de Privacidade</Link>
      </footer>
    </section>
  );
}
