# Status do projeto — DocFlow

## Fase atual

MVP concluído, publicado e auditado funcional e visualmente.

## Concluído

- foundation React/Vite e FastAPI;
- PostgreSQL e migration Alembic inicial;
- Company, User, autenticação JWT e refresh token;
- gestão de usuários com CPF, edição, troca de senha, ativação, inativação e exclusão segura;
- RBAC e isolamento multi-tenant no backend;
- documentos de texto e PDF;
- versionamento imutável;
- workflow completo de revisão e publicação;
- comentários e trilha de auditoria;
- abstração FileStorage com implementações local e S3 compatível;
- OCR híbrido para PDFs digitalizados, com Tesseract em português e inglês;
- abstração de IA com provider Gemini;
- ditado com gravação de voz, normalização FFmpeg, transcrição e correção com Gemini;
- dashboard, documentos, detalhe, criação, edição, histórico, comparação e usuários;
- seed idempotente com dados profissionais;
- testes backend e frontend;
- Dockerfiles e Docker Compose;
- healthcheck de processo e readiness do PostgreSQL;
- frontend publicado no projeto `docflow-saas` do Cloudflare Pages;
- API publicada no serviço `api` da Northflank, com liveness e readiness;
- PostgreSQL Neon conectado com TLS e migrations aplicadas;
- bucket privado Backblaze B2 validado por upload e download autenticado;
- Gemini 3.6 Flash validado nas funcionalidades de IA publicadas, inclusive a transcrição de áudio real em produção;
- OCR validado em produção com PDF sem camada textual;
- documentação de hospedagem Northflank, Neon, Backblaze B2 e Cloudflare;
- workflow de CI;
- auditoria de QA com regressão funcional e responsiva em desktop, tablet e mobile;
- listagem adaptativa com tabela no desktop e cards informativos em telas menores;
- README e licença.

## Pendente

- nenhuma pendência funcional do MVP;
- domínio personalizado e recursos do roadmap permanecem como evoluções futuras, sem implementação neste escopo.

## Problemas conhecidos

- o Developer Sandbox da Northflank possui 512 MB de memória e capacidade limitada durante rollouts;
- a conexão Neon usa o pooler com IPv4 explícito porque o sandbox não alcança o endereço IPv6; uma troca dos IPs do pooler exige atualizar `DATABASE_URL`;
- a disponibilidade e as cotas do Gemini dependem do nível gratuito do provedor;
- OCR aceita no máximo 25 páginas digitalizadas por requisição e PDFs de até 100 páginas;
- o ambiente público ainda não possui domínio personalizado;
- não há notificações, SSO, assinatura digital ou DOCX no MVP.

## Testes

- backend: 30 testes aprovados;
- Ruff: aprovado;
- frontend: 12 testes aprovados;
- ESLint: aprovado;
- Prettier: aprovado;
- build de produção: aprovado;
- npm audit: zero vulnerabilidades;
- migrations: upgrade, check e downgrade aprovados em SQLite; `head` e `check` aprovados no PostgreSQL;
- Playwright: 7 testes aprovados no ambiente Docker — 3 fluxos documentais, 1 fluxo completo de usuário e 3 matrizes responsivas;
- Docker Compose: frontend, backend e PostgreSQL saudáveis;
- OCR real no container: PDF sem camada textual reconhecido com `por+eng` em 1 de 1 página;
- seed: idempotência confirmada após duas execuções consecutivas;
- Alembic: banco no `head` e nenhuma operação de upgrade pendente;
- produção: login ADMIN e COLLABORATOR, healthchecks, workflow completo, histórico, B2, OCR, gestão completa de usuários e quatro ações Gemini aprovados;
- segurança do repositório: nenhum secret real, arquivo `.env` ou chave privada encontrado.

## Credenciais de demonstração

```text
ADMIN
admin@docflow.demo
DocFlowDemo2026!

COLLABORATOR
collaborator@docflow.demo
DocFlowDemo2026!
```

## Como executar

```bash
docker compose up --build
```

- aplicação: http://localhost:5173
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

Ambiente público:

- aplicação: https://docflow-saas.pages.dev
- API: https://http--api--52lxxtkxp7c5.code.run
- Swagger: https://http--api--52lxxtkxp7c5.code.run/docs
