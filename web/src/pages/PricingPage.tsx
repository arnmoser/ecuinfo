import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openPortalForCurrentUser, stashPendingPlan, startPlanCheckout } from '../services/billingClient';

type PlanType = 'monthly' | 'annual';

const plans: { id: PlanType; name: string; price: string; period: string; featured?: boolean; items: string[] }[] = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 'R$ 99',
    period: '/mês',
    items: ['Biblioteca técnica de módulos', 'Editor visual com marcações', 'Sincronização em nuvem']
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 'R$ 997',
    period: '/ano',
    featured: true,
    items: ['Todos os recursos do plano mensal', 'Economia equivalente a 2 meses', 'Prioridade em atualizações']
  }
];

export function PricingPage() {
  const navigate = useNavigate();
  const [busyPlan, setBusyPlan] = useState<PlanType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getErrorMessage(errorValue: unknown) {
    if (errorValue instanceof Error) return errorValue.message;
    return 'Unexpected billing error. Please try again.';
  }

  async function handleCheckout(plan: PlanType) {
    setBusyPlan(plan);
    setError(null);
    setMessage(null);
    try {
      const result = await startPlanCheckout(plan);
      if (result.needsLogin) {
        stashPendingPlan(plan);
        navigate('/login');
      }
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError));
    } finally {
      setBusyPlan(null);
    }
  }

  async function handlePortal() {
    setError(null);
    setMessage(null);
    try {
      await openPortalForCurrentUser();
    } catch (portalError) {
      setError(getErrorMessage(portalError));
      setMessage('Tip: sign in and then open billing portal from this page.');
    }
  }

  return (
    <section className="pricing-page">
      <header className="pricing-header">
        <p className="kicker">Planos ECU Info</p>
        <h1>Escolha o plano ideal para sua bancada</h1>
        <p>Assine com checkout seguro e gerencie cobranças pelo portal do cliente.</p>
      </header>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <article key={plan.id} className={plan.featured ? 'plan-card featured' : 'plan-card'}>
            <h2>{plan.name}</h2>
            <p className="plan-price">
              {plan.price}
              <span>{plan.period}</span>
            </p>
            <ul>
              {plan.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button
              className="btn btn-primary plan-cta"
              disabled={busyPlan !== null}
              type="button"
              onClick={() => handleCheckout(plan.id)}
            >
              {busyPlan === plan.id ? 'Aguarde...' : `Assinar ${plan.name}`}
            </button>
          </article>
        ))}
      </div>

      <div className="pricing-actions">
        <button type="button" className="btn btn-secondary" onClick={handlePortal}>
          Gerenciar assinatura
        </button>
      </div>

      {error && <p className="feedback error">{error}</p>}
      {message && <p className="feedback success">{message}</p>}
    </section>
  );
}
