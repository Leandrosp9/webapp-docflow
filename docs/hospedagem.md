# Hospedagem pública do DocFlow

O ambiente de portfólio segue a mesma composição usada no Workflix:

| Componente | Provedor | Configuração |
| --- | --- | --- |
| Frontend React | Cloudflare Pages | site estático com fallback para rotas SPA |
| API FastAPI | Northflank | imagem criada a partir de `backend/Dockerfile` |
| PostgreSQL | Neon | banco gerenciado com TLS obrigatório |
| PDFs | Backblaze B2 | bucket privado pela API compatível com S3 |
| IA | Google Gemini | chave protegida somente no backend |

## Ordem de publicação

1. Criar o projeto PostgreSQL na Neon e copiar a conexão com `sslmode=require`.
2. Criar um bucket privado na Backblaze B2 e uma chave restrita ao bucket, com leitura e escrita.
3. Criar o projeto e o serviço `backend` na Northflank a partir do repositório GitHub.
4. Configurar as variáveis protegidas no serviço e publicar a porta HTTP `8000`.
5. Validar `GET /health` e `GET /ready` na URL pública da API.
6. Compilar o frontend com `VITE_API_URL=https://<api-publica>/api/v1`.
7. Publicar `frontend/dist` no projeto `docflow` do Cloudflare Pages.
8. Atualizar `CORS_ORIGINS` com a URL definitiva do Pages e validar o login público.

## Northflank

Configuração do serviço:

- fonte: `Leandrosp9/webapp-docflow`, branch `main`;
- contexto de build: `/backend`;
- Dockerfile: `/backend/Dockerfile`;
- porta pública: `8000`, protocolo HTTP;
- liveness: `/health`;
- readiness: `/ready`;
- instância inicial: menor plano adequado ao Tesseract OCR.

Variáveis de runtime:

```text
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://<usuario>:<senha>@<host>/<banco>?sslmode=require
JWT_SECRET=<segredo-aleatorio-com-no-minimo-32-caracteres>
CORS_ORIGINS=https://docflow-451.pages.dev
FILE_STORAGE_PROVIDER=b2
S3_ENDPOINT_URL=https://s3.<regiao>.backblazeb2.com
S3_BUCKET=<bucket-privado>
S3_REGION=<regiao>
S3_ACCESS_KEY_ID=<id-da-chave-restrita>
S3_SECRET_ACCESS_KEY=<segredo-da-chave-restrita>
S3_PREFIX=docflow
GEMINI_API_KEY=<chave-protegida>
GEMINI_MODEL=gemini-3.7-flash
OCR_ENABLED=true
OCR_LANGUAGES=por+eng
OCR_DPI=200
OCR_MAX_PAGES=25
PDF_MAX_PAGES=100
MAX_UPLOAD_MB=10
```

Os valores entre `<...>` são placeholders. Nenhum segredo deve ser salvo neste arquivo, no README ou em variáveis públicas do frontend.

## Backblaze B2

- o bucket deve ser privado;
- a chave deve ter somente leitura e escrita no bucket do DocFlow;
- o `keyID` corresponde a `S3_ACCESS_KEY_ID`;
- a `applicationKey` corresponde a `S3_SECRET_ACCESS_KEY`;
- o endpoint e a região precisam pertencer à mesma conta B2;
- os objetos recebem criptografia `AES256` no envio.

## Cloudflare Pages

O projeto reservado é `docflow`, com endereço `https://docflow-451.pages.dev`.

Publicação direta após a API estar disponível:

```powershell
cd frontend
$env:VITE_API_URL = "https://<api-publica>/api/v1"
npm ci
npm run build
npx --yes wrangler@latest pages deploy dist --project-name docflow --branch main
```

O arquivo `frontend/public/_redirects` garante que URLs como `/documents` e `/history` carreguem diretamente no Pages.

## Verificação pós-publicação

- `GET /health` retorna `200`;
- `GET /ready` retorna `200` e confirma acesso ao PostgreSQL;
- login ADMIN e COLLABORATOR funciona no domínio público;
- upload e download autenticado usam o bucket B2;
- um PDF digitalizado é reconhecido pelo OCR;
- as três ações Gemini respondem sem expor a chave;
- isolamento multi-tenant e histórico permanecem válidos;
- uma rota SPA aberta diretamente retorna a aplicação, não `404`.
