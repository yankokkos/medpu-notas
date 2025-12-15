const { query } = require('../../config/database');

// Listar modelos com filtros e paginação
const listarModelos = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      categoria = '' 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (m.titulo_modelo LIKE ? OR m.texto_modelo LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (categoria) {
      whereClause += ' AND m.categoria = ?';
      params.push(categoria);
    }

    const sql = `
      SELECT 
        m.*,
        f.nome_completo as criador_nome,
        COUNT(DISTINCT nf.id) as uso_count,
        (SELECT COUNT(*) FROM tomador_modelo tm WHERE tm.modelo_id = m.id AND tm.ativo = true) as tomadores_associados
      FROM modelos_discriminacao m
      LEFT JOIN funcionarios f ON m.funcionario_criador_id = f.id
      LEFT JOIN notas_fiscais nf ON m.id = nf.modelo_discriminacao_id
      ${whereClause}
      GROUP BY m.id
      ORDER BY m.uso_frequente DESC, m.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const modelos = await query(sql, params);

    // Processar JSON fields
    const modelosProcessados = modelos.map(modelo => {
      let variaveisUsadas = [];
      
      try {
        if (Array.isArray(modelo.variaveis_usadas)) {
          variaveisUsadas = modelo.variaveis_usadas;
        } else if (typeof modelo.variaveis_usadas === 'string') {
          // Tentar parsear como JSON
          variaveisUsadas = JSON.parse(modelo.variaveis_usadas);
        } else if (modelo.variaveis_usadas) {
          variaveisUsadas = [modelo.variaveis_usadas];
        }
      } catch (error) {
        console.warn('Erro ao processar variaveis_usadas para modelo', modelo.id, ':', error.message);
        variaveisUsadas = [];
      }
      
      return {
        ...modelo,
        variaveis_usadas: variaveisUsadas,
        tomadores_associados: parseInt(modelo.tomadores_associados) || 0
      };
    });

    const countSql = `SELECT COUNT(*) as total FROM modelos_discriminacao m ${whereClause}`;
    const [{ total }] = await query(countSql, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        modelos: modelosProcessados,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar modelos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter modelo por ID
const obterModelo = async (req, res) => {
  try {
    const { id } = req.params;

    const [modelo] = await query(`
      SELECT 
        m.*,
        f.nome_completo as criador_nome,
        (SELECT COUNT(*) FROM tomador_modelo tm WHERE tm.modelo_id = m.id AND tm.ativo = true) as tomadores_associados
      FROM modelos_discriminacao m
      LEFT JOIN funcionarios f ON m.funcionario_criador_id = f.id
      WHERE m.id = ?
    `, [id]);

    if (!modelo) {
      return res.status(404).json({
        success: false,
        message: 'Modelo não encontrado'
      });
    }

    // Processar JSON fields
    let variaveisUsadas = [];
    
    try {
      if (Array.isArray(modelo.variaveis_usadas)) {
        variaveisUsadas = modelo.variaveis_usadas;
      } else if (typeof modelo.variaveis_usadas === 'string') {
        // Tentar parsear como JSON
        variaveisUsadas = JSON.parse(modelo.variaveis_usadas);
      } else if (modelo.variaveis_usadas) {
        variaveisUsadas = [modelo.variaveis_usadas];
      }
    } catch (error) {
      console.warn('Erro ao processar variaveis_usadas para modelo', modelo.id, ':', error.message);
      variaveisUsadas = [];
    }
    
    const modeloProcessado = {
      ...modelo,
      variaveis_usadas: variaveisUsadas,
      tomadores_associados: parseInt(modelo.tomadores_associados) || 0
    };

    res.json({
      success: true,
      data: { modelo: modeloProcessado }
    });

  } catch (error) {
    console.error('Erro ao obter modelo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar novo modelo
const criarModelo = async (req, res) => {
  try {
    const {
      titulo_modelo,
      texto_modelo,
      categoria,
      variaveis_usadas,
      uso_frequente
    } = req.body;

    const funcionarioId = req.user.id;

    // Verificar se título já existe
    const existing = await query(
      'SELECT id FROM modelos_discriminacao WHERE titulo_modelo = ?',
      [titulo_modelo]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um modelo com este título'
      });
    }

    const result = await query(`
      INSERT INTO modelos_discriminacao (
        titulo_modelo, texto_modelo, categoria, variaveis_usadas, 
        funcionario_criador_id, uso_frequente
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      titulo_modelo, texto_modelo, categoria, 
      JSON.stringify(variaveis_usadas || []), 
      funcionarioId, uso_frequente || false
    ]);

    const [modelo] = await query(
      'SELECT * FROM modelos_discriminacao WHERE id = ?',
      [result.insertId]
    );

    // Processar JSON fields
    let variaveisUsadas = [];
    
    try {
      if (Array.isArray(modelo.variaveis_usadas)) {
        variaveisUsadas = modelo.variaveis_usadas;
      } else if (typeof modelo.variaveis_usadas === 'string' && modelo.variaveis_usadas.trim() !== '') {
        // Tentar parsear como JSON apenas se não estiver vazio
        variaveisUsadas = JSON.parse(modelo.variaveis_usadas);
      } else if (modelo.variaveis_usadas) {
        variaveisUsadas = [modelo.variaveis_usadas];
      }
    } catch (error) {
      console.warn('Erro ao processar variaveis_usadas para modelo', modelo.id, ':', error.message);
      variaveisUsadas = [];
    }
    
    const modeloProcessado = {
      ...modelo,
      variaveis_usadas: variaveisUsadas,
      tomadores_associados: 0
    };

    res.status(201).json({
      success: true,
      message: 'Modelo criado com sucesso',
      data: { modelo: modeloProcessado }
    });

  } catch (error) {
    console.error('Erro ao criar modelo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar modelo
const atualizarModelo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo_modelo,
      texto_modelo,
      categoria,
      variaveis_usadas,
      uso_frequente
    } = req.body;

    const existing = await query(
      'SELECT id FROM modelos_discriminacao WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Modelo não encontrado'
      });
    }

    if (titulo_modelo) {
      const duplicate = await query(
        'SELECT id FROM modelos_discriminacao WHERE titulo_modelo = ? AND id != ?',
        [titulo_modelo, id]
      );

      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um modelo com este título'
        });
      }
    }

    await query(`
      UPDATE modelos_discriminacao SET
        titulo_modelo = COALESCE(?, titulo_modelo),
        texto_modelo = COALESCE(?, texto_modelo),
        categoria = COALESCE(?, categoria),
        variaveis_usadas = COALESCE(?, variaveis_usadas),
        uso_frequente = COALESCE(?, uso_frequente)
      WHERE id = ?
    `, [
      titulo_modelo, texto_modelo, categoria,
      variaveis_usadas ? JSON.stringify(variaveis_usadas) : null,
      uso_frequente, id
    ]);

    const [modelo] = await query(
      'SELECT * FROM modelos_discriminacao WHERE id = ?',
      [id]
    );

    // Processar JSON fields
    let variaveisUsadas = [];
    
    try {
      if (Array.isArray(modelo.variaveis_usadas)) {
        variaveisUsadas = modelo.variaveis_usadas;
      } else if (typeof modelo.variaveis_usadas === 'string' && modelo.variaveis_usadas.trim() !== '') {
        // Tentar parsear como JSON apenas se não estiver vazio
        variaveisUsadas = JSON.parse(modelo.variaveis_usadas);
      } else if (modelo.variaveis_usadas) {
        variaveisUsadas = [modelo.variaveis_usadas];
      }
    } catch (error) {
      console.warn('Erro ao processar variaveis_usadas para modelo', modelo.id, ':', error.message);
      variaveisUsadas = [];
    }
    
    const modeloProcessado = {
      ...modelo,
      variaveis_usadas: variaveisUsadas,
      tomadores_associados: 0
    };

    res.json({
      success: true,
      message: 'Modelo atualizado com sucesso',
      data: { modelo: modeloProcessado }
    });

  } catch (error) {
    console.error('Erro ao atualizar modelo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar modelo
const deletarModelo = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT id FROM modelos_discriminacao WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Modelo não encontrado'
      });
    }

    // Verificar se há notas fiscais usando este modelo
    const notas = await query(
      'SELECT COUNT(*) as count FROM notas_fiscais WHERE modelo_discriminacao_id = ?',
      [id]
    );

    if (notas[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir modelo em uso por notas fiscais'
      });
    }

    await query('DELETE FROM modelos_discriminacao WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Modelo excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar modelo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter modelos por tomador (para NFSeWizard)
const obterPorTomador = async (req, res) => {
  try {
    const { tomadorId } = req.params;

    // Verificar se tomador existe
    const tomador = await query(
      'SELECT id, nome_razao_social FROM tomadores WHERE id = ? AND status = "ativo"',
      [tomadorId]
    );

    if (tomador.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado ou inativo'
      });
    }

    // Buscar modelos disponíveis para o tomador
    let modelos = [];
    try {
      const resultados = await query(`
        SELECT 
          m.*,
          f.nome_completo as criador_nome,
          tm.uso_frequente as uso_frequente_tomador,
          tm.data_inicio,
          tm.data_fim,
          (SELECT COUNT(*) FROM tomador_modelo tm2 WHERE tm2.modelo_id = m.id AND tm2.ativo = true) as tomadores_associados
        FROM modelos_discriminacao m
        LEFT JOIN funcionarios f ON m.funcionario_criador_id = f.id
        INNER JOIN tomador_modelo tm ON m.id = tm.modelo_id
        WHERE tm.tomador_id = ? 
          AND tm.ativo = true
          AND (tm.data_fim IS NULL OR tm.data_fim >= CURDATE())
        ORDER BY tm.uso_frequente DESC, m.uso_frequente DESC, m.titulo_modelo
      `, [tomadorId]);
      
      // Garantir que modelos seja um array
      modelos = Array.isArray(resultados) ? resultados : [];
    } catch (queryError) {
      console.error('Erro na query de modelos:', queryError);
      // Se não houver modelos associados ou houver erro na query, retornar array vazio
      modelos = [];
    }

    // Processar JSON fields apenas se houver modelos
    let modelosProcessados = [];
    if (modelos && modelos.length > 0) {
      modelosProcessados = modelos.map(modelo => {
        let variaveisUsadas = [];
        
        try {
          if (Array.isArray(modelo.variaveis_usadas)) {
            variaveisUsadas = modelo.variaveis_usadas;
          } else if (typeof modelo.variaveis_usadas === 'string') {
            // Tentar parsear como JSON
            variaveisUsadas = JSON.parse(modelo.variaveis_usadas);
          } else if (modelo.variaveis_usadas) {
            variaveisUsadas = [modelo.variaveis_usadas];
          }
        } catch (error) {
          console.warn('Erro ao processar variaveis_usadas para modelo', modelo.id, ':', error.message);
          variaveisUsadas = [];
        }
        
        return {
          ...modelo,
          variaveis_usadas: variaveisUsadas,
          tomadores_associados: parseInt(modelo.tomadores_associados) || 0
        };
      });
    }

    // Retornar resposta mesmo se não houver modelos
    res.json({
      success: true,
      data: { 
        tomador: tomador && tomador.length > 0 ? tomador[0] : null,
        modelos: modelosProcessados
      }
    });

  } catch (error) {
    console.error('Erro ao obter modelos por tomador:', error);
    // Em caso de erro, retornar lista vazia ao invés de erro 500
    // para não quebrar o frontend
    try {
      const [tomador] = await query(
        'SELECT id, nome_razao_social FROM tomadores WHERE id = ? AND status = "ativo"',
        [req.params.tomadorId]
      );
      
      res.json({
        success: true,
        data: { 
          tomador: tomador || null,
          modelos: []
        }
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
};

module.exports = {
  listarModelos,
  obterModelo,
  criarModelo,
  atualizarModelo,
  deletarModelo,
  obterPorTomador
};
