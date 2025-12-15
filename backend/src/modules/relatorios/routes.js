const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { 
  relatorioFaturamento, 
  relatorioClientes, 
  relatorioOperacional 
} = require('./controller');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Relatório de faturamento
router.get('/faturamento', relatorioFaturamento);

// Relatório de clientes
router.get('/clientes', relatorioClientes);

// Relatório operacional
router.get('/operacional', relatorioOperacional);

module.exports = router;
