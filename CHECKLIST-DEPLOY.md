# ✅ Checklist de Deploy - MedUP

## Antes do Deploy

### Repositório Git
- [ ] Repositório Git criado e configurado
- [ ] Todos os arquivos commitados
- [ ] `.gitignore` configurado corretamente
- [ ] Branch `main` ou `master` criada

### Arquivos Criados
- [ ] `Dockerfile` (frontend) criado
- [ ] `backend/Dockerfile` criado
- [ ] `.dockerignore` criado
- [ ] `backend/.dockerignore` criado
- [ ] `nginx.conf` criado
- [ ] `docker-compose.yml` criado (opcional)
- [ ] `env.example` atualizado
- [ ] `backend/env.example` atualizado

### Banco de Dados
- [ ] Banco de dados MySQL criado
- [ ] Migrations preparadas:
  - [ ] `schema-corrected.sql`
  - [ ] `001_allow_null_modelo_discriminacao.sql`
  - [ ] `002_add-tem-acesso-sistema-pessoa-conta.sql`
  - [ ] `seed-corrected.sql` (opcional)

## Configuração no Coolify

### Backend
- [ ] Aplicação criada no Coolify
- [ ] Repositório Git conectado
- [ ] Dockerfile: `backend/Dockerfile`
- [ ] Port: `3001`
- [ ] Build Command: `npm ci --only=production`
- [ ] Start Command: `node src/server.js`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `DB_HOST`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `DB_NAME`
  - [ ] `DB_PORT`
  - [ ] `JWT_SECRET`
  - [ ] `JWT_EXPIRES_IN`
  - [ ] `PORT`
  - [ ] `NODE_ENV=production`
  - [ ] `FRONTEND_URL`
  - [ ] `NFEIO_API_KEY`
  - [ ] `NFEIO_API_URL`
  - [ ] `NFEIO_WEBHOOK_SECRET`

### Frontend
- [ ] Aplicação criada no Coolify
- [ ] Repositório Git conectado
- [ ] Dockerfile: `Dockerfile` (raiz)
- [ ] Port: `80`
- [ ] Build Command: `npm ci && npm run build`
- [ ] Start Command: `nginx -g daemon off;`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `VITE_API_URL`

## Pós-Deploy

- [ ] Backend respondendo em `/health`
- [ ] Frontend carregando corretamente
- [ ] Login funcionando
- [ ] API respondendo corretamente
- [ ] Conexão com banco de dados funcionando
- [ ] Uploads funcionando (se aplicável)

