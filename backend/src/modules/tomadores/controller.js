const { query } = require('../../config/database');

// Listar tomadores com filtros e paginação
const listarTomadores = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      conta_id = '',
      tipo_pessoa = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Filtros
    if (search) {
      whereClause += ' AND (t.nome_razao_social LIKE ? OR t.cnpj_cpf LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }
    if (conta_id) {
      whereClause += ' AND t.conta_id = ?';
      params.push(conta_id);
    }
    if (tipo_pessoa) {
      whereClause += ' AND t.tipo_pessoa = ?';
      params.push(tipo_pessoa);
    }

    const sql = `
      SELECT 
        vtc.*,
        COUNT(DISTINCT nf.id) as notas_emitidas,
        COALESCE(SUM(nf.valor_total), 0) as valor_total_notas
      FROM vw_tomadores_completos vtc
      LEFT JOIN notas_fiscais nf ON vtc.id = nf.tomador_id
      ${whereClause.replace('t.', 'vtc.')}
      GROUP BY vtc.id
      ORDER BY vtc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const tomadores = await query(sql, params);

    // Contar total
    const countSql = `
      SELECT COUNT(*) as total
      FROM vw_tomadores_completos vtc
      ${whereClause.replace('t.', 'vtc.')}
    `;
    const [{ total }] = await query(countSql, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        tomadores,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar tomadores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter tomador por ID
const obterTomador = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar dados completos do tomador incluindo pessoa_id e empresa_id
    const [tomadorBase] = await query(`
      SELECT 
        t.id,
        t.tipo_tomador,
        t.pessoa_id,
        t.empresa_id,
        t.status,
        t.iss_retido,
        t.inscricao_municipal,
        t.inscricao_estadual,
        t.conta_id,
        t.created_at,
        t.updated_at
      FROM tomadores t
      WHERE t.id = ?
    `, [id]);

    if (!tomadorBase) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    // Buscar dados da view para campos unificados
    const [tomadorView] = await query(`
      SELECT 
        vtc.*
      FROM vw_tomadores_completos vtc
      WHERE vtc.id = ?
    `, [id]);

    // Buscar data_nascimento se for pessoa física
    let data_nascimento = null;
    if (tomadorBase.tipo_tomador === 'PESSOA' && tomadorBase.pessoa_id) {
      const [pessoa] = await query(`
        SELECT data_nascimento
        FROM pessoas
        WHERE id = ?
      `, [tomadorBase.pessoa_id]);
      if (pessoa) {
        data_nascimento = pessoa.data_nascimento;
      }
    }

    // Buscar notas fiscais
    const notas = await query(`
      SELECT id, status, valor_total, mes_competencia, data_emissao, created_at
      FROM notas_fiscais 
      WHERE tomador_id = ?
      ORDER BY created_at DESC
    `, [id]);

    // Buscar endereços - verificar tanto enderecos quanto enderecos_tomador
    let enderecos = await query(`
      SELECT id, logradouro, numero, complemento, bairro, municipio as cidade, uf, cep, tipo_endereco
      FROM enderecos 
      WHERE entidade_tipo = 'Tomador' AND entidade_id = ?
      ORDER BY tipo_endereco
    `, [id]);

    // Se não encontrou em enderecos, buscar em enderecos_tomador
    if (enderecos.length === 0) {
      enderecos = await query(`
        SELECT id, logradouro, numero, complemento, bairro, cidade, estado as uf, cep, tipo_endereco
        FROM enderecos_tomador
        WHERE tomador_id = ?
        ORDER BY tipo_endereco
      `, [id]);
    }

    const tomador = {
      ...tomadorView,
      pessoa_id: tomadorBase.pessoa_id,
      empresa_id: tomadorBase.empresa_id,
      data_nascimento: data_nascimento,
      notas_fiscais: notas,
      enderecos: enderecos
    };

    res.json({
      success: true,
      data: { tomador }
    });

  } catch (error) {
    console.error('Erro ao obter tomador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar novo tomador
const criarTomador = async (req, res) => {
  try {
    const {
      conta_id,
      pessoa_id, // ID da pessoa se fornecida (vinculação a existente)
      empresa_id, // ID da empresa se fornecida (vinculação a existente)
      socio_id, // ID do sócio que presta serviço para este tomador (cria vínculo em socio_tomador)
      nome_razao_social,
      cnpj_cpf,
      tipo_pessoa, // PESSOA ou EMPRESA
      email,
      telefone,
      iss_retido,
      inscricao_municipal,
      inscricao_estadual,
      // Campos de endereço completo (obrigatório para emissão de nota)
      logradouro,
      endereco, // Mantido para compatibilidade
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      // Para pessoa física
      data_nascimento
    } = req.body;

    // Validar tipo_pessoa (aceita PF/PJ ou PESSOA/EMPRESA para compatibilidade)
    if (!tipo_pessoa) {
      return res.status(400).json({
        success: false,
        message: 'tipo_pessoa é obrigatório'
      });
    }
    
    // Normalizar tipo_pessoa: PF->PESSOA, PJ->EMPRESA
    let tipoNormalizado = tipo_pessoa;
    if (tipo_pessoa === 'PF') tipoNormalizado = 'PESSOA';
    if (tipo_pessoa === 'PJ') tipoNormalizado = 'EMPRESA';
    
    if (!['PESSOA', 'EMPRESA'].includes(tipoNormalizado)) {
      return res.status(400).json({
        success: false,
        message: 'tipo_pessoa deve ser PF/PJ ou PESSOA/EMPRESA'
      });
    }

    // Validar campos obrigatórios básicos
    if (!nome_razao_social || !cnpj_cpf) {
      return res.status(400).json({
        success: false,
        message: 'nome_razao_social e cnpj_cpf são obrigatórios'
      });
    }

    // Validar campos obrigatórios para pessoa física (CPF)
    if (tipoNormalizado === 'PESSOA') {
      const cpfLimpo = cnpj_cpf.replace(/[^\d]/g, '');
      if (cpfLimpo.length !== 11) {
        return res.status(400).json({
          success: false,
          message: 'CPF deve ter 11 dígitos'
        });
      }
      // Data de nascimento é recomendada para consulta de CPF, mas não obrigatória no cadastro
    }

    // Validar campos obrigatórios para pessoa jurídica (CNPJ) - necessários para emissão de nota
    if (tipoNormalizado === 'EMPRESA') {
      const cnpjLimpo = cnpj_cpf.replace(/[^\d]/g, '');
      if (cnpjLimpo.length !== 14) {
        return res.status(400).json({
          success: false,
          message: 'CNPJ deve ter 14 dígitos'
        });
      }
      
      // Endereço completo é obrigatório para emissão de nota fiscal
      const enderecoCompleto = logradouro || endereco;
      if (!enderecoCompleto || !numero || !bairro || !cidade || !uf || !cep) {
        return res.status(400).json({
          success: false,
          message: 'Para pessoa jurídica, os seguintes campos de endereço são obrigatórios para emissão de nota fiscal: logradouro, número, bairro, cidade, UF e CEP'
        });
      }
    }

    // Verificar se conta existe (se fornecida)
    if (conta_id) {
      const conta = await query(
        'SELECT id FROM contas WHERE id = ?',
        [conta_id]
      );

      if (conta.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Conta não encontrada'
        });
      }
    }

    let pessoaId = null;
    let empresaId = null;

    // Criar pessoa ou empresa primeiro
    if (tipoNormalizado === 'PESSOA') {
      // Verificar se CPF já existe
      const [pessoaExistente] = await query(
        'SELECT id FROM pessoas WHERE cpf = ?',
        [cnpj_cpf]
      );

      if (pessoaExistente) {
        pessoaId = pessoaExistente.id;
      } else {
        // Criar nova pessoa
        const pessoaResult = await query(`
          INSERT INTO pessoas (
            nome_completo, cpf, email, telefone, status
          ) VALUES (?, ?, ?, ?, 'ativo')
        `, [nome_razao_social, cnpj_cpf, email || '', telefone || '']);

        pessoaId = pessoaResult.insertId;
      }
    } else {
      // EMPRESA
      // Verificar se CNPJ já existe
      const [empresaExistente] = await query(
        'SELECT id FROM empresas WHERE cnpj = ?',
        [cnpj_cpf]
      );

      if (empresaExistente) {
        empresaId = empresaExistente.id;
      } else {
        // Criar nova empresa
        const enderecoCompleto = logradouro || endereco || '';
        const empresaResult = await query(`
          INSERT INTO empresas (
            conta_id, cnpj, razao_social, email, telefone,
            endereco, cidade, uf, cep, inscricao_municipal, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativa')
        `, [
          conta_id,
          cnpj_cpf,
          nome_razao_social,
          email || '',
          telefone || '',
          enderecoCompleto,
          cidade || '',
          uf || '',
          cep || '',
          inscricao_municipal || ''
        ]);

        empresaId = empresaResult.insertId;
      }
    }

    // Verificar se já existe tomador para esta pessoa/empresa
    const tipo_tomador = tipoNormalizado; // tipo_tomador = tipoNormalizado
    const [tomadorExistente] = await query(
      `SELECT id FROM tomadores WHERE tipo_tomador = ? AND ${tipoNormalizado === 'PESSOA' ? 'pessoa_id' : 'empresa_id'} = ?`,
      [tipo_tomador, tipoNormalizado === 'PESSOA' ? pessoaId : empresaId]
    );

    if (tomadorExistente) {
      // Buscar tomador existente
      const [tomador] = await query(`
        SELECT 
          vtc.*
        FROM vw_tomadores_completos vtc
        WHERE vtc.id = ?
      `, [tomadorExistente.id]);

      return res.status(200).json({
        success: true,
        message: 'Tomador já existe',
        data: { tomador }
      });
    }

    // Criar novo tomador
    const result = await query(`
      INSERT INTO tomadores (
        tipo_tomador, pessoa_id, empresa_id, conta_id,
        iss_retido, inscricao_municipal, inscricao_estadual, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ativo')
    `, [
      tipo_tomador,
      tipoNormalizado === 'PESSOA' ? pessoaId : null,
      tipoNormalizado === 'EMPRESA' ? empresaId : null,
      conta_id || null,
      iss_retido || false, // iss_retido é opcional, padrão false
      inscricao_municipal || '',
      inscricao_estadual || ''
    ]);

    const tomadorId = result.insertId;

    // Criar endereço completo do tomador (obrigatório para emissão de nota)
    const enderecoCompleto = logradouro || endereco || '';
    if (enderecoCompleto || numero || bairro || cidade || uf || cep) {
      await query(`
        INSERT INTO enderecos_tomador (
          tomador_id, tipo_endereco, logradouro, numero, complemento,
          bairro, cidade, estado, cep, pais
        ) VALUES (?, 'principal', ?, ?, ?, ?, ?, ?, ?, 'BRA')
      `, [
        tomadorId,
        enderecoCompleto,
        numero || '',
        complemento || '',
        bairro || '',
        cidade || '',
        uf || '',
        cep ? cep.replace(/[^\d]/g, '') : ''
      ]);
    }

    // Criar vínculo com sócio se fornecido (indica que o tomador recebe serviços deste sócio)
    if (socio_id) {
      // Verificar se o sócio existe
      const [socio] = await query(
        'SELECT id FROM pessoas WHERE id = ?',
        [socio_id]
      );

      if (!socio) {
        return res.status(400).json({
          success: false,
          message: 'Sócio não encontrado'
        });
      }

      // Criar vínculo na tabela socio_tomador
      await query(`
        INSERT INTO socio_tomador (
          pessoa_id, tomador_id, tipo_relacionamento, data_inicio, ativo
        ) VALUES (?, ?, 'CLIENTE', CURDATE(), true)
      `, [socio_id, tomadorId]);

      console.log(`✅ Vínculo criado: sócio ${socio_id} presta serviço para tomador ${tomadorId}`);
    }

    // Buscar tomador criado
    const [tomador] = await query(`
      SELECT 
        vtc.*
      FROM vw_tomadores_completos vtc
      WHERE vtc.id = ?
    `, [tomadorId]);

    res.status(201).json({
      success: true,
      message: 'Tomador criado com sucesso',
      data: { tomador }
    });

  } catch (error) {
    console.error('Erro ao criar tomador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar tomador
const atualizarTomador = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      conta_id,
      nome_razao_social,
      cnpj_cpf,
      tipo_pessoa,
      email,
      telefone,
      iss_retido,
      inscricao_municipal,
      inscricao_estadual,
      status,
      // Campos de endereço
      logradouro,
      endereco, // Mantido para compatibilidade
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      // Data de nascimento para pessoa física
      data_nascimento
    } = req.body;

    // Verificar se tomador existe e obter tipo
    const [tomadorExistente] = await query(
      'SELECT id, tipo_tomador, pessoa_id, empresa_id FROM tomadores WHERE id = ?',
      [id]
    );

    if (!tomadorExistente) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    // Atualizar pessoa ou empresa vinculada
    if (tomadorExistente.tipo_tomador === 'PESSOA' && tomadorExistente.pessoa_id) {
      // Atualizar pessoa
      const updatePessoa = {};
      if (nome_razao_social) updatePessoa.nome_completo = nome_razao_social;
      if (cnpj_cpf) updatePessoa.cpf = cnpj_cpf.replace(/[^\d]/g, '');
      if (email !== undefined) updatePessoa.email = email || null;
      if (telefone !== undefined) updatePessoa.telefone = telefone || null;
      if (data_nascimento) updatePessoa.data_nascimento = data_nascimento;

      if (Object.keys(updatePessoa).length > 0) {
        const campos = Object.keys(updatePessoa).map(k => `${k} = ?`).join(', ');
        const valores = Object.values(updatePessoa);
        valores.push(tomadorExistente.pessoa_id);
        await query(`UPDATE pessoas SET ${campos} WHERE id = ?`, valores);
      }
    } else if (tomadorExistente.tipo_tomador === 'EMPRESA' && tomadorExistente.empresa_id) {
      // Atualizar empresa
      const updateEmpresa = {};
      if (nome_razao_social) updateEmpresa.razao_social = nome_razao_social;
      if (cnpj_cpf) updateEmpresa.cnpj = cnpj_cpf.replace(/[^\d]/g, '');
      if (email !== undefined) updateEmpresa.email = email || null;
      if (telefone !== undefined) updateEmpresa.telefone = telefone || null;
      if (inscricao_municipal !== undefined) updateEmpresa.inscricao_municipal = inscricao_municipal || null;

      if (Object.keys(updateEmpresa).length > 0) {
        const campos = Object.keys(updateEmpresa).map(k => `${k} = ?`).join(', ');
        const valores = Object.values(updateEmpresa);
        valores.push(tomadorExistente.empresa_id);
        await query(`UPDATE empresas SET ${campos} WHERE id = ?`, valores);
      }
    }

    // Atualizar tomador
    await query(`
      UPDATE tomadores SET
        conta_id = COALESCE(?, conta_id),
        iss_retido = COALESCE(?, iss_retido),
        inscricao_municipal = COALESCE(?, inscricao_municipal),
        inscricao_estadual = COALESCE(?, inscricao_estadual),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      conta_id, iss_retido, inscricao_municipal, 
      inscricao_estadual, status, id
    ]);

    // Atualizar ou criar endereço
    const enderecoCompleto = logradouro || endereco || '';
    if (enderecoCompleto || numero || bairro || cidade || uf || cep) {
      // Verificar se já existe endereço
      const [enderecoExistente] = await query(`
        SELECT id FROM enderecos_tomador WHERE tomador_id = ? AND tipo_endereco = 'principal'
      `, [id]);

      if (enderecoExistente) {
        // Atualizar endereço existente
        await query(`
          UPDATE enderecos_tomador SET
            logradouro = ?,
            numero = ?,
            complemento = ?,
            bairro = ?,
            cidade = ?,
            estado = ?,
            cep = ?
          WHERE id = ?
        `, [
          enderecoCompleto,
          numero || '',
          complemento || '',
          bairro || '',
          cidade || '',
          uf || '',
          cep ? cep.replace(/[^\d]/g, '') : '',
          enderecoExistente.id
        ]);
      } else {
        // Criar novo endereço
        await query(`
          INSERT INTO enderecos_tomador (
            tomador_id, tipo_endereco, logradouro, numero, complemento,
            bairro, cidade, estado, cep, pais
          ) VALUES (?, 'principal', ?, ?, ?, ?, ?, ?, ?, 'BRA')
        `, [
          id,
          enderecoCompleto,
          numero || '',
          complemento || '',
          bairro || '',
          cidade || '',
          uf || '',
          cep ? cep.replace(/[^\d]/g, '') : ''
        ]);
      }
    }

    // Buscar tomador atualizado
    const [tomador] = await query(`
      SELECT 
        vtc.*
      FROM vw_tomadores_completos vtc
      WHERE vtc.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Tomador atualizado com sucesso',
      data: { tomador }
    });

  } catch (error) {
    console.error('Erro ao atualizar tomador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar tomador
const deletarTomador = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se tomador existe
    const existing = await query(
      'SELECT id FROM tomadores WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    // Verificar se há notas fiscais vinculadas
    const notas = await query(
      'SELECT COUNT(*) as count FROM notas_fiscais WHERE tomador_id = ?',
      [id]
    );

    if (notas[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir tomador com notas fiscais vinculadas'
      });
    }

    // Deletar tomador
    await query('DELETE FROM tomadores WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Tomador excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar tomador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter tomadores por sócios (para NFSeWizard)
const obterPorSocios = async (req, res) => {
  try {
    const { socio_ids } = req.query;
    
    if (!socio_ids) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetro socio_ids é obrigatório'
      });
    }

    const socioIdsArray = socio_ids.split(',').map(id => parseInt(id.trim()));
    
    if (socioIdsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de sócios não pode estar vazia'
      });
    }

    // Buscar tomadores em comum dos sócios
    const placeholders = socioIdsArray.map(() => '?').join(',');
    const tomadores = await query(`
      SELECT DISTINCT 
        vtc.*
      FROM vw_tomadores_completos vtc
      JOIN socio_tomador st ON vtc.id = st.tomador_id
      WHERE st.pessoa_id IN (${placeholders}) 
        AND st.ativo = true 
        AND vtc.status = 'ativo'
      ORDER BY vtc.nome_razao_social_unificado
    `, socioIdsArray);

    res.json({
      success: true,
      data: { tomadores }
    });

  } catch (error) {
    console.error('Erro ao obter tomadores por sócios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Gerenciar modelos vinculados ao tomador
const gerenciarModelos = async (req, res) => {
  try {
    const { id } = req.params;
    const { modelos, acao } = req.body; // acao: 'adicionar', 'remover' ou 'atualizar'
    // modelos pode ser array de IDs ou array de objetos { modelo_id, uso_frequente }

    // Verificar se tomador existe
    const tomador = await query(
      'SELECT id FROM tomadores WHERE id = ?',
      [id]
    );

    if (tomador.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    if (acao === 'adicionar' || acao === 'atualizar') {
      // Normalizar modelos para array de objetos
      const modelosArray = Array.isArray(modelos) 
        ? modelos.map(m => typeof m === 'number' || typeof m === 'string' 
            ? { modelo_id: m, uso_frequente: false }
            : m)
        : [];

      // Adicionar ou atualizar vínculos
      for (const modelo of modelosArray) {
        const modeloId = modelo.modelo_id || modelo.id;
        const usoFrequente = modelo.uso_frequente || false;

        // Verificar se vínculo já existe
        const existing = await query(
          'SELECT id FROM tomador_modelo WHERE tomador_id = ? AND modelo_id = ?',
          [id, modeloId]
        );

        if (existing.length > 0) {
          // Atualizar vínculo existente
          await query(`
            UPDATE tomador_modelo SET
              uso_frequente = ?,
              ativo = true,
              data_inicio = COALESCE(data_inicio, CURDATE()),
              data_fim = NULL
            WHERE tomador_id = ? AND modelo_id = ?
          `, [usoFrequente, id, modeloId]);
        } else {
          // Criar novo vínculo
          await query(`
            INSERT INTO tomador_modelo (tomador_id, modelo_id, uso_frequente, data_inicio, ativo)
            VALUES (?, ?, ?, CURDATE(), true)
          `, [id, modeloId, usoFrequente]);
        }
      }
    } else if (acao === 'remover') {
      // Remover vínculos - modelos pode ser array de IDs
      const modeloIds = Array.isArray(modelos) 
        ? modelos.map(m => typeof m === 'object' ? (m.modelo_id || m.id) : m)
        : [];
      
      if (modeloIds.length > 0) {
        // Desativar vínculos ao invés de deletar
        const placeholders = modeloIds.map(() => '?').join(',');
        await query(
          `UPDATE tomador_modelo SET ativo = false, data_fim = CURDATE() WHERE tomador_id = ? AND modelo_id IN (${placeholders})`,
          [id, ...modeloIds]
        );
      }
    }

    res.json({
      success: true,
      message: 'Vínculos de modelos atualizados com sucesso'
    });

  } catch (error) {
    console.error('Erro ao gerenciar modelos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter sócios vinculados ao tomador
const obterSocios = async (req, res) => {
  try {
    const { id } = req.params; // ID do tomador

    // Verificar se tomador existe
    const [tomador] = await query(
      'SELECT id FROM tomadores WHERE id = ?',
      [id]
    );

    if (!tomador) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    // Buscar sócios vinculados
    const socios = await query(`
      SELECT 
        p.id,
        p.nome_completo,
        p.cpf,
        p.email,
        p.telefone,
        st.id as vinculo_id,
        st.tipo_relacionamento,
        st.data_inicio,
        st.ativo
      FROM socio_tomador st
      JOIN pessoas p ON st.pessoa_id = p.id
      WHERE st.tomador_id = ? AND st.ativo = true
      ORDER BY p.nome_completo
    `, [id]);

    res.json({
      success: true,
      data: { socios }
    });

  } catch (error) {
    console.error('Erro ao obter sócios do tomador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Vincular tomador a sócio
const vincularSocio = async (req, res) => {
  try {
    const { id } = req.params; // ID do tomador
    const { socio_id } = req.body; // ID do sócio

    if (!socio_id) {
      return res.status(400).json({
        success: false,
        message: 'socio_id é obrigatório'
      });
    }

    // Verificar se tomador existe
    const [tomador] = await query(
      'SELECT id FROM tomadores WHERE id = ?',
      [id]
    );

    if (!tomador) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    // Verificar se sócio existe
    const [socio] = await query(
      'SELECT id FROM pessoas WHERE id = ?',
      [socio_id]
    );

    if (!socio) {
      return res.status(404).json({
        success: false,
        message: 'Sócio não encontrado'
      });
    }

    // Verificar se vínculo já existe
    const [vinculoExistente] = await query(
      'SELECT id FROM socio_tomador WHERE pessoa_id = ? AND tomador_id = ? AND ativo = true',
      [socio_id, id]
    );

    if (vinculoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Vínculo já existe entre este sócio e tomador'
      });
    }

    // Criar vínculo na tabela socio_tomador
    await query(`
      INSERT INTO socio_tomador (
        pessoa_id, tomador_id, tipo_relacionamento, data_inicio, ativo
      ) VALUES (?, ?, 'CLIENTE', CURDATE(), true)
    `, [socio_id, id]);

    console.log(`✅ Vínculo criado: sócio ${socio_id} presta serviço para tomador ${id}`);

    res.json({
      success: true,
      message: 'Tomador vinculado ao sócio com sucesso'
    });

  } catch (error) {
    console.error('Erro ao vincular sócio ao tomador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Remover vínculo de sócio do tomador
const removerSocio = async (req, res) => {
  try {
    const { id, socio_id } = req.params; // ID do tomador e ID do sócio

    // Verificar se tomador existe
    const [tomador] = await query(
      'SELECT id FROM tomadores WHERE id = ?',
      [id]
    );

    if (!tomador) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    // Verificar se vínculo existe
    const [vinculo] = await query(
      'SELECT id FROM socio_tomador WHERE pessoa_id = ? AND tomador_id = ? AND ativo = true',
      [socio_id, id]
    );

    if (!vinculo) {
      return res.status(404).json({
        success: false,
        message: 'Vínculo não encontrado'
      });
    }

    // Desativar vínculo (soft delete)
    await query(
      'UPDATE socio_tomador SET ativo = false WHERE id = ?',
      [vinculo.id]
    );

    console.log(`✅ Vínculo removido: sócio ${socio_id} do tomador ${id}`);

    res.json({
      success: true,
      message: 'Vínculo removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover vínculo de sócio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter modelos vinculados ao tomador
const obterModelos = async (req, res) => {
  try {
    const { id } = req.params;

    const modelos = await query(`
      SELECT 
        m.id,
        m.titulo_modelo,
        m.texto_modelo,
        m.categoria,
        tm.uso_frequente,
        tm.data_inicio,
        tm.data_fim
      FROM modelos_discriminacao m
      JOIN tomador_modelo tm ON m.id = tm.modelo_id
      WHERE tm.tomador_id = ? AND tm.ativo = true
      ORDER BY tm.uso_frequente DESC, m.titulo_modelo
    `, [id]);

    res.json({
      success: true,
      data: { modelos }
    });

  } catch (error) {
    console.error('Erro ao obter modelos do tomador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarTomadores,
  obterTomador,
  criarTomador,
  atualizarTomador,
  deletarTomador,
  obterPorSocios,
  obterSocios,
  vincularSocio,
  removerSocio,
  gerenciarModelos,
  obterModelos
};
