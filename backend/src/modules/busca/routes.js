const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { buscarUnificado } = require('./controller');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Busca unificada
router.get('/unificada', buscarUnificado);

module.exports = router;
