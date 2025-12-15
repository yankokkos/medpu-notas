const express = require('express');
const { login, loginCliente, getMe, refreshToken, logout } = require('./controller');
const { authenticateToken } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Rota de login de funcionário (pública)
router.post('/login', 
  validateCreate.funcionario.filter(field => field.path === 'email' || field.path === 'senha'),
  login
);

// Rota de login de cliente (pública)
router.post('/cliente/login', loginCliente);

// Rotas protegidas
router.get('/me', authenticateToken, getMe);
router.post('/refresh', authenticateToken, refreshToken);
router.post('/logout', authenticateToken, logout);

module.exports = router;
