const { query } = require('../../config/database');
const nfeioService = require('../../services/nfeioService');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

// Listar empresas com filtros e paginação
const listarEmpresas = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      conta_id = '',
      pode_emitir = '' // Novo filtro: apenas empresas sincronizadas com NFe.io
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Filtro de busca
    if (search) {
      whereClause += ' AND (e.razao_social LIKE ? OR e.cnpj LIKE ? OR c.nome_conta LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filtro de status
    if (status) {
      whereClause += ' AND e.status = ?';
      params.push(status);
    }

    // Filtro de conta
    if (conta_id) {
      whereClause += ' AND e.conta_id = ?';
      params.push(conta_id);
    }

    // Filtro para empresas que podem emitir (têm nfeio_empresa_id)
    if (pode_emitir === 'true' || pode_emitir === true) {
      whereClause += ' AND e.nfeio_empresa_id IS NOT NULL AND e.nfeio_empresa_id != ""';
    }

    // Query principal
    const sql = `
      SELECT 
        e.*,
        c.nome_conta as conta_nome,
        COUNT(DISTINCT ep.pessoa_id) as pessoas_count
      FROM empresas e
      LEFT JOIN contas c ON e.conta_id = c.id
      LEFT JOIN pessoa_empresa ep ON e.id = ep.empresa_id
      ${whereClause}
      GROUP BY e.id
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);

    const empresas = await query(sql, params);

    // Query para contar total
    const countSql = `
      SELECT COUNT(*) as total
      FROM empresas e
      LEFT JOIN contas c ON e.conta_id = c.id
      ${whereClause}
    `;

    const [{ total }] = await query(countSql, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        empresas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter empresa por ID
const obterEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const empresas = await query(`
      SELECT 
        e.*,
        c.nome_conta,
        c.tipo_relacionamento
      FROM empresas e
      LEFT JOIN contas c ON e.conta_id = c.id
      WHERE e.id = ?
    `, [id]);

    if (empresas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Buscar pessoas vinculadas com participação calculada
    const pessoasRaw = await query(`
      SELECT 
        p.id as pessoa_id, p.nome_completo as nome, p.cpf, p.email, p.telefone,
        ep.tipo_vinculo, ep.percentual_participacao as percentual_participacao_fixo, 
        ep.data_inicio, ep.data_fim,
        COALESCE(
          (SELECT SUM(nfp.valor_prestado) 
           FROM nota_fiscal_pessoa nfp
           JOIN notas_fiscais nf ON nfp.nota_fiscal_id = nf.id
           WHERE nfp.pessoa_id = p.id AND nf.empresa_id = ? AND nf.status = 'AUTORIZADA'),
          0
        ) as valor_total_emitido_socio,
        COALESCE(
          (SELECT SUM(nf.valor_total)
           FROM notas_fiscais nf
           WHERE nf.empresa_id = ? AND nf.status = 'AUTORIZADA'),
          0
        ) as valor_total_emitido_empresa
      FROM pessoas p
      JOIN pessoa_empresa ep ON p.id = ep.pessoa_id
      WHERE ep.empresa_id = ? AND p.status = 'ativo' AND ep.ativo = true
      ORDER BY p.nome_completo
    `, [id, id, id]);

    // Calcular participação dinâmica
    const pessoas = pessoasRaw.map(pessoa => {
      let participacaoCalculada = null;
      
      if (pessoa.valor_total_emitido_empresa > 0) {
        participacaoCalculada = (pessoa.valor_total_emitido_socio / pessoa.valor_total_emitido_empresa) * 100;
      }
      
      return {
        pessoa_id: pessoa.pessoa_id,
        nome: pessoa.nome,
        cpf: pessoa.cpf,
        email: pessoa.email,
        telefone: pessoa.telefone,
        tipo_vinculo: pessoa.tipo_vinculo,
        percentual_participacao: participacaoCalculada !== null ? parseFloat(participacaoCalculada.toFixed(2)) : pessoa.percentual_participacao_fixo,
        data_inicio: pessoa.data_inicio,
        data_fim: pessoa.data_fim,
        valor_total_emitido_socio: parseFloat(pessoa.valor_total_emitido_socio || 0),
        valor_total_emitido_empresa: parseFloat(pessoa.valor_total_emitido_empresa || 0)
      };
    });

    // Buscar documentos
    const documentos = await query(`
      SELECT id, nome_arquivo, nome_original, tipo_arquivo, tamanho_bytes, categoria, created_at
      FROM documentos 
      WHERE entidade_tipo = 'Empresa' AND entidade_id = ?
      ORDER BY created_at DESC
    `, [id]);

    // Buscar endereços
    const enderecos = await query(`
      SELECT id, logradouro, numero, complemento, bairro, municipio, uf, cep, tipo_endereco
      FROM enderecos 
      WHERE entidade_tipo = 'Empresa' AND entidade_id = ?
      ORDER BY tipo_endereco
    `, [id]);

    const empresa = {
      ...empresas[0],
      pessoas_vinculadas: pessoas,
      documentos: documentos,
      enderecos: enderecos
    };

    res.json({
      success: true,
      data: { empresa }
    });

  } catch (error) {
    console.error('Erro ao obter empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar nova empresa
const criarEmpresa = async (req, res) => {
  try {
    const {
      conta_id,
      cnpj,
      razao_social,
      nome_fantasia,
      inscricao_municipal,
      inscricao_estadual,
      regime_tributario,
      endereco,
      cidade,
      uf,
      cep,
      telefone,
      email,
      dados_fiscais,
      nfeio_empresa_id,
      // Novos campos de configurações fiscais
      determinacao_impostos_federacao,
      determinacao_impostos_municipio,
      aliquota_iss,
      serie_rps,
      numero_rps,
      certificado_digital_path,
      certificado_digital_senha,
      certificado_digital_validade,
      socios // Array de sócios para cadastrar manualmente: [{ nome, cpf?, qualificacao? }]
    } = req.body;

    // Verificar se CNPJ já existe
    const existing = await query(
      'SELECT id FROM empresas WHERE cnpj = ?',
      [cnpj]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma empresa com este CNPJ'
      });
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

    // Preparar configurações fiscais
    const configuracoesFiscais = {
      determinacao_impostos_federacao: determinacao_impostos_federacao || 'Definido pelo Simples Nacional',
      determinacao_impostos_municipio: determinacao_impostos_municipio || 'Definido pelo Simples Nacional'
    };

    // Preparar senha do certificado (criptografar se fornecida)
    let certificadoSenhaHash = null;
    if (certificado_digital_senha) {
      certificadoSenhaHash = await bcrypt.hash(certificado_digital_senha, 10);
    }

    // Inserir nova empresa
    const result = await query(`
      INSERT INTO empresas (
        conta_id, cnpj, razao_social, nome_fantasia, inscricao_municipal,
        inscricao_estadual, regime_tributario, endereco, cidade, uf,
        cep, telefone, email, dados_fiscais, nfeio_empresa_id,
        aliquota_iss, serie_rps, numero_rps, certificado_digital_path,
        certificado_digital_senha, certificado_digital_validade, configuracoes_fiscais
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      conta_id, cnpj, razao_social, nome_fantasia, inscricao_municipal,
      inscricao_estadual, regime_tributario, endereco, cidade, uf,
      cep, telefone, email, JSON.stringify(dados_fiscais), nfeio_empresa_id,
      aliquota_iss || 2.01, serie_rps || '1', numero_rps || 1,
      certificado_digital_path || null, certificadoSenhaHash, certificado_digital_validade || null,
      JSON.stringify(configuracoesFiscais)
    ]);

    const empresaId = result.insertId;

    // Se foram fornecidos sócios, criar pessoas e vincular como sócios
    if (Array.isArray(socios) && socios.length > 0) {
      console.log(`📝 Criando ${socios.length} sócio(s) para a empresa ${empresaId}...`);
      
      for (const socio of socios) {
        try {
          const nomeCompleto = socio.nome || socio.nome_completo || '';
          const cpf = socio.cpf ? socio.cpf.replace(/[^\d]/g, '') : null;
          
          if (!nomeCompleto) {
            console.warn('⚠️ Sócio sem nome, pulando...');
            continue;
          }
          
          let pessoaId = null;
          
          // Se tem CPF, verificar se pessoa já existe
          if (cpf && cpf.length === 11) {
            const [pessoaExistente] = await query(
              'SELECT id FROM pessoas WHERE cpf = ?',
              [cpf]
            );
            
            if (pessoaExistente) {
              pessoaId = pessoaExistente.id;
              console.log(`✅ Pessoa já existe com CPF ${cpf}, usando ID ${pessoaId}`);
            }
          }
          
          // Se não encontrou pessoa existente, criar nova
          if (!pessoaId) {
            const pessoaResult = await query(`
              INSERT INTO pessoas (
                nome_completo, cpf, email, telefone, registro_profissional, status
              ) VALUES (?, ?, ?, ?, ?, 'ativo')
            `, [
              nomeCompleto,
              cpf || null,
              socio.email || null,
              socio.telefone || null,
              socio.registro_profissional || null
            ]);
            
            pessoaId = pessoaResult.insertId;
            console.log(`✅ Pessoa criada com ID ${pessoaId} para sócio ${nomeCompleto}`);
          }
          
          // Vincular pessoa à empresa como sócio
          const tipoVinculo = 'SOCIO';
          const percentualParticipacao = socio.percentual_participacao || null;
          
          // Verificar se vínculo já existe
          const [vinculoExistente] = await query(
            'SELECT id FROM pessoa_empresa WHERE empresa_id = ? AND pessoa_id = ?',
            [empresaId, pessoaId]
          );
          
          if (vinculoExistente) {
            // Atualizar vínculo existente
            await query(`
              UPDATE pessoa_empresa SET
                tipo_vinculo = ?,
                percentual_participacao = ?,
                ativo = true,
                data_inicio = COALESCE(data_inicio, CURDATE())
              WHERE id = ?
            `, [tipoVinculo, percentualParticipacao, vinculoExistente.id]);
            console.log(`✅ Vínculo atualizado para pessoa ${pessoaId}`);
          } else {
            // Criar novo vínculo
            await query(`
              INSERT INTO pessoa_empresa (
                empresa_id, pessoa_id, tipo_vinculo, percentual_participacao, data_inicio, ativo
              ) VALUES (?, ?, ?, ?, CURDATE(), true)
            `, [empresaId, pessoaId, tipoVinculo, percentualParticipacao]);
            console.log(`✅ Vínculo criado entre empresa ${empresaId} e pessoa ${pessoaId}`);
          }
        } catch (socioError) {
          console.error(`❌ Erro ao criar sócio ${socio.nome || 'sem nome'}:`, socioError);
          // Continuar com os próximos sócios mesmo se um falhar
        }
      }
      
      console.log(`✅ Processamento de sócios concluído para empresa ${empresaId}`);
    }

    // Buscar empresa criada
    const [empresa] = await query(`
      SELECT 
        e.*,
        c.nome_conta
      FROM empresas e
      LEFT JOIN contas c ON e.conta_id = c.id
      WHERE e.id = ?
    `, [empresaId]);

    res.status(201).json({
      success: true,
      message: 'Empresa criada com sucesso',
      data: { empresa }
    });

  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar empresa
const atualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      conta_id,
      cnpj,
      razao_social,
      nome_fantasia,
      inscricao_municipal,
      inscricao_estadual,
      regime_tributario,
      endereco,
      cidade,
      uf,
      cep,
      telefone,
      email,
      dados_fiscais,
      nfeio_empresa_id,
      status,
      // Novos campos de configurações fiscais
      determinacao_impostos_federacao,
      determinacao_impostos_municipio,
      aliquota_iss,
      serie_rps,
      numero_rps,
      certificado_digital_path,
      certificado_digital_senha,
      certificado_digital_validade,
      socios // Array de sócios para atualizar: [{ nome, cpf?, qualificacao?, registro_profissional?, pessoa_id? }]
    } = req.body;

    // Verificar se empresa existe
    const existing = await query(
      'SELECT id FROM empresas WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Verificar se CNPJ já existe em outra empresa
    if (cnpj) {
      const duplicate = await query(
        'SELECT id FROM empresas WHERE cnpj = ? AND id != ?',
        [cnpj, id]
      );

      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma empresa com este CNPJ'
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

    // Preparar configurações fiscais se fornecidas
    let configuracoesFiscaisUpdate = null;
    if (determinacao_impostos_federacao !== undefined || determinacao_impostos_municipio !== undefined) {
      // Buscar configurações atuais
      const [empresaAtual] = await query('SELECT configuracoes_fiscais FROM empresas WHERE id = ?', [id]);
      const configAtual = empresaAtual?.configuracoes_fiscais ? JSON.parse(empresaAtual.configuracoes_fiscais) : {};
      
      configuracoesFiscaisUpdate = {
        ...configAtual,
        ...(determinacao_impostos_federacao !== undefined && { determinacao_impostos_federacao }),
        ...(determinacao_impostos_municipio !== undefined && { determinacao_impostos_municipio })
      };
    }

    // Preparar senha do certificado (criptografar se fornecida)
    let certificadoSenhaHash = null;
    if (certificado_digital_senha) {
      certificadoSenhaHash = await bcrypt.hash(certificado_digital_senha, 10);
    }

    // Atualizar empresa
    await query(`
      UPDATE empresas SET
        conta_id = COALESCE(?, conta_id),
        cnpj = COALESCE(?, cnpj),
        razao_social = COALESCE(?, razao_social),
        nome_fantasia = COALESCE(?, nome_fantasia),
        inscricao_municipal = COALESCE(?, inscricao_municipal),
        inscricao_estadual = COALESCE(?, inscricao_estadual),
        regime_tributario = COALESCE(?, regime_tributario),
        endereco = COALESCE(?, endereco),
        cidade = COALESCE(?, cidade),
        uf = COALESCE(?, uf),
        cep = COALESCE(?, cep),
        telefone = COALESCE(?, telefone),
        email = COALESCE(?, email),
        dados_fiscais = COALESCE(?, dados_fiscais),
        nfeio_empresa_id = COALESCE(?, nfeio_empresa_id),
        status = COALESCE(?, status),
        aliquota_iss = COALESCE(?, aliquota_iss),
        serie_rps = COALESCE(?, serie_rps),
        numero_rps = COALESCE(?, numero_rps),
        certificado_digital_path = COALESCE(?, certificado_digital_path),
        certificado_digital_senha = COALESCE(?, certificado_digital_senha),
        certificado_digital_validade = COALESCE(?, certificado_digital_validade),
        configuracoes_fiscais = COALESCE(?, configuracoes_fiscais)
      WHERE id = ?
    `, [
      conta_id, cnpj, razao_social, nome_fantasia, inscricao_municipal,
      inscricao_estadual, regime_tributario, endereco, cidade, uf,
      cep, telefone, email, dados_fiscais ? JSON.stringify(dados_fiscais) : null, 
      nfeio_empresa_id, status,
      aliquota_iss, serie_rps, numero_rps,
      certificado_digital_path, certificadoSenhaHash, certificado_digital_validade,
      configuracoesFiscaisUpdate ? JSON.stringify(configuracoesFiscaisUpdate) : null,
      id
    ]);

    // Se foram fornecidos sócios, atualizar vínculos
    if (Array.isArray(socios)) {
      console.log(`📝 Atualizando ${socios.length} sócio(s) para a empresa ${id}...`);
      
      // Buscar sócios atuais
      const sociosAtuais = await query(`
        SELECT pe.pessoa_id, p.cpf
        FROM pessoa_empresa pe
        JOIN pessoas p ON pe.pessoa_id = p.id
        WHERE pe.empresa_id = ? AND pe.tipo_vinculo = 'SOCIO' AND pe.ativo = true
      `, [id]);
      
      const sociosAtuaisIds = new Set(sociosAtuais.map(s => s.pessoa_id));
      const sociosEnviadosIds = new Set(socios.filter(s => s.pessoa_id).map(s => s.pessoa_id));
      
      // Desativar sócios que não estão mais na lista
      const sociosParaRemover = sociosAtuais.filter(s => !sociosEnviadosIds.has(s.pessoa_id));
      if (sociosParaRemover.length > 0) {
        const idsParaRemover = sociosParaRemover.map(s => s.pessoa_id);
        await query(`
          UPDATE pessoa_empresa SET ativo = false, data_fim = CURDATE()
          WHERE empresa_id = ? AND pessoa_id IN (${idsParaRemover.map(() => '?').join(',')})
        `, [id, ...idsParaRemover]);
        console.log(`✅ ${sociosParaRemover.length} sócio(s) desativado(s)`);
      }
      
      // Adicionar/atualizar sócios
      for (const socio of socios) {
        try {
          const nomeCompleto = socio.nome || socio.nome_completo || '';
          const cpf = socio.cpf ? socio.cpf.replace(/[^\d]/g, '') : null;
          
          if (!nomeCompleto) {
            console.warn('⚠️ Sócio sem nome, pulando...');
            continue;
          }
          
          let pessoaId = socio.pessoa_id || null;
          
          // Se tem pessoa_id, usar diretamente
          if (pessoaId) {
            // Atualizar dados da pessoa se necessário
            if (socio.registro_profissional) {
              await query(`
                UPDATE pessoas SET registro_profissional = ? WHERE id = ?
              `, [socio.registro_profissional, pessoaId]);
            }
          } else if (cpf && cpf.length === 11) {
            // Se tem CPF, verificar se pessoa já existe
            const [pessoaExistente] = await query(
              'SELECT id FROM pessoas WHERE cpf = ?',
              [cpf]
            );
            
            if (pessoaExistente) {
              pessoaId = pessoaExistente.id;
              // Atualizar dados da pessoa
              await query(`
                UPDATE pessoas SET 
                  nome_completo = ?,
                  registro_profissional = COALESCE(?, registro_profissional)
                WHERE id = ?
              `, [nomeCompleto, socio.registro_profissional || null, pessoaId]);
            }
          }
          
          // Se não encontrou pessoa existente, criar nova
          if (!pessoaId) {
            const pessoaResult = await query(`
              INSERT INTO pessoas (
                nome_completo, cpf, email, telefone, registro_profissional, status
              ) VALUES (?, ?, ?, ?, ?, 'ativo')
            `, [
              nomeCompleto,
              cpf || null,
              socio.email || null,
              socio.telefone || null,
              socio.registro_profissional || null
            ]);
            
            pessoaId = pessoaResult.insertId;
            console.log(`✅ Pessoa criada com ID ${pessoaId} para sócio ${nomeCompleto}`);
          }
          
          // Vincular pessoa à empresa como sócio
          const tipoVinculo = 'SOCIO';
          const percentualParticipacao = socio.percentual_participacao || null;
          
          // Verificar se vínculo já existe
          const [vinculoExistente] = await query(
            'SELECT id FROM pessoa_empresa WHERE empresa_id = ? AND pessoa_id = ?',
            [id, pessoaId]
          );
          
          if (vinculoExistente) {
            // Atualizar vínculo existente
            await query(`
              UPDATE pessoa_empresa SET
                tipo_vinculo = ?,
                percentual_participacao = ?,
                ativo = true,
                data_inicio = COALESCE(data_inicio, CURDATE()),
                data_fim = NULL
              WHERE id = ?
            `, [tipoVinculo, percentualParticipacao, vinculoExistente.id]);
            console.log(`✅ Vínculo atualizado para pessoa ${pessoaId}`);
          } else {
            // Criar novo vínculo
            await query(`
              INSERT INTO pessoa_empresa (
                empresa_id, pessoa_id, tipo_vinculo, percentual_participacao, data_inicio, ativo
              ) VALUES (?, ?, ?, ?, CURDATE(), true)
            `, [id, pessoaId, tipoVinculo, percentualParticipacao]);
            console.log(`✅ Vínculo criado entre empresa ${id} e pessoa ${pessoaId}`);
          }
        } catch (socioError) {
          console.error(`❌ Erro ao atualizar sócio ${socio.nome || 'sem nome'}:`, socioError);
          // Continuar com os próximos sócios mesmo se um falhar
        }
      }
      
      console.log(`✅ Processamento de sócios concluído para empresa ${id}`);
    }

    // Buscar empresa atualizada
    const [empresa] = await query(`
      SELECT 
        e.*,
        c.nome_conta
      FROM empresas e
      LEFT JOIN contas c ON e.conta_id = c.id
      WHERE e.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      data: { empresa }
    });

  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar empresa
const deletarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se empresa existe
    const existing = await query(
      'SELECT id FROM empresas WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Verificar se há notas fiscais vinculadas
    const notas = await query(
      'SELECT COUNT(*) as count FROM notas_fiscais WHERE empresa_id = ?',
      [id]
    );

    if (notas[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir empresa com notas fiscais vinculadas'
      });
    }

    // Deletar empresa (cascade vai deletar vínculos)
    await query('DELETE FROM empresas WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Empresa excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Gerenciar pessoas vinculadas à empresa
const gerenciarPessoas = async (req, res) => {
  try {
    const { id } = req.params;
    const { pessoas, acao } = req.body; // acao: 'adicionar', 'remover' ou 'atualizar'
    // pessoas pode ser array de IDs ou array de objetos { pessoa_id, tipo_vinculo, percentual_participacao }

    console.log('🔗 gerenciarPessoas - Recebido:', {
      empresa_id: id,
      acao,
      pessoas_count: Array.isArray(pessoas) ? pessoas.length : 0,
      pessoas: pessoas
    });

    // Verificar se empresa existe
    const empresa = await query(
      'SELECT id FROM empresas WHERE id = ?',
      [id]
    );

    if (empresa.length === 0) {
      console.error('❌ Empresa não encontrada:', id);
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    if (acao === 'adicionar' || acao === 'atualizar') {
      // Normalizar pessoas para array de objetos
      const pessoasArray = Array.isArray(pessoas) 
        ? pessoas.map(p => typeof p === 'number' || typeof p === 'string' 
            ? { pessoa_id: p, tipo_vinculo: 'SOCIO', percentual_participacao: null }
            : p)
        : [];

      // Se for 'atualizar', primeiro desativar todos os vínculos existentes que não estão na nova lista
      if (acao === 'atualizar') {
        const pessoaIdsNaLista = pessoasArray.map(p => p.pessoa_id || p.id).filter(Boolean);
        
        if (pessoaIdsNaLista.length > 0) {
          // Desativar vínculos que não estão mais na lista
          const placeholders = pessoaIdsNaLista.map(() => '?').join(',');
          await query(
            `UPDATE pessoa_empresa SET ativo = false, data_fim = CURDATE() 
             WHERE empresa_id = ? AND pessoa_id NOT IN (${placeholders}) AND ativo = true`,
            [id, ...pessoaIdsNaLista]
          );
        } else {
          // Se a lista está vazia, desativar todos os vínculos
          await query(
            `UPDATE pessoa_empresa SET ativo = false, data_fim = CURDATE() 
             WHERE empresa_id = ? AND ativo = true`,
            [id]
          );
        }
      }

      // Adicionar ou atualizar vínculos
      for (const pessoa of pessoasArray) {
        const pessoaId = pessoa.pessoa_id || pessoa.id;
        const tipoVinculo = pessoa.tipo_vinculo || 'SOCIO';
        const percentualParticipacao = pessoa.percentual_participacao || null;

        if (!pessoaId) {
          console.warn('⚠️ Pessoa sem ID ignorada:', pessoa);
          continue;
        }

        console.log(`📝 Processando vínculo: empresa_id=${id}, pessoa_id=${pessoaId}, tipo=${tipoVinculo}`);

        // Verificar se vínculo já existe (mesmo que desativado)
        const existing = await query(
          'SELECT id, ativo FROM pessoa_empresa WHERE empresa_id = ? AND pessoa_id = ?',
          [id, pessoaId]
        );

        if (existing.length > 0) {
          // Atualizar vínculo existente (reativar se estava desativado)
          const result = await query(`
            UPDATE pessoa_empresa SET
              tipo_vinculo = ?,
              percentual_participacao = ?,
              ativo = true,
              data_inicio = COALESCE(data_inicio, CURDATE()),
              data_fim = NULL
            WHERE empresa_id = ? AND pessoa_id = ?
          `, [tipoVinculo, percentualParticipacao, id, pessoaId]);
          console.log(`✅ Vínculo atualizado: empresa_id=${id}, pessoa_id=${pessoaId}, affectedRows=${result.affectedRows}`);
        } else {
          // Criar novo vínculo
          const result = await query(`
            INSERT INTO pessoa_empresa (empresa_id, pessoa_id, tipo_vinculo, percentual_participacao, data_inicio, ativo)
            VALUES (?, ?, ?, ?, CURDATE(), true)
          `, [id, pessoaId, tipoVinculo, percentualParticipacao]);
          console.log(`✅ Novo vínculo criado: empresa_id=${id}, pessoa_id=${pessoaId}, insertId=${result.insertId}`);
        }
      }
    } else if (acao === 'remover') {
      // Remover vínculos - pessoas pode ser array de IDs
      const pessoaIds = Array.isArray(pessoas) 
        ? pessoas.map(p => typeof p === 'object' ? (p.pessoa_id || p.id) : p)
        : [];
      
      if (pessoaIds.length > 0) {
        // Desativar vínculos ao invés de deletar
        const placeholders = pessoaIds.map(() => '?').join(',');
        await query(
          `UPDATE pessoa_empresa SET ativo = false, data_fim = CURDATE() WHERE empresa_id = ? AND pessoa_id IN (${placeholders})`,
          [id, ...pessoaIds]
        );
      }
    }

    // Verificar vínculos salvos
    const vinculosSalvos = await query(
      'SELECT pessoa_id, tipo_vinculo, ativo FROM pessoa_empresa WHERE empresa_id = ? AND ativo = true',
      [id]
    );
    console.log(`✅ Vínculos salvos para empresa ${id}:`, vinculosSalvos.length, vinculosSalvos);

    res.json({
      success: true,
      message: 'Vínculos atualizados com sucesso',
      data: {
        vinculos_count: vinculosSalvos.length,
        vinculos: vinculosSalvos
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerenciar pessoas:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obter sócios de uma empresa
const obterSocios = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se empresa existe
    const empresa = await query(
      'SELECT id, razao_social FROM empresas WHERE id = ?',
      [id]
    );

    if (empresa.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Buscar sócios da empresa
    const socios = await query(`
      SELECT 
        p.id, p.nome_completo, p.cpf, p.email, p.telefone, p.registro_profissional, p.especialidade,
        pe.tipo_vinculo, pe.percentual_participacao, pe.data_inicio, pe.data_fim
      FROM pessoas p
      JOIN pessoa_empresa pe ON p.id = pe.pessoa_id
      WHERE pe.empresa_id = ? AND pe.tipo_vinculo = 'SOCIO' AND pe.ativo = true AND p.status = 'ativo'
      ORDER BY p.nome_completo
    `, [id]);

    res.json({
      success: true,
      data: { 
        empresa: empresa[0],
        socios 
      }
    });

  } catch (error) {
    console.error('Erro ao obter sócios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Sincronizar empresas com NFe.io
const sincronizarComNFeio = async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronização com NFe.io...');
    
    // Buscar empresas da NFe.io
    const resultadoNFeio = await nfeioService.listarEmpresas();
    
    console.log('📡 Resultado da API NFe.io:', {
      success: resultadoNFeio.success,
      total: resultadoNFeio.total,
      hasError: !!resultadoNFeio.error,
      statusCode: resultadoNFeio.statusCode
    });

    if (!resultadoNFeio.success) {
      console.error('❌ Erro ao buscar empresas da NFe.io:', resultadoNFeio.error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar empresas da NFe.io',
        error: resultadoNFeio.error,
        statusCode: resultadoNFeio.statusCode
      });
    }

    // Buscar empresas locais
    const empresasLocais = await query(`
      SELECT id, cnpj, razao_social, nfeio_empresa_id
      FROM empresas
      WHERE status = 'ativa'
    `);

    console.log(`📊 Empresas locais encontradas: ${empresasLocais.length}`);

    // Criar mapa de empresas locais por CNPJ
    const empresasPorCnpj = {};
    empresasLocais.forEach(emp => {
      if (emp.cnpj) {
        const cnpjLimpo = emp.cnpj.replace(/[^\d]/g, '');
        empresasPorCnpj[cnpjLimpo] = emp;
      }
    });

    // Processar empresas da NFe.io
    const empresasNFeio = resultadoNFeio.empresas || [];
    console.log(`📊 Empresas NFe.io encontradas: ${empresasNFeio.length}`);
    
    const comparacao = {
      para_importar: [], // Existem na NFe.io mas não localmente
      para_atualizar: [], // Existem em ambos
      apenas_local: [] // Existem localmente mas não na NFe.io
    };

    empresasNFeio.forEach(empNFeio => {
      try {
        // A API NFe.io retorna CNPJ no campo federalTaxNumber (número sem formatação)
        // Tentar diferentes campos possíveis
        let cnpjNFeio = '';
        
        if (empNFeio.federalTaxNumber) {
          // federalTaxNumber é um número, converter para string
          cnpjNFeio = String(empNFeio.federalTaxNumber);
        } else if (empNFeio.cnpj) {
          cnpjNFeio = String(empNFeio.cnpj);
        } else if (empNFeio.documento) {
          cnpjNFeio = String(empNFeio.documento);
        } else if (empNFeio.cpf_cnpj) {
          cnpjNFeio = String(empNFeio.cpf_cnpj);
        } else if (empNFeio.cpfCnpj) {
          cnpjNFeio = String(empNFeio.cpfCnpj);
        } else if (empNFeio.tax_id) {
          cnpjNFeio = String(empNFeio.tax_id);
        } else if (empNFeio.taxId) {
          cnpjNFeio = String(empNFeio.taxId);
        }
        
        const cnpjLimpo = cnpjNFeio ? String(cnpjNFeio).replace(/[^\d]/g, '') : '';
        
        console.log('🔍 Processando empresa NFe.io:', {
          id: empNFeio.id || empNFeio._id,
          name: empNFeio.name,
          federalTaxNumber: empNFeio.federalTaxNumber,
          cnpj_extraido: cnpjLimpo,
          cnpj_tamanho: cnpjLimpo.length
        });
        
        if (!cnpjLimpo || cnpjLimpo.length < 11) {
          console.warn('⚠️ Empresa NFe.io sem CNPJ válido:', {
            empresa: empNFeio.name,
            federalTaxNumber: empNFeio.federalTaxNumber,
            cnpj_limpo: cnpjLimpo
          });
          // Mesmo sem CNPJ, adicionar para importar (pode ser preenchido depois)
          comparacao.para_importar.push({
            nfeio: empNFeio,
            cnpj: cnpjLimpo || 'SEM_CNPJ'
          });
          return;
        }
        
        const empLocal = empresasPorCnpj[cnpjLimpo];

        if (empLocal) {
          comparacao.para_atualizar.push({
            local: empLocal,
            nfeio: empNFeio,
            cnpj: cnpjLimpo
          });
          delete empresasPorCnpj[cnpjLimpo];
        } else {
          comparacao.para_importar.push({
            nfeio: empNFeio,
            cnpj: cnpjLimpo
          });
        }
      } catch (err) {
        console.error('❌ Erro ao processar empresa NFe.io:', err);
        console.error('   Empresa:', JSON.stringify(empNFeio, null, 2));
        console.error('   Stack:', err.stack);
      }
    });

    // Empresas que existem apenas localmente
    Object.values(empresasPorCnpj).forEach(empLocal => {
      comparacao.apenas_local.push({
        local: empLocal,
        cnpj: empLocal.cnpj ? empLocal.cnpj.replace(/[^\d]/g, '') : ''
      });
    });

    console.log('✅ Sincronização concluída:', {
      para_importar: comparacao.para_importar.length,
      para_atualizar: comparacao.para_atualizar.length,
      apenas_local: comparacao.apenas_local.length
    });

    res.json({
      success: true,
      data: comparacao,
      total_nfeio: empresasNFeio.length,
      total_local: empresasLocais.length
    });

  } catch (error) {
    console.error('❌ Erro ao sincronizar empresas com NFe.io:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Importar empresa específica da NFe.io
const importarEmpresaNFeio = async (req, res) => {
  try {
    const { nfeio_empresa_id } = req.body;

    if (!nfeio_empresa_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da empresa na NFe.io não informado'
      });
    }

    // Buscar empresa na NFe.io
    const resultadoNFeio = await nfeioService.obterEmpresa(nfeio_empresa_id);

    if (!resultadoNFeio.success || !resultadoNFeio.empresa) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada na NFe.io',
        error: resultadoNFeio.error
      });
    }

    const empNFeio = resultadoNFeio.empresa;

    console.log('📥 Dados da empresa NFe.io recebidos:', JSON.stringify(empNFeio, null, 2));

    // Extrair CNPJ do campo federalTaxNumber (formato da API NFe.io)
    let cnpjLimpo = '';
    if (empNFeio.federalTaxNumber) {
      cnpjLimpo = String(empNFeio.federalTaxNumber).replace(/[^\d]/g, '');
    } else if (empNFeio.cnpj) {
      cnpjLimpo = String(empNFeio.cnpj).replace(/[^\d]/g, '');
    } else if (empNFeio.documento) {
      cnpjLimpo = String(empNFeio.documento).replace(/[^\d]/g, '');
    }

    if (!cnpjLimpo || cnpjLimpo.length < 11) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ não encontrado nos dados da empresa NFe.io',
        error: 'A empresa não possui CNPJ válido'
      });
    }

    console.log('🔍 CNPJ extraído:', cnpjLimpo);

    // Validar formato do CNPJ (deve ter 14 dígitos)
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({
        success: false,
        message: `CNPJ inválido: deve ter 14 dígitos, encontrado ${cnpjLimpo.length}`,
        cnpj_recebido: cnpjLimpo
      });
    }

    // Extrair dados da empresa no formato da API NFe.io
    const razaoSocial = (empNFeio.name || empNFeio.razao_social || empNFeio.razaoSocial || '').trim();
    
    if (!razaoSocial) {
      return res.status(400).json({
        success: false,
        message: 'Razão social não encontrada nos dados da empresa NFe.io'
      });
    }
    
    const nomeFantasia = (empNFeio.tradeName || empNFeio.nome_fantasia || empNFeio.nomeFantasia || razaoSocial).trim();
    const cidade = (empNFeio.address?.city?.name || empNFeio.address?.municipio || empNFeio.municipio || '').trim() || null;
    const uf = (empNFeio.address?.state || empNFeio.uf || '').trim().toUpperCase() || null;
    const cepRaw = empNFeio.address?.postalCode ? String(empNFeio.address.postalCode).replace(/[^\d]/g, '') : '';
    const cep = cepRaw.length >= 8 ? cepRaw.substring(0, 8) : null;
    
    // Montar endereço completo
    let endereco = '';
    if (empNFeio.address) {
      const parts = [];
      if (empNFeio.address.street) parts.push(empNFeio.address.street);
      if (empNFeio.address.number) parts.push(empNFeio.address.number);
      if (empNFeio.address.additionalInformation) parts.push(empNFeio.address.additionalInformation);
      endereco = parts.join(', ').trim() || null;
    } else {
      endereco = null;
    }
    
    // Inscrição municipal é obrigatória - usar valor padrão se não estiver disponível
    const inscricaoMunicipal = (empNFeio.municipalTaxId 
      || empNFeio.inscricao_municipal 
      || empNFeio.inscricaoMunicipal 
      || empNFeio.municipalTaxNumber
      || 'PENDENTE').trim(); // Valor padrão para campo obrigatório

    console.log('📋 Dados extraídos e normalizados:', {
      cnpj: cnpjLimpo,
      cnpj_length: cnpjLimpo.length,
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      inscricao_municipal: inscricaoMunicipal,
      cidade,
      uf,
      cep,
      endereco
    });

    // Verificar se já existe empresa local com mesmo CNPJ
    const empresasExistentes = await query(`
      SELECT id FROM empresas WHERE cnpj = ?
    `, [cnpjLimpo]);

    if (empresasExistentes.length > 0) {
      // Atualizar empresa existente
      const empresaId = empresasExistentes[0].id;
      console.log('🔄 Atualizando empresa existente:', empresaId);
      
      try {
        await query(`
          UPDATE empresas SET
            nfeio_empresa_id = ?,
            razao_social = ?,
            nome_fantasia = ?,
            inscricao_municipal = ?,
            cidade = ?,
            uf = ?,
            cep = ?,
            endereco = ?
          WHERE id = ?
        `, [
          nfeio_empresa_id,
          razaoSocial,
          nomeFantasia,
          inscricaoMunicipal,
          cidade || null,
          uf || null,
          cep || null,
          endereco || null,
          empresaId
        ]);
      } catch (dbError) {
        console.error('❌ Erro ao atualizar empresa no banco:', dbError);
        console.error('   SQL Error Code:', dbError.code);
        console.error('   SQL Error Message:', dbError.message);
        throw dbError;
      }

      return res.json({
        success: true,
        message: 'Empresa atualizada com sucesso',
        data: { id: empresaId, nfeio_empresa_id }
      });
    } else {
      // Criar nova empresa
      console.log('➕ Criando nova empresa');
      
      try {
        const resultado = await query(`
          INSERT INTO empresas (
            cnpj, razao_social, nome_fantasia, inscricao_municipal,
            cidade, uf, cep, endereco, nfeio_empresa_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativa')
        `, [
          cnpjLimpo,
          razaoSocial,
          nomeFantasia,
          inscricaoMunicipal,
          cidade || null,
          uf || null,
          cep || null,
          endereco || null,
          nfeio_empresa_id
        ]);

        console.log('✅ Empresa criada com ID:', resultado.insertId);

        return res.json({
          success: true,
          message: 'Empresa importada com sucesso',
          data: { id: resultado.insertId, nfeio_empresa_id }
        });
      } catch (dbError) {
        console.error('❌ Erro ao inserir empresa no banco:', dbError);
        console.error('   SQL Error Code:', dbError.code);
        console.error('   SQL Error Message:', dbError.message);
        console.error('   SQL State:', dbError.sqlState);
        console.error('   SQL:', dbError.sql);
        throw dbError; // Re-throw para ser capturado pelo catch externo
      }
    }

  } catch (error) {
    console.error('❌ Erro ao importar empresa da NFe.io:', error);
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Sincronizar empresa específica (enviar para NFe.io ou atualizar)
const atualizarEmpresaNFeio = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar empresa local
    const [empresa] = await query(`
      SELECT * FROM empresas WHERE id = ?
    `, [id]);

    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Sincronizar com NFe.io
    const resultado = await nfeioService.sincronizarEmpresa({
      ...empresa,
      nfeio_empresa_id: empresa.nfeio_empresa_id
    });

    if (!resultado.success) {
      // Atualizar status de sincronização como erro
      await query(`
        UPDATE empresas SET 
          nfeio_sync_status = 'erro',
          nfeio_sync_at = NOW()
        WHERE id = ?
      `, [id]);

      return res.status(500).json({
        success: false,
        message: 'Erro ao sincronizar empresa com NFe.io',
        error: resultado.error
      });
    }

    // Atualizar nfeio_empresa_id e status de sincronização na empresa local
    if (resultado.nfeio_empresa_id) {
      await query(`
        UPDATE empresas SET 
          nfeio_empresa_id = ?,
          nfeio_sync_status = 'sincronizada',
          nfeio_sync_at = NOW()
        WHERE id = ?
      `, [resultado.nfeio_empresa_id, id]);
    }

    res.json({
      success: true,
      message: 'Empresa sincronizada com sucesso',
      data: {
        id: empresa.id,
        nfeio_empresa_id: resultado.nfeio_empresa_id,
        sync_status: 'sincronizada'
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar empresa na NFe.io:', error);
    
    // Atualizar status de sincronização como erro
    try {
      await query(`
        UPDATE empresas SET 
          nfeio_sync_status = 'erro',
          nfeio_sync_at = NOW()
        WHERE id = ?
      `, [req.params.id]);
    } catch (updateError) {
      console.error('Erro ao atualizar status de sincronização:', updateError);
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar empresas da NFe.io
const listarEmpresasNFeio = async (req, res) => {
  try {
    const resultado = await nfeioService.listarEmpresas();

    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar empresas da NFe.io',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: {
        empresas: resultado.empresas || [],
        total: resultado.total || 0
      }
    });

  } catch (error) {
    console.error('Erro ao listar empresas da NFe.io:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Upload de certificado digital
const uploadCertificadoDigital = async (req, res) => {
  try {
    const { id } = req.params;
    const { senha, validade } = req.body;
    const file = req.file;

    // Verificar se empresa existe
    const [empresa] = await query('SELECT id FROM empresas WHERE id = ?', [id]);
    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Validar arquivo
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo de certificado não fornecido'
      });
    }

    // Validar extensão
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pfx', '.p12'].includes(ext)) {
      // Remover arquivo inválido
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Formato de arquivo inválido. Use .pfx ou .p12'
      });
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande. Tamanho máximo: 5MB'
      });
    }

    // Criar diretório de certificados se não existir
    const certificadosDir = path.join(process.cwd(), 'uploads', 'certificados');
    await fs.mkdir(certificadosDir, { recursive: true });
    
    // Remover certificado antigo se existir
    if (empresa.certificado_digital_path) {
      try {
        await fs.unlink(empresa.certificado_digital_path).catch(() => {});
      } catch (oldFileError) {
        // Ignorar erro se arquivo não existir
      }
    }
    
    const fileName = `certificado_${id}_${Date.now()}${ext}`;
    const filePath = path.join(certificadosDir, fileName);
    await fs.rename(file.path, filePath);

    // Criptografar senha se fornecida
    let senhaHash = null;
    if (senha && senha.trim()) {
      senhaHash = await bcrypt.hash(senha, 10);
    }

    // Atualizar empresa com informações do certificado
    await query(`
      UPDATE empresas SET
        certificado_digital_path = ?,
        certificado_digital_senha = COALESCE(?, certificado_digital_senha),
        certificado_digital_validade = ?
      WHERE id = ?
    `, [filePath, senhaHash, validade || null, id]);

    res.json({
      success: true,
      message: 'Certificado digital enviado com sucesso',
      data: {
        path: filePath,
        validade: validade || null
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upload de certificado:', error);
    
    // Limpar arquivo se houver erro
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Buscar códigos de serviço e CNAEs frequentemente usados por uma empresa
const buscarCodigosFrequentes = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID da empresa é obrigatório'
      });
    }

    // Buscar códigos de serviço e CNAEs das notas fiscais emitidas por esta empresa
    // Agrupar por código e contar quantas vezes foi usado
    const codigosServico = await query(`
      SELECT 
        codigo_servico_municipal as codigo,
        COUNT(*) as vezes_usado,
        MAX(data_emissao) as ultima_uso
      FROM notas_fiscais
      WHERE empresa_id = ? 
        AND codigo_servico_municipal IS NOT NULL 
        AND codigo_servico_municipal != ''
        AND status IN ('AUTORIZADA', 'PROCESSANDO')
      GROUP BY codigo_servico_municipal
      ORDER BY vezes_usado DESC, ultima_uso DESC
      LIMIT 20
    `, [id]);

    const cnaes = await query(`
      SELECT 
        cnae_code as codigo,
        COUNT(*) as vezes_usado,
        MAX(data_emissao) as ultima_uso
      FROM notas_fiscais
      WHERE empresa_id = ? 
        AND cnae_code IS NOT NULL 
        AND cnae_code != ''
        AND status IN ('AUTORIZADA', 'PROCESSANDO')
      GROUP BY cnae_code
      ORDER BY vezes_usado DESC, ultima_uso DESC
      LIMIT 20
    `, [id]);

    // Buscar também códigos padrão da empresa
    const [empresa] = await query('SELECT codigo_servico_municipal, cnae_code FROM empresas WHERE id = ?', [id]);
    
    const codigosServicoList = codigosServico.map(c => c.codigo);
    const cnaesList = cnaes.map(c => c.codigo);

    // Adicionar códigos padrão da empresa se não estiverem na lista
    if (empresa?.codigo_servico_municipal && !codigosServicoList.includes(empresa.codigo_servico_municipal)) {
      codigosServicoList.unshift(empresa.codigo_servico_municipal);
    }
    if (empresa?.cnae_code && !cnaesList.includes(empresa.cnae_code)) {
      cnaesList.unshift(empresa.cnae_code);
    }

    res.json({
      success: true,
      data: {
        codigos_servico: codigosServicoList,
        cnaes: cnaesList,
        detalhes: {
          codigos_servico: codigosServico,
          cnaes: cnaes
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar códigos frequentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarEmpresas,
  obterEmpresa,
  buscarCodigosFrequentes,
  criarEmpresa,
  atualizarEmpresa,
  deletarEmpresa,
  gerenciarPessoas,
  obterSocios,
  sincronizarComNFeio,
  importarEmpresaNFeio,
  atualizarEmpresaNFeio,
  listarEmpresasNFeio,
  uploadCertificadoDigital
};
