# Como contribuir

Obrigado pelo interesse em melhorar o DocFlow. Este repositório prioriza mudanças pequenas, justificadas e verificáveis.

## Preparação

1. Crie uma branch a partir de `main`.
2. Use nomes objetivos, como `feature/filtro-documentos` ou `fix/transicao-revisao`.
3. Suba o ambiente com `docker compose up --build`.
4. Não inclua `.env`, chaves, tokens, arquivos privados ou dados pessoais.

## Antes da pull request

Execute as validações relacionadas à mudança:

```bash
# backend
cd backend
ruff check .
pytest --cov=app --cov-report=term-missing

# frontend
cd frontend
npm run lint
npm run format
npm test
npm run build
npm run e2e
```

Mudanças no banco devem incluir migration Alembic. Mudanças de comportamento devem incluir teste de regressão. O frontend deste projeto é exclusivamente JavaScript; não adicione arquivos TypeScript.

## Commits e pull requests

- escreva commits curtos e coerentes em português;
- explique problema, solução e forma de validação na pull request;
- mantenha a alteração dentro do escopo do MVP;
- atualize README ou `PROJECT_STATUS.md` quando o comportamento público mudar;
- aguarde todos os jobs do GitHub Actions antes do merge.

Ao contribuir, você concorda que sua alteração será distribuída sob a [Licença MIT](LICENSE).
