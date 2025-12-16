# 🚨 Correção Rápida - Erro 502 Bad Gateway

## ⚡ Solução Rápida

### 1. Verificar se o Backend está rodando

No Coolify, vá em **Logs** da aplicação backend e verifique:

✅ **Backend OK se você ver:**
```
🚀 Servidor rodando na porta 3001
📊 Health check: http://0.0.0.0:3001/health
```

❌ **Backend com problema se você ver:**
```
❌ Não foi possível conectar ao banco de dados
❌ ERRO: Variáveis de banco de dados não configuradas!
```

### 2. Verificar Variáveis de Ambiente

No Coolify, vá em **Settings > Environment Variables** do backend e verifique se TODAS estão configuradas:

**OBRIGATÓRIAS:**
- ✅ `DB_HOST`
- ✅ `DB_USER`
- ✅ `DB_PASSWORD`
- ✅ `DB_NAME`
- ✅ `DB_PORT` (geralmente 3306)
- ✅ `JWT_SECRET`
- ✅ `PORT` (deve ser 3001)
- ✅ `NODE_ENV` (deve ser `production`)
- ✅ `FRONTEND_URL` (URL completa do frontend, ex: `https://app.seudominio.com`)
- ✅ `NFEIO_API_KEY`
- ✅ `NFEIO_API_URL` (geralmente `https://api.nfe.io`)
- ✅ `NFEIO_WEBHOOK_SECRET`

### 3. Testar Health Check Diretamente

Acesse diretamente o backend:
```
https://seu-backend.com/health
```

**Deve retornar:**
```json
{
  "success": true,
  "message": "API MedUP funcionando",
  "database": "conectado"
}
```

Se retornar erro, o problema está no backend.

### 4. Verificar Frontend

No Coolify, verifique se o frontend tem a variável:
```env
VITE_API_URL=https://seu-backend.com/api
```

⚠️ **IMPORTANTE:** O `VITE_API_URL` deve apontar para o **domínio do backend** com `/api` no final.

### 5. Rebuild Completo

Se nada funcionar:
1. No Coolify, vá em **Settings**
2. Clique em **Rebuild**
3. Aguarde o build completar
4. Verifique os logs novamente

## 🔍 Diagnóstico Passo a Passo

1. **Backend responde?**
   - Acesse: `https://seu-backend.com/health`
   - Se não responder → Problema no backend

2. **Backend está rodando?**
   - Verifique logs no Coolify
   - Se não estiver → Verifique variáveis de ambiente

3. **Banco de dados conecta?**
   - Verifique logs do backend
   - Se não conectar → Verifique credenciais do banco

4. **Frontend consegue acessar backend?**
   - Abra o console do navegador (F12)
   - Veja se há erros de CORS ou 502
   - Se houver → Verifique `VITE_API_URL` e `FRONTEND_URL`

## 📞 Informações para Debug

Quando pedir ajuda, forneça:

1. **Logs do Backend** (últimas 50 linhas)
2. **Resposta do `/health`** (se acessível)
3. **Variáveis de ambiente configuradas** (sem valores sensíveis)
4. **Erro exato** do navegador (console F12)

