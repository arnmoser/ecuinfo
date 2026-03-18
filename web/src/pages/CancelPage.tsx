import { Link } from 'react-router-dom';

export function CancelPage() {
  return (
    <section className="status-page status-cancel">
      <div className="status-card">
        <span className="status-icon">✗</span>
        <h1>Pagamento cancelado</h1>
        <p>Você cancelou o processo de assinatura.</p>
        <p>Seus projetos continuam salvos. Quando quiser, pode reativar seu acesso a qualquer momento.</p>
        <div className="status-actions">
          <Link to="/remarketing" className="btn btn-primary status-primary">
            Voltar e escolher plano
          </Link>
          <Link to="/login" className="btn btn-secondary status-secondary">
            Fazer login
          </Link>
        </div>
        <small>Estamos aqui quando você precisar.</small>
      </div>
      <footer className="legal-footer">
        <Link to="/terms">Termos de Uso</Link>
        <Link to="/privacy">Política de Privacidade</Link>
      </footer>
    </section>
  );
}
