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

# Expor porta
EXPOSE 3001

# Variáveis de ambiente serão fornecidas pelo Coolify
# Não usar config.env em produção

# Comando para iniciar
CMD ["node", "src/server.js"]

