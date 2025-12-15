const express = require('express');
const { 
  listarEmpresas, 
  obterEmpresa, 
  criarEmpresa, 
  atualizarEmpresa, 
  deletarEmpresa,
  gerenciarPessoas,
  obterSocios,
  sincronizarComNFeio,
  importarEmpresaNFeio,
  atualizarEmpresaNFeio,
  listarEmpresasNFeio
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar empresas (com filtros e paginação)
router.get('/', 
  authorize(['empresas:read', '*']), 
  listarEmpresas
);

// Rotas de sincronização com NFe.io (devem vir antes das rotas genéricas)
router.get('/nfeio', 
  authorize(['empresas:read', '*']), 
  listarEmpresasNFeio
);

router.post('/sincronizar-nfeio', 
  authorize(['empresas:write', '*']), 
  sincronizarComNFeio
);

router.post('/importar-nfeio', 
  authorize(['empresas:write', '*']), 
  importarEmpresaNFeio
);

router.post('/:id/sincronizar-nfeio', 
  authorize(['empresas:write', '*']), 
  atualizarEmpresaNFeio
);

// Obter empresa por ID
router.get('/:id', 
  authorize(['empresas:read', '*']), 
  obterEmpresa
);

// Criar nova empresa
router.post('/', 
  authorize(['empresas:write', '*']),
  validateCreate.empresa,
  criarEmpresa
);

// Atualizar empresa
router.patch('/:id', 
  authorize(['empresas:write', '*']),
  atualizarEmpresa
);

// Deletar empresa
router.delete('/:id', 
  authorize(['empresas:write', '*']),
  deletarEmpresa
);

// Gerenciar pessoas vinculadas
router.post('/:id/pessoas', 
  authorize(['empresas:write', '*']),
  gerenciarPessoas
);

// Obter sócios da empresa
router.get('/:id/socios', 
  authorize(['empresas:read', '*']), 
  obterSocios
);

module.exports = router;
