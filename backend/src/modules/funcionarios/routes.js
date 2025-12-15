const express = require('express');
const { 
  listarFuncionarios, 
  obterFuncionario, 
  criarFuncionario, 
  atualizarFuncionario, 
  deletarFuncionario,
  listarFuncoes
} = require('./controller');
const { authenticateToken, authorize, requireAdmin } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar funcionários (com filtros e paginação)
router.get('/', 
  authorize(['funcionarios:read', '*']), 
  listarFuncionarios
);

// Listar funções disponíveis
router.get('/funcoes', 
  authorize(['funcionarios:read', '*']), 
  listarFuncoes
);

// Obter funcionário por ID
router.get('/:id', 
  authorize(['funcionarios:read', '*']), 
  obterFuncionario
);

// Criar novo funcionário (apenas admin)
router.post('/', 
  requireAdmin,
  validateCreate.funcionario,
  criarFuncionario
);

// Atualizar funcionário (apenas admin)
router.patch('/:id', 
  requireAdmin,
  atualizarFuncionario
);

// Deletar funcionário (apenas admin)
router.delete('/:id', 
  requireAdmin,
  deletarFuncionario
);

module.exports = router;
