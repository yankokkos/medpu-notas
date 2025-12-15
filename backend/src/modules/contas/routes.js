const express = require('express');
const { 
  listarContas, 
  obterConta, 
  criarConta, 
  atualizarConta, 
  deletarConta,
  gerenciarEmpresas,
  gerenciarPessoas
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar contas (com filtros e paginação)
router.get('/', 
  authorize(['contas:read', '*']), 
  listarContas
);

// Criar nova conta (ANTES das rotas específicas)
router.post('/', 
  authorize(['contas:write', '*']),
  validateCreate.conta,
  criarConta
);

// Gerenciar empresas vinculadas à conta (SPECIFIC ROUTE - antes de /:id)
router.post('/:id/empresas',
  authorize(['contas:write', '*']),
  gerenciarEmpresas
);

// Gerenciar pessoas vinculadas à conta (SPECIFIC ROUTE - antes de /:id)
router.post('/:id/pessoas',
  authorize(['contas:write', '*']),
  gerenciarPessoas
);

// Obter conta por ID (GENERIC ROUTE - depois das específicas)
router.get('/:id', 
  authorize(['contas:read', '*']), 
  obterConta
);

// Atualizar conta
router.patch('/:id', 
  authorize(['contas:write', '*']),
  atualizarConta
);

// Deletar conta
router.delete('/:id', 
  authorize(['contas:write', '*']),
  deletarConta
);

module.exports = router;
