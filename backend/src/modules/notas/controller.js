const { query } = require('../../config/database');
const nfeioService = require('../../services/nfeioService');
const fs = require('fs').promises;
const path = require('path');
const xlsxHelper = require('../../utils/xlsxHelper');

// Helper para garantir que o diretório de logs existe
async function ensureLogDirectory() {
  const logDir = path.join(process.cwd(), '.cursor');
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
}

// Helper para escrever logs de forma segura
async function writeLog(data) {
  try {
    await ensureLogDirectory();
    const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
    const logData = JSON.stringify(data) + '\n';
    await fs.appendFile(logPath, logData, 'utf8');
  } catch (err) {
    // Silenciosamente falhar - não queremos que logs quebrem a aplicação
    console.error('Log append error:', err.message);
  }
}

// Listar notas fiscais com filtros e paginação
const listarNotas = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      mes_competencia = '',
      empresa_id = '',
      socios_ids = '',
      tomador_id = '',
      data_emissao_inicio = '',
      data_emissao_fim = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Filtros
    if (search) {
      whereClause += ' AND (nf.discriminacao_final LIKE ? OR e.razao_social LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClause += ' AND nf.status = ?';
      params.push(status);
    }
    if (mes_competencia) {
      whereClause += ' AND nf.mes_competencia = ?';
      params.push(mes_competencia);
    }
    if (empresa_id) {
      whereClause += ' AND nf.empresa_id = ?';
      params.push(empresa_id);
    }
    if (tomador_id) {
      // Suporta múltiplos tomadores separados por vírgula
      const tomadoresArray = Array.isArray(tomador_id) ? tomador_id : tomador_id.split(',');
      if (tomadoresArray.length > 0) {
        const placeholders = tomadoresArray.map(() => '?').join(',');
        whereClause += ` AND nf.tomador_id IN (${placeholders})`;
        tomadoresArray.forEach(id => params.push(id));
      }
    }
    if (data_emissao_inicio) {
      whereClause += ' AND DATE(nf.data_emissao) >= ?';
      params.push(data_emissao_inicio);
    }
    if (data_emissao_fim) {
      whereClause += ' AND DATE(nf.data_emissao) <= ?';
      params.push(data_emissao_fim);
    }
    
    // Filtro por sócios (múltiplos IDs)
    let sociosJoin = '';
    if (socios_ids) {
      const sociosArray = Array.isArray(socios_ids) ? socios_ids : socios_ids.split(',');
      if (sociosArray.length > 0) {
        const placeholders = sociosArray.map(() => '?').join(',');
        whereClause += ` AND nf.id IN (
          SELECT DISTINCT nota_fiscal_id 
          FROM nota_fiscal_pessoa 
          WHERE pessoa_id IN (${placeholders})
        )`;
        sociosArray.forEach(id => params.push(id));
      }
    }

    const sql = `
      SELECT 
        nf.*,
        UPPER(TRIM(nf.status)) as status,
        e.razao_social as empresa_nome,
        e.cnpj as empresa_cnpj,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.nome_completo
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.razao_social
        END as tomador_nome,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.cpf
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.cnpj
        END as tomador_documento,
        m.titulo_modelo,
        COUNT(DISTINCT nfp.pessoa_id) as socios_count
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
      LEFT JOIN empresas e2 ON t.empresa_id = e2.id AND t.tipo_tomador = 'EMPRESA'
      LEFT JOIN modelos_discriminacao m ON nf.modelo_discriminacao_id = m.id
      LEFT JOIN nota_fiscal_pessoa nfp ON nf.id = nfp.nota_fiscal_id
      ${whereClause}
      GROUP BY nf.id
      ORDER BY nf.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const notas = await query(sql, params);

    // Para o count, precisamos aplicar os mesmos filtros, incluindo o de sócios
    let countWhereClause = 'WHERE 1=1';
    const countParams = [];
    
    if (search) {
      countWhereClause += ' AND (nf.discriminacao_final LIKE ? OR e.razao_social LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      countWhereClause += ' AND nf.status = ?';
      countParams.push(status);
    }
    if (mes_competencia) {
      countWhereClause += ' AND nf.mes_competencia = ?';
      countParams.push(mes_competencia);
    }
    if (empresa_id) {
      countWhereClause += ' AND nf.empresa_id = ?';
      countParams.push(empresa_id);
    }
    if (tomador_id) {
      // Suporta múltiplos tomadores separados por vírgula
      const tomadoresArray = Array.isArray(tomador_id) ? tomador_id : tomador_id.split(',');
      if (tomadoresArray.length > 0) {
        const placeholders = tomadoresArray.map(() => '?').join(',');
        countWhereClause += ` AND nf.tomador_id IN (${placeholders})`;
        tomadoresArray.forEach(id => countParams.push(id));
      }
    }
    if (data_emissao_inicio) {
      countWhereClause += ' AND DATE(nf.data_emissao) >= ?';
      countParams.push(data_emissao_inicio);
    }
    if (data_emissao_fim) {
      countWhereClause += ' AND DATE(nf.data_emissao) <= ?';
      countParams.push(data_emissao_fim);
    }
    if (socios_ids) {
      const sociosArray = Array.isArray(socios_ids) ? socios_ids : socios_ids.split(',');
      if (sociosArray.length > 0) {
        const placeholders = sociosArray.map(() => '?').join(',');
        countWhereClause += ` AND nf.id IN (
          SELECT DISTINCT nota_fiscal_id 
          FROM nota_fiscal_pessoa 
          WHERE pessoa_id IN (${placeholders})
        )`;
        sociosArray.forEach(id => countParams.push(id));
      }
    }

    const countSql = `
      SELECT COUNT(DISTINCT nf.id) as total 
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
      LEFT JOIN empresas e2 ON t.empresa_id = e2.id AND t.tipo_tomador = 'EMPRESA'
      ${countWhereClause}
    `;
    const [{ total }] = await query(countSql, countParams);

    res.json({
      success: true,
      data: {
        notas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar notas fiscais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter nota fiscal por ID
const obterNota = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        nf.*,
        UPPER(TRIM(nf.status)) as status,
        e.razao_social as empresa_nome,
        e.cnpj as empresa_cnpj,
        e.inscricao_municipal as empresa_inscricao_municipal,
        e.email as empresa_email,
        e.telefone as empresa_telefone,
        e.regime_tributario as empresa_regime_tributario,
        e.regime_tributario_detalhado as empresa_regime_tributario_detalhado,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.nome_completo
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.razao_social
        END as tomador_nome,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.cpf
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.cnpj
        END as tomador_documento,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.email
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.email
        END as tomador_email,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.telefone
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.telefone
        END as tomador_telefone,
        t.inscricao_municipal as tomador_inscricao_municipal,
        t.regime_tributario as tomador_regime_tributario,
        m.titulo_modelo,
        m.texto_modelo
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      LEFT JOIN tomadores t ON nf.tomador_id = t.id
      LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
      LEFT JOIN empresas e2 ON t.empresa_id = e2.id AND t.tipo_tomador = 'EMPRESA'
      LEFT JOIN modelos_discriminacao m ON nf.modelo_discriminacao_id = m.id
      WHERE nf.id = ?
    `;

    const notas = await query(sql, [id]);

    if (notas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    // Buscar sócios da nota
    const socios = await query(`
      SELECT 
        nfp.*,
        p.nome_completo,
        p.cpf
      FROM nota_fiscal_pessoa nfp
      LEFT JOIN pessoas p ON nfp.pessoa_id = p.id
      WHERE nfp.nota_fiscal_id = ?
    `, [id]);

    // Buscar endereços da empresa
    const [enderecoEmpresa] = await query(`
      SELECT * FROM enderecos 
      WHERE entidade_tipo = 'Empresa' AND entidade_id = ? 
      LIMIT 1
    `, [notas[0].empresa_id]);

    // Buscar endereços do tomador
    const [enderecoTomador] = await query(`
      SELECT * FROM enderecos 
      WHERE entidade_tipo = 'Tomador' AND entidade_id = ? 
      LIMIT 1
    `, [notas[0].tomador_id]);

    res.json({
      success: true,
      data: {
        nota: notas[0],
        socios,
        enderecoEmpresa: enderecoEmpresa || null,
        enderecoTomador: enderecoTomador || null
      }
    });

  } catch (error) {
    console.error('Erro ao obter nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar nova nota fiscal
const criarNota = async (req, res) => {
  // #region agent log
  await writeLog({
    location: 'notas/controller.js:criarNota entry',
    message: 'criarNota entry',
    data: { status: req.body.status, empresa_id: req.body.empresa_id, tomador_id: req.body.tomador_id },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run2',
    hypothesisId: 'A'
  });
  // #endregion
  try {
    const {
      empresa_id,
      tomador_id,
      modelo_discriminacao_id,
      valor_total,
      mes_competencia,
      discriminacao_final,
      status = 'RASCUNHO',
      socios = [],
      // Códigos de Serviço
      codigo_servico_municipal,
      codigo_servico_federal,
      cnae_code,
      nbs_code,
      // Tributação
      tipo_tributacao,
      aliquota_iss,
      valor_iss,
      // Retenções
      valor_retencao_ir,
      valor_retencao_pis,
      valor_retencao_cofins,
      valor_retencao_csll,
      valor_retencao_inss,
      valor_retencao_iss,
      valor_outras_retencoes,
      // Deduções e Descontos
      valor_deducoes,
      valor_desconto_incondicionado,
      valor_desconto_condicionado,
      // Informações Adicionais
      informacoes_adicionais,
      // RPS
      numero_rps,
      serie_rps,
      data_emissao_rps,
      // Localização
      localizacao
    } = req.body;

    // Validar dados obrigatórios
    // modelo_discriminacao_id pode ser null se discriminacao_final estiver preenchida (nota avulsa)
    if (!empresa_id || !tomador_id || !valor_total || !mes_competencia) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios não informados'
      });
    }
    
    // Validar que tem modelo OU discriminação
    if (!modelo_discriminacao_id && !discriminacao_final) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar um modelo de discriminação ou preencher a discriminação do serviço'
      });
    }

    // Gerar UUID para a nota
    const notaId = require('crypto').randomUUID();

    // Obter ID do funcionário criador (do token de autenticação)
    const funcionarioId = req.user?.id;
    if (!funcionarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Buscar dados completos da empresa
    const [empresa] = await query(`
      SELECT * FROM empresas WHERE id = ?
    `, [empresa_id]);

    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Se status não for RASCUNHO, verificar se empresa está sincronizada com NFe.io
    if (status !== 'RASCUNHO' && !empresa.nfeio_empresa_id) {
      // Tentar sincronizar empresa automaticamente
      try {
        const resultadoSync = await nfeioService.sincronizarEmpresa(empresa);
        if (resultadoSync.success && resultadoSync.nfeio_empresa_id) {
          // Atualizar empresa com nfeio_empresa_id
          await query(`
            UPDATE empresas SET nfeio_empresa_id = ? WHERE id = ?
          `, [resultadoSync.nfeio_empresa_id, empresa_id]);
          empresa.nfeio_empresa_id = resultadoSync.nfeio_empresa_id;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Empresa não está sincronizada com NFe.io. Por favor, sincronize a empresa primeiro através da página de Empresas.',
            error: resultadoSync.error
          });
        }
      } catch (syncError) {
        console.error('Erro ao sincronizar empresa automaticamente:', syncError);
        return res.status(400).json({
          success: false,
          message: 'Empresa não está sincronizada com NFe.io. Por favor, sincronize a empresa primeiro através da página de Empresas.',
          error: syncError.message
        });
      }
    }

    // Buscar dados completos do tomador
    const [tomador] = await query(`
      SELECT 
        t.*,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.nome_completo
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.razao_social
        END as nome_razao_social,
        CASE 
          WHEN t.tipo_tomador = 'PESSOA' THEN p.cpf
          WHEN t.tipo_tomador = 'EMPRESA' THEN e2.cnpj
        END as cnpj_cpf
      FROM tomadores t
      LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
      LEFT JOIN empresas e2 ON t.empresa_id = e2.id AND t.tipo_tomador = 'EMPRESA'
      WHERE t.id = ?
    `, [tomador_id]);
    
    // Log para debug - verificar CNPJ/CPF do tomador
    if (tomador) {
      console.log('📋 Dados do tomador:', {
        id: tomador.id,
        tipo: tomador.tipo_tomador,
        nome_razao_social: tomador.nome_razao_social,
        cnpj_cpf: tomador.cnpj_cpf,
        cnpj_cpf_type: typeof tomador.cnpj_cpf,
        cnpj_cpf_length: tomador.cnpj_cpf ? String(tomador.cnpj_cpf).length : 0
      });
    }

    if (!tomador) {
      return res.status(404).json({
        success: false,
        message: 'Tomador não encontrado'
      });
    }

    // Buscar endereço do tomador (pode estar em enderecos_tomador ou enderecos)
    let enderecoTomador = null;
    
    // Primeiro, tentar buscar na tabela específica de tomadores
    const [enderecoTomadorEspecifico] = await query(`
      SELECT 
        *,
        cidade as municipio,
        cidade_codigo_ibge as codigo_ibge,
        cidade_codigo_ibge as codigo_municipio,
        estado as uf,
        cidade_codigo_ibge  -- Manter campo original também
      FROM enderecos_tomador 
      WHERE tomador_id = ? AND tipo_endereco = 'principal'
      LIMIT 1
    `, [tomador_id]);
    
    if (enderecoTomadorEspecifico) {
      enderecoTomador = enderecoTomadorEspecifico;
      console.log('✅ Endereço encontrado na tabela enderecos_tomador');
    } else {
      // Se não encontrar, buscar na tabela genérica enderecos
      const [enderecoGenerico] = await query(`
        SELECT 
          *,
          municipio as cidade,
          uf as estado
        FROM enderecos 
        WHERE entidade_tipo = 'Tomador' AND entidade_id = ? 
        LIMIT 1
      `, [tomador_id]);
      
      if (enderecoGenerico) {
        enderecoTomador = enderecoGenerico;
        console.log('✅ Endereço encontrado na tabela enderecos');
      } else {
        console.warn('⚠️ Nenhum endereço encontrado para o tomador');
      }
    }

    // Log de debug do endereço
    console.log('📍 Endereço do tomador encontrado:', {
      temEndereco: !!enderecoTomador,
      cidade: enderecoTomador?.cidade || enderecoTomador?.municipio,
      codigo_municipio: enderecoTomador?.codigo_municipio 
        || enderecoTomador?.codigo_ibge 
        || enderecoTomador?.cidade_codigo_ibge,
      uf: enderecoTomador?.estado || enderecoTomador?.uf,
      logradouro: enderecoTomador?.logradouro || enderecoTomador?.endereco,
      cep: enderecoTomador?.cep,
      todasChaves: enderecoTomador ? Object.keys(enderecoTomador) : [],
      enderecoCompleto: enderecoTomador
    });

    // Combinar dados do tomador com endereço
    // O código IBGE pode estar em diferentes campos dependendo da tabela
    let codigoMunicipio = enderecoTomador?.codigo_municipio 
      || enderecoTomador?.codigo_ibge 
      || enderecoTomador?.cidade_codigo_ibge  // Campo da tabela enderecos_tomador
      || tomador.codigo_municipio;
    
    const cepTomador = enderecoTomador?.cep || tomador.cep;
    const cidadeTomador = enderecoTomador?.cidade 
      || enderecoTomador?.municipio 
      || tomador.cidade;
    const ufTomador = enderecoTomador?.estado 
      || enderecoTomador?.uf 
      || tomador.uf;

    // Se não tiver código do município, tentar buscar automaticamente
    if (!codigoMunicipio) {
      // Primeiro, tentar via CEP se disponível
      if (cepTomador) {
        try {
          console.log('🔍 Código IBGE não encontrado. Buscando via CEP:', cepTomador);
          const resultadoCEP = await nfeioService.consultarEnderecoPorCEP(cepTomador);
          
          if (resultadoCEP.success) {
            // O método consultarEnderecoPorCEP retorna o código IBGE em múltiplos campos
            const ibgeViaCEP = resultadoCEP.ibge 
              || resultadoCEP.codigo_ibge 
              || resultadoCEP.codigo_municipio
              || resultadoCEP.data?.ibge
              || resultadoCEP.data?.codigo_ibge;
            
            if (ibgeViaCEP) {
              codigoMunicipio = String(ibgeViaCEP).trim();
              console.log('✅ Código IBGE encontrado via CEP:', codigoMunicipio);
            } else {
              console.warn('⚠️ ViaCEP não retornou código IBGE');
            }
          } else {
            console.warn('⚠️ Erro ao consultar CEP:', resultadoCEP.error);
          }
        } catch (cepError) {
          console.warn('⚠️ Erro ao buscar código IBGE via CEP:', cepError.message);
        }
      }
      
      // Se ainda não tiver código IBGE mas tiver cidade e UF, buscar via API IBGE
      if (!codigoMunicipio && cidadeTomador && ufTomador) {
        try {
          console.log('🔍 Código IBGE não encontrado. Buscando via cidade e UF:', { cidade: cidadeTomador, uf: ufTomador });
          const resultadoIBGE = await nfeioService.buscarCodigoIBGEPorCidadeUF(cidadeTomador, ufTomador);
          
          if (resultadoIBGE.success && resultadoIBGE.codigo_ibge) {
            codigoMunicipio = String(resultadoIBGE.codigo_ibge).trim();
            console.log('✅ Código IBGE encontrado via API IBGE:', codigoMunicipio);
          } else {
            console.warn('⚠️ Não foi possível encontrar código IBGE via API:', resultadoIBGE.error);
          }
        } catch (ibgeError) {
          console.warn('⚠️ Erro ao buscar código IBGE via API:', ibgeError.message);
        }
      }
    }

    const tomadorCompleto = {
      ...tomador,
      ...(enderecoTomador || {}),
      // Mapear campos do endereço para nomes esperados pela API
      logradouro: enderecoTomador?.logradouro || enderecoTomador?.endereco || tomador.endereco,
      endereco: enderecoTomador?.logradouro || enderecoTomador?.endereco || tomador.endereco,
      numero: enderecoTomador?.numero || tomador.numero,
      complemento: enderecoTomador?.complemento || tomador.complemento,
      bairro: enderecoTomador?.bairro || tomador.bairro,
      cidade: cidadeTomador,
      municipio: cidadeTomador,
      uf: ufTomador,
      cep: cepTomador,
      codigo_municipio: codigoMunicipio, // Código IBGE (obrigatório)
      email: tomador.email || (tomador.tipo_tomador === 'PESSOA' ? null : null),
      telefone: tomador.telefone || (tomador.tipo_tomador === 'PESSOA' ? null : null)
    };

    console.log('📍 Dados finais do tomador:', {
      cidade: tomadorCompleto.cidade,
      uf: tomadorCompleto.uf,
      codigo_municipio: tomadorCompleto.codigo_municipio,
      cep: tomadorCompleto.cep
    });

    // Buscar dados dos sócios
    const sociosCompletos = [];
    if (socios && socios.length > 0) {
      for (const socio of socios) {
        const [pessoa] = await query(`
          SELECT * FROM pessoas WHERE id = ?
        `, [socio.pessoa_id]);
        
        if (pessoa) {
          sociosCompletos.push({
            ...pessoa,
            valor_prestado: socio.valor_prestado,
            percentual_participacao: socio.percentual_participacao
          });
        }
      }
    }

    // Inserir nota fiscal
    // modelo_discriminacao_id pode ser null para notas avulsas (quando discriminacao_final está preenchida)
    // Primeiro, verificar se a coluna permite NULL, se não, tentar alterar
    try {
      // Tentar inserir com null se modelo_discriminacao_id não foi fornecido
      const modeloId = modelo_discriminacao_id || null;
      
      // Extrair mês e ano da competência para campos separados
      const [ano, mes] = mes_competencia.split('-');
      
      await query(`
        INSERT INTO notas_fiscais (
          id, empresa_id, tomador_id, modelo_discriminacao_id,
          valor_total, mes_competencia, discriminacao_final, status, funcionario_criador_id,
          codigo_servico_municipal, codigo_servico_federal, cnae_code, nbs_code,
          tipo_tributacao, aliquota_iss, valor_iss,
          valor_retencao_ir, valor_retencao_pis, valor_retencao_cofins, valor_retencao_csll,
          valor_retencao_inss, valor_retencao_iss, valor_outras_retencoes,
          valor_deducoes, valor_desconto_incondicionado, valor_desconto_condicionado,
          informacoes_adicionais, numero_rps, serie_rps, data_emissao_rps,
          competencia_mes, competencia_ano
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notaId, 
        empresa_id, 
        tomador_id, 
        modeloId,
        valor_total, 
        mes_competencia, 
        discriminacao_final || null, 
        status, 
        funcionarioId,
        codigo_servico_municipal || null,
        codigo_servico_federal || null,
        cnae_code || null,
        nbs_code || null,
        tipo_tributacao || null,
        aliquota_iss || null,
        valor_iss || null,
        valor_retencao_ir || null,
        valor_retencao_pis || null,
        valor_retencao_cofins || null,
        valor_retencao_csll || null,
        valor_retencao_inss || null,
        valor_retencao_iss || null,
        valor_outras_retencoes || null,
        valor_deducoes || null,
        valor_desconto_incondicionado || null,
        valor_desconto_condicionado || null,
        informacoes_adicionais || null,
        numero_rps || null,
        serie_rps || null,
        data_emissao_rps || null,
        mes ? parseInt(mes) : null,
        ano ? parseInt(ano) : null
      ]);
    } catch (insertError) {
      // Se o erro for por causa de NOT NULL constraint, tentar alterar a coluna
      if (insertError.code === 'ER_BAD_NULL_ERROR' || insertError.message?.includes('NULL') || insertError.message?.includes('NOT NULL')) {
        console.warn('⚠️  Tentando alterar coluna modelo_discriminacao_id para permitir NULL...');
        try {
          await query(`
            ALTER TABLE notas_fiscais 
            MODIFY COLUMN modelo_discriminacao_id int(11) NULL
          `);
          // Tentar inserir novamente
          await query(`
            INSERT INTO notas_fiscais (
              id, empresa_id, tomador_id, modelo_discriminacao_id,
              valor_total, mes_competencia, discriminacao_final, status, funcionario_criador_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            notaId, 
            empresa_id, 
            tomador_id, 
            modelo_discriminacao_id || null,
            valor_total, 
            mes_competencia, 
            discriminacao_final || null, 
            status, 
            funcionarioId
          ]);
        } catch (alterError) {
          console.error('❌ Erro ao alterar coluna ou inserir nota:', alterError);
          throw alterError;
        }
      } else {
        throw insertError;
      }
    }

    // Inserir sócios da nota
    if (socios && socios.length > 0) {
      for (const socio of socios) {
        await query(`
          INSERT INTO nota_fiscal_pessoa (
            nota_fiscal_id, pessoa_id, valor_prestado, percentual_participacao
          ) VALUES (?, ?, ?, ?)
        `, [notaId, socio.pessoa_id, socio.valor_prestado, socio.percentual_participacao]);
      }
    }

    // Se status não for RASCUNHO, emitir via NFe.io
    let apiRef = null;
    let notaStatus = status;
    let apiProvider = null;

    // #region agent log
    await writeLog({
      location: 'notas/controller.js:before emission check',
      message: 'before emission check',
      data: { status, notaId, empresaFound: !!empresa, tomadorFound: !!tomador, sociosCount: sociosCompletos.length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'A'
    });
    // #endregion

    if (status !== 'RASCUNHO') {
      try {
        // Validar CNAE obrigatório em produção (não em ambiente de teste)
        const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.NFEIO_API_URL?.includes('test') || process.env.NFEIO_API_URL?.includes('sandbox');
        
        if (!isTestEnvironment) {
          // Em produção, CNAE é obrigatório
          if (!cnae_code || cnae_code.trim() === '') {
            return res.status(400).json({
              success: false,
              message: 'CNAE é obrigatório para emissão de notas fiscais em produção',
              error: 'Campo cnae_code não informado ou vazio'
            });
          }
        }
        
        // Validar se a empresa existe na NFe.io antes de tentar emitir
        if (empresa.nfeio_empresa_id) {
          const validacaoEmpresa = await nfeioService.obterEmpresa(empresa.nfeio_empresa_id);
          
          if (!validacaoEmpresa.success) {
            // Se a empresa não existe (404), limpar o ID e tentar criar uma nova
            if (validacaoEmpresa.statusCode === 404) {
              console.warn(`⚠️  Empresa ${empresa.nfeio_empresa_id} não encontrada na NFe.io (404). Limpando ID e criando nova empresa...`);
              
              // Limpar nfeio_empresa_id temporariamente para forçar criação
              const empresaParaSync = { ...empresa };
              empresaParaSync.nfeio_empresa_id = null;
              
              // Tentar criar nova empresa
              const resultadoSync = await nfeioService.sincronizarEmpresa(empresaParaSync);
              
              if (resultadoSync.success && resultadoSync.nfeio_empresa_id) {
                // Atualizar empresa com novo nfeio_empresa_id
                await query(`
                  UPDATE empresas SET nfeio_empresa_id = ? WHERE id = ?
                `, [resultadoSync.nfeio_empresa_id, empresa_id]);
                empresa.nfeio_empresa_id = resultadoSync.nfeio_empresa_id;
                console.log(`✅ Nova empresa criada na NFe.io. Novo ID: ${resultadoSync.nfeio_empresa_id}`);
              } else {
                return res.status(400).json({
                  success: false,
                  message: 'Empresa não encontrada na NFe.io e não foi possível criar uma nova. Por favor, sincronize a empresa manualmente através da página de Empresas.',
                  error: resultadoSync.error || 'Erro ao criar empresa na NFe.io',
                  diagnosticos: [
                    {
                      tipo: 'ERRO',
                      campo: 'empresa.nfeio_empresa_id',
                      mensagem: `Empresa com ID ${empresa.nfeio_empresa_id} não encontrada na conta da NFe.io e não foi possível criar uma nova.`
                    }
                  ]
                });
              }
            } else {
              // Outro tipo de erro (não 404)
              return res.status(400).json({
                success: false,
                message: 'Erro ao validar empresa na NFe.io. Por favor, verifique a configuração da API.',
                error: validacaoEmpresa.error,
                diagnosticos: [
                  {
                    tipo: 'ERRO',
                    campo: 'empresa.nfeio_empresa_id',
                    mensagem: `Erro ao validar empresa na NFe.io: ${validacaoEmpresa.error}`
                  }
                ]
              });
            }
          }
        }

        const notaData = {
          id: notaId,
          valor_total,
          mes_competencia,
          discriminacao_final,
          // Códigos de Serviço
          codigo_servico_municipal,
          codigo_servico_federal,
          cnae_code,
          nbs_code,
          // Tributação
          tipo_tributacao,
          aliquota_iss,
          valor_iss,
          // Retenções
          valor_retencao_ir,
          valor_retencao_pis,
          valor_retencao_cofins,
          valor_retencao_csll,
          valor_retencao_inss,
          valor_retencao_iss,
          valor_outras_retencoes,
          // Deduções e Descontos
          valor_deducoes,
          valor_desconto_incondicionado,
          valor_desconto_condicionado,
          // Informações Adicionais
          informacoes_adicionais,
          // RPS
          numero_rps,
          serie_rps,
          data_emissao_rps,
          // Localização
          localizacao
        };

        // #region agent log
        await writeLog({
          location: 'notas/controller.js:calling emitirNota',
          message: 'calling emitirNota',
          data: { notaId, empresaCnpj: empresa?.cnpj, tomadorDoc: tomador?.cnpj_cpf, codigoServico: codigo_servico_municipal },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run2',
          hypothesisId: 'C'
        });
        // #endregion

        const resultadoEmissao = await nfeioService.emitirNota({
          nota: notaData,
          empresa: empresa,
          tomador: tomadorCompleto,
          socios: sociosCompletos
        });

        // #region agent log
        await writeLog({
          location: 'notas/controller.js:emitirNota result',
          message: 'emitirNota result',
          data: { success: resultadoEmissao.success, status: resultadoEmissao.status, hasApiRef: !!resultadoEmissao.api_ref, error: resultadoEmissao.error },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run2',
          hypothesisId: 'A'
        });
        // #endregion

        if (resultadoEmissao.success) {
          apiRef = resultadoEmissao.api_ref;
          
          // Mapear status da API NFe.io para valores válidos do ENUM
          // Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-get/
          // Status possíveis: [Error, None, Created, Issued, Cancelled]
          const mapearStatusNFeio = (statusNFeio, flowStatus) => {
            if (!statusNFeio) {
              // Se não tiver status, verificar flowStatus
              if (flowStatus) {
                const flowUpper = String(flowStatus).toUpperCase();
                if (flowUpper === 'ISSUED') return 'AUTORIZADA';
                if (flowUpper.includes('WAITING') || flowUpper.includes('PULL')) return 'PROCESSANDO';
                if (flowUpper === 'CANCELLED') return 'CANCELADA';
                if (flowUpper.includes('FAILED') || flowUpper.includes('ERROR')) return 'ERRO';
              }
              return 'PROCESSANDO';
            }
            
            const statusUpper = String(statusNFeio).toUpperCase();
            
            // Mapear status da NFe.io para valores válidos do ENUM
            const mapeamento = {
              // Status da API NFe.io (conforme documentação)
              'ISSUED': 'AUTORIZADA',           // Emitida
              'CREATED': 'PROCESSANDO',          // Criada
              'CANCELLED': 'CANCELADA',         // Cancelada
              'ERROR': 'ERRO',                  // Erro
              'NONE': 'RASCUNHO',               // Nenhum
              // Status antigos (compatibilidade)
              'AUTHORIZED': 'AUTORIZADA',
              'AUTORIZADA': 'AUTORIZADA',
              'PROCESSING': 'PROCESSANDO',
              'PROCESSANDO': 'PROCESSANDO',
              'REJECTED': 'ERRO',
              'REJEITADA': 'ERRO',
              'DRAFT': 'RASCUNHO',
              'RASCUNHO': 'RASCUNHO',
              'PENDING': 'PROCESSANDO'
            };
            
            return mapeamento[statusUpper] || 'PROCESSANDO';
          };
          
          notaStatus = mapearStatusNFeio(resultadoEmissao.status, resultadoEmissao.data?.flowStatus);
          apiProvider = 'NFe.io';

          // Atualizar nota com dados da API
          await query(`
            UPDATE notas_fiscais SET
              api_ref = ?,
              api_provider = ?,
              status = ?,
              caminho_xml = COALESCE(?, caminho_xml),
              caminho_pdf = COALESCE(?, caminho_pdf),
              data_emissao = COALESCE(?, data_emissao)
            WHERE id = ?
          `, [
            apiRef, 
            apiProvider, 
            notaStatus,
            resultadoEmissao.data?.xml_url || resultadoEmissao.data?.urls?.xml || null,
            resultadoEmissao.data?.pdf_url || resultadoEmissao.data?.urls?.pdf || null,
            resultadoEmissao.data?.issuedAt ? new Date(resultadoEmissao.data.issuedAt) : null,
            notaId
          ]);
          
          // Se ainda estiver PROCESSANDO, tentar sincronizar após 2 segundos
          if (notaStatus === 'PROCESSANDO' && apiRef) {
            setTimeout(async () => {
              try {
                const resultadoSync = await nfeioService.obterNotaPorId(
                  empresa.nfeio_empresa_id,
                  apiRef
                );
                
                if (resultadoSync.success && resultadoSync.nota) {
                  const novoStatus = mapearStatusNFeio(resultadoSync.nota.status, resultadoSync.flowStatus || resultadoSync.nota.flowStatus);
                  
                  await query(`
                    UPDATE notas_fiscais SET
                      status = ?,
                      caminho_xml = COALESCE(?, caminho_xml),
                      caminho_pdf = COALESCE(?, caminho_pdf),
                      data_emissao = COALESCE(?, data_emissao)
                    WHERE id = ?
                  `, [
                    novoStatus,
                    resultadoSync.caminho_xml || null,
                    resultadoSync.caminho_pdf || null,
                    resultadoSync.nota.issuedAt ? new Date(resultadoSync.nota.issuedAt) : null,
                    notaId
                  ]);
                  
                  console.log(`✅ Status da nota ${notaId} atualizado para ${novoStatus}`);
                }
              } catch (error) {
                console.error(`Erro ao sincronizar nota ${notaId}:`, error);
              }
            }, 2000);
          }
        } else {
          // Extrair mensagem de erro detalhada
          const errorMessage = typeof resultadoEmissao.error === 'string' 
            ? resultadoEmissao.error 
            : resultadoEmissao.error?.message || JSON.stringify(resultadoEmissao.error);
          
          const errorSuggestion = resultadoEmissao.suggestion || '';
          const errorDetails = resultadoEmissao.errorDetails || resultadoEmissao.error;
          
          console.error('❌ Erro ao emitir nota:', {
            errorMessage,
            errorSuggestion,
            errorDetails,
            statusCode: resultadoEmissao.statusCode
          });
          
          // Verificar se o erro é "company not found on this account"
          if (errorMessage.includes('company not found') || resultadoEmissao.statusCode === 400) {
            console.warn(`⚠️  Empresa ${empresa.nfeio_empresa_id} não encontrada na NFe.io durante emissão. Tentando re-sincronizar...`);
            
            // Tentar re-sincronizar a empresa
            const resultadoSync = await nfeioService.sincronizarEmpresa(empresa);
            
            if (resultadoSync.success && resultadoSync.nfeio_empresa_id) {
              // Atualizar empresa com novo nfeio_empresa_id
              await query(`
                UPDATE empresas SET nfeio_empresa_id = ? WHERE id = ?
              `, [resultadoSync.nfeio_empresa_id, empresa_id]);
              empresa.nfeio_empresa_id = resultadoSync.nfeio_empresa_id;
              console.log(`✅ Empresa re-sincronizada. Novo ID: ${resultadoSync.nfeio_empresa_id}`);
              
              // Retornar erro informando que precisa tentar novamente
              return res.status(400).json({
                success: false,
                message: 'Empresa foi re-sincronizada com a NFe.io. Por favor, tente emitir a nota novamente.',
                error: 'Empresa re-sincronizada. Tente novamente.',
                diagnosticos: [
                  {
                    tipo: 'INFO',
                    campo: 'empresa.nfeio_empresa_id',
                    mensagem: `Empresa foi re-sincronizada. Novo ID: ${resultadoSync.nfeio_empresa_id}`
                  }
                ]
              });
        } else {
              // Se falhar na emissão, manter como RASCUNHO mas registrar erro
              // #region agent log
              await writeLog({
                location: 'notas/controller.js:emission failed - company not found',
                message: 'emission failed - company not found',
                data: { 
                  error: resultadoEmissao.error, 
                  errorDetails: resultadoEmissao.errorDetails,
                  statusCode: resultadoEmissao.statusCode,
                  empresaId: empresa_id,
                  empresaNfeioId: empresa.nfeio_empresa_id,
                  tomadorId: tomador_id,
                  syncAttempted: true,
                  syncSuccess: false
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run2',
                hypothesisId: 'B'
              });
              // #endregion
              
              return res.status(400).json({
                success: false,
                message: 'Empresa não encontrada na NFe.io e não foi possível re-sincronizar. Por favor, sincronize a empresa manualmente através da página de Empresas.',
                error: errorMessage,
                diagnosticos: [
                  {
                    tipo: 'ERRO',
                    campo: 'empresa.nfeio_empresa_id',
                    mensagem: `Empresa com ID ${empresa.nfeio_empresa_id} não encontrada na conta da NFe.io. A empresa precisa ser re-sincronizada manualmente.`
                  }
                ]
              });
            }
          }
          
          // Se falhar na emissão, manter como RASCUNHO mas registrar erro
          // #region agent log
          await writeLog({
            location: 'notas/controller.js:emission failed',
            message: 'emission failed',
            data: { 
              error: resultadoEmissao.error, 
              errorDetails: resultadoEmissao.errorDetails,
              statusCode: resultadoEmissao.statusCode,
              empresaId: empresa_id,
              empresaNfeioId: empresa.nfeio_empresa_id,
              tomadorId: tomador_id
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run2',
            hypothesisId: 'B'
          });
          // #endregion
          
          console.error('❌ Falha na emissão da nota:', {
            notaId,
            empresaId: empresa_id,
            errorMessage,
            errorSuggestion,
            errorDetails
          });
          
          // Atualizar nota com status de erro e mensagem
          await query(`
            UPDATE notas_fiscais SET
              status = 'ERRO',
              mensagem_erro = ?
            WHERE id = ?
          `, [
            JSON.stringify({
              message: errorMessage,
              suggestion: errorSuggestion,
              details: errorDetails,
              statusCode: resultadoEmissao.statusCode
            }),
            notaId
          ]);
          
          return res.status(400).json({
            success: false,
            message: 'Nota fiscal criada, mas houve erro na emissão',
            error: {
              message: errorMessage,
              suggestion: errorSuggestion
            },
            data: {
              id: notaId,
              status: 'ERRO',
              api_ref: null,
              api_provider: null
            }
          });
        }
      } catch (error) {
        // #region agent log
        await writeLog({
          location: 'notas/controller.js:emission exception',
          message: 'emission exception',
          data: { errorMessage: error.message, errorStack: error.stack?.substring(0,200) },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run2',
          hypothesisId: 'E'
        });
        // #endregion
        console.error('Erro ao emitir nota na NFe.io:', error);
        notaStatus = 'ERRO';
        await query(`
          UPDATE notas_fiscais SET
            status = ?,
            mensagem_erro = ?
          WHERE id = ?
        `, [notaStatus, error.message, notaId]);
      }
    }

    // Buscar mensagem de erro se houver
    let errorMessage = null;
    if (notaStatus === 'ERRO') {
      const [notaComErro] = await query(`
        SELECT mensagem_erro FROM notas_fiscais WHERE id = ?
      `, [notaId]);
      if (notaComErro && notaComErro.mensagem_erro) {
        try {
          const erroData = JSON.parse(notaComErro.mensagem_erro);
          errorMessage = erroData.error || erroData.errorDetails || 'Erro desconhecido na emissão';
        } catch (e) {
          errorMessage = notaComErro.mensagem_erro;
        }
      }
    }
    
    // Formatar mensagem de erro se houver
    let responseError = null;
    if (notaStatus === 'ERRO' && errorMessage) {
      try {
        const errorData = JSON.parse(errorMessage);
        responseError = {
          message: errorData.error || errorMessage,
          suggestion: errorData.errorSuggestion || '',
          details: errorData.errorDetails,
          diagnosticos: errorData.diagnosticos
        };
      } catch {
        responseError = {
          message: errorMessage,
          suggestion: ''
        };
      }
    }
    
    res.status(201).json({
      success: notaStatus !== 'ERRO',
      message: status === 'RASCUNHO' 
        ? 'Nota fiscal criada com sucesso' 
        : (notaStatus === 'AUTORIZADA' 
          ? 'Nota fiscal emitida com sucesso' 
          : (notaStatus === 'PROCESSANDO'
            ? 'Nota fiscal enviada para processamento'
            : 'Nota fiscal criada, mas houve erro na emissão')),
      error: responseError,
      data: { 
        id: notaId,
        status: notaStatus,
        api_ref: apiRef,
        api_provider: apiProvider
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar nota fiscal:', error);
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Atualizar nota fiscal
const atualizarNota = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar se a nota existe
    const nota = await query('SELECT id FROM notas_fiscais WHERE id = ?', [id]);
    if (nota.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    // Construir query de atualização
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }

    values.push(id);
    await query(`UPDATE notas_fiscais SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({
      success: true,
      message: 'Nota fiscal atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar nota fiscal
const deletarNota = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a nota existe
    const nota = await query('SELECT id FROM notas_fiscais WHERE id = ?', [id]);
    if (nota.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    // Deletar nota (cascade vai deletar os relacionamentos)
    await query('DELETE FROM notas_fiscais WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Nota fiscal deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Baixar XML da nota fiscal
const baixarXML = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar nota com dados da empresa
    const [nota] = await query(`
      SELECT 
        nf.id,
        nf.api_ref,
        nf.caminho_xml,
        nf.status,
        e.nfeio_empresa_id
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.id = ?
    `, [id]);

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    // Verificar se a nota está em um status que permite download de XML
    if (nota.status === 'RASCUNHO') {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal em rascunho não possui XML disponível.'
      });
    }

    if (nota.status === 'ERRO') {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal com erro não possui XML disponível.'
      });
    }

    // Função auxiliar para mapear status da NFe.io para valores válidos do ENUM
    const mapearStatusNFeio = (statusNFeio) => {
      if (!statusNFeio) return null;
      
      const statusUpper = String(statusNFeio).toUpperCase();
      
      // Mapear status da NFe.io para valores válidos do ENUM
      const mapeamento = {
        'AUTHORIZED': 'AUTORIZADA',
        'AUTORIZADA': 'AUTORIZADA',
        'PROCESSING': 'PROCESSANDO',
        'PROCESSANDO': 'PROCESSANDO',
        'CANCELLED': 'CANCELADA',
        'CANCELADA': 'CANCELADA',
        'ERROR': 'ERRO',
        'ERRO': 'ERRO',
        'DRAFT': 'RASCUNHO',
        'RASCUNHO': 'RASCUNHO',
        'PENDING': 'PROCESSANDO',
        'REJECTED': 'ERRO',
        'REJEITADA': 'ERRO'
      };
      
      return mapeamento[statusUpper] || null;
    };

    // Se a nota está PROCESSANDO, tentar sincronizar primeiro
    if (nota.status === 'PROCESSANDO' && nota.api_ref && nota.nfeio_empresa_id) {
      try {
        const resultadoConsulta = await nfeioService.obterNotaPorId(nota.nfeio_empresa_id, nota.api_ref);
        if (resultadoConsulta.success && resultadoConsulta.status) {
          // Mapear status da NFe.io para valor válido do ENUM
          const statusMapeado = mapearStatusNFeio(resultadoConsulta.status, resultadoConsulta.flowStatus || resultadoConsulta.nota?.flowStatus);
          
          if (statusMapeado) {
            // Atualizar status da nota apenas se o mapeamento foi bem-sucedido
            await query(`UPDATE notas_fiscais SET status = ? WHERE id = ?`, [statusMapeado, id]);
            nota.status = statusMapeado;
          }
          
          // Se agora tem caminho_xml, usar ele
          if (resultadoConsulta.caminho_xml) {
            nota.caminho_xml = resultadoConsulta.caminho_xml;
            await query(`UPDATE notas_fiscais SET caminho_xml = ? WHERE id = ?`, [resultadoConsulta.caminho_xml, id]);
          }
        }
      } catch (syncError) {
        console.error('Erro ao sincronizar nota antes de baixar XML:', syncError.message);
        // Continuar tentando baixar mesmo se a sincronização falhar
      }
    }

    // Se já tem caminho_xml salvo, retornar direto
    if (nota.caminho_xml) {
      try {
        const axios = require('axios');
        const xmlResponse = await axios.get(nota.caminho_xml, { responseType: 'text' });
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="nota-${id}.xml"`);
        return res.send(xmlResponse.data);
      } catch (error) {
        console.error('Erro ao baixar XML da URL:', error.message);
        // Continuar para tentar baixar via API
      }
    }

    // Se tem api_ref e nfeio_empresa_id, baixar via API NFe.io
    if (nota.api_ref && nota.nfeio_empresa_id) {
      const resultado = await nfeioService.baixarXML(nota.nfeio_empresa_id, nota.api_ref);
      
      if (resultado.success) {
        // Atualizar caminho_xml no banco
        await query(`UPDATE notas_fiscais SET caminho_xml = ? WHERE id = ?`, [
          `https://api.nfe.io/v1/companies/${nota.nfeio_empresa_id}/serviceinvoices/${nota.api_ref}/xml`,
          id
        ]);

        res.setHeader('Content-Type', resultado.contentType || 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="nota-${id}.xml"`);
        return res.send(resultado.xml);
      } else {
        // Se o erro for 404, pode ser que a nota ainda não foi processada
        if (resultado.statusCode === 404) {
          return res.status(404).json({
            success: false,
            message: 'XML ainda não está disponível. A nota pode estar sendo processada. Tente novamente em alguns instantes ou sincronize a nota primeiro.',
            suggestion: 'Tente usar o botão "Sincronizar" na página de detalhes da nota para atualizar o status.'
          });
        }
        
        return res.status(resultado.statusCode || 500).json({
          success: false,
          message: 'Erro ao baixar XML da nota',
          error: resultado.error
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Nota não possui XML disponível. Verifique se a nota foi emitida corretamente.'
    });

  } catch (error) {
    console.error('Erro ao baixar XML:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Baixar PDF da nota fiscal
const baixarPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar nota com dados da empresa
    const [nota] = await query(`
      SELECT 
        nf.id,
        nf.api_ref,
        nf.caminho_pdf,
        nf.status,
        e.nfeio_empresa_id
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.id = ?
    `, [id]);

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    // Verificar se a nota está em um status que permite download de PDF
    if (nota.status === 'RASCUNHO') {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal em rascunho não possui PDF disponível.'
      });
    }

    if (nota.status === 'ERRO') {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal com erro não possui PDF disponível.'
      });
    }

    // Função auxiliar para mapear status da NFe.io para valores válidos do ENUM
    const mapearStatusNFeio = (statusNFeio) => {
      if (!statusNFeio) return null;
      
      const statusUpper = String(statusNFeio).toUpperCase();
      
      // Mapear status da NFe.io para valores válidos do ENUM
      const mapeamento = {
        'AUTHORIZED': 'AUTORIZADA',
        'AUTORIZADA': 'AUTORIZADA',
        'PROCESSING': 'PROCESSANDO',
        'PROCESSANDO': 'PROCESSANDO',
        'CANCELLED': 'CANCELADA',
        'CANCELADA': 'CANCELADA',
        'ERROR': 'ERRO',
        'ERRO': 'ERRO',
        'DRAFT': 'RASCUNHO',
        'RASCUNHO': 'RASCUNHO',
        'PENDING': 'PROCESSANDO',
        'REJECTED': 'ERRO',
        'REJEITADA': 'ERRO'
      };
      
      return mapeamento[statusUpper] || null;
    };

    // Se a nota está PROCESSANDO, tentar sincronizar primeiro
    if (nota.status === 'PROCESSANDO' && nota.api_ref && nota.nfeio_empresa_id) {
      try {
        const resultadoConsulta = await nfeioService.obterNotaPorId(nota.nfeio_empresa_id, nota.api_ref);
        if (resultadoConsulta.success && resultadoConsulta.status) {
          // Mapear status da NFe.io para valor válido do ENUM
          const statusMapeado = mapearStatusNFeio(resultadoConsulta.status, resultadoConsulta.flowStatus || resultadoConsulta.nota?.flowStatus);
          
          if (statusMapeado) {
            // Atualizar status da nota apenas se o mapeamento foi bem-sucedido
            await query(`UPDATE notas_fiscais SET status = ? WHERE id = ?`, [statusMapeado, id]);
            nota.status = statusMapeado;
          }
          
          // Se agora tem caminho_pdf, usar ele
          if (resultadoConsulta.caminho_pdf) {
            nota.caminho_pdf = resultadoConsulta.caminho_pdf;
            await query(`UPDATE notas_fiscais SET caminho_pdf = ? WHERE id = ?`, [resultadoConsulta.caminho_pdf, id]);
          }
        }
      } catch (syncError) {
        console.error('Erro ao sincronizar nota antes de baixar PDF:', syncError.message);
        // Continuar tentando baixar mesmo se a sincronização falhar
      }
    }

    // Se já tem caminho_pdf salvo, retornar direto
    if (nota.caminho_pdf) {
      try {
        const axios = require('axios');
        const pdfResponse = await axios.get(nota.caminho_pdf, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="nota-${id}.pdf"`);
        return res.send(Buffer.from(pdfResponse.data));
      } catch (error) {
        console.error('Erro ao baixar PDF da URL:', error.message);
        // Continuar para tentar baixar via API
      }
    }

    // Se tem api_ref e nfeio_empresa_id, baixar via API NFe.io
    if (nota.api_ref && nota.nfeio_empresa_id) {
      const resultado = await nfeioService.baixarPDF(nota.nfeio_empresa_id, nota.api_ref);
      
      if (resultado.success) {
        // Atualizar caminho_pdf no banco
        await query(`UPDATE notas_fiscais SET caminho_pdf = ? WHERE id = ?`, [
          `https://api.nfe.io/v1/companies/${nota.nfeio_empresa_id}/serviceinvoices/${nota.api_ref}/pdf`,
          id
        ]);

        res.setHeader('Content-Type', resultado.contentType || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="nota-${id}.pdf"`);
        return res.send(resultado.pdf);
      } else {
        // Se o erro for 404, pode ser que a nota ainda não foi processada
        if (resultado.statusCode === 404) {
          return res.status(404).json({
            success: false,
            message: 'PDF ainda não está disponível. A nota pode estar sendo processada. Tente novamente em alguns instantes ou sincronize a nota primeiro.',
            suggestion: 'Tente usar o botão "Sincronizar" na página de detalhes da nota para atualizar o status.'
          });
        }
        
        return res.status(resultado.statusCode || 500).json({
          success: false,
          message: 'Erro ao baixar PDF da nota',
          error: resultado.error
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Nota não possui PDF disponível. Verifique se a nota foi emitida corretamente.'
    });

  } catch (error) {
    console.error('Erro ao baixar PDF:', error);
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

    // Buscar nota com dados da empresa
    const [nota] = await query(`
      SELECT 
        nf.id, 
        nf.status, 
        nf.api_ref, 
        nf.api_provider,
        e.nfeio_empresa_id
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.id = ?
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

    if (!nota.nfeio_empresa_id) {
      return res.status(400).json({
        success: false,
        message: 'Empresa não possui ID da NFe.io configurado'
      });
    }

    // Chamar serviço NFe.io para cancelar
    const resultado = await nfeioService.cancelarNota(
      nota.nfeio_empresa_id,
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

// Endpoints para códigos auxiliares da NFe.io
const listarCodigosOperacao = async (req, res) => {
  try {
    const resultado = await nfeioService.listarCodigosOperacao();
    
    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar códigos de operação',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: {
        codigos: resultado.codigos,
        total: resultado.total
      }
    });
  } catch (error) {
    console.error('Erro ao listar códigos de operação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const listarFinalidadesAquisicao = async (req, res) => {
  try {
    const resultado = await nfeioService.listarFinalidadesAquisicao();
    
    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar finalidades de aquisição',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: {
        finalidades: resultado.finalidades,
        total: resultado.total
      }
    });
  } catch (error) {
    console.error('Erro ao listar finalidades de aquisição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const listarPerfisFiscaisEmissor = async (req, res) => {
  try {
    const resultado = await nfeioService.listarPerfisFiscaisEmissor();
    
    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar perfis fiscais do emissor',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: {
        perfis: resultado.perfis,
        total: resultado.total
      }
    });
  } catch (error) {
    console.error('Erro ao listar perfis fiscais do emissor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const listarPerfisFiscaisDestinatario = async (req, res) => {
  try {
    const resultado = await nfeioService.listarPerfisFiscaisDestinatario();
    
    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar perfis fiscais do destinatário',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: {
        perfis: resultado.perfis,
        total: resultado.total
      }
    });
  } catch (error) {
    console.error('Erro ao listar perfis fiscais do destinatário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Baixar modelo XLSX para emissão em lote
const baixarModeloXLSX = async (req, res) => {
  try {
    const buffer = xlsxHelper.gerarModeloXLSX();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=modelo-emissao-lote.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao gerar modelo XLSX:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar modelo XLSX'
    });
  }
};

// Validar lote de notas antes de criar
const validarLote = async (req, res) => {
  try {
    const { dados } = req.body;

    if (!Array.isArray(dados) || dados.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos. É necessário um array de notas.'
      });
    }

    const erros = [];
    const funcionarioId = req.user?.id;

    if (!funcionarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Validar cada linha
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      const linhaErros = [];

      // Validar empresa
      let empresaId = null;
      if (linha.empresa_id) {
        empresaId = parseInt(linha.empresa_id);
        const [empresa] = await query('SELECT id, status FROM empresas WHERE id = ?', [empresaId]);
        if (!empresa) {
          linhaErros.push(`Linha ${i + 1}: Empresa ID ${empresaId} não encontrada`);
        } else if (empresa.status !== 'ativa') {
          linhaErros.push(`Linha ${i + 1}: Empresa ID ${empresaId} não está ativa`);
        }
      } else if (linha.empresa_cnpj) {
        const [empresa] = await query('SELECT id, status FROM empresas WHERE cnpj = ?', [linha.empresa_cnpj]);
        if (!empresa) {
          linhaErros.push(`Linha ${i + 1}: Empresa com CNPJ ${linha.empresa_cnpj} não encontrada`);
        } else if (empresa.status !== 'ativa') {
          linhaErros.push(`Linha ${i + 1}: Empresa com CNPJ ${linha.empresa_cnpj} não está ativa`);
        } else {
          empresaId = empresa.id;
        }
      } else {
        linhaErros.push(`Linha ${i + 1}: Empresa não informada`);
      }

      // Validar tomador
      let tomadorId = null;
      if (linha.tomador_id) {
        tomadorId = parseInt(linha.tomador_id);
        const [tomador] = await query('SELECT id, status FROM tomadores WHERE id = ?', [tomadorId]);
        if (!tomador) {
          linhaErros.push(`Linha ${i + 1}: Tomador ID ${tomadorId} não encontrado`);
        } else if (tomador.status !== 'ativo') {
          linhaErros.push(`Linha ${i + 1}: Tomador ID ${tomadorId} não está ativo`);
        }
      } else if (linha.tomador_cpf_cnpj) {
        // Buscar por CPF/CNPJ (precisa verificar em pessoas ou empresas)
        const [tomador] = await query(`
          SELECT t.id, t.status 
          FROM tomadores t
          LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
          LEFT JOIN empresas e ON t.empresa_id = e.id AND t.tipo_tomador = 'EMPRESA'
          WHERE p.cpf = ? OR e.cnpj = ?
        `, [linha.tomador_cpf_cnpj, linha.tomador_cpf_cnpj]);
        if (!tomador) {
          linhaErros.push(`Linha ${i + 1}: Tomador com CPF/CNPJ ${linha.tomador_cpf_cnpj} não encontrado`);
        } else if (tomador.status !== 'ativo') {
          linhaErros.push(`Linha ${i + 1}: Tomador com CPF/CNPJ ${linha.tomador_cpf_cnpj} não está ativo`);
        } else {
          tomadorId = tomador.id;
        }
      } else {
        linhaErros.push(`Linha ${i + 1}: Tomador não informado`);
      }

      // Validar sócios
      const sociosIds = linha.socios_ids || [];
      if (sociosIds.length === 0) {
        linhaErros.push(`Linha ${i + 1}: Nenhum sócio informado`);
      } else {
        // Verificar se sócios existem e estão vinculados à empresa
        if (empresaId) {
          for (const socioId of sociosIds) {
            const [socio] = await query(`
              SELECT pe.pessoa_id, pe.empresa_id, pe.ativo
              FROM pessoa_empresa pe
              WHERE pe.pessoa_id = ? AND pe.empresa_id = ?
            `, [socioId, empresaId]);
            if (!socio) {
              linhaErros.push(`Linha ${i + 1}: Sócio ID ${socioId} não está vinculado à empresa`);
            } else if (!socio.ativo) {
              linhaErros.push(`Linha ${i + 1}: Sócio ID ${socioId} não está ativo na empresa`);
            }
          }
        }
      }

      // Validar valores
      const valores = linha.valores || {};
      const valoresArray = Object.values(valores);
      if (valoresArray.length === 0) {
        linhaErros.push(`Linha ${i + 1}: Nenhum valor informado`);
      } else {
        const total = valoresArray.reduce((sum, val) => sum + (parseFloat(String(val)) || 0), 0);
        if (total <= 0) {
          linhaErros.push(`Linha ${i + 1}: Valor total deve ser maior que zero`);
        }
        if (valoresArray.length !== sociosIds.length) {
          linhaErros.push(`Linha ${i + 1}: Número de valores não corresponde ao número de sócios`);
        }
      }

      // Validar mês competência
      if (!linha.mes_competencia) {
        linhaErros.push(`Linha ${i + 1}: Mês competência não informado`);
      } else {
        const regex = /^\d{4}-\d{2}$/;
        if (!regex.test(linha.mes_competencia)) {
          linhaErros.push(`Linha ${i + 1}: Mês competência inválido (formato esperado: YYYY-MM)`);
        }
      }

      // Validar modelo (se informado)
      if (linha.modelo_id) {
        const modeloId = parseInt(linha.modelo_id);
        const [modelo] = await query('SELECT id FROM modelos_discriminacao WHERE id = ?', [modeloId]);
        if (!modelo) {
          linhaErros.push(`Linha ${i + 1}: Modelo ID ${modeloId} não encontrado`);
        }
      }

      if (linhaErros.length > 0) {
        erros.push(...linhaErros.map(msg => ({ linha: i, mensagem: msg })));
      }
    }

    res.json({
      success: true,
      data: {
        total: dados.length,
        erros: erros,
        valido: erros.length === 0
      }
    });

  } catch (error) {
    console.error('Erro ao validar lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar rascunhos em lote
const criarRascunhosLote = async (req, res) => {
  try {
    const { dados } = req.body;

    if (!Array.isArray(dados) || dados.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos. É necessário um array de notas.'
      });
    }

    const funcionarioId = req.user?.id;
    if (!funcionarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const notasCriadas = [];
    const erros = [];

    // Usar transação para garantir consistência
    const { transaction } = require('../../config/database');
    
    await transaction(async (connection) => {
      // Função auxiliar para executar queries na transação
      const queryTx = async (sql, params) => {
        const [rows] = await connection.query(sql, params);
        return rows;
      };

      for (let i = 0; i < dados.length; i++) {
        const linha = dados[i];
        
        try {
          // Resolver empresa_id se foi informado CNPJ
          let empresaId = linha.empresa_id;
          if (!empresaId && linha.empresa_cnpj) {
            const empresas = await queryTx('SELECT id FROM empresas WHERE cnpj = ?', [linha.empresa_cnpj]);
            if (empresas.length > 0) empresaId = empresas[0].id;
          }
          empresaId = parseInt(empresaId);

          // Resolver tomador_id se foi informado CPF/CNPJ
          let tomadorId = linha.tomador_id;
          if (!tomadorId && linha.tomador_cpf_cnpj) {
            const tomadores = await queryTx(`
              SELECT t.id 
              FROM tomadores t
              LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
              LEFT JOIN empresas e ON t.empresa_id = e.id AND t.tipo_tomador = 'EMPRESA'
              WHERE p.cpf = ? OR e.cnpj = ?
            `, [linha.tomador_cpf_cnpj, linha.tomador_cpf_cnpj]);
            if (tomadores.length > 0) tomadorId = tomadores[0].id;
          }
          tomadorId = parseInt(tomadorId);

          // Calcular valor total
          const socios = linha.socios || [];
          const valorTotal = socios.reduce((sum, s) => sum + (parseFloat(s.valor_prestado) || 0), 0);

          if (valorTotal <= 0) {
            throw new Error('Valor total deve ser maior que zero');
          }

          // Gerar UUID
          const notaId = require('crypto').randomUUID();

          // Criar nota
          await queryTx(`
            INSERT INTO notas_fiscais (
              id, empresa_id, tomador_id, modelo_discriminacao_id,
              status, valor_total, mes_competencia, funcionario_criador_id,
              discriminacao_final, codigo_servico_municipal
            ) VALUES (?, ?, ?, ?, 'RASCUNHO', ?, ?, ?, ?, ?)
          `, [
            notaId,
            empresaId,
            tomadorId,
            linha.modelo_discriminacao_id ? parseInt(linha.modelo_discriminacao_id) : null,
            valorTotal,
            linha.mes_competencia,
            funcionarioId,
            linha.discriminacao_final || null,
            linha.codigo_servico_municipal || null
          ]);

          // Adicionar sócios
          for (const socio of socios) {
            const valorPrestado = parseFloat(socio.valor_prestado) || 0;
            const percentual = valorTotal > 0 ? (valorPrestado / valorTotal * 100) : 0;
            
            await queryTx(`
              INSERT INTO nota_fiscal_pessoa (
                nota_fiscal_id, pessoa_id, valor_prestado, percentual_participacao
              ) VALUES (?, ?, ?, ?)
            `, [notaId, socio.pessoa_id, valorPrestado, percentual]);
          }

          notasCriadas.push({ id: notaId, linha: i + 1 });

        } catch (error) {
          erros.push({
            linha: i + 1,
            mensagem: error.message || 'Erro ao criar nota'
          });
        }
      }
    });

    // Buscar detalhes completos das notas criadas
    const notasCompletas = [];
    if (notasCriadas.length > 0) {
      const ids = notasCriadas.map(n => n.id);
      const placeholders = ids.map(() => '?').join(',');
      
      const notasDetalhes = await query(`
        SELECT 
          nf.*,
          e.razao_social as empresa_nome,
          e.cnpj as empresa_cnpj,
          CASE 
            WHEN t.tipo_tomador = 'PESSOA' THEN p.nome_completo
            WHEN t.tipo_tomador = 'EMPRESA' THEN e2.razao_social
          END as tomador_nome,
          CASE 
            WHEN t.tipo_tomador = 'PESSOA' THEN p.cpf
            WHEN t.tipo_tomador = 'EMPRESA' THEN e2.cnpj
          END as tomador_documento
        FROM notas_fiscais nf
        LEFT JOIN empresas e ON nf.empresa_id = e.id
        LEFT JOIN tomadores t ON nf.tomador_id = t.id
        LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
        LEFT JOIN empresas e2 ON t.empresa_id = e2.id AND t.tipo_tomador = 'EMPRESA'
        WHERE nf.id IN (${placeholders})
      `, ids);
      
      notasCompletas.push(...notasDetalhes);
    }

    res.json({
      success: true,
      data: {
        notas: notasCompletas,
        total: dados.length,
        criadas: notasCriadas.length,
        erros: erros.length
      }
    });

  } catch (error) {
    console.error('Erro ao criar rascunhos em lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Emitir notas em lote
const emitirLote = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs inválidos. É necessário um array de IDs de notas.'
      });
    }

    const resultados = [];

    // Emitir cada nota individualmente
    for (const id of ids) {
      try {
        // Buscar nota
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
            CASE 
              WHEN t.tipo_tomador = 'PESSOA' THEN p.nome_completo
              WHEN t.tipo_tomador = 'EMPRESA' THEN e2.razao_social
            END as tomador_nome_razao_social,
            CASE 
              WHEN t.tipo_tomador = 'PESSOA' THEN p.cpf
              WHEN t.tipo_tomador = 'EMPRESA' THEN e2.cnpj
            END as tomador_cnpj_cpf
          FROM notas_fiscais nf
          LEFT JOIN empresas e ON nf.empresa_id = e.id
          LEFT JOIN tomadores t ON nf.tomador_id = t.id
          LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
          LEFT JOIN empresas e2 ON t.empresa_id = e2.id AND t.tipo_tomador = 'EMPRESA'
          WHERE nf.id = ?
        `, [id]);

        if (!nota) {
          resultados.push({
            nota_id: id,
            success: false,
            message: 'Nota não encontrada'
          });
          continue;
        }

        if (nota.status !== 'RASCUNHO') {
          resultados.push({
            nota_id: id,
            success: false,
            message: `Nota não está em rascunho (status: ${nota.status})`
          });
          continue;
        }

        // Buscar endereços
        const [enderecoEmpresa] = await query(`
          SELECT * FROM enderecos 
          WHERE entidade_tipo = 'Empresa' AND entidade_id = ? 
          LIMIT 1
        `, [nota.empresa_id]);

        // Buscar endereço do tomador (pode estar em enderecos_tomador ou enderecos)
        let enderecoTomador = null;
        
        // Primeiro, tentar buscar na tabela específica de tomadores
        const [enderecoTomadorEspecifico] = await query(`
          SELECT 
            *,
            cidade as municipio,
            cidade_codigo_ibge as codigo_ibge,
            cidade_codigo_ibge as codigo_municipio,
            estado as uf
          FROM enderecos_tomador 
          WHERE tomador_id = ? AND tipo_endereco = 'principal'
          LIMIT 1
        `, [nota.tomador_id]);
        
        if (enderecoTomadorEspecifico) {
          enderecoTomador = enderecoTomadorEspecifico;
        } else {
          // Se não encontrar, buscar na tabela genérica enderecos
          const [enderecoGenerico] = await query(`
            SELECT 
              *,
              municipio as cidade,
              uf as estado
            FROM enderecos 
            WHERE entidade_tipo = 'Tomador' AND entidade_id = ? 
            LIMIT 1
          `, [nota.tomador_id]);
          
          if (enderecoGenerico) {
            enderecoTomador = enderecoGenerico;
          }
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

        if (socios.length === 0) {
          resultados.push({
            nota_id: id,
            success: false,
            message: 'Nota não tem sócios'
          });
          continue;
        }

        // Buscar dados completos da empresa
        const [empresaCompleta] = await query(`
          SELECT * FROM empresas WHERE id = ?
        `, [nota.empresa_id]);

        // Preparar dados para emissão
        // Garantir que o CNPJ da empresa está presente e usar dados completos da empresa
        const empresaData = { 
          ...(empresaCompleta || {}), // Dados completos da empresa
          ...enderecoEmpresa,
          cnpj: nota.empresa_cnpj || empresaCompleta?.cnpj || nota.cnpj, // Prioridade: empresa_cnpj da query > empresa completa > nota
          razao_social: nota.empresa_razao_social || empresaCompleta?.razao_social,
          nome_fantasia: nota.empresa_nome_fantasia || empresaCompleta?.nome_fantasia,
          inscricao_municipal: nota.empresa_inscricao_municipal || empresaCompleta?.inscricao_municipal,
          codigo_servico_municipal: nota.codigo_servico_municipal || empresaCompleta?.codigo_servico_municipal, // Prioridade: nota > empresa
          codigo_servico: nota.codigo_servico_municipal || empresaCompleta?.codigo_servico_municipal, // Alias para compatibilidade
          nfeio_empresa_id: empresaCompleta?.nfeio_empresa_id
        };
        const tomadorData = { 
          ...nota, 
          ...enderecoTomador,
          nome_razao_social: nota.tomador_nome_razao_social,
          cnpj_cpf: nota.tomador_cnpj_cpf
        };

        // Preparar dados da nota com código de serviço municipal
        const notaData = {
          ...nota,
          codigo_servico_municipal: nota.codigo_servico_municipal || empresaData.codigo_servico_municipal,
          codigo_servico: nota.codigo_servico_municipal || empresaData.codigo_servico_municipal
        };

        // Validar CNAE obrigatório em produção (não em ambiente de teste)
        const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.NFEIO_API_URL?.includes('test') || process.env.NFEIO_API_URL?.includes('sandbox');
        
        if (!isTestEnvironment) {
          // Em produção, CNAE é obrigatório
          const cnaeCode = notaData.cnae_code || nota.cnae_code || '';
          if (!cnaeCode || cnaeCode.trim() === '') {
            resultados.push({
              nota_id: id,
              success: false,
              message: 'CNAE é obrigatório para emissão de notas fiscais em produção',
              error: 'Campo cnae_code não informado ou vazio'
            });
            continue;
          }
        }

        // Chamar serviço NFe.io
        const resultado = await nfeioService.emitirNota({
          nota: notaData,
          empresa: empresaData,
          tomador: tomadorData,
          socios
        });

        if (resultado.success) {
          // Mapear status da API NFe.io para valores válidos do ENUM
          // Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-get/
          // Status possíveis: [Error, None, Created, Issued, Cancelled]
          const mapearStatusNFeio = (statusNFeio, flowStatus) => {
            if (!statusNFeio) {
              // Se não tiver status, verificar flowStatus
              if (flowStatus) {
                const flowUpper = String(flowStatus).toUpperCase();
                if (flowUpper === 'ISSUED') return 'AUTORIZADA';
                if (flowUpper.includes('WAITING') || flowUpper.includes('PULL')) return 'PROCESSANDO';
                if (flowUpper === 'CANCELLED') return 'CANCELADA';
                if (flowUpper.includes('FAILED') || flowUpper.includes('ERROR')) return 'ERRO';
              }
              return 'PROCESSANDO';
            }
            
            const statusUpper = String(statusNFeio).toUpperCase();
            
            const mapeamento = {
              // Status da API NFe.io (conforme documentação)
              'ISSUED': 'AUTORIZADA',           // Emitida
              'CREATED': 'PROCESSANDO',          // Criada
              'CANCELLED': 'CANCELADA',         // Cancelada
              'ERROR': 'ERRO',                  // Erro
              'NONE': 'RASCUNHO',               // Nenhum
              // Status antigos (compatibilidade)
              'AUTHORIZED': 'AUTORIZADA',
              'AUTORIZADA': 'AUTORIZADA',
              'PROCESSING': 'PROCESSANDO',
              'PROCESSANDO': 'PROCESSANDO',
              'REJECTED': 'ERRO',
              'REJEITADA': 'ERRO',
              'DRAFT': 'RASCUNHO',
              'RASCUNHO': 'RASCUNHO',
              'PENDING': 'PROCESSANDO'
            };
            
            return mapeamento[statusUpper] || 'PROCESSANDO';
          };
          
          const notaStatus = mapearStatusNFeio(resultado.status, resultado.data?.flowStatus);
          
          // Atualizar status
          await query(`
            UPDATE notas_fiscais SET
              status = ?,
              api_ref = ?,
              api_provider = 'NFEIO',
              caminho_xml = COALESCE(?, caminho_xml),
              caminho_pdf = COALESCE(?, caminho_pdf),
              data_emissao = COALESCE(?, data_emissao)
            WHERE id = ?
          `, [
            notaStatus,
            resultado.api_ref,
            resultado.data?.xml_url || resultado.data?.urls?.xml || null,
            resultado.data?.pdf_url || resultado.data?.urls?.pdf || null,
            resultado.data?.issuedAt ? new Date(resultado.data.issuedAt) : null,
            id
          ]);
          
          // Se ainda estiver PROCESSANDO, tentar sincronizar após 2 segundos
          if (notaStatus === 'PROCESSANDO' && resultado.api_ref) {
            setTimeout(async () => {
              try {
                const resultadoSync = await nfeioService.obterNotaPorId(
                  empresaCompleta.nfeio_empresa_id,
                  resultado.api_ref
                );
                
                if (resultadoSync.success && resultadoSync.nota) {
                  const novoStatus = mapearStatusNFeio(resultadoSync.nota.status, resultadoSync.flowStatus || resultadoSync.nota.flowStatus);
                  
                  await query(`
                    UPDATE notas_fiscais SET
                      status = ?,
                      caminho_xml = COALESCE(?, caminho_xml),
                      caminho_pdf = COALESCE(?, caminho_pdf),
                      data_emissao = COALESCE(?, data_emissao)
                    WHERE id = ?
                  `, [
                    novoStatus,
                    resultadoSync.caminho_xml || null,
                    resultadoSync.caminho_pdf || null,
                    resultadoSync.nota.issuedAt ? new Date(resultadoSync.nota.issuedAt) : null,
                    id
                  ]);
                  
                  console.log(`✅ Status da nota ${id} atualizado para ${novoStatus}`);
                }
              } catch (error) {
                console.error(`Erro ao sincronizar nota ${id}:`, error);
              }
            }, 2000);
          }

          resultados.push({
            nota_id: id,
            success: true,
            message: 'Nota enviada para processamento',
            api_ref: resultado.api_ref
          });
        } else {
          // Atualizar status para erro
          await query(`
            UPDATE notas_fiscais SET
              status = 'ERRO',
              mensagem_erro = ?,
              api_provider = 'NFEIO'
            WHERE id = ?
          `, [JSON.stringify(resultado.error), id]);

          resultados.push({
            nota_id: id,
            success: false,
            message: resultado.error?.message || 'Erro ao emitir nota',
            error: resultado.error
          });
        }

      } catch (error) {
        console.error(`Erro ao emitir nota ${id}:`, error);
        resultados.push({
          nota_id: id,
          success: false,
          message: error.message || 'Erro ao emitir nota'
        });
      }
    }

    const sucessos = resultados.filter(r => r.success).length;
    const erros = resultados.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        resultados,
        total: ids.length,
        sucessos,
        erros
      }
    });

  } catch (error) {
    console.error('Erro ao emitir lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Sincronizar nota com NFe.io (obter detalhes atualizados)
const sincronizarNotaNFeio = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar nota
    const [nota] = await query(`
      SELECT 
        nf.*,
        e.nfeio_empresa_id
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.id = ?
    `, [id]);

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }

    if (!nota.api_ref) {
      return res.status(400).json({
        success: false,
        message: 'Nota não possui referência da API (api_ref)'
      });
    }

    if (!nota.nfeio_empresa_id) {
      return res.status(400).json({
        success: false,
        message: 'Empresa não está sincronizada com NFe.io'
      });
    }

    // Obter detalhes atualizados da NFe.io
    const resultado = await nfeioService.obterNotaPorId(nota.nfeio_empresa_id, nota.api_ref);

    if (!resultado.success) {
      return res.status(resultado.statusCode || 500).json({
        success: false,
        message: 'Erro ao sincronizar nota com NFe.io',
        error: resultado.error
      });
    }

    // Função auxiliar para mapear status da NFe.io para valores válidos do ENUM
    // Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-get/
    // Status possíveis: [Error, None, Created, Issued, Cancelled]
    const mapearStatusNFeio = (statusNFeio, flowStatus) => {
      if (!statusNFeio) {
        // Se não tiver status, verificar flowStatus
        if (flowStatus) {
          const flowUpper = String(flowStatus).toUpperCase();
          if (flowUpper === 'ISSUED') return 'AUTORIZADA';
          if (flowUpper.includes('WAITING') || flowUpper.includes('PULL')) return 'PROCESSANDO';
          if (flowUpper === 'CANCELLED') return 'CANCELADA';
          if (flowUpper.includes('FAILED') || flowUpper.includes('ERROR')) return 'ERRO';
        }
        return null;
      }
      
      const statusUpper = String(statusNFeio).toUpperCase();
      
      // Mapear status da NFe.io para valores válidos do ENUM
      const mapeamento = {
        // Status da API NFe.io (conforme documentação)
        'ISSUED': 'AUTORIZADA',           // Emitida
        'CREATED': 'PROCESSANDO',          // Criada
        'CANCELLED': 'CANCELADA',         // Cancelada
        'ERROR': 'ERRO',                  // Erro
        'NONE': 'RASCUNHO',               // Nenhum
        // Status antigos (compatibilidade)
        'AUTHORIZED': 'AUTORIZADA',
        'AUTORIZADA': 'AUTORIZADA',
        'PROCESSING': 'PROCESSANDO',
        'PROCESSANDO': 'PROCESSANDO',
        'REJECTED': 'ERRO',
        'REJEITADA': 'ERRO',
        'DRAFT': 'RASCUNHO',
        'RASCUNHO': 'RASCUNHO',
        'PENDING': 'PROCESSANDO'
      };
      
      return mapeamento[statusUpper] || null;
    };

    // Atualizar nota no banco com dados da API
    const notaApi = resultado.nota;
    const novoStatus = mapearStatusNFeio(notaApi.status, notaApi.flowStatus) || nota.status;

    await query(`
      UPDATE notas_fiscais SET
        status = ?,
        caminho_xml = ?,
        caminho_pdf = ?,
        data_emissao = ?,
        mensagem_erro = ?
      WHERE id = ?
    `, [
      novoStatus,
      resultado.caminho_xml || nota.caminho_xml,
      resultado.caminho_pdf || nota.caminho_pdf,
      notaApi.issuedAt ? new Date(notaApi.issuedAt) : nota.data_emissao,
      notaApi.error ? JSON.stringify(notaApi.error) : null,
      id
    ]);

    // Buscar nota atualizada
    const [notaAtualizada] = await query(`
      SELECT 
        nf.*,
        e.razao_social as empresa_nome,
        e.cnpj as empresa_cnpj
      FROM notas_fiscais nf
      LEFT JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Nota sincronizada com sucesso',
      data: {
        nota: notaAtualizada,
        dados_api: notaApi
      }
    });

  } catch (error) {
    console.error('Erro ao sincronizar nota:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Sincronizar múltiplas notas em lote
const sincronizarLote = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar um array de IDs de notas'
      });
    }

    const resultados = [];
    const { query } = require('../../config/database');
    const nfeioService = require('../../services/nfeioService');

    for (const id of ids) {
      try {
        // Buscar nota
        const [nota] = await query(`
          SELECT 
            nf.*,
            e.nfeio_empresa_id
          FROM notas_fiscais nf
          LEFT JOIN empresas e ON nf.empresa_id = e.id
          WHERE nf.id = ?
        `, [id]);

        if (!nota) {
          resultados.push({
            nota_id: id,
            success: false,
            message: 'Nota não encontrada'
          });
          continue;
        }

        // Se não tem api_ref, não pode sincronizar
        if (!nota.api_ref || !nota.nfeio_empresa_id) {
          resultados.push({
            nota_id: id,
            success: false,
            message: 'Nota não possui referência da API para sincronização'
          });
          continue;
        }

        // Buscar dados atualizados da API
        const resultado = await nfeioService.obterNotaPorId(
          nota.nfeio_empresa_id,
          nota.api_ref
        );

        if (!resultado.success || !resultado.nota) {
          resultados.push({
            nota_id: id,
            success: false,
            message: resultado.error || 'Erro ao buscar dados da API'
          });
          continue;
        }

        // Mapear status
        const mapearStatusNFeio = (statusNFeio, flowStatus) => {
          if (!statusNFeio) {
            if (flowStatus) {
              const flowUpper = String(flowStatus).toUpperCase();
              if (flowUpper === 'ISSUED') return 'AUTORIZADA';
              if (flowUpper.includes('WAITING') || flowUpper.includes('PULL')) return 'PROCESSANDO';
              if (flowUpper === 'CANCELLED') return 'CANCELADA';
              if (flowUpper.includes('FAILED') || flowUpper.includes('ERROR')) return 'ERRO';
            }
            return null;
          }
          
          const statusUpper = String(statusNFeio).toUpperCase();
          const mapeamento = {
            'ISSUED': 'AUTORIZADA',
            'CREATED': 'PROCESSANDO',
            'CANCELLED': 'CANCELADA',
            'ERROR': 'ERRO',
            'NONE': 'RASCUNHO',
            'AUTHORIZED': 'AUTORIZADA',
            'AUTORIZADA': 'AUTORIZADA',
            'PROCESSING': 'PROCESSANDO',
            'PROCESSANDO': 'PROCESSANDO',
            'REJECTED': 'ERRO',
            'REJEITADA': 'ERRO',
            'DRAFT': 'RASCUNHO',
            'RASCUNHO': 'RASCUNHO',
            'PENDING': 'PROCESSANDO'
          };
          
          return mapeamento[statusUpper] || null;
        };

        const notaApi = resultado.nota;
        const novoStatus = mapearStatusNFeio(notaApi.status, notaApi.flowStatus) || nota.status;

        // Atualizar nota no banco
        await query(`
          UPDATE notas_fiscais SET
            status = ?,
            caminho_xml = COALESCE(?, caminho_xml),
            caminho_pdf = COALESCE(?, caminho_pdf),
            data_emissao = COALESCE(?, data_emissao),
            numero = COALESCE(?, numero),
            codigo_verificacao = COALESCE(?, codigo_verificacao)
          WHERE id = ?
        `, [
          novoStatus,
          resultado.caminho_xml || notaApi.xml_url || null,
          resultado.caminho_pdf || notaApi.pdf_url || null,
          notaApi.issuedOn ? new Date(notaApi.issuedOn) : null,
          notaApi.number || null,
          notaApi.checkCode || null,
          id
        ]);

        resultados.push({
          nota_id: id,
          success: true,
          message: 'Nota sincronizada com sucesso',
          status: novoStatus
        });

      } catch (error) {
        console.error(`Erro ao sincronizar nota ${id}:`, error);
        resultados.push({
          nota_id: id,
          success: false,
          message: error.message || 'Erro ao sincronizar nota'
        });
      }
    }

    const sucessos = resultados.filter(r => r.success).length;
    const erros = resultados.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Sincronização concluída: ${sucessos} sucesso(s), ${erros} erro(s)`,
      data: {
        resultados,
        total: ids.length,
        sucessos,
        erros
      }
    });

  } catch (error) {
    console.error('Erro ao sincronizar lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Baixar XMLs em lote (retorna ZIP)
const baixarXMLsLote = async (req, res) => {
  try {
    const { ids, agrupamento } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar um array de IDs de notas'
      });
    }

    const JSZip = require('jszip');
    const zip = new JSZip();
    const { query } = require('../../config/database');
    const nfeioService = require('../../services/nfeioService');
    const axios = require('axios');

    let sucessos = 0;
    let erros = 0;

    // Função auxiliar para obter caminho do arquivo baseado no agrupamento
    const obterCaminhoArquivo = (nota, agrupamento) => {
      if (!agrupamento || agrupamento === 'nenhum') {
        return `nota-${nota.id}.xml`;
      }

      let caminho = '';
      switch (agrupamento) {
        case 'prestador':
          const empresaNome = (nota.empresa_nome || nota.empresa || 'sem-nome').replace(/[^a-zA-Z0-9]/g, '_');
          caminho = `${empresaNome}/nota-${nota.id}.xml`;
          break;
        case 'tomador':
          const tomadorNome = (nota.tomador_nome || nota.tomador || 'sem-nome').replace(/[^a-zA-Z0-9]/g, '_');
          caminho = `${tomadorNome}/nota-${nota.id}.xml`;
          break;
        case 'competencia':
          const competencia = nota.mes_competencia || 'sem-competencia';
          caminho = `${competencia}/nota-${nota.id}.xml`;
          break;
        case 'status':
          const status = (nota.status || 'sem-status').toLowerCase();
          caminho = `${status}/nota-${nota.id}.xml`;
          break;
        default:
          caminho = `nota-${nota.id}.xml`;
      }
      return caminho;
    };

    for (const id of ids) {
      try {
        // Buscar nota com mais informações para agrupamento
        const [nota] = await query(`
          SELECT 
            nf.id,
            nf.api_ref,
            nf.caminho_xml,
            nf.status,
            nf.mes_competencia,
            e.nfeio_empresa_id,
            e.razao_social as empresa_nome,
            t.nome as tomador_nome
          FROM notas_fiscais nf
          LEFT JOIN empresas e ON nf.empresa_id = e.id
          LEFT JOIN tomadores t ON nf.tomador_id = t.id
          WHERE nf.id = ?
        `, [id]);

        if (!nota) {
          erros++;
          continue;
        }

        // Verificar se pode baixar XML
        if (nota.status === 'RASCUNHO' || nota.status === 'ERRO') {
          erros++;
          continue;
        }

        let xmlContent = null;

        // Tentar baixar do caminho salvo
        if (nota.caminho_xml) {
          try {
            const response = await axios.get(nota.caminho_xml, { 
              responseType: 'text',
              timeout: 10000
            });
            xmlContent = response.data;
          } catch (e) {
            console.log(`Erro ao baixar XML do caminho salvo para nota ${id}, tentando via API...`);
            // Se falhar, tentar via API
          }
        }

        // Se não conseguiu, tentar via API
        if (!xmlContent && nota.api_ref && nota.nfeio_empresa_id) {
          try {
            const resultado = await nfeioService.baixarXML(nota.nfeio_empresa_id, nota.api_ref);
            if (resultado.success && resultado.xml) {
              xmlContent = resultado.xml;
            }
          } catch (apiError) {
            console.error(`Erro ao baixar XML via API para nota ${id}:`, apiError);
          }
        }

        if (xmlContent) {
          const caminhoArquivo = obterCaminhoArquivo(nota, agrupamento);
          zip.file(caminhoArquivo, xmlContent);
          sucessos++;
        } else {
          console.error(`Não foi possível obter XML para nota ${id}`);
          erros++;
        }

      } catch (error) {
        console.error(`Erro ao baixar XML da nota ${id}:`, error);
        erros++;
      }
    }

    if (sucessos === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum XML foi encontrado para as notas selecionadas'
      });
    }

    // Gerar ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="notas-xml-${Date.now()}.zip"`);
    res.send(zipBuffer);

  } catch (error) {
    console.error('Erro ao baixar XMLs em lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Baixar PDFs em lote (retorna ZIP)
const baixarPDFsLote = async (req, res) => {
  try {
    const { ids, agrupamento } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário informar um array de IDs de notas'
      });
    }

    const JSZip = require('jszip');
    const zip = new JSZip();
    const { query } = require('../../config/database');
    const nfeioService = require('../../services/nfeioService');
    const axios = require('axios');

    let sucessos = 0;
    let erros = 0;

    // Função auxiliar para obter caminho do arquivo baseado no agrupamento
    const obterCaminhoArquivo = (nota, agrupamento) => {
      if (!agrupamento || agrupamento === 'nenhum') {
        return `nota-${nota.id}.pdf`;
      }

      let caminho = '';
      switch (agrupamento) {
        case 'prestador':
          const empresaNome = (nota.empresa_nome || nota.empresa || 'sem-nome').replace(/[^a-zA-Z0-9]/g, '_');
          caminho = `${empresaNome}/nota-${nota.id}.pdf`;
          break;
        case 'tomador':
          const tomadorNome = (nota.tomador_nome || nota.tomador || 'sem-nome').replace(/[^a-zA-Z0-9]/g, '_');
          caminho = `${tomadorNome}/nota-${nota.id}.pdf`;
          break;
        case 'competencia':
          const competencia = nota.mes_competencia || 'sem-competencia';
          caminho = `${competencia}/nota-${nota.id}.pdf`;
          break;
        case 'status':
          const status = (nota.status || 'sem-status').toLowerCase();
          caminho = `${status}/nota-${nota.id}.pdf`;
          break;
        default:
          caminho = `nota-${nota.id}.pdf`;
      }
      return caminho;
    };

    for (const id of ids) {
      try {
        // Buscar nota com mais informações para agrupamento
        const [nota] = await query(`
          SELECT 
            nf.id,
            nf.api_ref,
            nf.caminho_pdf,
            nf.status,
            nf.mes_competencia,
            e.nfeio_empresa_id,
            e.razao_social as empresa_nome,
            t.nome as tomador_nome
          FROM notas_fiscais nf
          LEFT JOIN empresas e ON nf.empresa_id = e.id
          LEFT JOIN tomadores t ON nf.tomador_id = t.id
          WHERE nf.id = ?
        `, [id]);

        if (!nota) {
          erros++;
          continue;
        }

        // Verificar se pode baixar PDF
        if (nota.status === 'RASCUNHO' || nota.status === 'ERRO') {
          erros++;
          continue;
        }

        let pdfContent = null;

        // Tentar baixar do caminho salvo
        if (nota.caminho_pdf) {
          try {
            const response = await axios.get(nota.caminho_pdf, { 
              responseType: 'arraybuffer',
              timeout: 10000
            });
            pdfContent = Buffer.from(response.data);
          } catch (e) {
            console.log(`Erro ao baixar PDF do caminho salvo para nota ${id}, tentando via API...`);
            // Se falhar, tentar via API
          }
        }

        // Se não conseguiu, tentar via API
        if (!pdfContent && nota.api_ref && nota.nfeio_empresa_id) {
          try {
            const resultado = await nfeioService.baixarPDF(nota.nfeio_empresa_id, nota.api_ref);
            if (resultado.success && resultado.pdf) {
              pdfContent = Buffer.from(resultado.pdf);
            }
          } catch (apiError) {
            console.error(`Erro ao baixar PDF via API para nota ${id}:`, apiError);
          }
        }

        if (pdfContent) {
          const caminhoArquivo = obterCaminhoArquivo(nota, agrupamento);
          zip.file(caminhoArquivo, pdfContent);
          sucessos++;
        } else {
          console.error(`Não foi possível obter PDF para nota ${id}`);
          erros++;
        }

      } catch (error) {
        console.error(`Erro ao baixar PDF da nota ${id}:`, error);
        erros++;
      }
    }

    if (sucessos === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum PDF foi encontrado para as notas selecionadas'
      });
    }

    // Gerar ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="notas-pdf-${Date.now()}.zip"`);
    res.send(zipBuffer);

  } catch (error) {
    console.error('Erro ao baixar PDFs em lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Calcular impostos para pré-visualização
const calcularImpostos = async (req, res) => {
  try {
    const {
      valor_servico,
      municipio_prestacao,
      codigo_servico,
      codigo_operacao,
      finalidade_aquisicao,
      perfil_fiscal_emissor,
      perfil_fiscal_destinatario,
      empresa_id,
      nfeio_empresa_id
    } = req.body;

    if (!valor_servico || valor_servico <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor do serviço é obrigatório e deve ser maior que zero'
      });
    }

    // Buscar dados completos da empresa e tomador se empresa_id foi fornecido
    let tenantId = nfeio_empresa_id;
    let empresaRegime = null;
    let empresaUF = null;
    let tomadorRegime = null;
    let tomadorUF = null;
    
    if (empresa_id) {
      const [empresa] = await query(
        `SELECT nfeio_empresa_id, regime_tributario, uf 
         FROM empresas WHERE id = ?`,
        [empresa_id]
      );
      if (empresa) {
        if (empresa.nfeio_empresa_id) {
          tenantId = empresa.nfeio_empresa_id;
        }
        empresaRegime = empresa.regime_tributario;
        empresaUF = empresa.uf;
      }
    }

    // Se tomador_id foi fornecido, buscar dados do tomador
    if (req.body.tomador_id) {
      const [tomador] = await query(
        `SELECT t.regime_tributario, 
         et.estado as uf
         FROM tomadores t
         LEFT JOIN enderecos_tomador et ON et.tomador_id = t.id AND et.tipo_endereco = 'principal'
         WHERE t.id = ?
         LIMIT 1`,
        [req.body.tomador_id]
      );
      if (tomador) {
        tomadorRegime = tomador.regime_tributario;
        tomadorUF = tomador.uf;
      }
    }

    const resultado = await nfeioService.calcularImpostos({
      valor_servico: parseFloat(valor_servico),
      municipio_prestacao: municipio_prestacao || '',
      codigo_servico: codigo_servico || '',
      codigo_operacao: codigo_operacao || '',
      finalidade_aquisicao: finalidade_aquisicao || '',
      perfil_fiscal_emissor: perfil_fiscal_emissor || '',
      perfil_fiscal_destinatario: perfil_fiscal_destinatario || '',
      tenant_id: tenantId,
      nfeio_empresa_id: tenantId,
      empresa_regime_tributario: empresaRegime,
      empresa_uf: empresaUF,
      tomador_regime_tributario: tomadorRegime,
      tomador_uf: tomadorUF
    });

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    console.error('Erro ao calcular impostos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

module.exports = {
  listarNotas,
  obterNota,
  criarNota,
  atualizarNota,
  deletarNota,
  cancelarNota,
  baixarXML,
  baixarPDF,
  listarCodigosOperacao,
  listarFinalidadesAquisicao,
  listarPerfisFiscaisEmissor,
  listarPerfisFiscaisDestinatario,
  baixarModeloXLSX,
  validarLote,
  criarRascunhosLote,
  emitirLote,
  sincronizarNotaNFeio,
  sincronizarLote,
  baixarXMLsLote,
  baixarPDFsLote,
  calcularImpostos
};
