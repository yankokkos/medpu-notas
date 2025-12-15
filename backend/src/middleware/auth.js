const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Função auxiliar para verificar se o erro é de conexão recuperável
const isConnectionError = (error) => {
  const connectionErrors = [
    'ECONNRESET',
    'PROTOCOL_CONNECTION_LOST',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED'
  ];
  return connectionErrors.includes(error.code);
};

// Middleware de autenticação JWT com retry para erros de conexão
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acesso requerido' 
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Erro ao verificar token JWT:', error.message);
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido ou expirado' 
    });
  }

  // Tentar buscar dados do usuário com retry para erros de conexão
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Buscar dados atualizados do usuário
      const user = await query(
        'SELECT f.id, f.nome_completo, f.email, f.status, ff.funcao_id, fn.nome as nome_funcao, fn.permissoes FROM funcionarios f LEFT JOIN funcionario_funcao ff ON f.id = ff.funcionario_id LEFT JOIN funcoes fn ON ff.funcao_id = fn.id WHERE f.id = ? AND f.status = "ativo"',
        [decoded.userId]
      );

      if (user.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuário não encontrado ou inativo' 
        });
      }

      // Organizar dados do usuário
      // Parsear permissões JSON e combinar todas as permissões das funções
      const todasPermissoes = [];
      user.forEach(u => {
        if (u.permissoes) {
          try {
            const permissoes = typeof u.permissoes === 'string' ? JSON.parse(u.permissoes) : u.permissoes;
            if (Array.isArray(permissoes)) {
              todasPermissoes.push(...permissoes);
            }
          } catch (e) {
            console.error('Erro ao parsear permissões:', e);
          }
        }
      });
      
      // Remover duplicatas
      const permissoesUnicas = [...new Set(todasPermissoes)];
      
      const funcoesUsuario = user.map(u => u.nome_funcao).filter(Boolean);
      
      // Log para debug (apenas se não tiver permissões)
      if (permissoesUnicas.length === 0) {
        console.warn(`[AUTH] Usuário ${user[0].email} não tem permissões! Funções:`, funcoesUsuario);
      }
      
      const userData = {
        id: user[0].id,
        nome_completo: user[0].nome_completo,
        email: user[0].email,
        funcoes: funcoesUsuario,
        permissoes: permissoesUnicas
      };

      req.user = userData;
      return next();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      const isConnectionErr = isConnectionError(error);
      
      console.error(`Erro na autenticação (tentativa ${attempt}/${maxRetries}):`, {
        code: error.code,
        message: error.message,
        isConnectionError: isConnectionErr
      });

      // Se não for erro de conexão ou for a última tentativa, retornar erro
      if (!isConnectionErr || isLastAttempt) {
        // Se for erro de conexão na última tentativa, retornar erro específico
        if (isConnectionErr && isLastAttempt) {
          console.error('❌ Falha na conexão com banco de dados após múltiplas tentativas');
          return res.status(503).json({ 
            success: false, 
            message: 'Erro temporário de conexão com o banco de dados. Tente novamente em alguns instantes.',
            error: 'DATABASE_CONNECTION_ERROR'
          });
        }
        
        // Para outros erros, retornar erro de autenticação
        return res.status(403).json({ 
          success: false, 
          message: 'Erro ao autenticar usuário' 
        });
      }

      // Se for erro de conexão e não for a última tentativa, aguardar e tentar novamente
      if (isConnectionErr && !isLastAttempt) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000); // Backoff exponencial, máximo 3s
        console.log(`🔄 Tentando reconectar em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  console.error('❌ Todas as tentativas de autenticação falharam');
  return res.status(503).json({ 
    success: false, 
    message: 'Erro temporário de conexão com o banco de dados. Tente novamente em alguns instantes.',
    error: 'DATABASE_CONNECTION_ERROR'
  });
};

// Middleware de autorização RBAC
const authorize = (requiredPermissions = []) => {
  return async (req, res, next) => {
    // #region agent log
    if (req.path.includes('notas-fiscais') && req.method === 'POST') {
      try{
        const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
        const logData = JSON.stringify({
          location: 'middleware/auth.js:54',
          message: 'authorize middleware - POST notas-fiscais',
          data: { path: req.path, method: req.method, hasUser: !!req.user, userId: req.user?.id },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run2',
          hypothesisId: 'A'
        }) + '\n';
        await fs.appendFile(logPath, logData, 'utf8').catch(() => {});
      } catch(e) {}
    }
    // #endregion

    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não autenticado' 
      });
    }

    // Se o usuário tem permissão total (*), permitir acesso
    if (req.user.permissoes.includes('*')) {
      return next();
    }

    // Verificar se o usuário tem pelo menos uma das permissões necessárias
    const hasPermission = requiredPermissions.some(permission => 
      req.user.permissoes.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'Permissão insuficiente para esta operação' 
      });
    }

    next();
  };
};

// Middleware para verificar se é administrador
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Usuário não autenticado' 
    });
  }

  if (!req.user.funcoes.includes('Administrador')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Acesso restrito a administradores' 
    });
  }

  next();
};

// Middleware de autenticação para clientes (sócios com acesso)
const authenticateClienteToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acesso requerido' 
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Erro ao verificar token JWT do cliente:', error.message);
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido ou expirado' 
    });
  }

  // Verificar se é token de cliente
  if (decoded.tipo !== 'cliente') {
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido para cliente' 
    });
  }

  // Tentar buscar dados do cliente com retry para erros de conexão
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Buscar dados atualizados do cliente
      const clientes = await query(`
        SELECT 
          pc.id,
          pc.pessoa_id,
          pc.conta_id,
          pc.login_cliente,
          pc.tem_acesso_sistema,
          pc.ativo,
          p.nome_completo,
          p.email,
          p.cpf,
          p.status,
          c.nome_conta,
          c.status as conta_status
        FROM pessoa_conta pc
        JOIN pessoas p ON pc.pessoa_id = p.id
        LEFT JOIN contas c ON pc.conta_id = c.id
        WHERE pc.pessoa_id = ? AND pc.id = ? AND pc.tem_acesso_sistema = true AND pc.ativo = true AND p.status = 'ativo'
      `, [decoded.clienteId, decoded.pessoaContaId]);

      if (clientes.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Cliente não encontrado ou acesso desativado' 
        });
      }

      const cliente = clientes[0];

      // Verificar se conta está ativa
      if (cliente.conta_status !== 'ATIVO') {
        return res.status(403).json({ 
          success: false, 
          message: 'Conta inativa' 
        });
      }

      // Buscar empresas vinculadas à conta
      const empresas = await query(`
        SELECT e.id, e.razao_social, e.cnpj
        FROM empresas e
        WHERE e.conta_id = ? AND e.status = 'ativa'
      `, [cliente.conta_id]);

      // Organizar dados do cliente
      const clienteData = {
        id: cliente.pessoa_id,
        pessoa_conta_id: cliente.id,
        nome_completo: cliente.nome_completo,
        email: cliente.email,
        cpf: cliente.cpf,
        conta_id: cliente.conta_id,
        conta_nome: cliente.nome_conta,
        empresas: empresas,
        tipo: 'cliente'
      };

      req.cliente = clienteData;
      return next();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      const isConnectionErr = isConnectionError(error);
      
      console.error(`Erro na autenticação de cliente (tentativa ${attempt}/${maxRetries}):`, {
        code: error.code,
        message: error.message,
        isConnectionError: isConnectionErr
      });

      // Se não for erro de conexão ou for a última tentativa, retornar erro
      if (!isConnectionErr || isLastAttempt) {
        if (isConnectionErr && isLastAttempt) {
          console.error('❌ Falha na conexão com banco de dados após múltiplas tentativas');
          return res.status(503).json({ 
            success: false, 
            message: 'Erro temporário de conexão com o banco de dados. Tente novamente em alguns instantes.',
            error: 'DATABASE_CONNECTION_ERROR'
          });
        }
        
        return res.status(403).json({ 
          success: false, 
          message: 'Erro ao autenticar cliente' 
        });
      }

      // Se for erro de conexão e não for a última tentativa, aguardar e tentar novamente
      if (isConnectionErr && !isLastAttempt) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.log(`🔄 Tentando reconectar em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  console.error('❌ Todas as tentativas de autenticação de cliente falharam');
  return res.status(503).json({ 
    success: false, 
    message: 'Erro temporário de conexão com o banco de dados. Tente novamente em alguns instantes.',
    error: 'DATABASE_CONNECTION_ERROR'
  });
};

module.exports = {
  authenticateToken,
  authenticateClienteToken,
  authorize,
  requireAdmin
};

