import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. DEFINIÇÃO DOS SERVIÇOS',
    paragraphs: [
      'O ECU Info é uma plataforma digital destinada ao apoio técnico, organização, armazenamento, visualização, comparação e gestão de informações relacionadas a módulos eletrônicos automotivos (ECUs).',
      'A plataforma permite que o usuário organize informações técnicas próprias, armazene imagens e anotações, compare dados inseridos e utilize conteúdos digitais licenciados quando aplicável.',
      'O ECU Info não executa reparos físicos, não substitui diagnóstico técnico profissional e não garante resultados práticos decorrentes do uso das informações.'
    ]
  },
  {
    title: '2. DIREITOS E RESPONSABILIDADES DO USUÁRIO',
    paragraphs: [
      'O usuário compromete-se a fornecer informações verdadeiras no cadastro, manter suas credenciais seguras e utilizar a plataforma de forma ética e legal.',
      'O usuário é responsável pelas ações realizadas na conta, pelas decisões técnicas tomadas com base no conteúdo e pelos dados inseridos na plataforma.',
      'É vedado compartilhar conta com terceiros, criar múltiplas contas para burlar limites, usar o serviço para fins ilegais ou inserir conteúdos maliciosos.'
    ]
  },
  {
    title: '3. POLÍTICA DE USO ACEITÁVEL E RESTRIÇÕES',
    paragraphs: [
      'É proibido explorar vulnerabilidades, realizar engenharia reversa, copiar ou revender partes da plataforma e utilizar o serviço para práticas ilícitas.',
      'O descumprimento dessas regras poderá resultar em suspensão ou encerramento da conta, além das medidas legais cabíveis.'
    ]
  },
  {
    title: '4. GARANTIAS E ISENÇÕES DE RESPONSABILIDADE',
    paragraphs: [
      'O ECU Info é fornecido como está, com esforços razoáveis para manter funcionamento adequado.',
      'O serviço responde por falhas comprovadas na prestação, mas não por danos decorrentes de uso inadequado, decisões técnicas do usuário ou conteúdo de terceiros.',
      'Não há garantia de disponibilidade ininterrupta, ausência total de erros ou compatibilidade com todos os cenários técnicos possíveis.'
    ]
  },
  {
    title: '5. RESOLUÇÃO DE DISPUTAS E MEDIAÇÃO',
    paragraphs: [
      'Conflitos devem ser tratados preferencialmente de forma administrativa pelos canais oficiais.',
      'Se não houver solução amigável, as partes podem recorrer aos meios legais previstos na legislação brasileira.'
    ]
  },
  {
    title: '6. MODIFICAÇÕES DOS TERMOS DE USO',
    paragraphs: [
      'Os Termos de Uso podem ser atualizados a qualquer momento para refletir melhorias do serviço ou adequações legais.',
      'Alterações relevantes serão comunicadas e o uso contínuo após atualização implica aceitação da nova versão.'
    ]
  },
  {
    title: '7. LEI APLICÁVEL E FORO',
    paragraphs: [
      'Estes termos são regidos pelas leis da República Federativa do Brasil.',
      'Nos termos do Código de Defesa do Consumidor, o usuário consumidor pode ajuizar ação no foro de seu domicílio.'
    ]
  }
];

export function TermsPage() {
  return (
    <section className="legal-page">
      <header className="legal-header">
        <p className="kicker">Documentação legal</p>
        <h1>Termos de Uso</h1>
        <p>Versão 1.0 • Vigência 03/01/2026 • Última atualização 03 de janeiro de 2026</p>
      </header>

      <article className="legal-card">
        <p>
          Estes Termos de Uso regulam o acesso e utilização do ECU Info como plataforma SaaS. Ao criar conta ou usar a
          plataforma, você declara ciência e concordância integral com estes termos.
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
        <Link to="/privacy">Política de Privacidade</Link>
        <Link to="/landing">Voltar</Link>
      </footer>
    </section>
  );
}
