const { query } = require('../../config/database');

// Busca unificada em todas as entidades
const buscarUnificado = async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: {
          contas: [],
          empresas: [],
          pessoas: [],
          tomadores: [],
          notas: []
        }
      });
    }

    const searchTerm = `%${q}%`;

    // Buscar contas
    const contas = await query(`
      SELECT 
        id,
        nome_conta as title,
        CONCAT('Conta ', status.toLowerCase(), ' • ', COUNT(DISTINCT e.id), ' empresas • ', COUNT(DISTINCT p.id), ' pessoas') as subtitle,
        'conta' as type,
        'Contas' as category,
        'contas' as url,
        JSON_OBJECT('status', status) as metadata
      FROM contas c
      LEFT JOIN empresas e ON c.id = e.conta_id AND e.status = 'ativa'
      LEFT JOIN empresa_pessoa ep ON e.id = ep.empresa_id
      LEFT JOIN pessoas p ON ep.pessoa_id = p.id AND p.status = 'ativo'
      WHERE c.nome_conta LIKE ? OR c.email_principal LIKE ?
      GROUP BY c.id
      ORDER BY c.nome_conta
      LIMIT ?
    `, [searchTerm, searchTerm, parseInt(limit)]);

    // Buscar empresas
    const empresas = await query(`
      SELECT 
        e.id,
        e.razao_social as title,
        CONCAT('CNPJ: ', e.cnpj, ' • ', e.cidade, '/', e.uf) as subtitle,
        'empresa' as type,
        'Empresas' as category,
        'empresas' as url,
        JSON_OBJECT('status', e.status) as metadata
      FROM empresas e
      WHERE e.razao_social LIKE ? OR e.cnpj LIKE ? OR e.nome_fantasia LIKE ?
      ORDER BY e.razao_social
      LIMIT ?
    `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

    // Buscar pessoas
    const pessoas = await query(`
      SELECT 
        p.id,
        p.nome_completo as title,
        CONCAT('CPF: ', p.cpf, ' • ', COALESCE(GROUP_CONCAT(e.razao_social SEPARATOR ', '), 'Sem empresa')) as subtitle,
        'pessoa' as type,
        'Pessoas' as category,
        'pessoas' as url,
        JSON_OBJECT('status', p.status) as metadata
      FROM pessoas p
      LEFT JOIN empresa_pessoa ep ON p.id = ep.pessoa_id
      LEFT JOIN empresas e ON ep.empresa_id = e.id AND e.status = 'ativa'
      WHERE p.nome_completo LIKE ? OR p.cpf LIKE ? OR p.email LIKE ?
      GROUP BY p.id
      ORDER BY p.nome_completo
      LIMIT ?
    `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

    // Buscar tomadores
    const tomadores = await query(`
      SELECT 
        t.id,
        t.nome_razao_social as title,
        CONCAT(t.cnpj_cpf, ' • ', CASE WHEN t.iss_retido THEN 'ISS Retido' ELSE 'ISS Não Retido' END) as subtitle,
        'tomador' as type,
        'Tomadores' as category,
        'tomadores' as url,
        JSON_OBJECT('status', t.status) as metadata
      FROM tomadores t
      WHERE t.nome_razao_social LIKE ? OR t.cnpj_cpf LIKE ? OR t.email LIKE ?
      ORDER BY t.nome_razao_social
      LIMIT ?
    `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

    // Buscar notas fiscais
    const notas = await query(`
      SELECT 
        nf.id,
        CONCAT('NFS-e #', nf.id) as title,
        CONCAT(e.razao_social, ' → ', t.nome_razao_social, ' • ', nf.status) as subtitle,
        'nota' as type,
        'Notas Fiscais' as category,
        'notas-fiscais' as url,
        JSON_OBJECT('status', nf.status, 'valor', nf.valor_total, 'data', DATE(nf.created_at)) as metadata
      FROM notas_fiscais nf
      JOIN empresas e ON nf.empresa_id = e.id
      JOIN tomadores t ON nf.tomador_id = t.id
      WHERE e.razao_social LIKE ? OR t.nome_razao_social LIKE ? OR nf.id LIKE ?
      ORDER BY nf.created_at DESC
      LIMIT ?
    `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

    res.json({
      success: true,
      data: {
        contas: contas.map(c => ({ ...c, id: `conta-${c.id}` })),
        empresas: empresas.map(e => ({ ...e, id: `empresa-${e.id}` })),
        pessoas: pessoas.map(p => ({ ...p, id: `pessoa-${p.id}` })),
        tomadores: tomadores.map(t => ({ ...t, id: `tomador-${t.id}` })),
        notas: notas.map(n => ({ ...n, id: `nota-${n.id}` }))
      }
    });

  } catch (error) {
    console.error('Erro na busca unificada:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  buscarUnificado
};
