const { query } = require('../../config/database');
const bcrypt = require('bcrypt');

// Listar contas com filtros e paginação
const listarContas = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      tipo_relacionamento = '' 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Filtro de busca
    if (search) {
      whereClause += ' AND (c.nome_conta LIKE ? OR c.email_principal LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filtro de status
    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    // Filtro de tipo de relacionamento
    if (tipo_relacionamento) {
      whereClause += ' AND c.tipo_relacionamento = ?';
      params.push(tipo_relacionamento);
    }

    // Query principal com contadores
    const sql = `
      SELECT 
        c.*,
        COUNT(DISTINCT e.id) as empresas_count,
        COUNT(DISTINCT p.id) as pessoas_count,
        COUNT(DISTINCT t.id) as tomadores_count
      FROM contas c
      LEFT JOIN empresas e ON c.id = e.conta_id AND e.status = 'ativa'
      LEFT JOIN pessoa_empresa ep ON e.id = ep.empresa_id
      LEFT JOIN pessoas p ON ep.pessoa_id = p.id AND p.status = 'ativo'
      LEFT JOIN tomadores t ON c.id = t.conta_id AND t.status = 'ativo'
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const contas = await query(sql, params);

    // Para cada conta, buscar dados relacionados
    const contasComRelacionamentos = await Promise.all(
      contas.map(async (conta) => {
        // Buscar empresas vinculadas
        const empresas = await query(`
          SELECT id, razao_social, cnpj, status
          FROM empresas 
          WHERE conta_id = ? AND status = 'ativa'
          ORDER BY razao_social
        `, [conta.id]);

        // Buscar pessoas vinculadas (diretamente ou através de empresas)
        // Usar IFNULL para compatibilidade caso a coluna ainda não exista
        const pessoas = await query(`
          SELECT DISTINCT
            p.id, 
            p.nome_completo, 
            p.cpf, 
            COALESCE(pc.tipo_vinculo, ep.tipo_vinculo) as tipo_vinculo,
            ep.percentual_participacao,
            CASE WHEN pc.id IS NOT NULL THEN 'DIRETO' ELSE 'INDIRETO' END as tipo_vinculacao,
            IFNULL(pc.tem_acesso_sistema, 0) as tem_acesso_sistema,
            pc.login_cliente
          FROM pessoas p
          LEFT JOIN pessoa_conta pc ON p.id = pc.pessoa_id AND pc.conta_id = ? AND pc.ativo = true
          LEFT JOIN pessoa_empresa ep ON p.id = ep.pessoa_id AND ep.ativo = true
          LEFT JOIN empresas e ON ep.empresa_id = e.id AND e.conta_id = ?
          WHERE (pc.id IS NOT NULL OR e.id IS NOT NULL) AND p.status = 'ativo'
          ORDER BY p.nome_completo
        `, [conta.id, conta.id]);

        return {
          ...conta,
          empresas_vinculadas: empresas,
          pessoas_vinculadas: pessoas
        };
      })
    );

    // Query para contar total
    const countSql = `
      SELECT COUNT(*) as total
      FROM contas c
      ${whereClause}
    `;

    const [{ total }] = await query(countSql, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        contas: contasComRelacionamentos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter conta por ID
const obterConta = async (req, res) => {
  try {
    const { id } = req.params;

    const contas = await query(`
      SELECT 
        c.*,
        COUNT(DISTINCT e.id) as empresas_count,
        COUNT(DISTINCT p.id) as pessoas_count,
        COUNT(DISTINCT t.id) as tomadores_count
      FROM contas c
      LEFT JOIN empresas e ON c.id = e.conta_id AND e.status = 'ativa'
      LEFT JOIN pessoa_empresa ep ON e.id = ep.empresa_id
      LEFT JOIN pessoas p ON ep.pessoa_id = p.id AND p.status = 'ativo'
      LEFT JOIN tomadores t ON c.id = t.conta_id AND t.status = 'ativo'
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (contas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conta não encontrada'
      });
    }

    // Buscar empresas vinculadas
    const empresas = await query(`
      SELECT id, razao_social, cnpj, status
      FROM empresas 
      WHERE conta_id = ?
      ORDER BY razao_social
    `, [id]);

    // Buscar pessoas vinculadas (diretamente ou através de empresas)
    // Usar IFNULL para compatibilidade caso a coluna ainda não exista
    const pessoas = await query(`
      SELECT DISTINCT
        p.id, 
        p.nome_completo, 
        p.cpf, 
        COALESCE(pc.tipo_vinculo, ep.tipo_vinculo) as tipo_vinculo,
        ep.percentual_participacao,
        CASE WHEN pc.id IS NOT NULL THEN 'DIRETO' ELSE 'INDIRETO' END as tipo_vinculacao,
        IFNULL(pc.tem_acesso_sistema, 0) as tem_acesso_sistema
      FROM pessoas p
      LEFT JOIN pessoa_conta pc ON p.id = pc.pessoa_id AND pc.conta_id = ? AND pc.ativo = true
      LEFT JOIN pessoa_empresa ep ON p.id = ep.pessoa_id AND ep.ativo = true
      LEFT JOIN empresas e ON ep.empresa_id = e.id AND e.conta_id = ?
      WHERE (pc.id IS NOT NULL OR e.id IS NOT NULL) AND p.status = 'ativo'
      ORDER BY p.nome_completo
    `, [id, id]);

    // Buscar tomadores vinculados
    const tomadores = await query(`
      SELECT id, nome_razao_social, cnpj_cpf, tipo_pessoa, iss_retido, status
      FROM tomadores 
      WHERE conta_id = ?
      ORDER BY nome_razao_social
    `, [id]);

    const conta = {
      ...contas[0],
      empresas_vinculadas: empresas,
      pessoas_vinculadas: pessoas,
      tomadores_vinculados: tomadores
    };

    res.json({
      success: true,
      data: { conta }
    });

  } catch (error) {
    console.error('Erro ao obter conta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar nova conta
const criarConta = async (req, res) => {
  try {
    const {
      nome_conta,
      email_principal,
      telefone_principal,
      data_inicio_contrato,
      tipo_relacionamento,
      duracao_isencao,
      observacoes
    } = req.body;

    // Verificar se já existe conta com mesmo nome
    const existing = await query(
      'SELECT id FROM contas WHERE nome_conta = ?',
      [nome_conta]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma conta com este nome'
      });
    }

    // Normalizar duracao_isencao: converter string vazia para null
    let duracaoIsencaoNormalizada = null;
    if (duracao_isencao !== undefined && duracao_isencao !== null && duracao_isencao !== '') {
      const parsed = parseInt(duracao_isencao);
      duracaoIsencaoNormalizada = isNaN(parsed) ? null : parsed;
    }

    // Inserir nova conta
    const result = await query(`
      INSERT INTO contas (
        nome_conta, email_principal, telefone_principal, 
        data_inicio_contrato, tipo_relacionamento, duracao_isencao, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      nome_conta, email_principal, telefone_principal,
      data_inicio_contrato, tipo_relacionamento, duracaoIsencaoNormalizada, observacoes
    ]);

    const contaId = result.insertId;

    // Buscar conta criada
    const [conta] = await query(
      'SELECT * FROM contas WHERE id = ?',
      [contaId]
    );

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso',
      data: { conta }
    });

  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar conta
const atualizarConta = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome_conta,
      email_principal,
      telefone_principal,
      data_inicio_contrato,
      status,
      tipo_relacionamento,
      duracao_isencao,
      observacoes
    } = req.body;

    // Verificar se conta existe
    const existing = await query(
      'SELECT id FROM contas WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conta não encontrada'
      });
    }

    // Verificar se nome já existe em outra conta
    if (nome_conta) {
      const duplicate = await query(
        'SELECT id FROM contas WHERE nome_conta = ? AND id != ?',
        [nome_conta, id]
      );

      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma conta com este nome'
        });
      }
    }

    // Normalizar duracao_isencao: converter string vazia para null
    let duracaoIsencaoNormalizada = null;
    if (duracao_isencao !== undefined && duracao_isencao !== null && duracao_isencao !== '') {
      const parsed = parseInt(duracao_isencao);
      duracaoIsencaoNormalizada = isNaN(parsed) ? null : parsed;
    }

    // Atualizar conta
    await query(`
      UPDATE contas SET
        nome_conta = COALESCE(?, nome_conta),
        email_principal = COALESCE(?, email_principal),
        telefone_principal = COALESCE(?, telefone_principal),
        data_inicio_contrato = COALESCE(?, data_inicio_contrato),
        status = COALESCE(?, status),
        tipo_relacionamento = COALESCE(?, tipo_relacionamento),
        duracao_isencao = ?,
        observacoes = COALESCE(?, observacoes)
      WHERE id = ?
    `, [
      nome_conta, email_principal, telefone_principal,
      data_inicio_contrato, status, tipo_relacionamento,
      duracaoIsencaoNormalizada, observacoes, id
    ]);

    // Buscar conta atualizada
    const [conta] = await query(
      'SELECT * FROM contas WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Conta atualizada com sucesso',
      data: { conta }
    });

  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar conta
const deletarConta = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se conta existe
    const existing = await query(
      'SELECT id FROM contas WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conta não encontrada'
      });
    }

    // Verificar se há empresas vinculadas
    const empresas = await query(
      'SELECT COUNT(*) as count FROM empresas WHERE conta_id = ?',
      [id]
    );

    if (empresas[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir conta com empresas vinculadas'
      });
    }

    // Deletar conta
    await query('DELETE FROM contas WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Conta excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Gerenciar vinculações de empresas à conta
const gerenciarEmpresas = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresas, acao } = req.body; // empresas: array de IDs, acao: 'atualizar'

    // Validar conta existe
    const [conta] = await query('SELECT id FROM contas WHERE id = ?', [id]);
    if (!conta) {
      return res.status(404).json({ success: false, message: 'Conta não encontrada' });
    }

    if (acao === 'atualizar') {
      const incomingCompanyIds = new Set(empresas || []);

      // Buscar empresas atualmente vinculadas
      const currentCompanies = await query(
        'SELECT id FROM empresas WHERE conta_id = ? AND status = "ativa"',
        [id]
      );
      const currentCompanyIds = new Set(currentCompanies.map(c => c.id));

      // Desvincular empresas removidas
      for (const currentCompanyId of currentCompanyIds) {
        if (!incomingCompanyIds.has(currentCompanyId)) {
          await query(
            'UPDATE empresas SET conta_id = NULL WHERE id = ? AND conta_id = ?',
            [currentCompanyId, id]
          );
        }
      }

      // Vincular novas empresas
      for (const companyId of incomingCompanyIds) {
        if (!currentCompanyIds.has(companyId)) {
          await query(
            'UPDATE empresas SET conta_id = ? WHERE id = ?',
            [id, companyId]
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Vínculos de empresas atualizados com sucesso'
    });

  } catch (error) {
    console.error('Erro ao gerenciar empresas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Gerenciar vinculações de pessoas à conta
const gerenciarPessoas = async (req, res) => {
  try {
    const { id } = req.params;
    const { pessoas, acao } = req.body; // pessoas: [{ pessoa_id, tipo_vinculo, tem_acesso_sistema, login_cliente, senha }], acao: 'atualizar'

    // Validar conta existe
    const [conta] = await query('SELECT id FROM contas WHERE id = ?', [id]);
    if (!conta) {
      return res.status(404).json({ success: false, message: 'Conta não encontrada' });
    }

    if (acao === 'atualizar') {
      const incomingPeopleIds = new Set((pessoas || []).map(p => p.pessoa_id));

      // Buscar pessoas atualmente vinculadas diretamente
      const currentLinks = await query(
        'SELECT pessoa_id FROM pessoa_conta WHERE conta_id = ? AND ativo = true',
        [id]
      );
      const currentPeopleIds = new Set(currentLinks.map(link => link.pessoa_id));

      // Desativar vínculos removidos
      for (const currentPersonId of currentPeopleIds) {
        if (!incomingPeopleIds.has(currentPersonId)) {
          await query(
            'UPDATE pessoa_conta SET ativo = false, data_fim = CURDATE() WHERE conta_id = ? AND pessoa_id = ? AND ativo = true',
            [id, currentPersonId]
          );
        }
      }

      // Adicionar ou atualizar vínculos
      for (const pessoa of pessoas || []) {
        const { 
          pessoa_id, 
          tipo_vinculo = 'CONSULTOR', 
          tem_acesso_sistema = false,
          login_cliente = null,
          senha = null
        } = pessoa;
        
        // Validar login único se fornecido
        if (login_cliente) {
          const existingLogin = await query(
            'SELECT id FROM pessoa_conta WHERE login_cliente = ? AND conta_id != ? AND pessoa_id != ? AND ativo = true',
            [login_cliente, id, pessoa_id]
          );
          if (existingLogin.length > 0) {
            return res.status(400).json({
              success: false,
              message: `O login "${login_cliente}" já está em uso por outra pessoa`
            });
          }
        }

        // Preparar senha_hash se senha fornecida
        let senhaHash = null;
        if (senha && senha.trim() !== '') {
          senhaHash = await bcrypt.hash(senha, 10);
        } else if (tem_acesso_sistema) {
          // Se tem acesso mas não forneceu senha, manter senha existente
          const existingLink = await query(
            'SELECT senha_hash FROM pessoa_conta WHERE conta_id = ? AND pessoa_id = ? AND ativo = true',
            [id, pessoa_id]
          );
          if (existingLink.length > 0 && existingLink[0].senha_hash) {
            senhaHash = existingLink[0].senha_hash;
          }
        }
        
        if (currentPeopleIds.has(pessoa_id)) {
          // Atualizar vínculo existente
          const updateFields = [
            'tipo_vinculo = ?',
            'tem_acesso_sistema = ?',
            'data_fim = NULL',
            'ativo = true'
          ];
          const updateParams = [tipo_vinculo, tem_acesso_sistema ? 1 : 0];

          if (login_cliente !== null) {
            updateFields.push('login_cliente = ?');
            updateParams.push(tem_acesso_sistema ? login_cliente : null);
          }

          if (senhaHash !== null) {
            updateFields.push('senha_hash = ?');
            updateParams.push(tem_acesso_sistema ? senhaHash : null);
          } else if (!tem_acesso_sistema) {
            // Se desativou acesso, limpar login e senha
            updateFields.push('login_cliente = NULL');
            updateFields.push('senha_hash = NULL');
          }

          updateParams.push(id, pessoa_id);

          await query(
            `UPDATE pessoa_conta SET ${updateFields.join(', ')} WHERE conta_id = ? AND pessoa_id = ? AND ativo = true`,
            updateParams
          );
        } else {
          // Criar novo vínculo
          await query(`
            INSERT INTO pessoa_conta (conta_id, pessoa_id, tipo_vinculo, tem_acesso_sistema, login_cliente, senha_hash, data_inicio, ativo)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), true)
            ON DUPLICATE KEY UPDATE
              tipo_vinculo = VALUES(tipo_vinculo),
              tem_acesso_sistema = VALUES(tem_acesso_sistema),
              login_cliente = VALUES(login_cliente),
              senha_hash = VALUES(senha_hash),
              data_inicio = VALUES(data_inicio),
              data_fim = NULL,
              ativo = true
          `, [id, pessoa_id, tipo_vinculo, tem_acesso_sistema ? 1 : 0, tem_acesso_sistema ? login_cliente : null, tem_acesso_sistema ? senhaHash : null]);
        }
      }
    }

    res.json({
      success: true,
      message: 'Vínculos de pessoas atualizados com sucesso'
    });

  } catch (error) {
    console.error('Erro ao gerenciar pessoas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarContas,
  obterConta,
  criarConta,
  atualizarConta,
  deletarConta,
  gerenciarEmpresas,
  gerenciarPessoas
};
