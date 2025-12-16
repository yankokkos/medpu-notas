# 🔧 Troubleshooting - Erro 502 Bad Gateway

## Possíveis Causas e Soluções

### 1. Backend não está rodando ou crashando

**Sintomas:**
- Erro 502 Bad Gateway
- Frontend não consegue conectar com a API

**Soluções:**

#### Verificar logs do backend no Coolify:
```bash
# No Coolify, vá em Logs da aplicação backend
# Procure por erros como:
- "Não foi possível conectar ao banco de dados"
- "Error: Cannot find module"
- "Port already in use"
```

#### Verificar variáveis de ambiente:
Certifique-se de que TODAS as variáveis estão configuradas:
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`
- `JWT_SECRET`
- `PORT=3001`
- `NODE_ENV=production`
- `FRONTEND_URL`
- `NFEIO_API_KEY`
- `NFEIO_API_URL`
- `NFEIO_WEBHOOK_SECRET`

#### Testar health check do backend:
```bash
# Acesse diretamente o backend:
https://seu-backend.com/health

# Deve retornar:
{
  "success": true,
  "message": "API MedUP funcionando",
  "database": "conectado"
}
```

### 2. Problema de conexão com banco de dados

**Sintomas:**
- Backend crasha na inicialização
- Logs mostram erro de conexão MySQL

**Soluções:**

#### Verificar credenciais do banco:
- `DB_HOST` está correto?
- `DB_USER` e `DB_PASSWORD` estão corretos?
- `DB_NAME` existe?
- `DB_PORT` está correto (geralmente 3306)?

#### Verificar acesso de rede:
- O servidor Coolify consegue acessar o banco de dados?
- Firewall permite conexão na porta do MySQL?
- Se o banco está em outro servidor, verifique conectividade

#### Testar conexão manualmente:
```bash
# No servidor Coolify, teste a conexão:
mysql -h DB_HOST -u DB_USER -p DB_NAME
```

### 3. Frontend não consegue acessar o backend

**Sintomas:**
- Frontend carrega mas não consegue fazer requisições
- Erro CORS ou 502 nas requisições

**Soluções:**

#### Verificar VITE_API_URL:
```env
# No frontend, deve estar configurado:
VITE_API_URL=https://seu-backend.com/api
```

#### Verificar FRONTEND_URL no backend:
```env
# No backend, deve estar configurado:
FRONTEND_URL=https://seu-frontend.com
```

#### Verificar CORS:
O backend deve permitir requisições do frontend. Verifique se `FRONTEND_URL` está correto.

### 4. Problemas de porta

**Sintomas:**
- Backend não inicia
- Erro "Port already in use"

**Soluções:**

#### Verificar porta no Coolify:
- Backend deve usar porta `3001`
- Frontend deve usar porta `80`
- Verifique se não há conflito de portas

### 5. Build falhando

**Sintomas:**
- Deploy não completa
- Erros no build

**Soluções:**

#### Verificar Dockerfile:
- Backend: `backend/Dockerfile`
- Frontend: `Dockerfile` (raiz)

#### Verificar comandos de build:
- Backend: `npm ci --only=production`
- Frontend: `npm ci && npm run build`

#### Verificar logs de build:
No Coolify, verifique os logs do processo de build para identificar erros específicos.

## 🔍 Checklist de Diagnóstico

Execute este checklist na ordem:

1. [ ] Backend está rodando? (verificar logs)
2. [ ] Health check responde? (`/health`)
3. [ ] Banco de dados está acessível?
4. [ ] Variáveis de ambiente estão todas configuradas?
5. [ ] `VITE_API_URL` aponta para o backend correto?
6. [ ] `FRONTEND_URL` no backend aponta para o frontend correto?
7. [ ] Portas estão corretas (3001 backend, 80 frontend)?
8. [ ] Build completou com sucesso?
9. [ ] SSL/HTTPS está configurado corretamente?

## 📝 Comandos Úteis

### Verificar se backend está rodando:
```bash
curl https://seu-backend.com/health
```

### Verificar variáveis de ambiente no Coolify:
- Vá em Settings > Environment Variables
- Verifique se todas estão configuradas

### Ver logs em tempo real:
- No Coolify, vá em Logs da aplicação
- Monitore erros em tempo real

## 🆘 Se nada funcionar

1. Verifique os logs completos no Coolify
2. Teste o backend diretamente (sem passar pelo frontend)
3. Verifique se o banco de dados está acessível
4. Revise todas as variáveis de ambiente
5. Tente fazer rebuild completo da aplicação

