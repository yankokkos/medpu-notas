const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Carregar variáveis de ambiente
// Em produção, usar variáveis de ambiente do sistema
// Em desenvolvimento, usar config.env se existir
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './config.env' });
}

const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Importar rotas
const authRoutes = require('./modules/auth/routes');
const contasRoutes = require('./modules/contas/routes');
const empresasRoutes = require('./modules/empresas/routes');
const pessoasRoutes = require('./modules/pessoas/routes');
const tomadoresRoutes = require('./modules/tomadores/routes');
const modelosRoutes = require('./modules/modelos/routes');
const notasRoutes = require('./modules/notas/routes');
const funcionariosRoutes = require('./modules/funcionarios/routes');
const relatoriosRoutes = require('./modules/relatorios/routes');
const buscaRoutes = require('./modules/busca/routes');
const webhookRoutes = require('./modules/webhook/routes');
const nfseRoutes = require('./modules/nfse/routes');
const consultasRoutes = require('./modules/consultas/routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança
app.use(helmet());

// Rate limiting (mais permissivo para desenvolvimento)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por janela (aumentado para desenvolvimento)
  message: {
    success: false,
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos'
  }
});
app.use(limiter);

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rota de health check
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    success: true,
    message: 'API MedUP funcionando',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'conectado' : 'desconectado',
    version: '1.0.0'
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/contas', contasRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/tomadores', tomadoresRoutes);
app.use('/api/modelos-discriminacao', modelosRoutes);
app.use('/api/notas-fiscais', notasRoutes);
app.use('/api/nfse', nfseRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/busca', buscaRoutes);
app.use('/api/consultas', consultasRoutes);
console.log('✅ Rotas de consultas registradas: /api/consultas/*');
// Webhook - endpoint público (sem autenticação)
app.use('/api/webhook', webhookRoutes);

// Middleware para rotas não encontradas
app.use(notFound);

// Middleware global de tratamento de erros
app.use(errorHandler);

// Inicializar servidor
const startServer = async () => {
  try {
    // Testar conexão com banco
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Não foi possível conectar ao banco de dados');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  process.exit(1);
});

startServer();

