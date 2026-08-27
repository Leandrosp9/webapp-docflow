# Hospedagem pública do DocFlow

O ambiente de portfólio segue a mesma composição usada no Workflix:

| Componente     | Provedor         | Configuração                                   |
| -------------- | ---------------- | ---------------------------------------------- |
| Frontend React | Cloudflare Pages | site estático com fallback para rotas SPA      |
| API FastAPI    | Northflank       | imagem criada a partir de `backend/Dockerfile` |
| PostgreSQL     | Neon             | banco gerenciado com TLS obrigatório           |
| PDFs           | Backblaze B2     | bucket privado pela API compatível com S3      |
| IA             | Google Gemini    | chave protegida somente no backend             |

## Ordem de publicação

1. Criar o projeto PostgreSQL na Neon e copiar a conexão com `sslmode=require`.
2. Criar um bucket privado na Backblaze B2 e uma chave restrita ao bucket, com leitura e escrita.
3. Criar o projeto `docflow` e o serviço `api` na Northflank a partir do repositório GitHub.
4. Configurar as variáveis protegidas no serviço e publicar a porta HTTP `8000`.
5. Validar `GET /health` e `GET /ready` na URL pública da API.
6. Compilar o frontend com `VITE_API_URL=https://<api-publica>/api/v1`.
7. Publicar `frontend/dist` no projeto `docflow-saas` do Cloudflare Pages.
8. Atualizar `CORS_ORIGINS` com a URL definitiva do Pages e validar o login público.

## Northflank

Configuração do serviço:

- endereço: `https://http--api--52lxxtkxp7c5.code.run`;
- fonte: `Leandrosp9/webapp-docflow`, branch `main`;
- contexto de build: `/backend`;
- Dockerfile: `/backend/Dockerfile`;
- porta pública: `8000`, protocolo HTTP;
- liveness: `/health`;
- readiness: `/ready`;
- instância: Developer Sandbox com 0,2 vCPU compartilhada e 512 MB;
- rollout: substituição sem surge para respeitar a cota do sandbox.

Variáveis de runtime:

```text
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://<usuario>:<senha>@<host>/<banco>?sslmode=require&hostaddr=<ipv4-do-pooler>
JWT_SECRET=<segredo-aleatorio-com-no-minimo-32-caracteres>
CORS_ORIGINS=https://docflow-saas.pages.dev
FILE_STORAGE_PROVIDER=b2
S3_ENDPOINT_URL=https://s3.<regiao>.backblazeb2.com
S3_BUCKET=<bucket-privado>
S3_REGION=<regiao>
S3_ACCESS_KEY_ID=<id-da-chave-restrita>
S3_SECRET_ACCESS_KEY=<segredo-da-chave-restrita>
S3_PREFIX=docflow
GEMINI_API_KEY=<chave-protegida>
GEMINI_MODEL=gemini-3.6-flash
OCR_ENABLED=true
OCR_LANGUAGES=por+eng
OCR_DPI=200
OCR_MAX_PAGES=25
PDF_MAX_PAGES=100
MAX_UPLOAD_MB=10
MAX_AUDIO_MB=10
MAX_AUDIO_SECONDS=300
```

Os valores entre `<...>` são placeholders. Nenhum segredo deve ser salvo neste arquivo, no README ou em variáveis públicas do frontend.

O `hostaddr` é necessário no Developer Sandbox atual porque o endpoint Neon também anuncia IPv6, indisponível nessa rede. Se o pooler alterar seus endereços, a variável deve ser atualizada com um IPv4 retornado pelo DNS.

## Backblaze B2

- o bucket deve ser privado;
- a chave deve ter somente leitura e escrita no bucket do DocFlow;
- o `keyID` corresponde a `S3_ACCESS_KEY_ID`;
- a `applicationKey` corresponde a `S3_SECRET_ACCESS_KEY`;
- o endpoint e a região precisam pertencer à mesma conta B2;
- os objetos recebem criptografia `AES256` no envio.

## Cloudflare Pages

O projeto público é `docflow-saas`, com endereço `https://docflow-saas.pages.dev`. O nome curto `docflow.pages.dev` já pertence a outro projeto no namespace global do Cloudflare.

Publicação direta após a API estar disponível:

```powershell
cd frontend
$env:VITE_API_URL = "https://<api-publica>/api/v1"
npm ci
npm run build
npx --yes wrangler@latest pages deploy dist --project-name docflow-saas --branch main
```

O arquivo `frontend/public/_redirects` garante que URLs como `/documents` e `/history` carreguem diretamente no Pages.

URLs publicadas:

- frontend: `https://docflow-saas.pages.dev`;
- API: `https://http--api--52lxxtkxp7c5.code.run`;
- Swagger: `https://http--api--52lxxtkxp7c5.code.run/docs`.

## Verificação pós-publicação

- [x] `GET /health` retorna `200`;
- [x] `GET /ready` retorna `200` e confirma acesso ao PostgreSQL;
- [x] login ADMIN e COLLABORATOR funciona no domínio público;
- [x] upload e download autenticado usam o bucket B2;
- [x] um PDF digitalizado sem texto nativo é reconhecido pelo OCR;
- [x] revisão, resumo e comparação Gemini respondem sem expor a chave;
- [x] ditado envia áudio temporário, transcreve e corrige o texto com Gemini;
- [x] criação, edição, troca de senha, inativação, reativação e exclusão segura de usuários;
- [x] comparação textual funciona independentemente da IA;
- [x] isolamento multi-tenant e histórico permanecem válidos;
- [x] rotas SPA abertas diretamente retornam a aplicação, não `404`;
- [x] os três fluxos Playwright passam no domínio público.
