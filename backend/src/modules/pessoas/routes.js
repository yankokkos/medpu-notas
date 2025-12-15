const express = require('express');
const { 
  listarPessoas, 
  obterPessoa, 
  criarPessoa, 
  atualizarPessoa, 
  deletarPessoa 
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar pessoas (com filtros e paginação)
router.get('/', 
  authorize(['pessoas:read', '*']), 
  listarPessoas
);

// Obter pessoa por ID
router.get('/:id', 
  authorize(['pessoas:read', '*']), 
  obterPessoa
);

// Criar nova pessoa
router.post('/', 
  authorize(['pessoas:write', '*']),
  validateCreate.pessoa,
  criarPessoa
);

// Atualizar pessoa
router.patch('/:id', 
  authorize(['pessoas:write', '*']),
  atualizarPessoa
);

// Deletar pessoa
router.delete('/:id', 
  authorize(['pessoas:write', '*']),
  deletarPessoa
);

module.exports = router;
