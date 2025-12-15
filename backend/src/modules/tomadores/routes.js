const express = require('express');
const { 
  listarTomadores, 
  obterTomador, 
  criarTomador, 
  atualizarTomador, 
  deletarTomador,
  obterPorSocios,
  obterSocios,
  vincularSocio,
  removerSocio,
  gerenciarModelos,
  obterModelos
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar tomadores (com filtros e paginação)
router.get('/', 
  authorize(['tomadores:read', '*']), 
  listarTomadores
);

// Obter tomadores por sócios (para NFSeWizard)
router.get('/por-socios', 
  authorize(['tomadores:read', '*']), 
  obterPorSocios
);

// IMPORTANTE: Rotas mais específicas devem vir ANTES das rotas genéricas
// Obter modelos vinculados ao tomador
router.get('/:id/modelos', 
  authorize(['tomadores:read', '*']),
  obterModelos
);

// Gerenciar modelos vinculados ao tomador
router.post('/:id/modelos', 
  authorize(['tomadores:write', '*']),
  gerenciarModelos
);

// Obter sócios vinculados ao tomador
router.get('/:id/socios', 
  authorize(['tomadores:read', '*']),
  obterSocios
);

// Vincular tomador a sócio
router.post('/:id/socios', 
  authorize(['tomadores:write', '*']),
  vincularSocio
);

// Remover vínculo de sócio do tomador
router.delete('/:id/socios/:socio_id', 
  authorize(['tomadores:write', '*']),
  removerSocio
);

// Obter tomador por ID (deve vir depois das rotas mais específicas)
router.get('/:id', 
  authorize(['tomadores:read', '*']), 
  obterTomador
);

// Criar novo tomador
router.post('/', 
  authorize(['tomadores:write', '*']),
  validateCreate.tomador,
  criarTomador
);

// Atualizar tomador
router.patch('/:id', 
  authorize(['tomadores:write', '*']),
  atualizarTomador
);

// Deletar tomador
router.delete('/:id', 
  authorize(['tomadores:write', '*']),
  deletarTomador
);

module.exports = router;
