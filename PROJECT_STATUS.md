# Status do projeto — DocFlow

## Fase atual

MVP concluído, validado e preparado para publicação no GitHub.

## Concluído

- foundation React/Vite e FastAPI;
- PostgreSQL e migration Alembic inicial;
- Company, User, autenticação JWT e refresh token;
- RBAC e isolamento multi-tenant no backend;
- documentos de texto e PDF;
- versionamento imutável;
- workflow completo de revisão e publicação;
- comentários e trilha de auditoria;
- abstração FileStorage com implementação local;
- abstração de IA com provider Gemini;
- dashboard, documentos, detalhe, criação, edição, histórico, comparação e usuários;
- seed idempotente com dados profissionais;
- testes backend e frontend;
- Dockerfiles e Docker Compose;
- workflow de CI;
- README e licença.

## Pendente

Nenhum item funcional bloqueante dentro do escopo do MVP.

## Problemas conhecidos

- funcionalidades de IA retornam `AI_NOT_CONFIGURED` quando `GEMINI_API_KEY` não é fornecida;
- PDFs digitalizados sem camada de texto podem ser visualizados, mas não analisados pela IA;
- armazenamento local é intencional para desenvolvimento e demonstração;
- não há notificações, SSO, assinatura digital ou DOCX no MVP.

## Testes

- backend: 9 testes aprovados, cobertura de 84%;
- Ruff: aprovado;
- frontend: 5 testes aprovados;
- ESLint: aprovado;
- Prettier: aprovado;
- build de produção: aprovado;
- npm audit: zero vulnerabilidades;
- migrations: upgrade, check e downgrade aprovados em SQLite; `head` e `check` aprovados no PostgreSQL;
- Playwright: 3 de 3 fluxos aprovados no ambiente Docker;
- Docker Compose: frontend, backend e PostgreSQL saudáveis;
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
