# AGENTS

## Projeto
ECU Info e um MVP de sistema web para tecnicos automotivos. O produto permite criar modulos, adicionar fotos, marcar pontos de teste e textos, organizar e buscar informacoes de centrais eletronicas. Interface em HTML, CSS e JavaScript. Backend com Supabase. Pagamentos via Stripe.

## Modelos de assinatura e acesso

### 1. Cadastro e trial
- Todo novo usuario recebe 7 dias de trial completo.
- Durante o trial: status = 'demo', acesso total ao app.
- Campos: demo_started_at e demo_expires_at sao preenchidos via trigger no Supabase.

### 2. Estados da conta
- 'demo': trial ativo ate demo_expires_at.
- 'active': assinatura paga ativa ou trial valido.
- 'expired': trial expirado ou assinatura nao paga/cancelada.

### 3. Controle de acesso
- Acesso ao app somente se account_access.has_access = true.
- Conta 'expired' e bloqueada:
  - nao ve projetos.
  - nao entra no app.
- Dados permanecem salvos e seguros na nuvem.
- Tela de bloqueio com botao para remarketing.html.

### 4. Assinatura e pagamento
- Planos: Mensal e Anual (Stripe).
- Pagamento via Stripe Checkout.
- Apos pagamento bem-sucedido:
  - acesso reativado imediatamente.
  - status muda para 'active'.
  - usuario volta ao app.
- Grace period do Stripe respeitado (acesso ate o fim do ciclo pago).

### 5. Fluxo de reativacao
- Usuario expirado vai para remarketing.html.
- Escolhe mensal ou anual.
- Se nao logado: login e checkout inicia automaticamente.
- Se logado: vai direto ao checkout.
- Se assinatura ativa e clicar em assinar: oferecer Customer Portal.

### 6. Customer Portal
- Usuario ativo pode:
  - atualizar cartao
  - cancelar assinatura
  - ver invoices
- Acesso via Edge Function create-portal-session.

### 7. ECU Packs (add-ons)
- Sao projetos prontos, compra unica (one-time payment).
- Acesso vitalicio enquanto a assinatura principal estiver ativa.
- Nao sao consumiveis.
- Nao ha packs gratis mensais (por enquanto).

### 8. Seguranca e dados
- Dados do usuario (projetos, fotos, anotacoes) ficam salvos permanentemente.
- Mesmo com conta expirada, nada e apagado.
- RLS ativada nas tabelas principais (projects, etc.) e depende de conta ativa.

### 9. Experiencia do usuario (UX)
- Fluxo sem friccao: nao logado -> login -> checkout automatico.
- Mensagens claras em caso de erro ou bloqueio.
- Redirecionamentos inteligentes com contexto preservado.
- Paginas dedicadas: success.html, cancel.html, remarketing.html.

### 10. Tecnico
- Integracao com Supabase Auth + Stripe Sync Engine.
- Triggers automaticos para criacao de conta no cadastro.
- View account_access para verificacao centralizada de acesso.
- Edge Functions seguras com autenticacao e CORS.

## Modelo de dados: Project, Module e Mark

### Project
- Existe exatamente 1 Project por usuario.
- O usuario nao cria nem gerencia projetos.
- Container raiz de tudo; define contexto global.
- Contem todos os Modules e metadados globais.
- Resumo: Project e o filesystem do usuario.

### Module
- Unidade real de trabalho.
- Representa uma ECU, placa ou variacao tecnica.
- Organiza o trabalho por contexto tecnico.
- Contem imagem, notas e marks.

Estrutura base:
```
{
  id: uid('mod'),
  name: 'Novo Modulo',
  notes: '',
  photo: '',
  marks: []
}
```

### Mark
- Entidade filha que so existe dentro de um Module.
- Anota informacao tecnica com referencia espacial e semantica.
- Coordenadas percentuais (independentes de zoom/pan).
- type explicito, label curto, title + description.
- size desacoplado para controle visual.

### Relacao final
Usuario tem 1 Project -> Project organiza Modules -> Modules dao significado as Marks.
