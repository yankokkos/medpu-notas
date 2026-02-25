const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

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

// Configuração da API NFe.io
const NFEIO_API_URL = process.env.NFEIO_API_URL || 'https://api.nfe.io';
const NFEIO_API_KEY = process.env.NFEIO_API_KEY;

if (!NFEIO_API_KEY) {
  console.warn('⚠️  NFEIO_API_KEY não configurada. A integração com NFe.io não funcionará.');
}

/**
 * Cliente para integração com a API NFe.io
 */
class NFeIOService {
  constructor() {
    this.apiUrl = NFEIO_API_URL;
    this.apiKey = NFEIO_API_KEY;
    // URL base para cálculo de impostos (legalentity.api.nfe.io)
    this.legalEntityApiUrl = process.env.NFEIO_LEGALENTITY_API_URL || 'https://legalentity.api.nfe.io';
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey
      }
    });
    // Cliente separado para legalentity API (cálculo de impostos)
    this.legalEntityClient = axios.create({
      baseURL: this.legalEntityApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey
      }
    });
  }

  /**
   * Monta o payload para emissão de NFS-e na NFe.io
   * @param {Object} notaData - Dados da nota fiscal do banco
   * @param {Object} empresaData - Dados da empresa emissora
   * @param {Object} tomadorData - Dados do tomador
   * @param {Array} sociosData - Array de sócios/prestadores
   * @returns {Object} Payload formatado para a API NFe.io
   */
  montarPayloadEmissao(notaData, empresaData, tomadorData, sociosData) {
    // Log de debug para CNAE
    console.log('🔍 Debug CNAE - montarPayloadEmissao:', {
      notaData_cnae_code: notaData.cnae_code,
      notaData_cnae: notaData.cnae,
      notaData_cnaeCode: notaData.cnaeCode,
      empresaData_cnae_code: empresaData.cnae_code,
      empresaData_cnae: empresaData.cnae,
      empresaData_cnaeCode: empresaData.cnaeCode
    });
    
    // Extrair mês e ano da competência (YYYY-MM)
    const [ano, mes] = notaData.mes_competencia.split('-');
    
    // Obter código de serviço municipal (obrigatório)
    // Prioridade: notaData > empresaData
    // Tentar múltiplos nomes de campos para compatibilidade
    const cityServiceCode = notaData.codigo_servico_municipal 
      || notaData.codigo_servico 
      || notaData.cityServiceCode
      || empresaData.codigo_servico_municipal 
      || empresaData.codigo_servico 
      || empresaData.cityServiceCode
      || '';
    
    if (!cityServiceCode || cityServiceCode.trim() === '') {
      // Log detalhado para debug
      console.error('❌ Código de serviço municipal não encontrado:', {
        notaData: {
          codigo_servico_municipal: notaData.codigo_servico_municipal,
          codigo_servico: notaData.codigo_servico,
          cityServiceCode: notaData.cityServiceCode
        },
        empresaData: {
          codigo_servico_municipal: empresaData.codigo_servico_municipal,
          codigo_servico: empresaData.codigo_servico,
          cityServiceCode: empresaData.cityServiceCode,
          id: empresaData.id,
          razao_social: empresaData.razao_social
        }
      });
      throw new Error('Código de serviço municipal (cityServiceCode) é obrigatório. Configure o código de serviço municipal na empresa ou informe na nota.');
    }
    
    // Montar payload conforme documentação oficial da NFe.io
    // Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-post/
    // Campos obrigatórios conforme documentação:
    // - borrower.name (string) - Nome/Razão Social
    // - borrower.federalTaxNumber (integer) - CNPJ ou CPF
    // - borrower.address.country (string) - Sigla do País (BRA)
    // - cityServiceCode (string) - Código do serviço no município
    // - description (string) - Descrição dos serviços
    // - servicesAmount (number) - Valor dos serviços
    
    // Validar campos obrigatórios
    if (!notaData.discriminacao_final || notaData.discriminacao_final.trim() === '') {
      throw new Error('Descrição dos serviços (description) é obrigatória');
    }
    
    if (!notaData.valor_total || parseFloat(notaData.valor_total) <= 0) {
      throw new Error('Valor dos serviços (servicesAmount) é obrigatório e deve ser maior que zero');
    }
    
    if (!tomadorData.nome_razao_social || tomadorData.nome_razao_social.trim() === '') {
      throw new Error('Nome/Razão Social do tomador (borrower.name) é obrigatório');
    }
    
    if (!tomadorData.cnpj_cpf || tomadorData.cnpj_cpf.replace(/[^\d]/g, '').length === 0) {
      throw new Error('CNPJ/CPF do tomador (borrower.federalTaxNumber) é obrigatório');
    }
    
    // Montar payload apenas com campos obrigatórios
    // Validar e preparar CNPJ/CPF
    const cnpjCpfOriginal = String(tomadorData.cnpj_cpf || '').trim();
    const cnpjCpfLimpo = cnpjCpfOriginal.replace(/[^\d]/g, '');
    
    if (!cnpjCpfLimpo || cnpjCpfLimpo.length < 11 || cnpjCpfLimpo.length > 14) {
      throw new Error(`CNPJ/CPF do tomador inválido: deve ter entre 11 e 14 dígitos. Recebido: "${cnpjCpfOriginal}" (${cnpjCpfLimpo.length} dígitos após limpeza)`);
    }
    
    // Validar formato básico
    if (cnpjCpfLimpo.length === 11) {
      // CPF: não pode ser todos os dígitos iguais
      if (/^(\d)\1{10}$/.test(cnpjCpfLimpo)) {
        throw new Error(`CPF inválido: todos os dígitos são iguais: ${cnpjCpfLimpo}`);
      }
    } else if (cnpjCpfLimpo.length === 14) {
      // CNPJ: não pode ser todos os dígitos iguais
      if (/^(\d)\1{13}$/.test(cnpjCpfLimpo)) {
        throw new Error(`CNPJ inválido: todos os dígitos são iguais: ${cnpjCpfLimpo}`);
      }
    }
    
    // Converter para número, mas manter como string se houver perda de precisão (zeros à esquerda)
    // A API NFe.io aceita string para federalTaxNumber (integer<int64> pode ser representado como string)
    let federalTaxNumber;
    try {
      const numeroTentativa = Number(cnpjCpfLimpo);
      
      // Verificar se a conversão manteve todos os dígitos (sem perda de precisão)
      if (String(numeroTentativa) !== cnpjCpfLimpo) {
        // Se perdeu dígitos (zeros à esquerda), manter como string
        // A API aceita string para números grandes
        federalTaxNumber = cnpjCpfLimpo;
        console.log(`⚠️ CNPJ/CPF com zero à esquerda detectado. Mantendo como string: "${cnpjCpfLimpo}"`);
      } else {
        // Sem perda de precisão, pode usar número
        federalTaxNumber = numeroTentativa;
      }
      
      // Validação final
      if (typeof federalTaxNumber === 'string') {
        // Validar que é uma string numérica válida
        if (!/^\d+$/.test(federalTaxNumber) || federalTaxNumber.length < 11 || federalTaxNumber.length > 14) {
          throw new Error('CNPJ/CPF inválido como string');
        }
      } else {
        // Validar número
        if (isNaN(federalTaxNumber) || federalTaxNumber <= 0) {
          throw new Error('CNPJ/CPF inválido após conversão');
        }
      }
    } catch (error) {
      throw new Error(`Erro ao processar CNPJ/CPF do tomador: ${error.message}. CNPJ/CPF original: "${cnpjCpfOriginal}", limpo: "${cnpjCpfLimpo}"`);
    }
    
    // Log para debug
    console.log(`📋 CNPJ/CPF do tomador: "${cnpjCpfOriginal}" -> "${cnpjCpfLimpo}" -> ${federalTaxNumber} (${typeof federalTaxNumber})`);
    
    // Limpar descrição removendo informações de tributos (Lei 12.741/2012)
    // Remover qualquer texto relacionado a tributos aproximados, IBPT, empresometro, etc.
    let descricaoLimpa = notaData.discriminacao_final.trim();
    
    // Remover padrões comuns de texto sobre tributos
    // Padrão 1: "CONFORME LEI 12.741/2012" seguido de qualquer coisa até o final da frase
    descricaoLimpa = descricaoLimpa.replace(/\s*CONFORME\s+LEI\s+12\.?\s*741\/2012[^.]*\./gi, '');
    
    // Padrão 2: "o valor aproximado dos tributos" seguido de qualquer coisa até o final da frase
    descricaoLimpa = descricaoLimpa.replace(/\s*o\s+valor\s+aproximado\s+dos\s+tributos[^.]*\./gi, '');
    descricaoLimpa = descricaoLimpa.replace(/\s*valor\s+aproximado\s+dos\s+tributos[^.]*\./gi, '');
    
    // Padrão 3: "FONTE: IBPT" ou "FONTE: empresometro"
    descricaoLimpa = descricaoLimpa.replace(/\s*FONTE\s*:\s*IBPT[^.]*\./gi, '');
    descricaoLimpa = descricaoLimpa.replace(/\s*FONTE\s*:\s*empresometro[^.]*\./gi, '');
    descricaoLimpa = descricaoLimpa.replace(/\s*FONTE\s*:\s*IBPT\/empresometro[^.]*\./gi, '');
    
    // Padrão 4: Texto entre parênteses contendo IBPT ou empresometro
    descricaoLimpa = descricaoLimpa.replace(/\s*\([^)]*IBPT[^)]*\)/gi, '');
    descricaoLimpa = descricaoLimpa.replace(/\s*\([^)]*empresometro[^)]*\)/gi, '');
    
    // Padrão 5: Percentuais e valores de tributos (ex: "R$ 1,65 (16,45%)")
    descricaoLimpa = descricaoLimpa.replace(/\s*R\$\s*\d+[.,]\d+\s*\(\d+[.,]\d+%\)/gi, '');
    
    // Padrão 6: Códigos como "(21.1.F)" que podem aparecer após informações de tributos
    descricaoLimpa = descricaoLimpa.replace(/\s*\(\d+\.\d+\.\w+\)/g, '');
    
    // Limpar espaços múltiplos e quebras de linha extras
    descricaoLimpa = descricaoLimpa.replace(/\s+/g, ' ').trim();
    
    // Remover pontos finais duplicados ou isolados
    descricaoLimpa = descricaoLimpa.replace(/\.\s*\./g, '.');
    descricaoLimpa = descricaoLimpa.replace(/^\s*\.\s*/, '');
    
    const payload = {
      // Campos obrigatórios conforme documentação NFe.io
      borrower: {
        name: tomadorData.nome_razao_social.trim(),
        federalTaxNumber: federalTaxNumber, // integer<int64> ou string (aceita ambos)
        address: {
          country: 'BRA' // Obrigatório conforme documentação
        }
      },
      cityServiceCode: cityServiceCode, // string, required
      description: descricaoLimpa, // string, required (limpa de informações de tributos)
      servicesAmount: parseFloat(notaData.valor_total) // number<double>, required
    };
    
    // Adicionar campos opcionais apenas se tiverem valor
    if (tomadorData.email && tomadorData.email.trim()) {
      payload.borrower.email = tomadorData.email.trim();
    }
    
    if (tomadorData.telefone && tomadorData.telefone.trim()) {
      payload.borrower.phoneNumber = tomadorData.telefone.trim();
    }
    
    // Endereço completo - OBRIGATÓRIO pela API nfe.io (código do município é obrigatório)
    // Sempre incluir endereço, mesmo que parcial
    const cidadeNome = tomadorData.cidade || tomadorData.municipio || '';
    const codigoMunicipio = tomadorData.codigo_municipio 
      || tomadorData.codigo_ibge 
      || tomadorData.codigo_municipio_ibge
      || '';
    
    // Validar que cidade e código do município estão presentes
    if (!cidadeNome || cidadeNome.trim() === '') {
      console.warn('⚠️ Cidade do tomador não informada');
    }
    
    if (!codigoMunicipio || codigoMunicipio.trim() === '') {
      console.error('❌ Código do município do tomador não informado - OBRIGATÓRIO pela API nfe.io');
      throw new Error('Código do município do tomador é obrigatório. O campo codigo_municipio (código IBGE) deve ser informado no endereço do tomador.');
    }
    
    // Sempre incluir endereço no payload
    payload.borrower.address = {
      country: 'BRA',
      ...(tomadorData.logradouro || tomadorData.endereco ? {
        street: (tomadorData.logradouro || tomadorData.endereco || '').trim()
      } : {}),
      ...(tomadorData.numero ? {
        number: tomadorData.numero.trim()
      } : {}),
      ...(tomadorData.complemento ? {
        additionalInformation: tomadorData.complemento.trim()
      } : {}),
      ...(tomadorData.bairro ? {
        district: tomadorData.bairro.trim()
      } : {}),
      // Cidade e código do município são OBRIGATÓRIOS
      city: {
        name: cidadeNome.trim() || 'Não informado',
        code: codigoMunicipio.trim() // Código IBGE do município - OBRIGATÓRIO
      },
      ...(tomadorData.uf ? {
        state: tomadorData.uf.trim()
      } : {}),
      ...(tomadorData.cep ? {
        postalCode: tomadorData.cep.replace(/[^\d]/g, '')
      } : {})
    };
    
    console.log('📍 Endereço do tomador incluído:', {
      cidade: cidadeNome,
      codigoMunicipio: codigoMunicipio,
      uf: tomadorData.uf,
      logradouro: tomadorData.logradouro || tomadorData.endereco
    });
    
    // Campos opcionais adicionais
    if (empresaData.aliquota_iss) {
      payload.issRate = parseFloat(empresaData.aliquota_iss);
    }
    
    if (notaData.id) {
      payload.externalId = notaData.id;
    }
    
    // CNAE (obrigatório em produção)
    // Prioridade: notaData > empresaData
    const cnaeCode = notaData.cnae_code 
      || notaData.cnae 
      || notaData.cnaeCode
      || empresaData.cnae_code 
      || empresaData.cnae 
      || empresaData.cnaeCode
      || '';
    
    console.log('🔍 CNAE encontrado:', {
      cnaeCode,
      origem: notaData.cnae_code ? 'notaData.cnae_code' : 
              notaData.cnae ? 'notaData.cnae' :
              notaData.cnaeCode ? 'notaData.cnaeCode' :
              empresaData.cnae_code ? 'empresaData.cnae_code' :
              empresaData.cnae ? 'empresaData.cnae' :
              empresaData.cnaeCode ? 'empresaData.cnaeCode' : 'NÃO ENCONTRADO'
    });
    
    // Verificar se está em ambiente de produção
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.NFEIO_API_URL?.includes('test') || process.env.NFEIO_API_URL?.includes('sandbox');
    
    // Em produção, CNAE é obrigatório e sempre deve ser enviado
    if (cnaeCode && cnaeCode.trim() !== '') {
      // Limpar CNAE (apenas números)
      const cnaeLimpo = cnaeCode.replace(/[^\d]/g, '');
      if (cnaeLimpo.length > 0) {
        payload.cnaeCode = cnaeLimpo; // Campo correto conforme documentação da API: cnaeCode (camelCase)
        console.log('✅ CNAE adicionado ao payload:', cnaeLimpo);
      } else {
        console.warn('⚠️ CNAE limpo está vazio após remover caracteres não numéricos');
      }
    } else if (!isTestEnvironment) {
      // Em produção sem CNAE, lançar erro (validação já deveria ter capturado isso)
      console.error('❌ CNAE não fornecido em ambiente de produção!');
      throw new Error('CNAE é obrigatório em ambiente de produção. O campo cnae_code deve ser informado.');
    } else {
      console.log('ℹ️ CNAE não informado (ambiente de teste)');
    }
    
    // Código Federal do Serviço (opcional)
    const federalServiceCode = notaData.codigo_servico_federal 
      || notaData.federalServiceCode
      || empresaData.codigo_servico_federal
      || '';
    
    if (federalServiceCode && federalServiceCode.trim() !== '') {
      payload.federalServiceCode = federalServiceCode.trim();
    }
    
    // Código NBS (opcional)
    const nbsCode = notaData.nbs_code 
      || notaData.nbsCode
      || empresaData.nbs_code
      || '';
    
    if (nbsCode && nbsCode.trim() !== '') {
      payload.nbsCode = nbsCode.trim();
    }

    return payload;
  }

  /**
   * Calcula impostos usando a API de Cálculo de Impostos da NFe.io
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/calculo-de-impostos-v1/calcula-os-impostos-de-uma-operacao/
   * @param {Object} dadosCalculo - Dados para cálculo
   * @param {number} dadosCalculo.valor_servico - Valor do serviço
   * @param {string} dadosCalculo.municipio_prestacao - Município de prestação do serviço
   * @param {string} dadosCalculo.codigo_servico - Código do serviço municipal
   * @param {string} dadosCalculo.tenant_id - ID do tenant (opcional, será extraído se não fornecido)
   * @returns {Promise<Object>} Resultado do cálculo de impostos
   */
  async calcularImpostos(dadosCalculo) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        console.warn('⚠️  NFEIO_API_KEY não configurada. Cálculo de impostos será estimado.');
        // Retornar cálculo estimado se API não estiver configurada
        return {
          success: true,
          estimado: true,
          valor_iss: dadosCalculo.valor_servico * 0.05, // Estimativa de 5%
          aliquota_iss: 5.0,
          base_calculo: dadosCalculo.valor_servico,
          valor_liquido: dadosCalculo.valor_servico * 0.95
        };
      }

      // Validar dados mínimos necessários
      if (!dadosCalculo.valor_servico || dadosCalculo.valor_servico <= 0) {
        console.warn('⚠️  Valor do serviço não informado ou inválido para cálculo de impostos.');
        return {
          success: false,
          estimado: true,
          valor_servico: dadosCalculo.valor_servico || 0,
          valor_iss: 0,
          valor_liquido: dadosCalculo.valor_servico || 0,
          aliquota_iss: 0,
          base_calculo: dadosCalculo.valor_servico || 0,
          message: 'Valor do serviço inválido. Cálculo será feito automaticamente pela NFe.io durante a emissão.'
        };
      }

      // Montar payload para a API de cálculo de impostos da NFe.io
      // Documentação: https://nfe.io/docs/desenvolvedores/rest-api/calculo-de-impostos-v1/calcula-os-impostos-de-uma-operacao/
      // Endpoint correto: POST /tax-rules/:tenantId/engine/calculate
      // O tenantId é o nfeio_empresa_id (ID da empresa na NFe.io)
      
      // Obter tenantId (nfeio_empresa_id)
      const tenantId = dadosCalculo.tenant_id || dadosCalculo.nfeio_empresa_id;
      
      if (!tenantId) {
        console.warn('⚠️  tenantId (nfeio_empresa_id) não fornecido. Cálculo de impostos requer empresa sincronizada com NFe.io.');
        return {
          success: true,
          estimado: true,
          valor_servico: dadosCalculo.valor_servico,
          valor_iss: 0,
          valor_liquido: dadosCalculo.valor_servico,
          aliquota_iss: 0,
          base_calculo: dadosCalculo.valor_servico,
          message: 'tenantId (nfeio_empresa_id) não fornecido. Cálculo será feito automaticamente pela NFe.io durante a emissão'
        };
      }

      // Mapear regime tributário para formato da API
      const mapearRegimeTributario = (regime) => {
        if (!regime) return 'NationalSimple';
        const regimeUpper = regime.toUpperCase();
        if (regimeUpper.includes('SIMPLES') || regimeUpper.includes('NACIONAL')) {
          return 'NationalSimple';
        }
        if (regimeUpper.includes('LUCRO REAL') || regimeUpper.includes('REAL')) {
          return 'RealProfit';
        }
        if (regimeUpper.includes('PRESUMIDO') || regimeUpper.includes('PRESUMIDO')) {
          return 'PresumedProfit';
        }
        if (regimeUpper.includes('MEI') || regimeUpper.includes('MICRO')) {
          return 'IndividualMicroEnterprise';
        }
        if (regimeUpper.includes('ISENTO') || regimeUpper.includes('ISENTA')) {
          return 'Exempt';
        }
        return 'NationalSimple'; // Default
      };

      // Mapear UF para formato da API (2 letras)
      const mapearUF = (uf) => {
        if (!uf) return 'SE'; // Default Sergipe
        return uf.toUpperCase().substring(0, 2);
      };

      // Montar payload conforme documentação da API
      // https://legalentity.api.nfe.io/tax-rules/:tenantId/engine/calculate
      const issuerTaxRegime = mapearRegimeTributario(dadosCalculo.empresa_regime_tributario);
      const recipientTaxRegime = mapearRegimeTributario(dadosCalculo.tomador_regime_tributario) || 'NationalSimple';
      const issuerState = mapearUF(dadosCalculo.empresa_uf || dadosCalculo.uf_empresa);
      const recipientState = mapearUF(dadosCalculo.tomador_uf || dadosCalculo.uf_tomador) || issuerState;

      const payloadCalculo = {
        issuer: {
          taxRegime: issuerTaxRegime,
          taxProfile: dadosCalculo.empresa_tax_profile || null,
          state: issuerState
        },
        recipient: {
          taxRegime: recipientTaxRegime,
          taxProfile: dadosCalculo.tomador_tax_profile || null,
          state: recipientState
        },
        operationType: 'Outgoing', // Saída (emissão de nota)
        items: [
          {
            id: 'item-1',
            operationCode: parseInt(dadosCalculo.codigo_servico || '1718') || 1718,
            acquisitionPurpose: dadosCalculo.finalidade_aquisicao || null,
            issuerTaxProfile: dadosCalculo.empresa_tax_profile || null,
            recipientTaxProfile: dadosCalculo.tomador_tax_profile || null,
            sku: dadosCalculo.codigo_servico || null,
            ncm: null, // NFS-e não usa NCM
            cest: null,
            benefit: null,
            exTipi: null,
            origin: 'National', // Nacional
            gtin: null,
            quantity: 1,
            unitAmount: parseFloat(dadosCalculo.valor_servico),
            freightAmount: null,
            insuranceAmount: null,
            discountAmount: null,
            othersAmount: null,
            icms: {} // NFS-e não usa ICMS
          }
        ],
        isProductRegistration: false // É para emissão de nota fiscal
      };

      console.log('📊 Tentando calcular impostos via API NFe.io:');
      console.log(`   Legal Entity API URL: ${this.legalEntityApiUrl}`);
      console.log(`   Tenant ID: ${tenantId}`);
      console.log(`   API Key (primeiros 10 chars): ${this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NÃO CONFIGURADA'}`);
      console.log(`   Payload:`, JSON.stringify(payloadCalculo, null, 2));

      // Tentar diferentes variações do endpoint
      const endpointsParaTentar = [
        `/tax-rules/${tenantId}/engine/calculate`,  // Formato da documentação
        `/v1/tax-rules/${tenantId}/engine/calculate`,  // Com prefixo /v1/
        `/tax-rules/${tenantId}/calculate`,  // Sem /engine/
        `/v1/tax-rules/${tenantId}/calculate`  // Sem /engine/ mas com /v1/
      ];

      let response;
      let lastError;
      let endpointUsado = '';

      for (const endpoint of endpointsParaTentar) {
        try {
          console.log(`   Tentando endpoint: ${endpoint}`);
          endpointUsado = endpoint;
          
          response = await this.legalEntityClient.post(endpoint, payloadCalculo, {
            headers: {
              'Authorization': this.apiKey,
              'Content-Type': 'application/json'
            },
            validateStatus: function (status) {
              // Não lançar erro para 404, vamos tentar o próximo endpoint
              return status < 500;
            }
          });
          
          // Se status for 200-299, funcionou!
          if (response.status >= 200 && response.status < 300) {
            console.log(`   ✅ Endpoint funcionou: ${endpoint} (Status: ${response.status})`);
            break;
          } else if (response.status === 404) {
            console.log(`   ❌ Endpoint retornou 404: ${endpoint}`);
            lastError = new Error(`Endpoint retornou 404: ${endpoint}`);
            continue;
          } else {
            // Outro erro (401, 403, etc)
            console.log(`   ❌ Endpoint retornou ${response.status}: ${endpoint}`);
            throw new Error(`Endpoint retornou ${response.status}: ${response.statusText || 'Unknown error'}`);
          }
        } catch (error) {
          lastError = error;
          if (error.response?.status === 404) {
            console.log(`   ❌ Endpoint retornou 404: ${endpoint}`);
            continue;
          } else if (error.response?.status) {
            // Outro erro HTTP
            console.log(`   ❌ Erro ${error.response.status} no endpoint: ${endpoint}`);
            throw error;
          } else {
            // Erro de rede ou outro
            console.log(`   ❌ Erro de rede no endpoint: ${endpoint} - ${error.message}`);
            throw error;
          }
        }
      }

      // Se nenhum endpoint funcionou
      if (!response || response.status === 404) {
        throw lastError || new Error('Todos os endpoints retornaram 404. Verifique se o tenantId está correto e se a API de cálculo de impostos está disponível no seu plano.');
      }

      console.log('✅ Resposta do cálculo de impostos NFe.io:', JSON.stringify(response.data, null, 2));

      // Processar resposta da API
      // A resposta da API pode ter diferentes formatos dependendo da estrutura retornada
      const resultado = response.data;
      
      // Extrair valores dos itens (se a resposta tiver items)
      let valorISS = 0;
      let aliquotaISS = 0;
      let baseCalculo = parseFloat(dadosCalculo.valor_servico);
      let valorRetencaoIR = 0;
      let valorRetencaoPIS = 0;
      let valorRetencaoCOFINS = 0;
      let valorRetencaoCSLL = 0;
      let valorRetencaoINSS = 0;
      let valorRetencaoISS = 0;

      if (resultado.items && Array.isArray(resultado.items) && resultado.items.length > 0) {
        // Processar primeiro item (para NFS-e geralmente há apenas um)
        const item = resultado.items[0];
        
        // Extrair ISS do item
        if (item.iss) {
          valorISS = parseFloat(item.iss.taxAmount || item.iss.value || 0);
          aliquotaISS = parseFloat(item.iss.rate || item.iss.aliquota || 0);
          baseCalculo = parseFloat(item.iss.baseAmount || item.iss.base_calculo || dadosCalculo.valor_servico);
        }
        
        // Extrair retenções
        if (item.withholdings) {
          valorRetencaoIR = parseFloat(item.withholdings.irrf?.amount || item.withholdings.irrf?.value || 0);
          valorRetencaoPIS = parseFloat(item.withholdings.pis?.amount || item.withholdings.pis?.value || 0);
          valorRetencaoCOFINS = parseFloat(item.withholdings.cofins?.amount || item.withholdings.cofins?.value || 0);
          valorRetencaoCSLL = parseFloat(item.withholdings.csll?.amount || item.withholdings.csll?.value || 0);
          valorRetencaoINSS = parseFloat(item.withholdings.inss?.amount || item.withholdings.inss?.value || 0);
          valorRetencaoISS = parseFloat(item.withholdings.iss?.amount || item.withholdings.iss?.value || 0);
        }
      } else if (resultado.iss) {
        // Formato alternativo com ISS direto
        valorISS = parseFloat(resultado.iss.taxAmount || resultado.iss.value || resultado.iss.valor || 0);
        aliquotaISS = parseFloat(resultado.iss.rate || resultado.iss.aliquota || 0);
        baseCalculo = parseFloat(resultado.iss.baseAmount || resultado.iss.base_calculo || dadosCalculo.valor_servico);
      }

      const valorLiquido = parseFloat(dadosCalculo.valor_servico) - valorISS - valorRetencaoIR - valorRetencaoPIS - valorRetencaoCOFINS - valorRetencaoCSLL - valorRetencaoINSS - valorRetencaoISS;

      return {
        success: true,
        estimado: false,
        valor_servico: parseFloat(dadosCalculo.valor_servico),
        valor_iss: valorISS,
        aliquota_iss: aliquotaISS,
        base_calculo: baseCalculo,
        valor_liquido: valorLiquido,
        // Retenções
        valor_retencao_ir: valorRetencaoIR,
        valor_retencao_pis: valorRetencaoPIS,
        valor_retencao_cofins: valorRetencaoCOFINS,
        valor_retencao_csll: valorRetencaoCSLL,
        valor_retencao_inss: valorRetencaoINSS,
        valor_retencao_iss: valorRetencaoISS,
        // Detalhes completos
        detalhes: resultado,
        fonte: 'NFe.io API',
        message: 'Cálculo de impostos realizado com sucesso via API NFe.io'
      };
    } catch (error) {
      console.error('❌ Erro ao calcular impostos na NFe.io (não crítico):');
      console.error('   Status:', error.response?.status);
      console.error('   Status Text:', error.response?.statusText);
      console.error('   Mensagem:', error.message);
      console.error('   Resposta completa:', JSON.stringify(error.response?.data, null, 2));
      
      // Em caso de erro, retornar valores padrão (sem cálculo)
      // Isso não impede a emissão da nota, pois a NFe.io calculará automaticamente
      const erroFinal = error || lastError;
      return {
        success: true, // Marcar como success pois não é crítico
        estimado: true,
        valor_servico: dadosCalculo.valor_servico,
        valor_iss: 0,
        valor_liquido: dadosCalculo.valor_servico,
        aliquota_iss: 0,
        base_calculo: dadosCalculo.valor_servico,
        error: {
          status: erroFinal.response?.status,
          statusText: erroFinal.response?.statusText,
          message: erroFinal.message,
          url: erroFinal.config?.url || endpointUsado || `https://legalentity.api.nfe.io/tax-rules/${tenantId}/engine/calculate`,
          full_url: erroFinal.config ? `${erroFinal.config.baseURL}${erroFinal.config.url}` : 'N/A',
          tenant_id: tenantId,
          data: erroFinal.response?.data,
          note: 'A API de cálculo de impostos pode não estar disponível no seu plano NFe.io ou o endpoint pode ter mudado. O cálculo será feito automaticamente durante a emissão da nota.'
        },
        message: 'Cálculo de impostos será feito automaticamente pela NFe.io durante a emissão'
      };
    }
  }

  /**
   * Diagnóstico completo antes de emitir nota
   * @param {Object} notaData - Dados completos da nota fiscal
   * @returns {Object} Resultado do diagnóstico
   */
  async diagnosticarEmissao(notaData) {
    const diagnosticos = [];
    let podeEmitir = true;

    // 1. Verificar API Key
    if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
      diagnosticos.push({
        tipo: 'ERRO',
        campo: 'NFEIO_API_KEY',
        mensagem: 'Chave da API NFe.io não configurada'
      });
      podeEmitir = false;
    } else {
      diagnosticos.push({
        tipo: 'OK',
        campo: 'NFEIO_API_KEY',
        mensagem: 'Chave da API configurada'
      });
    }

    // 2. Verificar empresa
    if (!notaData.empresa) {
      diagnosticos.push({
        tipo: 'ERRO',
        campo: 'empresa',
        mensagem: 'Dados da empresa não fornecidos'
      });
      podeEmitir = false;
    } else {
      if (!notaData.empresa.nfeio_empresa_id) {
        diagnosticos.push({
          tipo: 'AVISO',
          campo: 'empresa.nfeio_empresa_id',
          mensagem: 'Empresa não está sincronizada com NFe.io'
        });
      } else {
        diagnosticos.push({
          tipo: 'OK',
          campo: 'empresa.nfeio_empresa_id',
          mensagem: `Empresa sincronizada (ID: ${notaData.empresa.nfeio_empresa_id})`
        });
      }

      // Verificar CNPJ da empresa (pode estar em diferentes formatos)
      const empresaCnpj = notaData.empresa.cnpj || notaData.empresa.cnpj_cpf || '';
      const empresaCnpjLimpo = empresaCnpj ? String(empresaCnpj).replace(/[^\d]/g, '') : '';
      
      if (!empresaCnpjLimpo || empresaCnpjLimpo.length !== 14) {
        diagnosticos.push({
          tipo: 'ERRO',
          campo: 'empresa.cnpj',
          mensagem: `CNPJ da empresa não informado ou inválido. CNPJ recebido: "${empresaCnpj}" (${empresaCnpjLimpo.length} dígitos após limpeza)`
        });
        podeEmitir = false;
      } else {
        diagnosticos.push({
          tipo: 'OK',
          campo: 'empresa.cnpj',
          mensagem: `CNPJ da empresa válido: ${empresaCnpjLimpo.substring(0, 2)}.***.***/****-${empresaCnpjLimpo.substring(12)}`
        });
      }

      if (!notaData.empresa.inscricao_municipal) {
        diagnosticos.push({
          tipo: 'AVISO',
          campo: 'empresa.inscricao_municipal',
          mensagem: 'Inscrição municipal não informada'
        });
      }
    }

    // 3. Verificar tomador
    if (!notaData.tomador) {
      diagnosticos.push({
        tipo: 'ERRO',
        campo: 'tomador',
        mensagem: 'Dados do tomador não fornecidos'
      });
      podeEmitir = false;
    } else {
      if (!notaData.tomador.cnpj_cpf) {
        diagnosticos.push({
          tipo: 'ERRO',
          campo: 'tomador.cnpj_cpf',
          mensagem: 'CPF/CNPJ do tomador não informado'
        });
        podeEmitir = false;
      }
    }

    // 4. Verificar nota
    if (!notaData.nota) {
      diagnosticos.push({
        tipo: 'ERRO',
        campo: 'nota',
        mensagem: 'Dados da nota não fornecidos'
      });
      podeEmitir = false;
    } else {
      if (!notaData.nota.valor_total || parseFloat(notaData.nota.valor_total) <= 0) {
        diagnosticos.push({
          tipo: 'ERRO',
          campo: 'nota.valor_total',
          mensagem: 'Valor total inválido'
        });
        podeEmitir = false;
      }

      if (!notaData.nota.mes_competencia) {
        diagnosticos.push({
          tipo: 'ERRO',
          campo: 'nota.mes_competencia',
          mensagem: 'Mês de competência não informado'
        });
        podeEmitir = false;
      }
    }

    // 5. Verificar sócios
    if (!notaData.socios || notaData.socios.length === 0) {
      diagnosticos.push({
        tipo: 'AVISO',
        campo: 'socios',
        mensagem: 'Nenhum sócio/prestador informado'
      });
    }

    return {
      podeEmitir,
      diagnosticos
    };
  }

  /**
   * Emite uma NFS-e na API NFe.io
   * @param {Object} notaData - Dados completos da nota fiscal
   * @returns {Promise<Object>} Resposta da API com referência e status
   */
  async emitirNota(notaData) {
    // #region agent log
    await writeLog({
      location: 'nfeioService.js:emitirNota',
      message: 'emitirNota entry',
      data: { hasApiKey: !!this.apiKey, apiKeyIsPlaceholder: this.apiKey === 'your_nfeio_api_key_here', hasNota: !!notaData.nota, hasEmpresa: !!notaData.empresa, hasTomador: !!notaData.tomador },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'B'
    });
    // #endregion
    
    // Executar diagnóstico antes de emitir
    const diagnostico = await this.diagnosticarEmissao(notaData);
    
    // #region agent log
    await writeLog({
      location: 'nfeioService.js:diagnostico',
      message: 'diagnostico executado',
      data: { podeEmitir: diagnostico.podeEmitir, diagnosticos: diagnostico.diagnosticos },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'D'
    });
    // #endregion
    
    console.log('🔍 Diagnóstico de Emissão:', JSON.stringify(diagnostico.diagnosticos, null, 2));
    
    if (!diagnostico.podeEmitir) {
      const erros = diagnostico.diagnosticos.filter(d => d.tipo === 'ERRO');
      console.error('❌ Diagnóstico falhou:', erros);
      return {
        success: false,
        error: `Erros encontrados: ${erros.map(e => e.mensagem).join(', ')}`,
        diagnosticos: diagnostico.diagnosticos,
        statusCode: 400
      };
    }
    
    // Declarar payload no escopo do método para estar disponível no catch
    let payload = null;
    
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        // #region agent log
        await writeLog({
          location: 'nfeioService.js:API key not configured',
          message: 'API key not configured',
          data: { hasApiKey: !!this.apiKey },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run2',
          hypothesisId: 'B'
        });
        // #endregion
        throw new Error('NFEIO_API_KEY não configurada. Por favor, configure a variável de ambiente NFEIO_API_KEY');
      }

      // Calcular impostos antes de emitir
      // Usar código de serviço da nota se disponível, senão usar da empresa
      const codigoServico = notaData.nota.codigo_servico_municipal 
        || notaData.nota.codigo_servico 
        || notaData.empresa.codigo_servico_municipal 
        || notaData.empresa.codigo_servico 
        || '';
      
      const calculoImpostos = await this.calcularImpostos({
        valor_servico: parseFloat(notaData.nota.valor_total),
        municipio_prestacao: notaData.empresa.cidade || '',
        codigo_servico: codigoServico
      });

      // Montar payload
      payload = this.montarPayloadEmissao(
        notaData.nota,
        notaData.empresa,
        notaData.tomador,
        notaData.socios
      );

      // #region agent log
      await writeLog({
        location: 'nfeioService.js:payload created',
        message: 'payload created',
        data: { 
          hasPrestador: !!payload.prestador, 
          hasTomador: !!payload.tomador, 
          hasServico: !!payload.servico, 
          valorServico: payload.servico?.valor_servico,
          companyId: payload.company_id,
          prestadorCompanyId: payload.prestador?.company_id,
          prestadorCnpj: payload.prestador?.cnpj,
          tomadorDocumento: payload.tomador?.documento,
          payloadKeys: Object.keys(payload)
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'C'
      });
      // #endregion
      
      // Log completo do payload (sem dados sensíveis)
      const payloadLog = {
        ...payload,
        borrower: {
          ...payload.borrower,
          federalTaxNumber: payload.borrower?.federalTaxNumber ? `${String(payload.borrower.federalTaxNumber).substring(0, 3)}***` : null
        },
        cnaeCode: payload.cnaeCode || 'NÃO ENVIADO',
        federalServiceCode: payload.federalServiceCode || 'NÃO ENVIADO',
        nbsCode: payload.nbsCode || 'NÃO ENVIADO',
        cityServiceCode: payload.cityServiceCode || 'NÃO ENVIADO'
      };
      console.log('📤 Payload NFe.io COMPLETO:', JSON.stringify(payloadLog, null, 2));
      
      // Log detalhado do borrower para debug
      console.log('🔍 Detalhes do Borrower:', {
        name: payload.borrower?.name,
        federalTaxNumber: payload.borrower?.federalTaxNumber,
        federalTaxNumberType: typeof payload.borrower?.federalTaxNumber,
        federalTaxNumberString: String(payload.borrower?.federalTaxNumber || ''),
        address: payload.borrower?.address
      });

      // Adicionar dados de impostos calculados ao payload (se disponível)
      if (calculoImpostos.success && calculoImpostos.aliquota_iss) {
        payload.issRate = calculoImpostos.aliquota_iss;
        if (calculoImpostos.valor_iss) {
          payload.issTaxAmount = calculoImpostos.valor_iss;
        }
      }

      // #region agent log
      await writeLog({
        location: 'nfeioService.js:before API call',
        message: 'before API call',
        data: { endpoint: '/v1/companies/:company_id/serviceinvoices', apiUrl: this.apiUrl },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'E'
      });
      // #endregion

      console.log('🌐 Chamando API NFe.io para emissão de NFS-e');
      
      // Endpoint correto conforme documentação oficial:
      // POST /v1/companies/:company_id/serviceinvoices
      // Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-post/
      // company_id é um path parameter, não deve estar no body
      const companyId = notaData.empresa.nfeio_empresa_id;
      if (!companyId) {
        throw new Error('nfeio_empresa_id é obrigatório para emitir NFS-e na NFe.io. A empresa precisa estar sincronizada com a NFe.io.');
      }
      
      // Remover company_id do payload se existir (deve ser apenas path parameter)
      const { company_id, companyId: _, ...bodyPayload } = payload;
      
      const endpoint = `/v1/companies/${companyId}/serviceinvoices`;
      console.log(`   Endpoint: ${endpoint}`);
      console.log(`   Payload COMPLETO enviado para API:`, JSON.stringify(bodyPayload, null, 2));
      console.log(`   CNAE Code no payload:`, bodyPayload.cnaeCode || 'NÃO ENVIADO');
      
      const response = await this.client.post(endpoint, bodyPayload);
      
      // Log da resposta completa
      console.log('📥 Resposta COMPLETA da API NFe.io:', JSON.stringify(response.data, null, 2));
      
      // Verificar se há erros na resposta
      if (response.data.errors && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
        console.error('❌ Erros na resposta da API NFe.io:', JSON.stringify(response.data.errors, null, 2));
        const erros = response.data.errors.map(e => e.message || e).join(', ');
        throw new Error(`Erro na API NFe.io: ${erros}`);
      }

      // #region agent log
      await writeLog({
        location: 'nfeioService.js:API response received',
        message: 'API response received',
        data: { status: response.status, hasData: !!response.data, responseId: response.data?.id, responseStatus: response.data?.status },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'A'
      });
      // #endregion

      // Retornar resposta completa conforme solicitado
      return {
        success: true,
        api_ref: response.data.id || response.data.reference || response.data.external_id,
        status: response.data.status || 'PROCESSANDO',
        flowStatus: response.data.flowStatus,
        flowMessage: response.data.flowMessage,
        environment: response.data.environment,
        data: response.data, // Resposta completa da API
        impostos: calculoImpostos,
        // Campos adicionais da resposta
        number: response.data.number,
        checkCode: response.data.checkCode,
        issuedOn: response.data.issuedOn,
        cancelledOn: response.data.cancelledOn,
        rpsNumber: response.data.rpsNumber,
        rpsSerialNumber: response.data.rpsSerialNumber,
        cityServiceCode: response.data.cityServiceCode,
        federalServiceCode: response.data.federalServiceCode,
        cnaeCode: response.data.cnaeCode,
        nbsCode: response.data.nbsCode,
        servicesAmount: response.data.servicesAmount,
        issRate: response.data.issRate,
        issTaxAmount: response.data.issTaxAmount,
        borrower: response.data.borrower,
        provider: response.data.provider
      };
    } catch (error) {
      // #region agent log
      await writeLog({
        location: 'nfeioService.js:emitirNota error',
        message: 'emitirNota error',
        data: { 
          errorMessage: error.message, 
          statusCode: error.response?.status, 
          errorData: error.response?.data, 
          errorHeaders: error.response?.headers,
          isNetworkError: !error.response,
          errorStack: error.stack?.substring(0, 500)
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'E'
      });
      // #endregion
      
      // Log detalhado do erro
      console.error('❌ Erro ao emitir nota na NFe.io:');
      console.error('   Status:', error.response?.status);
      console.error('   Mensagem:', error.message);
      const responseData = error.response?.data;
      const dataStr = responseData === undefined || responseData === null
        ? '(sem corpo)'
        : typeof responseData === 'string'
          ? responseData || '(vazio)'
          : JSON.stringify(responseData, null, 2) || '(vazio)';
      console.error('   Dados do erro:', dataStr);
      console.error('   URL:', error.config?.url);
      console.error('   Método:', error.config?.method);
      if (error.response?.status === 403) {
        console.error('   💡 403 Forbidden: Verifique se está usando a "Chave de Nota Fiscal" (não a "Chave de Dados") no NFEIO_API_KEY e se a empresa pertence à mesma conta.');
      }
      
      // Formatar mensagem de erro mais amigável
      let errorMessage = 'Erro ao emitir nota na NFe.io';
      let errorSuggestion = '';
      
      if (error.response?.status === 403) {
        errorMessage = 'Acesso negado pela NFe.io (403). Use a Chave de Nota Fiscal na variável NFEIO_API_KEY e confirme que a empresa pertence à sua conta.';
        errorSuggestion = 'No painel NFe.io: CONTA → CHAVE DE ACESSO → use a "Chave de Nota fiscal" para emissão. A "Chave de Dados" não emite notas.';
      } else if (error.response?.data) {
        // Tentar extrair mensagem de erro mais específica
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          const erros = error.response.data.errors.map(e => {
            if (typeof e === 'string') return e;
            if (e.message) return e.message;
            if (e.field) return `${e.field}: ${e.message || e}`;
            return JSON.stringify(e);
          });
          errorMessage = erros.join('; ');
          
          // Extrair sugestões se houver
          const suggestions = error.response.data.errors
            .filter(e => e.suggestion)
            .map(e => e.suggestion);
          if (suggestions.length > 0) {
            errorSuggestion = suggestions.join('; ');
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          errorSuggestion = error.response.data.suggestion || '';
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        suggestion: errorSuggestion,
        errorDetails: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
        // Incluir dados do payload que causou o erro para debug (apenas se payload foi criado)
        payloadDebug: (process.env.NODE_ENV === 'development' && payload) ? {
          borrower: {
            name: payload.borrower?.name,
            federalTaxNumber: payload.borrower?.federalTaxNumber ? '***' : null,
            address: payload.borrower?.address
          },
          cityServiceCode: payload.cityServiceCode,
          cnaeCode: payload.cnaeCode
        } : undefined
      };
    }
  }

  /**
   * Consulta o status de uma nota fiscal na NFe.io
   * Usa obterNotaPorId internamente
   * @param {string} companyId - ID da empresa na NFe.io
   * @param {string} serviceInvoiceId - ID da nota fiscal na NFe.io
   * @returns {Promise<Object>} Status atual da nota
   */
  async consultarNota(companyId, serviceInvoiceId) {
    try {
      // Usar o método obterNotaPorId que já está implementado corretamente
      return await this.obterNotaPorId(companyId, serviceInvoiceId);
    } catch (error) {
      console.error('Erro ao consultar nota na NFe.io:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Baixa o XML de uma nota fiscal da NFe.io
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-get-document-xml/
   * @param {string} companyId - ID da empresa na NFe.io
   * @param {string} serviceInvoiceId - ID da nota fiscal na NFe.io
   * @returns {Promise<Object>} XML da nota fiscal
   */
  async baixarXML(companyId, serviceInvoiceId) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      const response = await this.client.get(
        `/v1/companies/${companyId}/serviceinvoices/${serviceInvoiceId}/xml`,
        { responseType: 'text' }
      );

      return {
        success: true,
        xml: response.data,
        contentType: response.headers['content-type'] || 'application/xml'
      };
    } catch (error) {
      console.error('Erro ao baixar XML da nota:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Baixa o PDF de uma nota fiscal da NFe.io
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-get-document-pdf/
   * @param {string} companyId - ID da empresa na NFe.io
   * @param {string} serviceInvoiceId - ID da nota fiscal na NFe.io
   * @returns {Promise<Object>} PDF da nota fiscal (buffer)
   */
  async baixarPDF(companyId, serviceInvoiceId) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      const response = await this.client.get(
        `/v1/companies/${companyId}/serviceinvoices/${serviceInvoiceId}/pdf`,
        { responseType: 'arraybuffer' }
      );

      return {
        success: true,
        pdf: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'application/pdf'
      };
    } catch (error) {
      console.error('Erro ao baixar PDF da nota:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Lista as notas fiscais de serviço de uma empresa
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-get/
   * @param {string} companyId - ID da empresa na NFe.io
   * @param {Object} params - Parâmetros de filtro (page, limit, etc)
   * @returns {Promise<Object>} Lista de notas fiscais
   */
  async listarNotas(companyId, params = {}) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      const response = await this.client.get(
        `/v1/companies/${companyId}/serviceinvoices`,
        { params }
      );

      return {
        success: true,
        notas: response.data.data || response.data || [],
        total: response.data.total || response.data.length || 0
      };
    } catch (error) {
      console.error('Erro ao listar notas na NFe.io:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Obtém os detalhes de uma nota fiscal de serviço por ID
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-id-get/
   * @param {string} companyId - ID da empresa na NFe.io
   * @param {string} serviceInvoiceId - ID da nota fiscal na NFe.io
   * @returns {Promise<Object>} Detalhes da nota fiscal
   */
  async obterNotaPorId(companyId, serviceInvoiceId) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      const response = await this.client.get(
        `/v1/companies/${companyId}/serviceinvoices/${serviceInvoiceId}`
      );

      return {
        success: true,
        status: response.data.status,
        nota: response.data,
        flowStatus: response.data.flowStatus, // Incluir flowStatus na resposta
        caminho_xml: response.data.xml_url || response.data.xml,
        caminho_pdf: response.data.pdf_url || response.data.pdf
      };
    } catch (error) {
      console.error('Erro ao obter nota na NFe.io:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Obtém os detalhes de uma nota fiscal de serviço por externalId
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-id-get/
   * @param {string} companyId - ID da empresa na NFe.io
   * @param {string} externalId - ID externo (externalId) da nota fiscal
   * @returns {Promise<Object>} Detalhes da nota fiscal
   */
  async obterNotaPorExternalId(companyId, externalId) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      const response = await this.client.get(
        `/v1/companies/${companyId}/serviceinvoices/external/${externalId}`
      );

      return {
        success: true,
        status: response.data.status,
        nota: response.data,
        flowStatus: response.data.flowStatus, // Incluir flowStatus na resposta
        caminho_xml: response.data.xml_url || response.data.xml,
        caminho_pdf: response.data.pdf_url || response.data.pdf
      };
    } catch (error) {
      console.error('Erro ao obter nota por externalId na NFe.io:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Cancela uma nota fiscal na NFe.io
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/service-invoices-delete/
   * @param {string} companyId - ID da empresa na NFe.io
   * @param {string} serviceInvoiceId - ID da nota fiscal na NFe.io
   * @param {string} motivo - Motivo do cancelamento (opcional)
   * @returns {Promise<Object>} Resultado do cancelamento
   */
  async cancelarNota(companyId, serviceInvoiceId, motivo) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada. Por favor, configure a variável de ambiente NFEIO_API_KEY');
      }

      // A documentação mostra que o cancelamento é feito via DELETE
      // O axios aceita data no config para DELETE requests
      const config = {};
      if (motivo) {
        config.data = { motivo: motivo || 'Cancelamento solicitado pelo usuário' };
      }

      const response = await this.client.delete(
        `/v1/companies/${companyId}/serviceinvoices/${serviceInvoiceId}`,
        config
      );

      return {
        success: true,
        status: response.data?.status || 'CANCELADA',
        data: response.data
      };
    } catch (error) {
      console.error('Erro ao cancelar nota na NFe.io:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Valida assinatura de webhook da NFe.io
   * @param {Object} payload - Payload do webhook
   * @param {string} signature - Assinatura recebida
   * @returns {boolean} True se a assinatura for válida
   */
  validarWebhookSignature(payload, signature) {
    // Implementar validação conforme documentação da NFe.io
    // Por enquanto, validação básica com secret
    const crypto = require('crypto');
    const secret = process.env.NFEIO_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️  NFEIO_WEBHOOK_SECRET não configurado. Validação de webhook desabilitada.');
      return true; // Em desenvolvimento, aceitar sem validação
    }

    const hmac = crypto.createHmac('sha256', secret);
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = hmac.update(payloadString).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Lista empresas cadastradas na NFe.io
   * @returns {Promise<Object>} Lista de empresas
   */
  async listarEmpresas() {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada. Por favor, configure a variável de ambiente NFEIO_API_KEY');
      }

      console.log('🌐 Chamando API NFe.io: GET /v1/companies');
      const response = await this.client.get('/v1/companies');
      
      // Log completo da resposta para debug
      console.log('📥 Resposta completa da API NFe.io:');
      console.log('   Status:', response.status);
      console.log('   Headers:', JSON.stringify(response.headers, null, 2));
      console.log('   Data type:', Array.isArray(response.data) ? 'array' : typeof response.data);
      console.log('   Data keys:', response.data ? Object.keys(response.data) : 'null');
      console.log('   Data completo:', JSON.stringify(response.data, null, 2));

      // A API NFe.io pode retornar em diferentes formatos
      let empresas = [];
      
      // Tentar diferentes formatos de resposta
      if (Array.isArray(response.data)) {
        empresas = response.data;
        console.log('✅ Formato: Array direto');
      } else if (response.data && Array.isArray(response.data.data)) {
        empresas = response.data.data;
        console.log('✅ Formato: response.data.data');
      } else if (response.data && Array.isArray(response.data.companies)) {
        empresas = response.data.companies;
        console.log('✅ Formato: response.data.companies');
      } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
        empresas = response.data.items;
        console.log('✅ Formato: response.data.items');
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        empresas = response.data.results;
        console.log('✅ Formato: response.data.results');
      } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Verificar se tem propriedades que indicam ser uma empresa
        if (response.data.id || response.data.cnpj || response.data.razao_social) {
          empresas = [response.data];
          console.log('✅ Formato: Objeto único (empresa)');
        } else {
          // Tentar extrair de outras propriedades
          const possibleArrays = Object.values(response.data).filter(v => Array.isArray(v));
          if (possibleArrays.length > 0) {
            empresas = possibleArrays[0];
            console.log('✅ Formato: Array encontrado em propriedade do objeto');
          } else {
            console.warn('⚠️ Formato desconhecido, tentando processar como objeto único');
            empresas = [response.data];
          }
        }
      }

      console.log(`✅ Empresas extraídas: ${empresas.length}`);
      if (empresas.length > 0) {
        console.log('📋 Primeira empresa:', JSON.stringify(empresas[0], null, 2));
      }

      return {
        success: true,
        empresas: empresas,
        total: empresas.length,
        rawResponse: process.env.NODE_ENV === 'development' ? response.data : undefined
      };
    } catch (error) {
      console.error('❌ Erro ao listar empresas na NFe.io:');
      console.error('   Status:', error.response?.status);
      console.error('   Mensagem:', error.message);
      console.error('   Dados:', JSON.stringify(error.response?.data, null, 2));
      console.error('   URL:', error.config?.url);
      
      return {
        success: false,
        empresas: [],
        total: 0,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
        errorDetails: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        } : undefined
      };
    }
  }

  /**
   * Obtém uma empresa específica da NFe.io
   * @param {string} empresaId - ID da empresa na NFe.io
   * @returns {Promise<Object>} Dados da empresa
   */
  async obterEmpresa(empresaId) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada. Por favor, configure a variável de ambiente NFEIO_API_KEY');
      }

      console.log('🌐 Chamando API NFe.io: GET /v1/companies/' + empresaId);
      const response = await this.client.get(`/v1/companies/${empresaId}`);
      
      console.log('📥 Resposta obterEmpresa:', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      // A API NFe.io retorna em diferentes formatos:
      // - response.data.companies (objeto único ou array)
      // - response.data.data (objeto único)
      // - response.data (objeto único)
      let empresa = null;
      if (response.data) {
        // Primeiro, verificar se está dentro de 'companies'
        if (response.data.companies) {
          if (Array.isArray(response.data.companies) && response.data.companies.length > 0) {
            // Se for array, pegar o primeiro
            empresa = response.data.companies[0];
            console.log('✅ Formato: response.data.companies (array)');
          } else if (typeof response.data.companies === 'object' && !Array.isArray(response.data.companies)) {
            // Se for objeto único
            empresa = response.data.companies;
            console.log('✅ Formato: response.data.companies (objeto)');
          }
        } else if (response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
          empresa = response.data.data;
          console.log('✅ Formato: response.data.data');
        } else if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          // Verificar se é um objeto de empresa (tem id, name, etc)
          if (response.data.id || response.data.federalTaxNumber || response.data.name) {
            empresa = response.data;
            console.log('✅ Formato: response.data (objeto empresa)');
          }
        }
      }

      console.log('✅ Empresa obtida:', empresa ? {
        id: empresa.id,
        name: empresa.name,
        federalTaxNumber: empresa.federalTaxNumber
      } : 'null');

      if (!empresa) {
        console.warn('⚠️ Estrutura de resposta não reconhecida:', JSON.stringify(response.data, null, 2));
      }

      return {
        success: !!empresa,
        empresa: empresa
      };
    } catch (error) {
      console.error('❌ Erro ao obter empresa na NFe.io:');
      console.error('   Status:', error.response?.status);
      console.error('   Mensagem:', error.message);
      console.error('   Dados:', JSON.stringify(error.response?.data, null, 2));
      console.error('   URL:', error.config?.url);
      
      return {
        success: false,
        empresa: null,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Sincroniza (cria ou atualiza) uma empresa na NFe.io
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/companies-post/
   * @param {Object} dadosEmpresa - Dados da empresa para sincronizar
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async sincronizarEmpresa(dadosEmpresa) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada. Por favor, configure a variável de ambiente NFEIO_API_KEY');
      }

      // Validar campos obrigatórios
      if (!dadosEmpresa.razao_social || dadosEmpresa.razao_social.trim() === '') {
        throw new Error('Razão social é obrigatória para sincronizar empresa com NFe.io');
      }
      
      if (!dadosEmpresa.cnpj || dadosEmpresa.cnpj.replace(/[^\d]/g, '').length !== 14) {
        throw new Error('CNPJ é obrigatório e deve ter 14 dígitos para sincronizar empresa com NFe.io');
      }

      // Montar payload para a API NFe.io conforme documentação
      // Documentação: https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/companies-post/
      const cnpjLimpo = dadosEmpresa.cnpj.replace(/[^\d]/g, '');
      const cepLimpo = (dadosEmpresa.endereco?.cep || dadosEmpresa.cep || '').replace(/[^\d]/g, '');
      
      const payload = {
        company: {
          name: dadosEmpresa.razao_social.trim(),
          federalTaxNumber: parseInt(cnpjLimpo),
          taxRegime: dadosEmpresa.regime_tributario || 'SimplesNacional',
          address: {
            country: 'BRA',
            state: dadosEmpresa.endereco?.uf || dadosEmpresa.uf || '',
            city: {
              name: dadosEmpresa.endereco?.municipio || dadosEmpresa.cidade || '',
              code: dadosEmpresa.codigo_municipio || '' // Código IBGE do município (opcional)
            },
            district: dadosEmpresa.endereco?.bairro || dadosEmpresa.bairro || '',
            street: dadosEmpresa.endereco?.logradouro || dadosEmpresa.logradouro || '',
            number: dadosEmpresa.endereco?.numero || dadosEmpresa.numero || '',
            additionalInformation: dadosEmpresa.endereco?.complemento || dadosEmpresa.complemento || '',
            postalCode: cepLimpo
          }
        }
      };

      // Adicionar campos opcionais se disponíveis
      if (dadosEmpresa.inscricao_municipal) {
        payload.company.municipalTaxNumber = dadosEmpresa.inscricao_municipal;
      }
      
      if (dadosEmpresa.inscricao_estadual) {
        payload.company.stateTaxNumber = dadosEmpresa.inscricao_estadual;
      }
      
      if (dadosEmpresa.email) {
        payload.company.email = dadosEmpresa.email;
      }
      
      if (dadosEmpresa.telefone) {
        payload.company.phone = dadosEmpresa.telefone.replace(/[^\d]/g, '');
        }

      // Se já existe nfeio_empresa_id, tentar atualizar; senão, criar
      let response;
      if (dadosEmpresa.nfeio_empresa_id) {
        try {
          // Tentar atualizar empresa existente (PUT também usa o mesmo formato)
        response = await this.client.put(`/v1/companies/${dadosEmpresa.nfeio_empresa_id}`, payload);
        } catch (updateError) {
          // Se a empresa não existe (404), criar uma nova
          if (updateError.response?.status === 404) {
            console.warn(`⚠️  Empresa ${dadosEmpresa.nfeio_empresa_id} não encontrada na NFe.io. Criando nova empresa...`);
            response = await this.client.post('/v1/companies', payload);
      } else {
            // Se for outro erro, propagar
            throw updateError;
          }
        }
      } else {
        // Criar nova empresa
        console.log('📤 Criando nova empresa na NFe.io:', JSON.stringify(payload, null, 2));
        response = await this.client.post('/v1/companies', payload);
      }

      // Extrair ID da empresa da resposta
      // A resposta pode vir em diferentes formatos:
      // - response.data.company.id
      // - response.data.id
      // - response.data.data.id
      const empresaId = response.data?.company?.id || 
                       response.data?.id || 
                       response.data?.data?.id;
      
      if (!empresaId) {
        console.warn('⚠️  Não foi possível extrair o ID da empresa da resposta:', JSON.stringify(response.data, null, 2));
      }

      return {
        success: true,
        nfeio_empresa_id: empresaId,
        empresa: response.data?.company || response.data?.data || response.data
      };
    } catch (error) {
      console.error('Erro ao sincronizar empresa na NFe.io:', error.response?.data || error.message);
      console.error('   Status:', error.response?.status);
      console.error('   URL:', error.config?.url);
      
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Lista códigos de operação disponíveis
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/calculo-de-impostos-v1/listar-codigos-de-operacao/
   * @returns {Promise<Object>} Lista de códigos de operação
   */
  async listarCodigosOperacao() {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      console.log('🌐 Chamando API NFe.io: GET /tax-codes/operation-code');
      const response = await this.client.get('/tax-codes/operation-code');

      return {
        success: true,
        codigos: response.data.data || response.data.items || response.data || [],
        total: Array.isArray(response.data.data || response.data.items || response.data) 
          ? (response.data.data || response.data.items || response.data).length 
          : 0
      };
    } catch (error) {
      console.error('❌ Erro ao listar códigos de operação:', error.response?.data || error.message);
      return {
        success: false,
        codigos: [],
        total: 0,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Lista finalidades de aquisição disponíveis
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/calculo-de-impostos-v1/listar-finalidades-de-aquisicao/
   * @returns {Promise<Object>} Lista de finalidades de aquisição
   */
  async listarFinalidadesAquisicao() {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      console.log('🌐 Chamando API NFe.io: GET /tax-codes/acquisition-purpose');
      const response = await this.client.get('/tax-codes/acquisition-purpose');

      return {
        success: true,
        finalidades: response.data.data || response.data.items || response.data || [],
        total: Array.isArray(response.data.data || response.data.items || response.data) 
          ? (response.data.data || response.data.items || response.data).length 
          : 0
      };
    } catch (error) {
      console.error('❌ Erro ao listar finalidades de aquisição:', error.response?.data || error.message);
      return {
        success: false,
        finalidades: [],
        total: 0,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Lista perfis fiscais do emissor disponíveis
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/calculo-de-impostos-v1/listar-perfis-fiscais-do-emissor/
   * @returns {Promise<Object>} Lista de perfis fiscais do emissor
   */
  async listarPerfisFiscaisEmissor() {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      console.log('🌐 Chamando API NFe.io: GET /tax-codes/issuer-fiscal-profile');
      const response = await this.client.get('/tax-codes/issuer-fiscal-profile');

      return {
        success: true,
        perfis: response.data.data || response.data.items || response.data || [],
        total: Array.isArray(response.data.data || response.data.items || response.data) 
          ? (response.data.data || response.data.items || response.data).length 
          : 0
      };
    } catch (error) {
      console.error('❌ Erro ao listar perfis fiscais do emissor:', error.response?.data || error.message);
      return {
        success: false,
        perfis: [],
        total: 0,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Lista perfis fiscais do destinatário disponíveis
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/calculo-de-impostos-v1/listar-perfis-fiscais-do-destinatario/
   * @returns {Promise<Object>} Lista de perfis fiscais do destinatário
   */
  async listarPerfisFiscaisDestinatario() {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      console.log('🌐 Chamando API NFe.io: GET /tax-codes/recipient-fiscal-profile');
      const response = await this.client.get('/tax-codes/recipient-fiscal-profile');

      return {
        success: true,
        perfis: response.data.data || response.data.items || response.data || [],
        total: Array.isArray(response.data.data || response.data.items || response.data) 
          ? (response.data.data || response.data.items || response.data).length 
          : 0
      };
    } catch (error) {
      console.error('❌ Erro ao listar perfis fiscais do destinatário:', error.response?.data || error.message);
      return {
        success: false,
        perfis: [],
        total: 0,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Consulta situação cadastral do CPF
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/consulta-de-cpf-v1/v-1-naturalperson-status-by-federal-tax-number-by-birth-date-get/
   * @param {string} cpf - CPF (apenas números)
   * @param {string} dataNascimento - Data de nascimento no formato YYYY-MM-DD
   * @returns {Promise<Object>} Dados do CPF
   */
  async consultarCPF(cpf, dataNascimento) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      if (!cpf || !dataNascimento) {
        throw new Error('CPF e data de nascimento são obrigatórios');
      }

      // Limpar CPF (apenas números)
      const cpfLimpo = cpf.replace(/[^\d]/g, '');
      if (cpfLimpo.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos');
      }

      // Formatar data de nascimento (YYYY-MM-DD)
      const dataFormatada = dataNascimento.replace(/[^\d-]/g, '');

      console.log('🌐 Consultando CPF na NFe.io:', cpfLimpo.substring(0, 3) + '***');
      console.log('📅 Data de nascimento:', dataFormatada);
      
      // Tentar primeiro com a URL base padrão, depois com subdomínio específico
      let response;
      let lastError;
      
      // Tentativa 1: URL base padrão
      try {
        console.log('🌐 Tentativa 1: Usando api.nfe.io');
        response = await this.client.get(`/v1/naturalperson/status/${cpfLimpo}/${dataFormatada}`);
      } catch (error1) {
        lastError = error1;
        console.log('⚠️ Tentativa 1 falhou, tentando subdomínio específico...');
        
        // Tentativa 2: Subdomínio específico (se existir para CPF)
        try {
          const naturalPersonApiUrl = 'https://naturalperson.api.nfe.io';
          const endpoint = `/v1/naturalperson/status/${cpfLimpo}/${dataFormatada}`;
          
          const naturalPersonClient = axios.create({
            baseURL: naturalPersonApiUrl,
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.apiKey
            }
          });
          
          console.log('🌐 Tentativa 2: Usando naturalperson.api.nfe.io');
          console.log('🌐 URL completa:', `${naturalPersonApiUrl}${endpoint}`);
          response = await naturalPersonClient.get(endpoint);
        } catch (error2) {
          lastError = error2;
          console.log('⚠️ Tentativa 2 falhou, tentando com apiKey como query parameter...');
          
          // Tentativa 3: Com apiKey como query parameter
          try {
            const naturalPersonApiUrl = 'https://naturalperson.api.nfe.io';
            const endpoint = `/v1/naturalperson/status/${cpfLimpo}/${dataFormatada}?apiKey=${this.apiKey}`;
            
            const naturalPersonClient = axios.create({
              baseURL: naturalPersonApiUrl,
              timeout: 30000,
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log('🌐 Tentativa 3: Usando apiKey como query parameter');
            response = await naturalPersonClient.get(endpoint);
          } catch (error3) {
            // Se todas as tentativas falharem, lançar o último erro
            throw lastError;
          }
        }
      }

      // Log da resposta completa para debug
      console.log('📥 Resposta completa da API:', JSON.stringify(response.data, null, 2));
      
      // A API pode retornar em diferentes formatos
      let data = response.data;
      if (response.data && response.data.data && typeof response.data.data === 'object') {
        data = response.data.data;
        console.log('✅ Dados encontrados em response.data.data');
      } else if (response.data && typeof response.data === 'object') {
        data = response.data;
        console.log('✅ Dados encontrados em response.data');
      }
      
      return {
        success: true,
        data: data,
        cpf: cpfLimpo,
        status: data?.status || data?.situacao || '',
        nome: data?.name || data?.nome || '',
        situacao: data?.situation || data?.situacao || ''
      };
    } catch (error) {
      console.error('❌ Erro ao consultar CPF:', error.response?.data || error.message);
      console.error('📊 Detalhes do erro:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      
      // Tratamento específico para erros de autenticação
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('🔐 Erro de autenticação - verifique a API Key');
      }
      
      // Tratamento específico para erro 404 (CPF não encontrado ou data divergente)
      if (error.response?.status === 404) {
        console.error('🔍 CPF não encontrado ou data de nascimento divergente');
      }
      
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Consulta dados básicos do CNPJ
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/consulta-de-cnpj-v1/v-2-legalentities-basic-info-by-federal-tax-number-get/
   * @param {string} cnpj - CNPJ (apenas números)
   * @returns {Promise<Object>} Dados básicos do CNPJ
   */
  async consultarCNPJBasico(cnpj) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      if (!cnpj) {
        throw new Error('CNPJ é obrigatório');
      }

      // Limpar CNPJ (apenas números)
      const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
      if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
      }

      console.log('🌐 Consultando CNPJ na NFe.io:', cnpjLimpo.substring(0, 3) + '***');
      console.log('🔑 API Key configurada:', this.apiKey ? 'Sim' : 'Não');
      
      // Tentar primeiro com a URL base padrão
      // Se falhar, tentar com subdomínio específico
      let response;
      let lastError;
      
      // Tentativa 1: URL base padrão com Authorization header
      try {
        console.log('🌐 Tentativa 1: Usando api.nfe.io');
        response = await this.client.get(`/v2/legalentities/basicInfo/${cnpjLimpo}`);
      } catch (error1) {
        lastError = error1;
        console.log('⚠️ Tentativa 1 falhou, tentando subdomínio específico...');
        
        // Tentativa 2: Subdomínio específico legalentity.api.nfe.io
        try {
          const legalEntityApiUrl = 'https://legalentity.api.nfe.io';
          const endpoint = `/v2/legalentities/basicInfo/${cnpjLimpo}`;
          
          const legalEntityClient = axios.create({
            baseURL: legalEntityApiUrl,
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.apiKey
            }
          });
          
          console.log('🌐 Tentativa 2: Usando legalentity.api.nfe.io');
          console.log('🌐 URL completa:', `${legalEntityApiUrl}${endpoint}`);
          response = await legalEntityClient.get(endpoint);
          
          // Se a resposta não contém partners, tentar endpoint completo
          if (response.data?.legalEntity && !response.data.legalEntity.partners) {
            console.log('⚠️ Endpoint basicInfo não retornou partners. Tentando endpoint completo...');
            try {
              const fullEndpoint = `/v2/legalentities/${cnpjLimpo}`;
              const fullResponse = await legalEntityClient.get(fullEndpoint);
              console.log('🔍 Tentativa endpoint completo:', `${legalEntityApiUrl}${fullEndpoint}`);
              
              // Se o endpoint completo retornar partners, usar essa resposta
              if (fullResponse.data?.legalEntity?.partners || fullResponse.data?.partners) {
                console.log('✅ Endpoint completo retornou dados com partners!');
                response = fullResponse;
              }
            } catch (fullError) {
              console.log('ℹ️ Endpoint completo também não retornou partners ou falhou:', fullError.response?.status || fullError.message);
            }
          }
        } catch (error2) {
          lastError = error2;
          console.log('⚠️ Tentativa 2 falhou, tentando com apiKey como query parameter...');
          
          // Tentativa 3: Com apiKey como query parameter
          try {
            const legalEntityApiUrl = 'https://legalentity.api.nfe.io';
            const endpoint = `/v2/legalentities/basicInfo/${cnpjLimpo}`;
            
            const legalEntityClient = axios.create({
              baseURL: legalEntityApiUrl,
              timeout: 30000,
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log('🌐 Tentativa 3: Usando apiKey como query parameter');
            console.log('🌐 URL completa:', `${legalEntityApiUrl}${endpoint}?apiKey=...`);
            response = await legalEntityClient.get(`${endpoint}?apiKey=${this.apiKey}`);
            
            // Se a resposta não contém partners, tentar endpoint completo com query parameter
            if (response.data?.legalEntity && !response.data.legalEntity.partners) {
              console.log('⚠️ Tentativa 3 não retornou partners. Tentando endpoint completo com query parameter...');
              try {
                const fullEndpoint = `/v2/legalentities/${cnpjLimpo}`;
                const fullResponse = await legalEntityClient.get(`${fullEndpoint}?apiKey=${this.apiKey}`);
                console.log('🔍 Tentativa endpoint completo com query:', `${legalEntityApiUrl}${fullEndpoint}?apiKey=...`);
                
                if (fullResponse.data?.legalEntity?.partners || fullResponse.data?.partners) {
                  console.log('✅ Endpoint completo com query retornou dados com partners!');
                  response = fullResponse;
                }
              } catch (fullError) {
                console.log('ℹ️ Endpoint completo com query também não retornou partners:', fullError.response?.status || fullError.message);
              }
            }
          } catch (error3) {
            // Se todas as tentativas falharem, lançar o último erro
            throw lastError || error3;
          }
        }
      }

      // Log da resposta completa para debug
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📥 RESPOSTA COMPLETA DA API NFe.io');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🌐 Endpoint:', response.config?.url || 'N/A');
      console.log('📊 Status HTTP:', response.status, response.statusText);
      console.log('📋 Headers da Resposta:');
      console.log(JSON.stringify(response.headers, null, 2));
      console.log('📦 Body completo (response.data):');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('═══════════════════════════════════════════════════════════\n');
      
      // A API pode retornar em diferentes formatos
      let data = response.data;
      
      // Verificar se os dados estão em response.data.legalEntity (formato mais comum)
      if (response.data && response.data.legalEntity && typeof response.data.legalEntity === 'object') {
        data = response.data.legalEntity;
        console.log('✅ Dados encontrados em response.data.legalEntity');
      } else if (response.data && response.data.data && typeof response.data.data === 'object') {
        data = response.data.data;
        console.log('✅ Dados encontrados em response.data.data');
      } else if (response.data && typeof response.data === 'object') {
        data = response.data;
        console.log('✅ Dados encontrados em response.data');
      }
      
      // Verificar se há sócios em diferentes locais da resposta
      console.log('🔍 Verificando sócios na resposta:');
      console.log('  - data.partners:', data?.partners);
      console.log('  - response.data.partners:', response.data?.partners);
      console.log('  - response.data.legalEntity?.partners:', response.data?.legalEntity?.partners);
      console.log('  - response.data.data?.partners:', response.data?.data?.partners);
      
      // Log da estrutura de dados encontrada
      console.log('📋 Estrutura de dados:', {
        hasData: !!data,
        keys: data ? Object.keys(data) : [],
        hasAddress: !!(data?.address),
        hasName: !!(data?.name || data?.tradeName),
        hasFederalTaxNumber: !!(data?.federalTaxNumber)
      });
      
      // Extrair dados com múltiplos fallbacks para diferentes formatos da API
      // Razão social: name é a razão social oficial
      const razaoSocial = data?.name || 
                         data?.razaoSocial || 
                         data?.razao_social || 
                         data?.corporateName ||
                         '';
      
      // Nome fantasia: tradeName é o nome fantasia na API NFe.io
      const nomeFantasia = data?.tradeName || 
                          data?.alias || 
                          data?.nomeFantasia || 
                          data?.nome_fantasia || 
                          data?.fantasyName ||
                          '';
      
      // Endereço pode estar em diferentes estruturas
      const address = data?.address || data?.endereco || {};
      const endereco = address?.street || 
                       address?.logradouro || 
                       address?.addressLine || 
                       '';
      
      const numero = address?.number || 
                     address?.numero || 
                     address?.addressNumber || 
                     '';
      
      const complemento = address?.additionalInformation || 
                         address?.complemento || 
                         address?.complement || 
                         '';
      
      const bairro = address?.district || 
                    address?.bairro || 
                    address?.neighborhood || 
                    '';
      
      // Cidade pode estar aninhada em city.name ou ser string direta
      const cidade = address?.city?.name || 
                     address?.city || 
                     address?.municipio || 
                     address?.cidade || 
                     data?.city?.name ||
                     data?.city ||
                     '';
      
      const uf = address?.state || 
                 address?.uf || 
                 address?.federativeUnit ||
                 data?.state ||
                 '';
      
      const cep = address?.postalCode || 
                  address?.cep || 
                  address?.zipCode ||
                  data?.postalCode ||
                  '';
      
      const telefone = data?.phone || 
                      data?.telefone || 
                      data?.phoneNumber ||
                      '';
      
      const email = data?.email || 
                   data?.emailAddress ||
                   '';
      
      // Situação pode estar em diferentes campos
      const situacao = data?.status || 
                      data?.situacao || 
                      data?.registrationStatus ||
                      data?.situation ||
                      '';
      
      // Data de abertura: openedOn vem no formato ISO 8601, converter para formato brasileiro (YYYY-MM-DD)
      let abertura = '';
      if (data?.openedOn) {
        try {
          const date = new Date(data.openedOn);
          // Formato: YYYY-MM-DD
          abertura = date.toISOString().split('T')[0];
        } catch (e) {
          // Se falhar, usar o valor original
          abertura = String(data.openedOn).substring(0, 10);
        }
      } else {
        abertura = data?.openingDate || 
                  data?.dataAbertura || 
                  data?.data_abertura ||
                  data?.foundedAt ||
                  '';
      }
      
      // Extrair dados de sócios/partners se existirem
      // Segundo a documentação da NFe.io, partners está em legalEntity.partners
      // https://nfe.io/docs/desenvolvedores/rest-api/consulta-de-cnpj-v1/v-2-legalentities-basic-info-by-federal-tax-number-get/
      let partners = [];
      
      // Verificar em diferentes níveis da resposta (priorizando legalEntity.partners conforme documentação)
      if (response.data?.legalEntity?.partners && Array.isArray(response.data.legalEntity.partners)) {
        partners = response.data.legalEntity.partners;
        console.log('✅ Sócios encontrados em response.data.legalEntity.partners (conforme documentação)');
      } else if (data?.partners && Array.isArray(data.partners)) {
        partners = data.partners;
        console.log('✅ Sócios encontrados em data.partners');
      } else if (response.data?.partners && Array.isArray(response.data.partners)) {
        partners = response.data.partners;
        console.log('✅ Sócios encontrados em response.data.partners');
      } else if (response.data?.data?.partners && Array.isArray(response.data.data.partners)) {
        partners = response.data.data.partners;
        console.log('✅ Sócios encontrados em response.data.data.partners');
      }
      
      // Log detalhado para debug
      console.log('🔍 Verificando sócios na resposta (conforme documentação NFe.io):');
      console.log('  - response.data.legalEntity?.partners (PRINCIPAL):', response.data?.legalEntity?.partners);
      console.log('  - data.partners (data = legalEntity):', data?.partners);
      console.log('  - response.data.partners:', response.data?.partners);
      console.log('  - response.data.data?.partners:', response.data?.data?.partners);
      console.log('  - Todos as chaves de data:', data ? Object.keys(data) : 'data é null');
      console.log('  - Todos as chaves de response.data:', response.data ? Object.keys(response.data) : 'response.data é null');
      if (response.data?.legalEntity) {
        console.log('  - Todos as chaves de response.data.legalEntity:', Object.keys(response.data.legalEntity));
        console.log('  - response.data.legalEntity tem partners?', 'partners' in (response.data.legalEntity || {}));
        console.log('  - Tipo de response.data.legalEntity.partners:', typeof response.data.legalEntity.partners);
        console.log('  - É array?', Array.isArray(response.data.legalEntity.partners));
        if (response.data.legalEntity.partners) {
          console.log('  - Tamanho do array partners:', response.data.legalEntity.partners.length);
        }
      }
      
      console.log('📊 Dados extraídos:', {
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cidade,
        uf,
        cep,
        hasPartners: partners.length > 0,
        partnersCount: partners.length
      });
      
      if (partners.length > 0) {
        console.log('👥 Detalhes dos sócios encontrados:', JSON.stringify(partners, null, 2));
      } else {
        console.log('⚠️ Nenhum sócio encontrado na resposta básica. Tentando buscar em endpoint específico...');
        
        // Tentar buscar sócios em diferentes endpoints possíveis
        const endpointsParaTentar = [
          `/v2/legalentities/${cnpjLimpo}/partners`,
          `/v2/legalentities/${cnpjLimpo}/shareholders`,
          `/v2/legalentities/${cnpjLimpo}/socios`,
          `/v2/legalentities/${cnpjLimpo}`, // Endpoint completo (não apenas basicInfo)
        ];
        
        for (const endpoint of endpointsParaTentar) {
          try {
            const legalEntityApiUrl = 'https://legalentity.api.nfe.io';
            
            const legalEntityClient = axios.create({
              baseURL: legalEntityApiUrl,
              timeout: 30000,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': this.apiKey
              }
            });
            
            console.log(`🔍 Tentando buscar sócios em: ${legalEntityApiUrl}${endpoint}`);
            const partnersResponse = await legalEntityClient.get(endpoint);
            
            if (partnersResponse.data) {
              let partnersData = null;
              
              // Verificar diferentes formatos possíveis
              if (partnersResponse.data.partners) {
                partnersData = partnersResponse.data.partners;
              } else if (partnersResponse.data.legalEntity?.partners) {
                partnersData = partnersResponse.data.legalEntity.partners;
              } else if (partnersResponse.data.data?.partners) {
                partnersData = partnersResponse.data.data.partners;
              } else if (partnersResponse.data.shareholders) {
                partnersData = partnersResponse.data.shareholders;
              } else if (partnersResponse.data.legalEntity?.shareholders) {
                partnersData = partnersResponse.data.legalEntity.shareholders;
              } else if (partnersResponse.data.socios) {
                partnersData = partnersResponse.data.socios;
              } else if (Array.isArray(partnersResponse.data)) {
                partnersData = partnersResponse.data;
              }
              
              if (Array.isArray(partnersData) && partnersData.length > 0) {
                partners = partnersData;
                console.log(`✅ Sócios encontrados no endpoint ${endpoint}:`, partners.length);
                console.log('👥 Detalhes dos sócios:', JSON.stringify(partners, null, 2));
                break; // Parar de tentar outros endpoints se encontrou
              }
            }
          } catch (partnersError) {
            // Continuar tentando outros endpoints
            console.log(`ℹ️ Endpoint ${endpoint} não disponível (${partnersError.response?.status || partnersError.message})`);
            continue;
          }
        }
        
        if (partners.length === 0) {
          console.log('⚠️ Nenhum sócio encontrado em nenhum endpoint alternativo.');
          console.log('ℹ️ Isso pode indicar que:');
          console.log('   1. A empresa não possui sócios cadastrados na Receita Federal');
          console.log('   2. Os dados de sócios não estão disponíveis na API NFe.io para este CNPJ');
          console.log('   3. Pode ser necessário um plano/API key com acesso a dados completos');
        }
      }
      
      return {
        success: true,
        data: data,
        cnpj: cnpjLimpo,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        endereco: endereco,
        numero: numero,
        complemento: complemento,
        bairro: bairro,
        cidade: cidade,
        uf: uf,
        cep: cep,
        telefone: telefone,
        email: email,
        situacao: situacao,
        abertura: abertura,
        partners: partners // Incluir sócios na resposta
      };
    } catch (error) {
      console.error('❌ Erro ao consultar CNPJ:', error.response?.data || error.message);
      console.error('📊 Detalhes do erro:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      
      // Tratamento específico para erros de autenticação
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('🔐 Erro de autenticação - verifique a API Key');
      }
      
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Consulta inscrição estadual por CNPJ e UF
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/consulta-de-cnpj-v1/v-2-legalentities-state-tax-info-by-state-by-federal-tax-number-get/
   * @param {string} cnpj - CNPJ (apenas números)
   * @param {string} uf - UF (2 letras)
   * @returns {Promise<Object>} Inscrições estaduais
   */
  async consultarInscricaoEstadual(cnpj, uf) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      if (!cnpj || !uf) {
        throw new Error('CNPJ e UF são obrigatórios');
      }

      const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
      const ufUpper = uf.toUpperCase().substring(0, 2);

      console.log('🌐 Consultando Inscrição Estadual:', cnpjLimpo.substring(0, 3) + '***', ufUpper);
      const response = await this.client.get(`/v2/legalentities/stateTaxInfo/${ufUpper}/${cnpjLimpo}`);

      return {
        success: true,
        data: response.data.data || response.data,
        inscricoes: response.data.data || response.data.items || []
      };
    } catch (error) {
      console.error('❌ Erro ao consultar Inscrição Estadual:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Consulta melhor inscrição estadual para emissão de nota
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/consulta-de-cnpj-v1/v-2-legalentities-state-tax-for-invoice-by-state-by-federal-tax-number-get/
   * @param {string} cnpj - CNPJ (apenas números)
   * @param {string} uf - UF (2 letras)
   * @returns {Promise<Object>} Melhor inscrição estadual para emissão
   */
  async consultarInscricaoEstadualParaEmissao(cnpj, uf) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      if (!cnpj || !uf) {
        throw new Error('CNPJ e UF são obrigatórios');
      }

      const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
      const ufUpper = uf.toUpperCase().substring(0, 2);

      console.log('🌐 Consultando IE para emissão:', cnpjLimpo.substring(0, 3) + '***', ufUpper);
      
      // Usar o subdomínio específico para consultas de CNPJ
      const legalEntityApiUrl = 'https://legalentity.api.nfe.io';
      const endpoint = `/v2/legalentities/stateTaxForInvoice/${ufUpper}/${cnpjLimpo}`;
      
      const legalEntityClient = axios.create({
        baseURL: legalEntityApiUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey
        }
      });
      
      console.log('🌐 URL completa:', `${legalEntityApiUrl}${endpoint}`);
      let response;
      try {
        response = await legalEntityClient.get(endpoint);
      } catch (error) {
        // Se o erro for que a empresa não tem IE no estado, não é um erro crítico
        if (error.response?.status === 404 || 
            (error.response?.data?.errors && 
             error.response.data.errors.some(e => 
               e.message && e.message.includes('not found in the requested state')
             ))) {
          console.log('ℹ️ Empresa não possui inscrição estadual habilitada no estado', ufUpper);
          return {
            success: true,
            inscricao_estadual: '',
            uf: ufUpper,
            habilitada: false,
            message: 'Empresa não possui inscrição estadual habilitada neste estado'
          };
        }
        throw error;
      }

      // A API pode retornar em diferentes formatos
      let data = response.data;
      if (response.data && response.data.legalEntity && typeof response.data.legalEntity === 'object') {
        data = response.data.legalEntity;
        console.log('✅ Dados encontrados em response.data.legalEntity');
      } else if (response.data && response.data.data && typeof response.data.data === 'object') {
        data = response.data.data;
        console.log('✅ Dados encontrados em response.data.data');
      } else if (response.data && typeof response.data === 'object') {
        data = response.data;
        console.log('✅ Dados encontrados em response.data');
      }
      
      // A inscrição estadual está no array stateTaxes
      let inscricaoEstadual = '';
      let habilitada = false;
      
      if (data?.stateTaxes && Array.isArray(data.stateTaxes) && data.stateTaxes.length > 0) {
        // Pegar a primeira inscrição estadual (geralmente é a principal)
        const stateTax = data.stateTaxes[0];
        inscricaoEstadual = stateTax.taxNumber || stateTax.inscricaoEstadual || '';
        // Status "Abled" significa habilitada
        habilitada = stateTax.status === 'Abled' || stateTax.status === 'Enabled' || stateTax.enabled !== false;
        
        console.log('📋 Inscrição Estadual encontrada:', {
          taxNumber: inscricaoEstadual,
          status: stateTax.status,
          habilitada: habilitada
        });
      } else {
        // Fallback para formato antigo
        inscricaoEstadual = data?.stateTaxNumber || data?.inscricaoEstadual || '';
        habilitada = data?.enabled !== false;
      }
      
      return {
        success: true,
        data: data,
        inscricao_estadual: inscricaoEstadual,
        uf: ufUpper,
        habilitada: habilitada
      };
    } catch (error) {
      // Se o erro for que a empresa não tem IE no estado, não é um erro crítico
      if (error.response?.status === 404 || 
          (error.response?.data?.errors && 
           Array.isArray(error.response.data.errors) &&
           error.response.data.errors.some(e => 
             e.message && (
               e.message.includes('not found in the requested state') ||
               e.message.includes('federal tax number is not found')
             )
           ))) {
        console.log('ℹ️ Empresa não possui inscrição estadual habilitada no estado', ufUpper);
        return {
          success: true,
          inscricao_estadual: '',
          uf: ufUpper,
          habilitada: false,
          message: 'Empresa não possui inscrição estadual habilitada neste estado'
        };
      }
      
      console.error('❌ Erro ao consultar IE para emissão:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Consulta endereço por CEP usando ViaCEP (API pública e gratuita)
   * Documentação: https://viacep.com.br/
   * @param {string} cep - CEP (com ou sem formatação)
   * @returns {Promise<Object>} Dados do endereço
   */
  async consultarEnderecoPorCEP(cep) {
    try {
      if (!cep) {
        throw new Error('CEP é obrigatório');
      }

      // Limpar CEP, mantendo apenas números
      const cepLimpo = cep.replace(/[^\d]/g, '');
      if (cepLimpo.length !== 8) {
        throw new Error('CEP deve ter 8 dígitos');
      }

      console.log('🌐 Consultando endereço por CEP na ViaCEP:', cepLimpo);

      // ViaCEP - API pública e gratuita, sem necessidade de autenticação
      const viaCepUrl = `https://viacep.com.br/ws/${cepLimpo}/json/`;
      
      const response = await axios.get(viaCepUrl, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Verificar se o CEP foi encontrado (ViaCEP retorna { erro: true } quando não encontra)
      if (response.data.erro) {
        throw new Error('CEP não encontrado');
      }

      console.log('✅ Consulta de CEP bem-sucedida!');
      console.log('📥 Resposta da ViaCEP:', JSON.stringify(response.data, null, 2));

      // ViaCEP retorna os dados no seguinte formato:
      // {
      //   "cep": "49020-450",
      //   "logradouro": "Rua Coronel Stanley Fernandes da Silveira",
      //   "complemento": "",
      //   "bairro": "São José",
      //   "localidade": "Aracaju",
      //   "uf": "SE",
      //   "ibge": "2800308",
      //   "gia": "",
      //   "ddd": "79",
      //   "siafi": "3001"
      // }

      const data = response.data;
      
      // Extrair e formatar os dados
      const logradouro = data.logradouro || '';
      const bairro = data.bairro || '';
      const cidade = data.localidade || '';
      const uf = data.uf || '';
      const cepRetornado = data.cep || cepLimpo;
      const codigoIbge = data.ibge || ''; // Código IBGE do município (retornado pela ViaCEP)

      console.log('📊 Dados extraídos do CEP:', {
        logradouro,
        bairro,
        cidade,
        uf,
        cep: cepRetornado,
        codigoIbge: codigoIbge
      });

      return {
        success: true,
        data: data,
        logradouro: logradouro,
        bairro: bairro,
        cidade: cidade,
        uf: uf,
        cep: cepRetornado,
        ibge: codigoIbge, // Código IBGE do município
        codigo_ibge: codigoIbge, // Alias
        codigo_municipio: codigoIbge // Alias
      };
    } catch (error) {
      console.error('❌ Erro ao consultar endereço por CEP:', error.response?.data || error.message);
      console.error('📊 Detalhes do erro:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });

      return {
        success: false,
        error: error.response?.data?.erro ? 'CEP não encontrado' : (error.message || 'Erro desconhecido ao consultar CEP'),
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Busca código IBGE do município por cidade e UF
   * Usa API pública para buscar o código IBGE quando não disponível via CEP
   * @param {string} cidade - Nome da cidade
   * @param {string} uf - Sigla do estado (2 letras)
   * @returns {Promise<Object>} Código IBGE do município
   */
  async buscarCodigoIBGEPorCidadeUF(cidade, uf) {
    try {
      if (!cidade || !uf) {
        return {
          success: false,
          error: 'Cidade e UF são obrigatórios para buscar código IBGE'
        };
      }

      const cidadeLimpa = cidade.trim();
      const ufLimpa = uf.trim().toUpperCase();

      console.log('🔍 Buscando código IBGE para:', { cidade: cidadeLimpa, uf: ufLimpa });

      // Tentar buscar via API do IBGE ou API pública
      // Usar API do IBGE via servidordados.ibge.gov.br
      try {
        const ibgeApiUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`;
        const response = await axios.get(ibgeApiUrl, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data && Array.isArray(response.data)) {
          // Normalizar nomes para comparação (remover acentos e converter para maiúsculas)
          const normalizar = (str) => {
            return (str || '').toUpperCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();
          };

          const cidadeNormalizada = normalizar(cidadeLimpa);

          // Buscar município que corresponda à cidade e UF
          // Primeiro, tentar busca exata
          let municipio = response.data.find(m => {
            const nomeMunicipio = normalizar(m.nome || '');
            const siglaUF = (m.microrregiao?.mesorregiao?.UF?.sigla || '').toUpperCase();
            
            return nomeMunicipio === cidadeNormalizada && siglaUF === ufLimpa;
          });

          // Se não encontrar exato, tentar busca parcial (contém)
          if (!municipio) {
            municipio = response.data.find(m => {
              const nomeMunicipio = normalizar(m.nome || '');
              const siglaUF = (m.microrregiao?.mesorregiao?.UF?.sigla || '').toUpperCase();
              
              return nomeMunicipio.includes(cidadeNormalizada) 
                || cidadeNormalizada.includes(nomeMunicipio)
                && siglaUF === ufLimpa;
            });
          }

          if (municipio && municipio.id) {
            const codigoIBGE = String(municipio.id).padStart(7, '0');
            console.log('✅ Código IBGE encontrado via API IBGE:', {
              codigo: codigoIBGE,
              cidade: municipio.nome,
              uf: municipio.microrregiao?.mesorregiao?.UF?.sigla || ufLimpa
            });
            return {
              success: true,
              codigo_ibge: codigoIBGE,
              codigo_municipio: codigoIBGE,
              cidade: municipio.nome,
              uf: municipio.microrregiao?.mesorregiao?.UF?.sigla || ufLimpa
            };
          } else {
            console.warn('⚠️ Município não encontrado na API IBGE:', { cidade: cidadeLimpa, uf: ufLimpa });
          }
        }
      } catch (ibgeError) {
        console.warn('⚠️ Erro ao buscar via API IBGE:', ibgeError.message);
      }

      // Se não encontrar, retornar erro
      return {
        success: false,
        error: `Código IBGE não encontrado para ${cidadeLimpa}/${ufLimpa}. Verifique se o nome da cidade está correto.`
      };
    } catch (error) {
      console.error('❌ Erro ao buscar código IBGE:', error.message);
      return {
        success: false,
        error: error.message || 'Erro ao buscar código IBGE'
      };
    }
  }

  /**
   * Busca endereços por termo
   * Documentação: https://nfe.io/docs/desenvolvedores/rest-api/consulta-de-enderecos-v1/v-2-addresses-by-term-get/
   * @param {string} termo - Termo de busca
   * @returns {Promise<Object>} Lista de endereços
   */
  async consultarEnderecoPorTermo(termo) {
    try {
      if (!this.apiKey || this.apiKey === 'your_nfeio_api_key_here') {
        throw new Error('NFEIO_API_KEY não configurada');
      }

      if (!termo || termo.length < 3) {
        throw new Error('Termo de busca deve ter pelo menos 3 caracteres');
      }

      console.log('🌐 Buscando endereços por termo:', termo);
      const response = await this.client.get(`/v2/addresses/byTerm`, {
        params: { term: termo }
      });

      const addresses = response.data.data || response.data.items || response.data || [];
      
      return {
        success: true,
        data: addresses,
        enderecos: Array.isArray(addresses) ? addresses : [addresses],
        total: Array.isArray(addresses) ? addresses.length : 1
      };
    } catch (error) {
      console.error('❌ Erro ao buscar endereços:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
        enderecos: [],
        total: 0
      };
    }
  }
}

module.exports = new NFeIOService();

