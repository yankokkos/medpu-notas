const { query } = require('../../config/database');

// Listar pessoas com filtros e paginação
const listarPessoas = async (req, res) => {
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

    // Filtro de busca
    if (search) {
      whereClause += ' AND (p.nome_completo LIKE ? OR p.cpf LIKE ? OR p.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filtro de status
    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    // Query principal
    const sql = `
      SELECT 
        p.*,
        COUNT(DISTINCT ep.empresa_id) as empresas_count
      FROM pessoas p
      LEFT JOIN pessoa_empresa ep ON p.id = ep.pessoa_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);

    const pessoas = await query(sql, params);

    // Para cada pessoa, buscar empresas relacionadas com participação calculada
    const pessoasComEmpresas = await Promise.all(
      pessoas.map(async (pessoa) => {
        // Buscar empresas relacionadas com participação calculada baseada nas notas fiscais
        const empresas = await query(`
          SELECT 
            e.id as empresa_id,
            e.razao_social as empresa_nome,
            ep.tipo_vinculo,
            ep.percentual_participacao as percentual_participacao_fixo,
            COALESCE(
              (SELECT SUM(nfp.valor_prestado) 
               FROM nota_fiscal_pessoa nfp
               JOIN notas_fiscais nf ON nfp.nota_fiscal_id = nf.id
               WHERE nfp.pessoa_id = ? AND nf.empresa_id = e.id AND nf.status = 'AUTORIZADA'),
              0
            ) as valor_total_emitido_socio,
            COALESCE(
              (SELECT SUM(nf.valor_total)
               FROM notas_fiscais nf
               WHERE nf.empresa_id = e.id AND nf.status = 'AUTORIZADA'),
              0
            ) as valor_total_emitido_empresa
          FROM empresas e
          JOIN pessoa_empresa ep ON e.id = ep.empresa_id
          WHERE ep.pessoa_id = ? AND e.status = 'ativa' AND ep.ativo = true
          ORDER BY e.razao_social
        `, [pessoa.id, pessoa.id]);

        // Calcular participação dinâmica baseada nas notas fiscais
        const empresasComParticipacao = empresas.map(empresa => {
          let participacaoCalculada = null;
          
          // Se houver valor total emitido pela empresa, calcular participação
          if (empresa.valor_total_emitido_empresa > 0) {
            participacaoCalculada = (empresa.valor_total_emitido_socio / empresa.valor_total_emitido_empresa) * 100;
          }
          
          return {
            empresa_id: empresa.empresa_id,
            empresa_nome: empresa.empresa_nome,
            tipo_vinculo: empresa.tipo_vinculo,
            percentual_participacao: participacaoCalculada !== null ? parseFloat(participacaoCalculada.toFixed(2)) : empresa.percentual_participacao_fixo,
            valor_total_emitido_socio: parseFloat(empresa.valor_total_emitido_socio || 0),
            valor_total_emitido_empresa: parseFloat(empresa.valor_total_emitido_empresa || 0)
          };
        });

        return {
          ...pessoa,
          empresas: empresasComParticipacao
        };
      })
    );

    // Query para contar total
    const countSql = `
      SELECT COUNT(*) as total
      FROM pessoas p
      ${whereClause}
    `;

    const [{ total }] = await query(countSql, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        pessoas: pessoasComEmpresas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter pessoa por ID
const obterPessoa = async (req, res) => {
  try {
    const { id } = req.params;

    const pessoas = await query(`
      SELECT * FROM pessoas WHERE id = ?
    `, [id]);

    if (pessoas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada'
      });
    }

    // Buscar empresas vinculadas com participação calculada
    const empresasRaw = await query(`
      SELECT 
        e.id, e.razao_social, e.cnpj, e.status,
        ep.tipo_vinculo, ep.percentual_participacao as percentual_participacao_fixo, 
        ep.data_inicio, ep.data_fim,
        COALESCE(
          (SELECT SUM(nfp.valor_prestado) 
           FROM nota_fiscal_pessoa nfp
           JOIN notas_fiscais nf ON nfp.nota_fiscal_id = nf.id
           WHERE nfp.pessoa_id = ? AND nf.empresa_id = e.id AND nf.status = 'AUTORIZADA'),
          0
        ) as valor_total_emitido_socio,
        COALESCE(
          (SELECT SUM(nf.valor_total)
           FROM notas_fiscais nf
           WHERE nf.empresa_id = e.id AND nf.status = 'AUTORIZADA'),
          0
        ) as valor_total_emitido_empresa
      FROM empresas e
      JOIN pessoa_empresa ep ON e.id = ep.empresa_id
      WHERE ep.pessoa_id = ?
      ORDER BY e.razao_social
    `, [id, id]);

    // Calcular participação dinâmica
    const empresas = empresasRaw.map(empresa => {
      let participacaoCalculada = null;
      
      if (empresa.valor_total_emitido_empresa > 0) {
        participacaoCalculada = (empresa.valor_total_emitido_socio / empresa.valor_total_emitido_empresa) * 100;
      }
      
      return {
        id: empresa.id,
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        status: empresa.status,
        tipo_vinculo: empresa.tipo_vinculo,
        percentual_participacao: participacaoCalculada !== null ? parseFloat(participacaoCalculada.toFixed(2)) : empresa.percentual_participacao_fixo,
        data_inicio: empresa.data_inicio,
        data_fim: empresa.data_fim,
        valor_total_emitido_socio: parseFloat(empresa.valor_total_emitido_socio || 0),
        valor_total_emitido_empresa: parseFloat(empresa.valor_total_emitido_empresa || 0)
      };
    });

    // Buscar documentos
    const documentos = await query(`
      SELECT id, nome_arquivo, nome_original, tipo_arquivo, tamanho_bytes, categoria, created_at
      FROM documentos 
      WHERE entidade_tipo = 'Pessoa' AND entidade_id = ?
      ORDER BY created_at DESC
    `, [id]);

    // Buscar endereços
    const enderecos = await query(`
      SELECT id, logradouro, numero, complemento, bairro, municipio, uf, cep, tipo_endereco
      FROM enderecos 
      WHERE entidade_tipo = 'Pessoa' AND entidade_id = ?
      ORDER BY tipo_endereco
    `, [id]);

    const pessoa = {
      ...pessoas[0],
      empresas_vinculadas: empresas,
      documentos: documentos,
      enderecos: enderecos
    };

    res.json({
      success: true,
      data: { pessoa }
    });

  } catch (error) {
    console.error('Erro ao obter pessoa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar nova pessoa
const criarPessoa = async (req, res) => {
  try {
    const {
      nome_completo,
      cpf,
      email,
      telefone,
      data_nascimento,
      registro_profissional,
      especialidade,
      foto_url
    } = req.body;

    // Verificar se CPF já existe
    const existing = await query(
      'SELECT id FROM pessoas WHERE cpf = ?',
      [cpf]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma pessoa com este CPF'
      });
    }

    // Verificar se email já existe (se fornecido)
    if (email) {
      const emailExisting = await query(
        'SELECT id FROM pessoas WHERE email = ?',
        [email]
      );

      if (emailExisting.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma pessoa com este email'
        });
      }
    }

    // Inserir nova pessoa
    const result = await query(`
      INSERT INTO pessoas (
        nome_completo, cpf, email, telefone, data_nascimento,
        registro_profissional, especialidade, foto_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nome_completo, cpf, email, telefone, data_nascimento,
      registro_profissional, especialidade, foto_url
    ]);

    const pessoaId = result.insertId;

    // Buscar pessoa criada
    const [pessoa] = await query(
      'SELECT * FROM pessoas WHERE id = ?',
      [pessoaId]
    );

    res.status(201).json({
      success: true,
      message: 'Pessoa criada com sucesso',
      data: { pessoa }
    });

  } catch (error) {
    console.error('Erro ao criar pessoa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar pessoa
const atualizarPessoa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome_completo,
      cpf,
      email,
      telefone,
      data_nascimento,
      registro_profissional,
      especialidade,
      foto_url,
      status
    } = req.body;

    // Verificar se pessoa existe
    const existing = await query(
      'SELECT id FROM pessoas WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada'
      });
    }

    // Verificar se CPF já existe em outra pessoa
    if (cpf) {
      const duplicate = await query(
        'SELECT id FROM pessoas WHERE cpf = ? AND id != ?',
        [cpf, id]
      );

      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma pessoa com este CPF'
        });
      }
    }

    // Verificar se email já existe em outra pessoa (se fornecido)
    if (email) {
      const emailDuplicate = await query(
        'SELECT id FROM pessoas WHERE email = ? AND id != ?',
        [email, id]
      );

      if (emailDuplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma pessoa com este email'
        });
      }
    }

    // Atualizar pessoa
    await query(`
      UPDATE pessoas SET
        nome_completo = COALESCE(?, nome_completo),
        cpf = COALESCE(?, cpf),
        email = COALESCE(?, email),
        telefone = COALESCE(?, telefone),
        data_nascimento = COALESCE(?, data_nascimento),
        registro_profissional = COALESCE(?, registro_profissional),
        especialidade = COALESCE(?, especialidade),
        foto_url = COALESCE(?, foto_url),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      nome_completo, cpf, email, telefone, data_nascimento,
      registro_profissional, especialidade, foto_url, status, id
    ]);

    // Buscar pessoa atualizada
    const [pessoa] = await query(
      'SELECT * FROM pessoas WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Pessoa atualizada com sucesso',
      data: { pessoa }
    });

  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar pessoa
const deletarPessoa = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se pessoa existe
    const existing = await query(
      'SELECT id FROM pessoas WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada'
      });
    }

    // Verificar se há notas fiscais vinculadas
    const notas = await query(`
      SELECT COUNT(*) as count 
      FROM nota_fiscal_pessoa nfp
      JOIN notas_fiscais nf ON nfp.nota_fiscal_id = nf.id
      WHERE nfp.pessoa_id = ?
    `, [id]);

    if (notas[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir pessoa com notas fiscais vinculadas'
      });
    }

    // Deletar pessoa (cascade vai deletar vínculos)
    await query('DELETE FROM pessoas WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Pessoa excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarPessoas,
  obterPessoa,
  criarPessoa,
  atualizarPessoa,
  deletarPessoa
};
