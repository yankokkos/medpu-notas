# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies)
# Forçar instalação de devDependencies mesmo com NODE_ENV=production
RUN npm ci --include=dev || npm install

# Copiar código fonte
COPY . .

# Build da aplicação (vite precisa estar instalado)
# Garantir que NODE_ENV não seja production durante o build
RUN NODE_ENV=development npm run build

# Production stage
FROM nginx:alpine

# Copiar arquivos buildados
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta
EXPOSE 80

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]

