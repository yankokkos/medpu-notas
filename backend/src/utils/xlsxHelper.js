const XLSX = require('xlsx');

/**
 * Gera um arquivo XLSX modelo para emissão de notas em lote
 */
function gerarModeloXLSX() {
  // Criar dados de exemplo - usando CPF/CNPJ como chave principal
  // IMPORTANTE: Se o tomador já está cadastrado, preencha apenas tomador_cpf_cnpj
  // Se o tomador NÃO está cadastrado, preencha todos os campos do tomador (nome, CPF/CNPJ, CEP, endereço completo)
  const dadosExemplo = [
    {
      // ===== EMPRESA (PRESTADOR) - OBRIGATÓRIO =====
      empresa_cnpj: '12.345.678/0001-90', // CNPJ da empresa que emite a nota (sem pontos/traços)
      
      // ===== TOMADOR - OBRIGATÓRIO =====
      // Opção 1: Se tomador JÁ está cadastrado, preencha apenas:
      tomador_cpf_cnpj: '123.456.789-00', // CPF ou CNPJ do tomador cadastrado
      
      // Opção 2: Se tomador NÃO está cadastrado, preencha TODOS os campos abaixo:
      tomador_nome: 'João da Silva', // Nome completo ou Razão Social
      tomador_cep: '49020-450', // CEP (será usado para buscar endereço automaticamente)
      tomador_logradouro: 'Rua Exemplo', // Rua, Avenida, etc
      tomador_numero: '123', // Número
      tomador_complemento: 'Apto 101', // Complemento (opcional)
      tomador_bairro: 'Centro', // Bairro
      tomador_cidade: 'Aracaju', // Cidade
      tomador_uf: 'SE', // UF (2 letras)
      
      // ===== SÓCIOS E VALORES - OBRIGATÓRIO =====
      socios_cpfs: '111.222.333-44,222.333.444-55', // CPFs dos sócios separados por vírgula
      valores: '1000.00,2000.00', // Valores na mesma ordem dos CPFs, separados por vírgula
      
      // ===== COMPETÊNCIA E SERVIÇO - OBRIGATÓRIO =====
      mes_competencia: '2024-01', // Formato: YYYY-MM
      codigo_servico_municipal: '12345', // Código do serviço no município
      cnae_code: '6201-5/00', // CNAE do prestador para esta nota
      
      // ===== CAMPOS OPCIONAIS =====
      codigo_servico_federal: '', // Código federal do serviço (LC 116)
      nbs_code: '', // Código NBS
      modelo_discriminacao_id: '', // ID do modelo de discriminação (opcional)
      aliquota_iss: '', // Alíquota ISS (opcional)
      discriminacao: 'Descrição detalhada do serviço prestado' // Discriminação do serviço
    }
  ];

  // Criar workbook
  const workbook = XLSX.utils.book_new();
  
  // Criar worksheet com dados
  const worksheet = XLSX.utils.json_to_sheet(dadosExemplo);
  
  // Ajustar largura das colunas para melhor visualização
  const colWidths = [
    { wch: 20 }, // empresa_cnpj
    { wch: 18 }, // tomador_cpf_cnpj
    { wch: 25 }, // tomador_nome
    { wch: 12 }, // tomador_cep
    { wch: 25 }, // tomador_logradouro
    { wch: 10 }, // tomador_numero
    { wch: 15 }, // tomador_complemento
    { wch: 15 }, // tomador_bairro
    { wch: 15 }, // tomador_cidade
    { wch: 5 },  // tomador_uf
    { wch: 30 }, // socios_cpfs
    { wch: 20 }, // valores
    { wch: 15 }, // mes_competencia
    { wch: 20 }, // codigo_servico_municipal
    { wch: 12 }, // cnae_code
    { wch: 20 }, // codigo_servico_federal
    { wch: 12 }, // nbs_code
    { wch: 15 }, // modelo_discriminacao_id
    { wch: 12 }, // aliquota_iss
    { wch: 40 }  // discriminacao
  ];
  worksheet['!cols'] = colWidths;
  
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

  // Colunas obrigatórias (usar CPF/CNPJ como chave principal)
  const colunasObrigatorias = [
    { opcoes: ['empresa_cnpj'], nome: 'Empresa (CNPJ)' },
    { opcoes: ['tomador_cpf_cnpj', 'tomador_nome'], nome: 'Tomador (CPF/CNPJ ou dados completos)' },
    { opcoes: ['socios_cpfs'], nome: 'Sócios (CPFs)' },
    { opcoes: ['valores'], nome: 'Valores' },
    { opcoes: ['mes_competencia'], nome: 'Mês Competência' },
    { opcoes: ['codigo_servico_municipal'], nome: 'Código Serviço Municipal' },
    { opcoes: ['cnae_code'], nome: 'CNAE' }
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

