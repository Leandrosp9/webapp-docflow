# Status do projeto — DocFlow

## Fase atual

MVP concluído e validado; publicação do ambiente público em andamento.

## Concluído

- foundation React/Vite e FastAPI;
- PostgreSQL e migration Alembic inicial;
- Company, User, autenticação JWT e refresh token;
- RBAC e isolamento multi-tenant no backend;
- documentos de texto e PDF;
- versionamento imutável;
- workflow completo de revisão e publicação;
- comentários e trilha de auditoria;
- abstração FileStorage com implementações local e S3 compatível;
- OCR híbrido para PDFs digitalizados, com Tesseract em português e inglês;
- abstração de IA com provider Gemini;
- dashboard, documentos, detalhe, criação, edição, histórico, comparação e usuários;
- seed idempotente com dados profissionais;
- testes backend e frontend;
- Dockerfiles e Docker Compose;
- healthcheck de processo e readiness do PostgreSQL;
- projeto `docflow` reservado no Cloudflare Pages;
- documentação de hospedagem Northflank, Neon, Backblaze B2 e Cloudflare;
- workflow de CI;
- README e licença.

## Pendente

- autenticar as contas externas no ambiente de automação;
- provisionar Neon, Backblaze B2 e Northflank;
- configurar a chave Gemini como segredo protegido;
- publicar e validar o frontend no Cloudflare Pages.

## Problemas conhecidos

- funcionalidades de IA retornam `AI_NOT_CONFIGURED` quando `GEMINI_API_KEY` não é fornecida;
- funcionalidades de hospedagem dependem das contas externas Northflank, Neon e Backblaze B2 autenticadas;
- não há notificações, SSO, assinatura digital ou DOCX no MVP.

## Testes

- backend: 14 testes aprovados, cobertura de 84%;
- Ruff: aprovado;
- frontend: 5 testes aprovados;
- ESLint: aprovado;
- Prettier: aprovado;
- build de produção: aprovado;
- npm audit: zero vulnerabilidades;
- migrations: upgrade, check e downgrade aprovados em SQLite; `head` e `check` aprovados no PostgreSQL;
- Playwright: 3 de 3 fluxos aprovados no ambiente Docker;
- Docker Compose: frontend, backend e PostgreSQL saudáveis;
- OCR real no container: PDF sem camada textual reconhecido com `por+eng`;
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
