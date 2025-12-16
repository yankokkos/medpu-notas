# 🔧 Correção: Erro de Build - vite not found

## Problema

O erro `sh: vite: not found` acontece porque o Coolify está passando `NODE_ENV=production` durante o build, o que faz com que `npm ci` não instale as `devDependencies`. Mas o `vite` está em `devDependencies` e é necessário para fazer o build.

## ✅ Solução

### Opção 1: Configurar NODE_ENV como "Runtime only" (Recomendado)

No Coolify:
1. Vá em **Settings > Environment Variables**
2. Encontre a variável `NODE_ENV`
3. **Desmarque** a opção "Available at Buildtime"
4. Deixe apenas "Available at Runtime" marcado
5. Faça rebuild

### Opção 2: Usar valores diferentes para build e runtime

No Coolify, configure duas variáveis:
- `NODE_ENV_BUILD=development` (Available at Buildtime)
- `NODE_ENV=production` (Runtime only)

E ajuste o Dockerfile para usar `NODE_ENV_BUILD` durante o build.

### Opção 3: Dockerfile já corrigido

O Dockerfile já foi atualizado para forçar instalação de devDependencies:
```dockerfile
RUN npm ci --include=dev || npm install
RUN NODE_ENV=development npm run build
```

Se ainda não funcionar, verifique se o Coolify não está sobrescrevendo o NODE_ENV durante o build.

## 📝 Checklist

- [ ] `NODE_ENV` está marcado como "Runtime only" no Coolify?
- [ ] Dockerfile atualizado foi aplicado?
- [ ] Build Command está vazio (deixando Dockerfile fazer o trabalho)?
- [ ] Logs mostram que `vite` foi instalado?

## 🔍 Verificar Logs

Nos logs de build, você deve ver:
```
✅ npm ci instalando devDependencies
✅ vite encontrado durante o build
✅ Build completado com sucesso
```

Se ainda houver erro, verifique os logs completos do build no Coolify.

