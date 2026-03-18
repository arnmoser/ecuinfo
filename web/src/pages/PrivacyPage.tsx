import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. COLETA E TRATAMENTO DE DADOS PESSOAIS',
    paragraphs: [
      'O ECU Info coleta apenas os dados necessários para prestação do serviço, com base legal adequada.',
      'Os dados podem ser coletados no cadastro, durante o uso da plataforma e em interações com suporte.'
    ]
  },
  {
    title: '2. TIPOS DE DADOS E FINALIDADES',
    paragraphs: [
      'Dados de identificação (nome, e-mail e login) são usados para criação e gestão da conta.',
      'Dados de uso e dados técnicos são utilizados para segurança, estabilidade, prevenção de fraude e melhoria do serviço.',
      'Dados de pagamento, quando aplicáveis, são processados por intermediadores externos para cobrança e gestão de assinaturas.'
    ]
  },
  {
    title: '3. DIREITOS DOS USUÁRIOS',
    paragraphs: [
      'Nos termos da LGPD, o usuário pode solicitar confirmação de tratamento, acesso, correção, exclusão quando possível e revogação de consentimento.',
      'Solicitações devem ser feitas pelos canais oficiais do ECU Info.'
    ]
  },
  {
    title: '4. COMPARTILHAMENTO DE DADOS',
    paragraphs: [
      'Dados pessoais podem ser compartilhados com prestadores essenciais e para cumprimento de obrigações legais ou ordens judiciais.',
      'O ECU Info não comercializa dados pessoais.'
    ]
  },
  {
    title: '5. MEDIDAS DE SEGURANÇA',
    paragraphs: [
      'São adotadas medidas técnicas e administrativas razoáveis contra acessos não autorizados, vazamentos, alterações indevidas e perda de informações.',
      'Nenhum sistema é totalmente imune, mas o compromisso é manter boas práticas de segurança da informação.'
    ]
  },
  {
    title: '6. TEMPO DE RETENÇÃO',
    paragraphs: [
      'Os dados são armazenados pelo tempo necessário para prestação do serviço, pelos prazos legais e regulatórios ou até solicitação válida de exclusão.'
    ]
  },
  {
    title: '7. CORREÇÃO, EXCLUSÃO E ACESSO',
    paragraphs: [
      'O usuário pode solicitar correção ou exclusão de dados, respeitados os limites legais de retenção.',
      'As solicitações são analisadas dentro dos prazos legais.'
    ]
  },
  {
    title: '8. COOKIES E TECNOLOGIAS DE RASTREAMENTO',
    paragraphs: [
      'O ECU Info pode utilizar cookies para melhorar experiência, garantir funcionamento e apoiar análises de desempenho.',
      'O usuário pode gerenciar cookies nas configurações do navegador.'
    ]
  },
  {
    title: '9. ALTERAÇÕES DE POLÍTICA',
    paragraphs: [
      'Esta política pode ser atualizada a qualquer momento e alterações relevantes serão comunicadas aos usuários.'
    ]
  },
  {
    title: '10. CONTATO',
    paragraphs: [
      'Para dúvidas ou exercício de direitos relacionados à privacidade, utilize os canais oficiais disponibilizados na plataforma.'
    ]
  }
];

export function PrivacyPage() {
  return (
    <section className="legal-page">
      <header className="legal-header">
        <p className="kicker">Documentação legal</p>
        <h1>Política de Privacidade</h1>
        <p>Versão 1.0 • Vigência 03/01/2026 • Última atualização 03 de janeiro de 2026</p>
      </header>

      <article className="legal-card">
        <p>
          Esta Política de Privacidade descreve como o ECU Info coleta, utiliza, armazena e protege dados pessoais em
          conformidade com a LGPD (Lei nº 13.709/2018).
        </p>
        {sections.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </section>
        ))}
      </article>

      <footer className="legal-footer">
        <Link to="/terms">Termos de Uso</Link>
        <Link to="/landing">Voltar</Link>
      </footer>
    </section>
  );
}
