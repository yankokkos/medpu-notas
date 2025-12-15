const bcrypt = require('bcrypt');
const { query } = require('../../config/database');

// Listar funcionários com filtros e paginação
const listarFuncionarios = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '' 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (f.nome_completo LIKE ? OR f.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClause += ' AND f.status = ?';
      params.push(status);
    }

    const sql = `
      SELECT 
        f.id, f.nome_completo, f.email, f.telefone, f.cargo, f.status, f.created_at,
        GROUP_CONCAT(fn.nome) as funcoes
      FROM funcionarios f
      LEFT JOIN funcionario_funcao ff ON f.id = ff.funcionario_id
      LEFT JOIN funcoes fn ON ff.funcao_id = fn.id
      ${whereClause}
      GROUP BY f.id
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const funcionarios = await query(sql, params);

    // Processar funcoes de string para array
    const funcionariosProcessados = funcionarios.map(funcionario => ({
      ...funcionario,
      funcoes: funcionario.funcoes ? funcionario.funcoes.split(',') : [],
      data_cadastro: funcionario.created_at,
      ultimo_acesso: null // Campo não existe no schema atual
    }));

    const countSql = `SELECT COUNT(*) as total FROM funcionarios f ${whereClause}`;
    const [{ total }] = await query(countSql, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        funcionarios: funcionariosProcessados,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar funcionários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter funcionário por ID
const obterFuncionario = async (req, res) => {
  try {
    const { id } = req.params;

    const [funcionario] = await query(`
      SELECT 
        f.id, f.nome_completo, f.email, f.telefone, f.cargo, f.status, f.created_at
      FROM funcionarios f
      WHERE f.id = ?
    `, [id]);

    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    // Buscar funções
    const funcoesFuncionario = await query(`
      SELECT fn.id, fn.nome, fn.descricao, fn.permissoes
      FROM funcionario_funcao ff
      JOIN funcoes fn ON ff.funcao_id = fn.id
      WHERE ff.funcionario_id = ?
    `, [id]);

    funcionario.funcoes = funcoesFuncionario.map(f => f.nome);
    funcionario.data_cadastro = funcionario.created_at;
    funcionario.ultimo_acesso = null;

    res.json({
      success: true,
      data: { funcionario }
    });

  } catch (error) {
    console.error('Erro ao obter funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar novo funcionário
const criarFuncionario = async (req, res) => {
  try {
    const {
      nome_completo,
      email,
      senha,
      telefone,
      cargo,
      funcoes = []
    } = req.body;

    // Verificar se email já existe
    const existing = await query(
      'SELECT id FROM funcionarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um funcionário com este email'
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar funcionário
    const result = await query(`
      INSERT INTO funcionarios (nome_completo, email, senha_hash, telefone, cargo)
      VALUES (?, ?, ?, ?, ?)
    `, [nome_completo, email, senhaHash, telefone, cargo]);

    const funcionarioId = result.insertId;

    // Associar funções
    for (const funcao of funcoes) {
      let funcaoId;
      
      // Se funcao é um número, usar diretamente como ID
      if (typeof funcao === 'number' || (typeof funcao === 'string' && /^\d+$/.test(funcao))) {
        funcaoId = parseInt(funcao);
      } else {
        // Se é string (nome da função), buscar o ID
        const funcaoEncontrada = await query(
          'SELECT id FROM funcoes WHERE nome = ?',
          [funcao]
        );
        
        if (funcaoEncontrada.length === 0) {
          console.warn(`Função "${funcao}" não encontrada. Pulando...`);
          continue;
        }
        
        funcaoId = funcaoEncontrada[0].id;
      }
      
      await query(`
        INSERT INTO funcionario_funcao (funcionario_id, funcao_id)
        VALUES (?, ?)
      `, [funcionarioId, funcaoId]);
    }

    // Buscar funcionário criado
    const [funcionario] = await query(`
      SELECT 
        f.id, f.nome_completo, f.email, f.telefone, f.cargo, f.status, f.created_at
      FROM funcionarios f
      WHERE f.id = ?
    `, [funcionarioId]);

    // Buscar funções
    const funcoesFuncionario = await query(`
      SELECT fn.nome
      FROM funcionario_funcao ff
      JOIN funcoes fn ON ff.funcao_id = fn.id
      WHERE ff.funcionario_id = ?
    `, [funcionarioId]);

    funcionario.funcoes = funcoesFuncionario.map(f => f.nome);
    funcionario.data_cadastro = funcionario.created_at;
    funcionario.ultimo_acesso = null;

    res.status(201).json({
      success: true,
      message: 'Funcionário criado com sucesso',
      data: { funcionario }
    });

  } catch (error) {
    console.error('Erro ao criar funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar funcionário
const atualizarFuncionario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome_completo,
      email,
      senha,
      telefone,
      cargo,
      status,
      funcoes = []
    } = req.body;

    // Verificar se funcionário existe
    const existing = await query(
      'SELECT id FROM funcionarios WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    // Verificar se email já existe em outro funcionário
    if (email) {
      const duplicate = await query(
        'SELECT id FROM funcionarios WHERE email = ? AND id != ?',
        [email, id]
      );

      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um funcionário com este email'
        });
      }
    }

    // Preparar dados para atualização
    let updateFields = [];
    let params = [];

    if (nome_completo) {
      updateFields.push('nome_completo = ?');
      params.push(nome_completo);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (senha) {
      const senhaHash = await bcrypt.hash(senha, 10);
      updateFields.push('senha_hash = ?');
      params.push(senhaHash);
    }
    if (telefone !== undefined) {
      updateFields.push('telefone = ?');
      params.push(telefone);
    }
    if (cargo !== undefined) {
      updateFields.push('cargo = ?');
      params.push(cargo);
    }
    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }

    if (updateFields.length > 0) {
      params.push(id);
      await query(`
        UPDATE funcionarios SET ${updateFields.join(', ')} WHERE id = ?
      `, params);
    }

    // Atualizar funções se fornecidas
    if (funcoes.length >= 0) {
      // Remover funções existentes
      await query('DELETE FROM funcionario_funcao WHERE funcionario_id = ?', [id]);

      // Adicionar novas funções
      for (const funcao of funcoes) {
        let funcaoId;
        
        // Se funcao é um número, usar diretamente como ID
        if (typeof funcao === 'number' || (typeof funcao === 'string' && /^\d+$/.test(funcao))) {
          funcaoId = parseInt(funcao);
        } else {
          // Se é string (nome da função), buscar o ID
          const funcaoEncontrada = await query(
            'SELECT id FROM funcoes WHERE nome = ?',
            [funcao]
          );
          
          if (funcaoEncontrada.length === 0) {
            console.warn(`Função "${funcao}" não encontrada. Pulando...`);
            continue;
          }
          
          funcaoId = funcaoEncontrada[0].id;
        }
        
        await query(`
          INSERT INTO funcionario_funcao (funcionario_id, funcao_id)
          VALUES (?, ?)
        `, [id, funcaoId]);
      }
    }

    // Buscar funcionário atualizado
    const [funcionario] = await query(`
      SELECT 
        f.id, f.nome_completo, f.email, f.telefone, f.cargo, f.status, f.created_at
      FROM funcionarios f
      WHERE f.id = ?
    `, [id]);

    // Buscar funções
    const funcoesFuncionario = await query(`
      SELECT fn.nome
      FROM funcionario_funcao ff
      JOIN funcoes fn ON ff.funcao_id = fn.id
      WHERE ff.funcionario_id = ?
    `, [id]);

    funcionario.funcoes = funcoesFuncionario.map(f => f.nome);
    funcionario.data_cadastro = funcionario.created_at;
    funcionario.ultimo_acesso = null;

    res.json({
      success: true,
      message: 'Funcionário atualizado com sucesso',
      data: { funcionario }
    });

  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar funcionário
const deletarFuncionario = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se funcionário existe
    const existing = await query(
      'SELECT id FROM funcionarios WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    // Verificar se é o último administrador
    const adminCount = await query(`
      SELECT COUNT(*) as count
      FROM funcionario_funcao ff
      JOIN funcoes f ON ff.funcao_id = f.id
      WHERE f.nome_funcao = 'Administrador'
    `);

    if (adminCount[0].count <= 1) {
      // Verificar se este funcionário é administrador
      const isAdmin = await query(`
        SELECT COUNT(*) as count
        FROM funcionario_funcao ff
        JOIN funcoes f ON ff.funcao_id = f.id
        WHERE ff.funcionario_id = ? AND f.nome_funcao = 'Administrador'
      `, [id]);

      if (isAdmin[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível excluir o último administrador do sistema'
        });
      }
    }

    // Deletar funcionário (cascade vai deletar vínculos)
    await query('DELETE FROM funcionarios WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Funcionário excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar funções disponíveis
const listarFuncoes = async (req, res) => {
  try {
    const funcoesDisponiveis = await query(`
      SELECT id, nome, descricao, permissoes
      FROM funcoes
      ORDER BY nome
    `);

    res.json({
      success: true,
      data: { funcoes: funcoesDisponiveis }
    });

  } catch (error) {
    console.error('Erro ao listar funções:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarFuncionarios,
  obterFuncionario,
  criarFuncionario,
  atualizarFuncionario,
  deletarFuncionario,
  listarFuncoes
};
