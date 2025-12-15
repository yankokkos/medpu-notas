# MedUP - Sistema de Gestão Contábil

Sistema completo de gestão contábil com backend Node.js + Express + MySQL e frontend React.

## 🚀 Deploy no Coolify

Consulte o arquivo [DEPLOY.md](./DEPLOY.md) para instruções detalhadas de deploy.

### Resumo Rápido

1. Configure as variáveis de ambiente no Coolify (veja `DEPLOY.md`)
2. Execute as migrations do banco de dados
3. Faça deploy do backend e frontend separadamente
4. Configure os domínios e SSL

### Variáveis de Ambiente Essenciais

**Backend:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `FRONTEND_URL`, `NFEIO_API_KEY`

**Frontend:** `VITE_API_URL`

Veja `DEPLOY.md` para lista completa e `CHECKLIST-DEPLOY.md` para checklist completo.
