import { Link } from 'react-router-dom';

const highlights = [
  'Mapeie componentes e defeitos direto na placa',
  'Centralize fotos, notas e marcações por módulo',
  'Reduza retrabalho no diagnóstico diário'
];

export function LandingPage() {
  return (
    <section className="landing">
      <div className="hero-card">
        <p className="kicker">Sistema para reparadores de centrais</p>
        <h1>Domine seus reparos com um banco técnico vivo</h1>
        <p className="lead">
          Organize conhecimento da bancada em um fluxo único de módulos, marcações e notas para acelerar decisões e padronizar processos.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" to="/register">
            Criar conta grátis
          </Link>
          <Link className="btn btn-secondary" to="/login">
            Já tenho conta
          </Link>
        </div>
      </div>
      <aside className="benefits-card">
        <h2>Por que migrar sua rotina para ECU Info</h2>
        <ul>
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link className="text-link" to="/app">
          Abrir aplicação
        </Link>
      </aside>
    </section>
  );
}
