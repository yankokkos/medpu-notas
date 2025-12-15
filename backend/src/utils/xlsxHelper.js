const XLSX = require('xlsx');

/**
 * Gera um arquivo XLSX modelo para emissão de notas em lote
 */
function gerarModeloXLSX() {
  // Definir colunas do modelo
  const colunas = [
    'empresa_id',
    'empresa_cnpj',
    'tomador_id',
    'tomador_cpf_cnpj',
    'socios_ids',
    'socios_cpfs',
    'valores',
    'mes_competencia',
    'modelo_discriminacao_id',
    'codigo_servico_municipal',
    'codigo_servico_federal',
    'cnae_code',
    'nbs_code',
    'aliquota_iss',
    'discriminacao'
  ];

  // Criar dados de exemplo
  const dadosExemplo = [
    {
      empresa_id: '1',
      empresa_cnpj: '',
      tomador_id: '1',
      tomador_cpf_cnpj: '',
      socios_ids: '1,2',
      socios_cpfs: '',
      valores: '1000.00,2000.00',
      mes_competencia: '2024-01',
      modelo_discriminacao_id: '',
      codigo_servico_municipal: '',
      codigo_servico_federal: '',
      cnae_code: '',
      nbs_code: '',
      aliquota_iss: '',
      discriminacao: ''
    }
  ];

  // Criar workbook
  const workbook = XLSX.utils.book_new();
  
  // Criar worksheet com dados
  const worksheet = XLSX.utils.json_to_sheet(dadosExemplo);
  
  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Notas');
  
  // Gerar buffer do arquivo
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
}

/**
 * Lê e parseia um arquivo XLSX
 */
function lerXLSX(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(worksheet);
    
    return dados;
  } catch (error) {
    throw new Error(`Erro ao ler arquivo XLSX: ${error.message}`);
  }
}

/**
 * Valida a estrutura do XLSX (verifica se tem colunas obrigatórias)
 */
function validarEstruturaXLSX(dados) {
  const erros = [];
  
  if (!Array.isArray(dados) || dados.length === 0) {
    erros.push('O arquivo está vazio ou não contém dados válidos');
    return { valido: false, erros };
  }

  // Colunas obrigatórias (pelo menos uma das opções deve estar presente)
  const colunasObrigatorias = [
    { opcoes: ['empresa_id', 'empresa_cnpj'], nome: 'Empresa' },
    { opcoes: ['tomador_id', 'tomador_cpf_cnpj'], nome: 'Tomador' },
    { opcoes: ['socios_ids', 'socios_cpfs'], nome: 'Sócios' },
    { opcoes: ['valores'], nome: 'Valores' },
    { opcoes: ['mes_competencia'], nome: 'Mês Competência' }
  ];

  // Verificar primeira linha como referência
  const primeiraLinha = dados[0];
  const chaves = Object.keys(primeiraLinha);

  colunasObrigatorias.forEach(({ opcoes, nome }) => {
    const temAlguma = opcoes.some(col => chaves.includes(col));
    if (!temAlguma) {
      erros.push(`Coluna obrigatória não encontrada: ${nome} (deve ter uma das: ${opcoes.join(', ')})`);
    }
  });

  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Normaliza dados do XLSX para o formato esperado pelo sistema
 */
function normalizarDadosXLSX(dados) {
  return dados.map((linha, index) => {
    const normalizado = {
      linha: index + 1, // Linha no arquivo (1-indexed)
      empresa_id: linha.empresa_id || null,
      empresa_cnpj: linha.empresa_cnpj || null,
      tomador_id: linha.tomador_id || null,
      tomador_cpf_cnpj: linha.tomador_cpf_cnpj || null,
      socios_ids: linha.socios_ids ? String(linha.socios_ids).split(',').map(s => s.trim()).filter(s => s) : [],
      socios_cpfs: linha.socios_cpfs ? String(linha.socios_cpfs).split(',').map(s => s.trim()).filter(s => s) : [],
      valores: linha.valores ? String(linha.valores).split(',').map(v => parseFloat(v.trim()) || 0) : [],
      mes_competencia: linha.mes_competencia || null,
      modelo_discriminacao_id: linha.modelo_discriminacao_id || null,
      codigo_servico_municipal: linha.codigo_servico_municipal || null,
      codigo_servico_federal: linha.codigo_servico_federal || null,
      cnae_code: linha.cnae_code || null,
      nbs_code: linha.nbs_code || null,
      aliquota_iss: linha.aliquota_iss ? parseFloat(linha.aliquota_iss) : null,
      discriminacao: linha.discriminacao || null
    };

    return normalizado;
  });
}

module.exports = {
  gerarModeloXLSX,
  lerXLSX,
  validarEstruturaXLSX,
  normalizarDadosXLSX
};

