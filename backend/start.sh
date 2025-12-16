#!/bin/sh

# Script de inicialização para garantir que o servidor inicie corretamente

echo "🚀 Iniciando MedUP Backend..."
echo "📋 Variáveis de ambiente:"
echo "  - DB_HOST: ${DB_HOST:-não configurado}"
echo "  - DB_NAME: ${DB_NAME:-não configurado}"
echo "  - PORT: ${PORT:-3001}"
echo "  - NODE_ENV: ${NODE_ENV:-não configurado}"

# Verificar variáveis críticas
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
  echo "❌ ERRO: Variáveis de banco de dados não configuradas!"
  echo "Configure: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "❌ ERRO: JWT_SECRET não configurado!"
  exit 1
fi

echo "✅ Variáveis de ambiente OK"
echo "🔌 Iniciando servidor Node.js..."

# Iniciar servidor
exec node src/server.js

