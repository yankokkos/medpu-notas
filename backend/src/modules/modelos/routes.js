const express = require('express');
const { 
  listarModelos, 
  obterModelo, 
  criarModelo, 
  atualizarModelo, 
  deletarModelo,
  obterPorTomador
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar modelos (com filtros e paginação)
router.get('/', 
  authorize(['modelos:read', '*']), 
  listarModelos
);

// Obter modelos por tomador (para NFSeWizard)
router.get('/por-tomador/:tomadorId', 
  authorize(['modelos:read', '*']), 
  obterPorTomador
);

// Obter modelo por ID
router.get('/:id', 
  authorize(['modelos:read', '*']), 
  obterModelo
);

// Criar novo modelo
router.post('/', 
  authorize(['modelos:write', '*']),
  validateCreate.modelo,
  criarModelo
);

// Atualizar modelo
router.patch('/:id', 
  authorize(['modelos:write', '*']),
  atualizarModelo
);

// Deletar modelo
router.delete('/:id', 
  authorize(['modelos:write', '*']),
  deletarModelo
);

module.exports = router;
