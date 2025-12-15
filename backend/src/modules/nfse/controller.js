const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');
const nfeioService = require('../../services/nfeioService');

// Listar notas fiscais com filtros e paginação
const listarNotas = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      empresa_id = '',
      tomador_id = '',
      mes_competencia = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (e.razao_social LIKE ? OR t.nome_razao_social LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClause += ' AND nf.status = ?';
      params.push(status);
    }
    if (empresa_id) {
      whereClause += ' AND nf.empresa_id = ?';
      params.push(empresa_id);
    }
    if (tomador_id) {
      whereClause += ' AND nf.tomador_id = ?';
      params.push(tomador_id);
    }
    if (mes_competencia) {
      whereClause += ' AND nf.mes_competencia = ?';
      params.push(mes_competencia);
    }

    const sql = `
      SELECT 
        nf.*,
        e.razao_social as empresa,
        e.cnpj as empresa_cnpj,
        t.nome_razao_social as tomador,
        t.cnpj_cpf as tomador_documento,
        m.titulo_modelo,
        f.nome_completo as criador_nome,
        CASE 
          WHEN nf.status = 'AUTORIZADA' THEN CONCAT('NFSe-', nf.id)
          ELSE NULL
        END as numero
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      LEFT JOIN modelos_discriminacao m ON nf.modelo_discriminacao_id = m.id
      LEFT JOIN funcionarios f ON nf.funcionario_criador_id = f.id
      ${whereClause}
      ORDER BY nf.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const notas = await query(sql, params);

    // Buscar sócios para cada nota
    for (let nota of notas) {
      const socios = await query(`
        SELECT 
          p.id, p.nome_completo, p.cpf,
          nfp.valor_prestado, nfp.percentual_participacao
        FROM nota_fiscal_pessoa nfp
        JOIN pessoas p ON nfp.pessoa_id = p.id
        WHERE nfp.nota_fiscal_id = ?
      `, [nota.id]);
      nota.socios = socios;
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      ${whereClause}
    `;
    const [{ total }] = await query(countSql, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        notas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar notas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter nota por ID
const obterNota = async (req, res) => {
  try {
    const { id } = req.params;

    const [nota] = await query(`
      SELECT 
        nf.*,
        e.razao_social as empresa,
        e.cnpj as empresa_cnpj,
        t.nome_razao_social as tomador,
        t.cnpj_cpf as tomador_documento,
        m.titulo_modelo,
        f.nome_completo as criador_nome,
        CASE 
          WHEN nf.status = 'AUTORIZADA' THEN CONCAT('NFSe-', nf.id)
          ELSE NULL
        END as numero
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      LEFT JOIN modelos_discriminacao m ON nf.modelo_discriminacao_id = m.id
      LEFT JOIN funcionarios f ON nf.funcionario_criador_id = f.id
      WHERE nf.id = ?
    `, [id]);

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    // Buscar sócios
    const socios = await query(`
      SELECT 
        p.id, p.nome_completo, p.cpf,
        nfp.valor_prestado, nfp.percentual_participacao
      FROM nota_fiscal_pessoa nfp
      JOIN pessoas p ON nfp.pessoa_id = p.id
      WHERE nfp.nota_fiscal_id = ?
    `, [id]);

    nota.socios = socios;

    res.json({
      success: true,
      data: { nota }
    });

  } catch (error) {
    console.error('Erro ao obter nota:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar rascunho de nota fiscal
const criarRascunho = async (req, res) => {
  try {
    const {
      empresa_id,
      tomador_id,
      modelo_discriminacao_id,
      mes_competencia,
      socios = []
    } = req.body;

    const funcionarioId = req.user.id;

    // Validar empresa
    const [empresa] = await query(
      'SELECT id, razao_social FROM empresas WHERE id = ? AND status = "ativa"',
      [empresa_id]
    );

    if (!empresa) {
      return res.status(400).json({
        success: false,
        message: 'Empresa não encontrada ou inativa'
      });
    }

    // Validar tomador
    const [tomador] = await query(
      'SELECT id, nome_razao_social FROM tomadores WHERE id = ? AND status = "ativo"',
      [tomador_id]
    );

    if (!tomador) {
      return res.status(400).json({
        success: false,
        message: 'Tomador não encontrado ou inativo'
      });
    }

    // Validar modelo
    const [modelo] = await query(
      'SELECT id, titulo_modelo, texto_modelo FROM modelos_discriminacao WHERE id = ?',
      [modelo_discriminacao_id]
    );

    if (!modelo) {
      return res.status(400).json({
        success: false,
        message: 'Modelo de discriminação não encontrado'
      });
    }

    // Validar sócios
    if (socios.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar pelo menos um sócio'
      });
    }

    // Calcular valor total
    const valorTotal = socios.reduce((total, socio) => total + (socio.valor_prestado || 0), 0);

    if (valorTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor total deve ser maior que zero'
      });
    }

    // Gerar ID único
    const notaId = uuidv4();

    // Criar nota fiscal
    await query(`
      INSERT INTO notas_fiscais (
        id, empresa_id, tomador_id, modelo_discriminacao_id,
        status, valor_total, mes_competencia, funcionario_criador_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      notaId, empresa_id, tomador_id, modelo_discriminacao_id,
      'RASCUNHO', valorTotal, mes_competencia, funcionarioId
    ]);

    // Adicionar sócios
    for (const socio of socios) {
      await query(`
        INSERT INTO nota_fiscal_pessoa (
          nota_fiscal_id, pessoa_id, valor_prestado, percentual_participacao
        ) VALUES (?, ?, ?, ?)
      `, [
        notaId, socio.pessoa_id, socio.valor_prestado,
        socio.percentual_participacao || ((socio.valor_prestado / valorTotal) * 100)
      ]);
    }

    // Buscar nota criada
    const [nota] = await query(`
      SELECT 
        nf.*,
        e.razao_social as empresa,
        t.nome_razao_social as tomador,
        m.titulo_modelo,
        CASE 
          WHEN nf.status = 'AUTORIZADA' THEN CONCAT('NFSe-', nf.id)
          ELSE NULL
        END as numero
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      LEFT JOIN modelos_discriminacao m ON nf.modelo_discriminacao_id = m.id
      WHERE nf.id = ?
    `, [notaId]);

    res.status(201).json({
      success: true,
      message: 'Rascunho de nota fiscal criado com sucesso',
      data: { nota }
    });

  } catch (error) {
    console.error('Erro ao criar rascunho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar rascunho
const atualizarRascunho = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      modelo_discriminacao_id,
      mes_competencia,
      socios = [],
      discriminacao_final
    } = req.body;

    // Verificar se nota existe e é rascunho
    const [nota] = await query(
      'SELECT id, status FROM notas_fiscais WHERE id = ?',
      [id]
    );

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    if (nota.status !== 'RASCUNHO') {
      return res.status(400).json({
        success: false,
        message: 'Apenas rascunhos podem ser editados'
      });
    }

    // Atualizar sócios se fornecidos
    if (socios.length > 0) {
      // Remover sócios existentes
      await query('DELETE FROM nota_fiscal_pessoa WHERE nota_fiscal_id = ?', [id]);

      // Adicionar novos sócios
      const valorTotal = socios.reduce((total, socio) => total + (socio.valor_prestado || 0), 0);
      
      for (const socio of socios) {
        await query(`
          INSERT INTO nota_fiscal_pessoa (
            nota_fiscal_id, pessoa_id, valor_prestado, percentual_participacao
          ) VALUES (?, ?, ?, ?)
        `, [
          id, socio.pessoa_id, socio.valor_prestado,
          socio.percentual_participacao || ((socio.valor_prestado / valorTotal) * 100)
        ]);
      }

      // Atualizar valor total
      await query(
        'UPDATE notas_fiscais SET valor_total = ? WHERE id = ?',
        [valorTotal, id]
      );
    }

    // Atualizar outros campos
    await query(`
      UPDATE notas_fiscais SET
        modelo_discriminacao_id = COALESCE(?, modelo_discriminacao_id),
        mes_competencia = COALESCE(?, mes_competencia),
        discriminacao_final = COALESCE(?, discriminacao_final)
      WHERE id = ?
    `, [modelo_discriminacao_id, mes_competencia, discriminacao_final, id]);

    res.json({
      success: true,
      message: 'Rascunho atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar rascunho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Emitir nota fiscal usando NFe.io
const emitirNota = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar nota completa com dados relacionados
    const [nota] = await query(`
      SELECT 
        nf.*,
        e.id as empresa_id,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj,
        e.nome_fantasia as empresa_nome_fantasia,
        e.inscricao_municipal as empresa_inscricao_municipal,
        t.id as tomador_id,
        t.tipo_tomador,
        t.nome_razao_social as tomador_nome_razao_social,
        t.cnpj_cpf as tomador_cnpj_cpf
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      WHERE nf.id = ?
    `, [id]);

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    if (nota.status !== 'RASCUNHO') {
      return res.status(400).json({
        success: false,
        message: 'Apenas rascunhos podem ser emitidos'
      });
    }

    // Buscar endereço da empresa
    const [enderecoEmpresa] = await query(`
      SELECT * FROM enderecos 
      WHERE entidade_tipo = 'Empresa' AND entidade_id = ? 
      LIMIT 1
    `, [nota.empresa_id]);

    // Buscar endereço do tomador
    const [enderecoTomador] = await query(`
      SELECT * FROM enderecos 
      WHERE entidade_tipo = 'Tomador' AND entidade_id = ? 
      LIMIT 1
    `, [nota.tomador_id]);

    // Buscar sócios
    const socios = await query(`
      SELECT 
        p.id, p.nome_completo, p.cpf,
        nfp.valor_prestado, nfp.percentual_participacao
      FROM nota_fiscal_pessoa nfp
      JOIN pessoas p ON nfp.pessoa_id = p.id
      WHERE nfp.nota_fiscal_id = ?
    `, [id]);

    if (socios.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal deve ter pelo menos um sócio'
      });
    }

    // Preparar dados para o serviço
    const empresaData = {
      ...nota,
      ...enderecoEmpresa
    };

    const tomadorData = {
      ...nota,
      ...enderecoTomador
    };

    // Chamar serviço NFe.io
    const resultado = await nfeioService.emitirNota({
      nota,
      empresa: empresaData,
      tomador: tomadorData,
      socios
    });

    if (!resultado.success) {
      // Atualizar status para erro
      await query(`
        UPDATE notas_fiscais SET
          status = 'ERRO',
          mensagem_erro = ?,
          api_provider = 'NFEIO'
        WHERE id = ?
      `, [
        JSON.stringify(resultado.error),
        id
      ]);

      return res.status(500).json({
        success: false,
        message: 'Erro ao emitir nota na NFe.io',
        error: resultado.error
      });
    }

    // Atualizar status para processando e salvar referência
    await query(`
      UPDATE notas_fiscais SET
        status = 'PROCESSANDO',
        api_ref = ?,
        api_provider = 'NFEIO'
      WHERE id = ?
    `, [resultado.api_ref, id]);

    res.json({
      success: true,
      message: 'Nota fiscal enviada para processamento na NFe.io',
      data: {
        api_ref: resultado.api_ref,
        status: 'PROCESSANDO'
      }
    });

  } catch (error) {
    console.error('Erro ao emitir nota:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar rascunho
const deletarRascunho = async (req, res) => {
  try {
    const { id } = req.params;

    const [nota] = await query(
      'SELECT id, status FROM notas_fiscais WHERE id = ?',
      [id]
    );

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    if (nota.status !== 'RASCUNHO') {
      return res.status(400).json({
        success: false,
        message: 'Apenas rascunhos podem ser excluídos'
      });
    }

    // Deletar nota (cascade vai deletar sócios)
    await query('DELETE FROM notas_fiscais WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Rascunho excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar rascunho:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Cancelar nota fiscal
const cancelarNota = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Buscar nota
    const [nota] = await query(`
      SELECT id, status, api_ref, api_provider
      FROM notas_fiscais 
      WHERE id = ?
    `, [id]);

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    if (nota.status !== 'AUTORIZADA') {
      return res.status(400).json({
        success: false,
        message: 'Apenas notas autorizadas podem ser canceladas'
      });
    }

    if (!nota.api_ref) {
      return res.status(400).json({
        success: false,
        message: 'Nota não possui referência da API para cancelamento'
      });
    }

    // Chamar serviço NFe.io para cancelar
    const resultado = await nfeioService.cancelarNota(
      nota.api_ref,
      motivo || 'Cancelamento solicitado pelo usuário'
    );

    if (!resultado.success) {
      // Atualizar com erro
      await query(`
        UPDATE notas_fiscais SET
          status = 'ERRO',
          mensagem_erro = ?
        WHERE id = ?
      `, [JSON.stringify(resultado.error), id]);

      return res.status(500).json({
        success: false,
        message: 'Erro ao cancelar nota na NFe.io',
        error: resultado.error
      });
    }

    // Atualizar status para cancelada
    await query(`
      UPDATE notas_fiscais SET
        status = 'CANCELADA'
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Nota fiscal cancelada com sucesso',
      data: {
        status: 'CANCELADA'
      }
    });

  } catch (error) {
    console.error('Erro ao cancelar nota:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarNotas,
  obterNota,
  criarRascunho,
  atualizarRascunho,
  emitirNota,
  deletarRascunho,
  cancelarNota
};
