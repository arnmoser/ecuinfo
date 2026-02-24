# AGENTS

DOCUMENTAÇÃO TÉCNICA: ECU INFO (v2.0)
1. Visão Geral do Projeto
O ECU Info é um sistema web (SaaS) projetado para técnicos em eletrônica automotiva. Ele funciona como uma biblioteca técnica interativa onde o usuário pode gerenciar fotos de centrais eletrônicas (ECUs), mapear pontos de teste e consultar manuais. O sistema é construído com tecnologia Fullstack Serverless (HTML/JS puro no Frontend e Supabase no Backend).

2. Estratégia de Conteúdo e Domínios
A grande evolução do sistema é a separação entre conteúdo proprietário e conteúdo do usuário:

2.1. Domínio Global (System Modules)
Fonte: Tabela system_modules (Pública/Read-only).

Identificação: IDs com prefixo mod_sys_.

Comportamento: Módulos oficiais fornecidos pela plataforma. São imutáveis para o usuário.

Segurança: Protegidos por RLS (Row Level Security) que impede INSERT, UPDATE ou DELETE via frontend.

2.2. Domínio do Usuário (Private Modules)
Fonte: Campo JSONB na tabela projects.

Identificação: IDs dinâmicos gerados no frontend.

Comportamento: Módulos criados pelo usuário ou clonados do sistema. Totalmente editáveis.

3. Modelo de Dados
3.1. Project (O Filesystem)
Cada usuário possui exatamente um projeto.

Funciona como o container raiz para todos os módulos privados do usuário.

Sanitização de Payload: Ao salvar, o sistema filtra o estado e remove qualquer dado pertencente ao Domínio Global para evitar redundância no banco.

3.2. Module (Unidade de Trabalho)
Representa uma ECU específica.

JavaScript
{
  id: "mod_sys_xyz" ou "mod_abc123",
  name: "Nome da ECU",
  notes: "Texto com dicas técnicas",
  photo_path: "caminho_no_storage.png",
  marks: [],        // Array de objetos Mark
  isSystem: boolean // Define permissões de UI
}
3.3. Mark (Marcação Espacial)
Pontos de interesse na foto da ECU.

Coordenadas: Percentuais (x, y, width, height) para garantir precisão em qualquer tamanho de tela.

Tipos: Texto, alimentação, sinal, aterramento, etc.

UI Lock: Marks em módulos globais têm eventos de arrastar/redimensionar bloqueados.

4. Assinatura e Controle de Acesso
4.1. Estados da Conta
'demo': Trial de 7 dias (calculado via triggers no Supabase).

'active': Assinatura Stripe em dia.

'expired': Fim do trial ou inadimplência. Bloqueia o acesso ao app e redireciona para remarketing.html.

4.2. Integração Stripe
Pagamentos: Stripe Checkout (Planos Mensal/Anual).

Sincronização: Stripe Sync Engine + Edge Functions.

Customer Portal: Permite gestão de cartões e cancelamentos via create-portal-session.

5. Fluxos Especiais
5.1. Mecanismo de Clonagem
Permite que o usuário torne um módulo do sistema "seu":

O sistema copia a imagem do bucket ecu-system para o bucket ecu_images.

Gera-se um novo registro no domínio do usuário sem a flag isSystem.

5.2. Otimização de Storage
Imagens oficiais ficam no bucket protegido ecu-system.

Imagens de usuários ficam no bucket ecu_images.

O sistema remove strings em Base64 assim que o upload é concluído para manter o banco de dados leve.

6. UX e Interface (Blindagem)
Feedback Visual: Módulos globais exibem cursor not-allowed em campos de texto e marcas fixas.

Acesso Fluido: Usuários expirados podem visualizar planos e assinar sem necessidade de novo login (contexto preservado).

7. Pilha Técnica
Frontend: Vanilla JS, CSS3 (variáveis e flexbox), HTML5.

Backend: Supabase (Auth, PostgreSQL, Storage, Edge Functions).

Pagamentos: Stripe API.

Infra: Cloudflare Pages (Hosting).

Atualizado em: 2026-02-24