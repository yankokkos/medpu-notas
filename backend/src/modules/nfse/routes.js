const express = require('express');
const { 
  listarNotas, 
  obterNota, 
  criarRascunho, 
  atualizarRascunho, 
  emitirNota,
  deletarRascunho,
  cancelarNota
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar notas fiscais (com filtros e paginação)
router.get('/', 
  authorize(['notas:read', '*']), 
  listarNotas
);

// Obter nota por ID
router.get('/:id', 
  authorize(['notas:read', '*']), 
  obterNota
);

// Criar rascunho de nota fiscal
router.post('/', 
  authorize(['notas:write', '*']),
  criarRascunho
);

// Atualizar rascunho
router.patch('/:id', 
  authorize(['notas:write', '*']),
  atualizarRascunho
);

// Emitir nota fiscal
router.post('/:id/emitir', 
  authorize(['notas:write', '*']),
  emitirNota
);

// Cancelar nota fiscal
router.post('/:id/cancelar', 
  authorize(['notas:write', '*']),
  cancelarNota
);

// Deletar rascunho
router.delete('/:id', 
  authorize(['notas:write', '*']),
  deletarRascunho
);

module.exports = router;
