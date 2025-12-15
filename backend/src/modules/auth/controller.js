const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

// Login do usuário
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário por email
    const users = await query(
      'SELECT f.id, f.nome_completo, f.email, f.senha_hash, f.status, ff.funcao_id, fn.nome as nome_funcao, fn.permissoes FROM funcionarios f LEFT JOIN funcionario_funcao ff ON f.id = ff.funcionario_id LEFT JOIN funcoes fn ON ff.funcao_id = fn.id WHERE f.email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const user = users[0];

    // Verificar se usuário está ativo
    if (user.status !== 'ativo') {
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Organizar dados do usuário
    // Parsear permissões JSON e combinar todas as permissões das funções
    const todasPermissoes = [];
    users.forEach(u => {
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
    
    const funcoesUsuario = users.map(u => u.nome_funcao).filter(Boolean);
    
    // Log para debug
    console.log(`[LOGIN] Usuário ${user.email}:`, {
      funcoes: funcoesUsuario,
      permissoes: permissoesUnicas,
      totalPermissoes: permissoesUnicas.length
    });
    
    const userData = {
      id: user.id,
      nome_completo: user.nome_completo,
      email: user.email,
      funcoes: funcoesUsuario,
      permissoes: permissoesUnicas
    };

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: userData,
        token: token
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter dados do usuário logado
const getMe = async (req, res) => {
  try {
    const user = req.user; // Vem do middleware de autenticação

    res.json({
      success: true,
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Renovar token
const refreshToken = async (req, res) => {
  try {
    const user = req.user; // Vem do middleware de autenticação

    // Gerar novo token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        token: token
      }
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Logout (apenas para registro de auditoria)
const logout = async (req, res) => {
  try {
    // Em uma implementação mais robusta, poderíamos invalidar o token
    // Por enquanto, apenas retornamos sucesso
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Login de cliente (sócio com acesso ao sistema)
const loginCliente = async (req, res) => {
  try {
    const { login, senha } = req.body;

    if (!login || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Login e senha são obrigatórios'
      });
    }

    // Buscar cliente por login_cliente
    const clientes = await query(`
      SELECT 
        pc.id,
        pc.pessoa_id,
        pc.conta_id,
        pc.login_cliente,
        pc.senha_hash,
        pc.tem_acesso_sistema,
        pc.ativo,
        p.nome_completo,
        p.email,
        p.cpf,
        c.nome_conta
      FROM pessoa_conta pc
      JOIN pessoas p ON pc.pessoa_id = p.id
      LEFT JOIN contas c ON pc.conta_id = c.id
      WHERE pc.login_cliente = ? AND pc.tem_acesso_sistema = true AND pc.ativo = true AND p.status = 'ativo'
    `, [login]);

    if (clientes.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const cliente = clientes[0];

    // Verificar se tem senha definida
    if (!cliente.senha_hash) {
      return res.status(401).json({
        success: false,
        message: 'Senha não configurada. Entre em contato com o administrador.'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, cliente.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Buscar empresas vinculadas à conta do cliente
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

    // Gerar token JWT para cliente
    const token = jwt.sign(
      { 
        clienteId: cliente.pessoa_id, 
        pessoaContaId: cliente.id,
        contaId: cliente.conta_id,
        tipo: 'cliente'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        cliente: clienteData,
        token: token
      }
    });

  } catch (error) {
    console.error('Erro no login de cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  login,
  loginCliente,
  getMe,
  refreshToken,
  logout
};
