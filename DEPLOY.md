# Guia de Deploy - MedUP no Coolify

## 📋 Pré-requisitos

- Repositório Git configurado
- Coolify instalado e configurado
- Banco de dados MySQL acessível
- Domínios configurados (frontend e backend)

## 🚀 Configuração no Coolify

### 1. Backend (API)

#### Configurações Básicas:
- **Nome:** `medup-backend`
- **Repositório:** Seu repositório Git
- **Branch:** `main` ou `master`
- **Dockerfile:** `backend/Dockerfile`
- **Port:** `3001`

#### Build Settings:
- **Build Command:** (deixe vazio - Dockerfile cuida do build)
- **Start Command:** (deixe vazio - Dockerfile usa start.sh)
- **OU se o Coolify exigir comandos:**
  - Build Command: `npm ci --only=production`
  - Start Command: `./start.sh`

#### Environment Variables:
```env
DB_HOST=seu_host_mysql
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=medup
DB_PORT=3306
JWT_SECRET=chave_secreta_jwt_forte_aleatoria
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://seu-frontend.com
NFEIO_API_KEY=sua_chave_nfeio
NFEIO_API_URL=https://api.nfe.io
NFEIO_WEBHOOK_SECRET=seu_webhook_secret
```

### 2. Frontend

#### Configurações Básicas:
- **Nome:** `medup-frontend`
- **Repositório:** Mesmo repositório Git
- **Branch:** `main` ou `master`
- **Dockerfile:** `Dockerfile` (raiz)
- **Port:** `80`

#### Build Settings:
- **Build Command:** (deixe vazio - Dockerfile cuida do build)
- **Start Command:** (deixe vazio - Dockerfile usa nginx)
- **OU se o Coolify exigir comandos:**
  - Build Command: `npm ci --include=dev && npm run build`
  - Start Command: `nginx -g daemon off;`
  
**⚠️ IMPORTANTE:** Se usar `NODE_ENV=production` como variável de ambiente, marque como **"Runtime only"** no Coolify para não afetar o build.

#### Environment Variables:
```env
VITE_API_URL=https://seu-backend.com/api
```

## 🗄️ Banco de Dados

Execute as migrations na ordem:

1. `backend/database/schema-corrected.sql` - Schema principal
2. `backend/database/migrations/001_allow_null_modelo_discriminacao.sql`
3. `backend/database/migrations/002_add-tem-acesso-sistema-pessoa-conta.sql`
4. `backend/database/seed-corrected.sql` (opcional - dados de exemplo)

## 🔐 Login Padrão

Após executar o seed:
- **Email:** `admin@medup.com.br`
- **Senha:** `admin123`

## 📝 Notas Importantes

1. **Variáveis de Ambiente:** Configure todas as variáveis no Coolify antes de fazer o deploy
2. **JWT_SECRET:** Use uma chave forte e aleatória em produção
3. **FRONTEND_URL:** Deve apontar para o domínio do frontend
4. **VITE_API_URL:** Deve apontar para o domínio do backend com `/api`
5. **Banco de Dados:** Certifique-se de que o banco está acessível do servidor Coolify

## 🔄 Atualizações

Para atualizar a aplicação:
1. Faça push das alterações para o repositório Git
2. O Coolify detectará automaticamente e fará rebuild
3. Ou force rebuild manualmente no painel do Coolify

