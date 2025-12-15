const express = require('express');
const { 
  listarNotas, 
  obterNota, 
  criarNota, 
  atualizarNota, 
  deletarNota,
  cancelarNota,
  baixarXML,
  baixarPDF,
  listarCodigosOperacao,
  listarFinalidadesAquisicao,
  listarPerfisFiscaisEmissor,
  listarPerfisFiscaisDestinatario,
  baixarModeloXLSX,
  validarLote,
  criarRascunhosLote,
  emitirLote,
  sincronizarNotaNFeio,
  sincronizarLote,
  baixarXMLsLote,
  baixarPDFsLote,
  calcularImpostos
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas para códigos auxiliares (devem vir antes das rotas com :id)
router.get('/codigos-operacao', 
  authorize(['notas:read', '*']), 
  listarCodigosOperacao
);

router.get('/finalidades-aquisicao', 
  authorize(['notas:read', '*']), 
  listarFinalidadesAquisicao
);

router.get('/perfis-fiscais-emissor', 
  authorize(['notas:read', '*']), 
  listarPerfisFiscaisEmissor
);

router.get('/perfis-fiscais-destinatario', 
  authorize(['notas:read', '*']), 
  listarPerfisFiscaisDestinatario
);

router.post('/calcular-impostos',
  authorize(['notas:read', '*']),
  calcularImpostos
);

// Rotas para emissão em lote (devem vir antes das rotas com :id)
router.get('/modelo-xlsx', 
  authorize(['notas:read', '*']), 
  baixarModeloXLSX
);

router.post('/validar-lote', 
  authorize(['notas:write', '*']), 
  validarLote
);

router.post('/criar-lote', 
  authorize(['notas:write', '*']), 
  criarRascunhosLote
);

router.post('/emitir-lote', 
  authorize(['notas:write', '*']), 
  emitirLote
);

router.post('/sincronizar-lote', 
  authorize(['notas:write', '*']), 
  sincronizarLote
);

router.post('/baixar-xmls-lote', 
  authorize(['notas:read', '*']), 
  baixarXMLsLote
);

router.post('/baixar-pdfs-lote', 
  authorize(['notas:read', '*']), 
  baixarPDFsLote
);

// Listar notas fiscais (com filtros e paginação)
router.get('/', 
  authorize(['notas:read', '*']), 
  listarNotas
);

// Criar nova nota fiscal
router.post('/', 
  authorize(['notas:write', '*']),
  criarNota
);

// Rotas específicas que devem vir ANTES de /:id (ordem importa no Express)
// Baixar XML da nota fiscal
router.get('/:id/xml', 
  authorize(['notas:read', '*']),
  baixarXML
);

// Baixar PDF da nota fiscal
router.get('/:id/pdf', 
  authorize(['notas:read', '*']),
  baixarPDF
);

// Cancelar nota fiscal
router.post('/:id/cancelar', 
  authorize(['notas:write', '*']),
  cancelarNota
);

// Sincronizar/atualizar nota da NFe.io
router.post('/:id/sincronizar', 
  authorize(['notas:write', '*']),
  sincronizarNotaNFeio
);

// Obter nota fiscal por ID (deve vir depois das rotas específicas)
router.get('/:id', 
  authorize(['notas:read', '*']), 
  obterNota
);

// Atualizar nota fiscal
router.patch('/:id', 
  authorize(['notas:write', '*']),
  atualizarNota
);

// Deletar nota fiscal
router.delete('/:id', 
  authorize(['notas:write', '*']),
  deletarNota
);

module.exports = router;
