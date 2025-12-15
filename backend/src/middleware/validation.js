const { body, validationResult } = require('express-validator');

// Middleware para processar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Validações para CNPJ
const validateCNPJ = (field = 'cnpj') => {
  return body(field)
    .notEmpty()
    .withMessage('CNPJ é obrigatório')
    .isLength({ min: 14, max: 18 })
    .withMessage('CNPJ deve ter entre 14 e 18 caracteres')
    .custom((value) => {
      // Remove formatação
      const cnpj = value.replace(/[^\d]/g, '');
      
      if (cnpj.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
      }

      // Validação básica de CNPJ
      if (/^(\d)\1+$/.test(cnpj)) {
        throw new Error('CNPJ inválido');
      }

      return true;
    });
};

// Validações para CPF
const validateCPF = (field = 'cpf') => {
  return body(field)
    .notEmpty()
    .withMessage('CPF é obrigatório')
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF deve ter entre 11 e 14 caracteres')
    .custom((value) => {
      // Remove formatação
      const cpf = value.replace(/[^\d]/g, '');
      
      if (cpf.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos');
      }

      // Validação básica de CPF
      if (/^(\d)\1+$/.test(cpf)) {
        throw new Error('CPF inválido');
      }

      return true;
    });
};

// Validações para email
const validateEmail = (field = 'email') => {
  return body(field)
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail();
};

// Validações para telefone
const validatePhone = (field = 'telefone') => {
  return body(field)
    .optional()
    .isLength({ min: 10, max: 15 })
    .withMessage('Telefone deve ter entre 10 e 15 caracteres')
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Telefone deve conter apenas números, espaços, parênteses, hífens e +');
};

// Validações para CEP
const validateCEP = (field = 'cep') => {
  return body(field)
    .optional()
    .isLength({ min: 8, max: 10 })
    .withMessage('CEP deve ter entre 8 e 10 caracteres')
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido (00000-000)');
};

// Validações comuns para criação de entidades
const validateCreate = {
  conta: [
    body('nome_conta').notEmpty().withMessage('Nome da conta é obrigatório'),
    body('email_principal').isEmail().withMessage('Email principal deve ser válido'),
    body('telefone_principal').optional().isLength({ min: 10, max: 15 }),
    body('tipo_relacionamento').isIn(['PADRAO', 'PRO_BONO', 'PARCERIA_ISENCAO', 'PARCERIA_REMUNERADA'])
      .withMessage('Tipo de relacionamento inválido'),
    handleValidationErrors
  ],

  empresa: [
    body('conta_id').isInt().withMessage('ID da conta deve ser um número'),
    validateCNPJ('cnpj'),
    body('razao_social').notEmpty().withMessage('Razão social é obrigatória'),
    body('inscricao_municipal').notEmpty().withMessage('Inscrição municipal é obrigatória'),
    body('cidade').notEmpty().withMessage('Cidade é obrigatória'),
    body('uf').isLength({ min: 2, max: 2 }).withMessage('UF deve ter 2 caracteres'),
    validateCEP('cep'),
    handleValidationErrors
  ],

  pessoa: [
    body('nome_completo').notEmpty().withMessage('Nome completo é obrigatório'),
    validateCPF('cpf'),
    validateEmail('email').optional(),
    validatePhone('telefone'),
    handleValidationErrors
  ],

  tomador: [
    body('conta_id').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('ID da conta deve ser um número'),
    body('nome_razao_social').notEmpty().withMessage('Nome/Razão social é obrigatório'),
    body('cnpj_cpf').notEmpty().withMessage('CNPJ/CPF é obrigatório'),
    body('tipo_pessoa').isIn(['PF', 'PJ', 'PESSOA', 'EMPRESA']).withMessage('Tipo de pessoa deve ser PF/PJ ou PESSOA/EMPRESA'),
    body('iss_retido').optional().isBoolean().withMessage('ISS retido deve ser true ou false'),
    handleValidationErrors
  ],

  modelo: [
    body('titulo_modelo').notEmpty().withMessage('Título do modelo é obrigatório'),
    body('texto_modelo').notEmpty().withMessage('Texto do modelo é obrigatório'),
    body('categoria').isIn(['MEDICO', 'JURIDICO', 'CONTABIL', 'TECNOLOGIA', 'CONSULTORIA', 'OUTROS'])
      .withMessage('Categoria inválida'),
    handleValidationErrors
  ],

  funcionario: [
    body('nome_completo').notEmpty().withMessage('Nome completo é obrigatório'),
    validateEmail('email'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('funcoes').isArray().withMessage('Funções deve ser um array'),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  validateCNPJ,
  validateCPF,
  validateEmail,
  validatePhone,
  validateCEP,
  validateCreate
};

