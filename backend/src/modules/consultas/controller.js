const nfeioService = require('../../services/nfeioService');

/**
 * Consulta situação cadastral do CPF
 * GET /api/consultas/cpf/:cpf/:dataNascimento
 */
const consultarCPF = async (req, res) => {
  try {
    const { cpf, dataNascimento } = req.params;

    if (!cpf || !dataNascimento) {
      return res.status(400).json({
        success: false,
        message: 'CPF e data de nascimento são obrigatórios'
      });
    }

    const resultado = await nfeioService.consultarCPF(cpf, dataNascimento);

    if (!resultado.success) {
      return res.status(resultado.statusCode || 500).json({
        success: false,
        message: 'Erro ao consultar CPF',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: resultado.data,
      cpf: resultado.cpf,
      status: resultado.status,
      nome: resultado.nome,
      situacao: resultado.situacao
    });
  } catch (error) {
    console.error('Erro ao consultar CPF:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Consulta dados básicos do CNPJ
 * GET /api/consultas/cnpj/:cnpj
 */
const consultarCNPJ = async (req, res) => {
  try {
    const { cnpj } = req.params;

    if (!cnpj) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ é obrigatório'
      });
    }

    const resultado = await nfeioService.consultarCNPJBasico(cnpj);

    if (!resultado.success) {
      return res.status(resultado.statusCode || 500).json({
        success: false,
        message: 'Erro ao consultar CNPJ',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: {
        cnpj: resultado.cnpj,
        razao_social: resultado.razao_social,
        nome_fantasia: resultado.nome_fantasia,
        endereco: resultado.endereco,
        numero: resultado.numero,
        complemento: resultado.complemento,
        bairro: resultado.bairro,
        cidade: resultado.cidade,
        uf: resultado.uf,
        cep: resultado.cep,
        telefone: resultado.telefone,
        email: resultado.email,
        situacao: resultado.situacao,
        abertura: resultado.abertura,
        partners: resultado.partners || [] // Incluir sócios na resposta
      }
    });
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Consulta inscrição estadual por CNPJ e UF
 * GET /api/consultas/cnpj/:cnpj/inscricao-estadual/:uf
 */
const consultarInscricaoEstadual = async (req, res) => {
  try {
    const { cnpj, uf } = req.params;

    if (!cnpj || !uf) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ e UF são obrigatórios'
      });
    }

    const resultado = await nfeioService.consultarInscricaoEstadual(cnpj, uf);

    if (!resultado.success) {
      return res.status(resultado.statusCode || 500).json({
        success: false,
        message: 'Erro ao consultar Inscrição Estadual',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: resultado.data,
      inscricoes: resultado.inscricoes
    });
  } catch (error) {
    console.error('Erro ao consultar Inscrição Estadual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Consulta melhor inscrição estadual para emissão
 * GET /api/consultas/cnpj/:cnpj/inscricao-estadual-emissao/:uf
 */
const consultarInscricaoEstadualEmissao = async (req, res) => {
  try {
    const { cnpj, uf } = req.params;

    if (!cnpj || !uf) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ e UF são obrigatórios'
      });
    }

    const resultado = await nfeioService.consultarInscricaoEstadualParaEmissao(cnpj, uf);

    if (!resultado.success) {
      return res.status(resultado.statusCode || 500).json({
        success: false,
        message: 'Erro ao consultar Inscrição Estadual para emissão',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: resultado.data,
      inscricao_estadual: resultado.inscricao_estadual,
      uf: resultado.uf,
      habilitada: resultado.habilitada
    });
  } catch (error) {
    console.error('Erro ao consultar IE para emissão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Consulta endereço por CEP
 * GET /api/consultas/endereco/cep/:cep
 */
const consultarEnderecoPorCEP = async (req, res) => {
  try {
    const { cep } = req.params;

    if (!cep) {
      return res.status(400).json({
        success: false,
        message: 'CEP é obrigatório'
      });
    }

    const resultado = await nfeioService.consultarEnderecoPorCEP(cep);

    if (!resultado.success) {
      return res.status(resultado.statusCode || 500).json({
        success: false,
        message: 'Erro ao consultar endereço por CEP',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: {
        logradouro: resultado.logradouro,
        bairro: resultado.bairro,
        cidade: resultado.cidade,
        uf: resultado.uf,
        cep: resultado.cep,
        codigo_municipio: resultado.codigo_municipio || resultado.codigo_ibge || resultado.ibge || null,
        codigoIbge: resultado.codigo_municipio || resultado.codigo_ibge || resultado.ibge || null
      }
    });
  } catch (error) {
    console.error('Erro ao consultar endereço por CEP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Busca endereços por termo
 * GET /api/consultas/endereco/termo/:termo
 */
const consultarEnderecoPorTermo = async (req, res) => {
  try {
    const { termo } = req.params;

    if (!termo || termo.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Termo de busca deve ter pelo menos 3 caracteres'
      });
    }

    const resultado = await nfeioService.consultarEnderecoPorTermo(termo);

    if (!resultado.success) {
      return res.status(resultado.statusCode || 500).json({
        success: false,
        message: 'Erro ao buscar endereços',
        error: resultado.error
      });
    }

    res.json({
      success: true,
      data: resultado.enderecos,
      total: resultado.total
    });
  } catch (error) {
    console.error('Erro ao buscar endereços:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  consultarCPF,
  consultarCNPJ,
  consultarInscricaoEstadual,
  consultarInscricaoEstadualEmissao,
  consultarEnderecoPorCEP,
  consultarEnderecoPorTermo
};

