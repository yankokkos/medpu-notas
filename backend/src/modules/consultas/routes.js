const express = require('express');
const {
  consultarCPF,
  consultarCNPJ,
  consultarInscricaoEstadual,
  consultarInscricaoEstadualEmissao,
  consultarEnderecoPorCEP,
  consultarEnderecoPorTermo
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Consulta CPF
router.get('/cpf/:cpf/:dataNascimento',
  authorize(['consultas:read', '*']),
  consultarCPF
);

// Consulta CNPJ básico - DEVE VIR ANTES das rotas mais específicas
router.get('/cnpj/:cnpj',
  authorize(['consultas:read', '*']),
  (req, res, next) => {
    console.log('🔍 Rota /cnpj/:cnpj chamada com CNPJ:', req.params.cnpj);
    next();
  },
  consultarCNPJ
);

// Consulta Inscrição Estadual
router.get('/cnpj/:cnpj/inscricao-estadual/:uf',
  authorize(['consultas:read', '*']),
  consultarInscricaoEstadual
);

// Consulta Inscrição Estadual para emissão
router.get('/cnpj/:cnpj/inscricao-estadual-emissao/:uf',
  authorize(['consultas:read', '*']),
  consultarInscricaoEstadualEmissao
);

// Consulta endereço por CEP
router.get('/endereco/cep/:cep',
  authorize(['consultas:read', '*']),
  consultarEnderecoPorCEP
);

// Busca endereços por termo
router.get('/endereco/termo/:termo',
  authorize(['consultas:read', '*']),
  consultarEnderecoPorTermo
);

module.exports = router;

