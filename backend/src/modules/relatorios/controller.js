const { query } = require('../../config/database');

// Relatório de faturamento mensal
const relatorioFaturamento = async (req, res) => {
  try {
    const { periodo = '2024-01', empresa_id } = req.query;
    
    // Construir filtro de empresa se fornecido
    const empresaFilter = empresa_id ? 'AND nf.empresa_id = ?' : '';
    const empresaParams = empresa_id ? [empresa_id] : [];

    // Dados mensais dos últimos 6 meses
    const monthlyData = await query(`
      SELECT 
        DATE_FORMAT(STR_TO_DATE(mes_competencia, '%Y-%m'), '%b') as mes,
        COUNT(*) as notas,
        SUM(valor_total) as valor,
        COUNT(DISTINCT empresa_id) as clientes
      FROM notas_fiscais nf
      WHERE nf.mes_competencia >= DATE_SUB(STR_TO_DATE(?, '%Y-%m'), INTERVAL 5 MONTH)
        AND nf.mes_competencia <= ?
        AND nf.status = 'AUTORIZADA'
        ${empresaFilter}
      GROUP BY nf.mes_competencia
      ORDER BY nf.mes_competencia DESC
    `, [periodo, periodo, ...empresaParams]);

    // Distribuição por cliente
    const clientDistribution = await query(`
      SELECT 
        e.razao_social as name,
        SUM(nf.valor_total) as value,
        COUNT(nf.id) as count
      FROM notas_fiscais nf
      JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.mes_competencia = ? AND nf.status = 'AUTORIZADA'
        ${empresaFilter}
      GROUP BY e.id, e.razao_social
      ORDER BY value DESC
      LIMIT 10
    `, [periodo, ...empresaParams]);

    // Distribuição por status
    const statusDistribution = await query(`
      SELECT 
        CASE 
          WHEN nf.status = 'AUTORIZADA' THEN 'Autorizadas'
          WHEN nf.status = 'PROCESSANDO' THEN 'Processando'
          WHEN nf.status = 'CANCELADA' THEN 'Canceladas'
          WHEN nf.status = 'ERRO' THEN 'Com Erro'
        END as name,
        COUNT(*) as value,
        CASE 
          WHEN nf.status = 'AUTORIZADA' THEN '#2CDE1F'
          WHEN nf.status = 'PROCESSANDO' THEN '#97D5FF'
          WHEN nf.status = 'CANCELADA' THEN '#E53E3E'
          WHEN nf.status = 'ERRO' THEN '#042938'
        END as color
      FROM notas_fiscais nf
      WHERE nf.mes_competencia = ?
        ${empresaFilter}
      GROUP BY nf.status
    `, [periodo, ...empresaParams]);

    // Top empresas (prestadoras)
    const topEmpresas = await query(`
      SELECT 
        e.razao_social as nome,
        COUNT(nf.id) as notas,
        SUM(nf.valor_total) as valor,
        ROUND((SUM(nf.valor_total) / (SELECT SUM(valor_total) FROM notas_fiscais nf2 WHERE nf2.mes_competencia = ? AND nf2.status = 'AUTORIZADA' ${empresaFilter.replace('nf.', 'nf2.')})) * 100, 1) as percentual
      FROM notas_fiscais nf
      JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.mes_competencia = ? AND nf.status = 'AUTORIZADA'
        ${empresaFilter}
      GROUP BY e.id, e.razao_social
      ORDER BY valor DESC
      LIMIT 5
    `, [periodo, ...empresaParams, periodo, ...empresaParams]);

    // Estatísticas por sócio
    const sociosEstatisticas = await query(`
      SELECT 
        p.id,
        p.nome_completo as nome,
        COUNT(DISTINCT nf.id) as total_notas,
        SUM(nfp.valor_prestado) as valor_total_emitido,
        AVG(nfp.percentual_participacao) as percentual_medio,
        COUNT(DISTINCT nf.empresa_id) as empresas_envolvidas,
        ROUND((SUM(nfp.valor_prestado) / (SELECT SUM(valor_prestado) FROM nota_fiscal_pessoa nfp2 
          JOIN notas_fiscais nf2 ON nfp2.nota_fiscal_id = nf2.id 
          WHERE nf2.mes_competencia = ? AND nf2.status = 'AUTORIZADA' ${empresaFilter.replace('nf.', 'nf2.')})) * 100, 2) as proporcao_percentual
      FROM nota_fiscal_pessoa nfp
      JOIN notas_fiscais nf ON nfp.nota_fiscal_id = nf.id
      JOIN pessoas p ON nfp.pessoa_id = p.id
      WHERE nf.mes_competencia = ? AND nf.status = 'AUTORIZADA'
        ${empresaFilter}
      GROUP BY p.id, p.nome_completo
      ORDER BY valor_total_emitido DESC
    `, [periodo, ...empresaParams, periodo, ...empresaParams]);

    // Dados por município
    const municipios = await query(`
      SELECT 
        CONCAT(e.cidade, '/', e.uf) as cidade,
        COUNT(nf.id) as notas,
        SUM(nf.valor_total) as valor
      FROM notas_fiscais nf
      JOIN empresas e ON nf.empresa_id = e.id
      WHERE nf.mes_competencia = ? AND nf.status = 'AUTORIZADA'
        ${empresaFilter}
      GROUP BY e.cidade, e.uf
      ORDER BY valor DESC
      LIMIT 10
    `, [periodo, ...empresaParams]);

    // Calcular totais para KPIs
    const totalFaturamento = topEmpresas.reduce((sum, emp) => sum + parseFloat(emp.valor || 0), 0);
    const totalNotas = topEmpresas.reduce((sum, emp) => sum + parseInt(emp.notas || 0), 0);
    const totalSocios = sociosEstatisticas.length;
    const totalValorSocios = sociosEstatisticas.reduce((sum, s) => sum + parseFloat(s.valor_total_emitido || 0), 0);
    
    // Calcular crescimento (comparar com mês anterior)
    const [ano, mes] = periodo.split('-');
    const mesAnterior = new Date(parseInt(ano), parseInt(mes) - 2, 1);
    const periodoAnterior = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;
    
    const [dadosAnterior] = await query(`
      SELECT 
        COUNT(*) as total_notas,
        SUM(valor_total) as faturamento_total
      FROM notas_fiscais nf
      WHERE nf.mes_competencia = ? AND nf.status = 'AUTORIZADA'
        ${empresaFilter}
    `, [periodoAnterior, ...empresaParams]);
    
    const faturamentoAnterior = parseFloat(dadosAnterior?.faturamento_total || 0);
    const notasAnterior = parseInt(dadosAnterior?.total_notas || 0);
    
    const crescimentoFaturamento = faturamentoAnterior > 0 
      ? ((totalFaturamento - faturamentoAnterior) / faturamentoAnterior * 100).toFixed(1)
      : 0;
    const crescimentoNotas = notasAnterior > 0
      ? ((totalNotas - notasAnterior) / notasAnterior * 100).toFixed(1)
      : 0;
    
    // Taxa de sucesso
    const [statusCounts] = await query(`
      SELECT 
        COUNT(CASE WHEN nf.status = 'AUTORIZADA' THEN 1 END) as autorizadas,
        COUNT(*) as total
      FROM notas_fiscais nf
      WHERE nf.mes_competencia = ?
        ${empresaFilter}
    `, [periodo, ...empresaParams]);
    
    const taxaSucesso = statusCounts?.total > 0 
      ? ((statusCounts.autorizadas / statusCounts.total) * 100).toFixed(1)
      : 0;

    // Evolução mensal (últimos 6 meses)
    const evolucaoMensal = monthlyData.map(item => ({
      mes: item.mes,
      valor: parseFloat(item.valor || 0)
    }));

    res.json({
      success: true,
      data: {
        faturamento_total: totalFaturamento,
        crescimento_faturamento: parseFloat(crescimentoFaturamento),
        total_notas: totalNotas,
        crescimento_notas: parseFloat(crescimentoNotas),
        taxa_sucesso: parseFloat(taxaSucesso),
        evolucao_mensal: evolucaoMensal,
        distribuicao_status: statusDistribution.map(s => ({
          name: s.name,
          value: parseInt(s.value || 0),
          color: s.color
        })),
        top_empresas: topEmpresas.map(emp => ({
          nome: emp.nome,
          notas: parseInt(emp.notas || 0),
          valor: parseFloat(emp.valor || 0),
          percentual: parseFloat(emp.percentual || 0)
        })),
        faturamento_municipio: municipios.map(m => ({
          cidade: m.cidade,
          notas: parseInt(m.notas || 0),
          valor: parseFloat(m.valor || 0)
        })),
        socios_estatisticas: sociosEstatisticas.map(s => ({
          id: s.id,
          nome: s.nome,
          total_notas: parseInt(s.total_notas || 0),
          valor_total_emitido: parseFloat(s.valor_total_emitido || 0),
          percentual_medio: parseFloat(s.percentual_medio || 0),
          empresas_envolvidas: parseInt(s.empresas_envolvidas || 0),
          proporcao_percentual: parseFloat(s.proporcao_percentual || 0)
        }))
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Relatório de clientes
const relatorioClientes = async (req, res) => {
  try {
    const { periodo = '2024-01' } = req.query;

    // Estatísticas gerais de clientes
    const stats = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_contas,
        COUNT(DISTINCT e.id) as total_empresas,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT t.id) as total_tomadores
      FROM contas c
      LEFT JOIN empresas e ON c.id = e.conta_id
      LEFT JOIN empresa_pessoa ep ON e.id = ep.empresa_id
      LEFT JOIN pessoas p ON ep.pessoa_id = p.id
      LEFT JOIN tomadores t ON c.id = t.conta_id
      WHERE c.status = 'ATIVO'
    `);

    // Contas por tipo de relacionamento
    const contasPorTipo = await query(`
      SELECT 
        tipo_relacionamento,
        COUNT(*) as quantidade
      FROM contas
      WHERE status = 'ATIVO'
      GROUP BY tipo_relacionamento
    `);

    // Empresas por status
    const empresasPorStatus = await query(`
      SELECT 
        status,
        COUNT(*) as quantidade
      FROM empresas
      GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        stats: stats[0],
        contasPorTipo,
        empresasPorStatus
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Relatório operacional
const relatorioOperacional = async (req, res) => {
  try {
    const { periodo = '2024-01' } = req.query;

    // Notas por status no período
    const notasPorStatus = await query(`
      SELECT 
        status,
        COUNT(*) as quantidade,
        SUM(valor_total) as valor_total
      FROM notas_fiscais
      WHERE mes_competencia = ?
      GROUP BY status
    `, [periodo]);

    // Notas por dia do mês
    const notasPorDia = await query(`
      SELECT 
        DAY(created_at) as dia,
        COUNT(*) as quantidade
      FROM notas_fiscais
      WHERE mes_competencia = ?
      GROUP BY DAY(created_at)
      ORDER BY dia
    `, [periodo]);

    // Tempo médio de processamento
    const tempoProcessamento = await query(`
      SELECT 
        AVG(TIMESTAMPDIFF(HOUR, created_at, data_emissao)) as tempo_medio_horas
      FROM notas_fiscais
      WHERE mes_competencia = ? 
        AND status = 'AUTORIZADA' 
        AND data_emissao IS NOT NULL
    `, [periodo]);

    res.json({
      success: true,
      data: {
        notasPorStatus,
        notasPorDia,
        tempoProcessamento: tempoProcessamento[0]
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório operacional:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  relatorioFaturamento,
  relatorioClientes,
  relatorioOperacional
};
