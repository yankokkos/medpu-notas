FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY src/ ./src/

# Criar diretório de uploads
RUN mkdir -p uploads

# Copiar script de inicialização
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Expor porta
EXPOSE 3001

# Variáveis de ambiente serão fornecidas pelo Coolify
# Não usar config.env em produção

# Health check (usar 127.0.0.1 ao invés de localhost para evitar IPv6)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar (usar script para validação)
CMD ["./start.sh"]

