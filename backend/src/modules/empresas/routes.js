const express = require('express');
const multer = require('multer');
const path = require('path');
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
  listarEmpresasNFeio,
  uploadCertificadoDigital,
  buscarCodigosFrequentes
} = require('./controller');
const { authenticateToken, authorize } = require('../../middleware/auth');
const { validateCreate } = require('../../middleware/validation');

const router = express.Router();

// Criar diretório de uploads/temp se não existir
const fs = require('fs');
const uploadsTempDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadsTempDir)) {
  fs.mkdirSync(uploadsTempDir, { recursive: true });
}

// Configurar multer para upload de certificados
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsTempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pfx', '.p12'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo inválido. Use .pfx ou .p12'));
    }
  }
});

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

// Upload de certificado digital
router.post('/:id/certificado-digital', 
  authorize(['empresas:write', '*']),
  upload.single('certificado'),
  uploadCertificadoDigital
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

// Buscar códigos de serviço e CNAEs frequentemente usados
router.get('/:id/codigos-frequentes', 
  authorize(['empresas:read', '*']), 
  buscarCodigosFrequentes
);

module.exports = router;
