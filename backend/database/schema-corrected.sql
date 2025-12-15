-- =====================================================
-- SCHEMA CORRIGIDO - FLUXO DE EMISSÃO DE NOTAS
-- Sistema de Gestão Contábil - MVP Fase 1
-- Estrutura baseada no fluxo real de negócio
-- =====================================================

-- =====================================================
-- BLOCO 1: GESTÃO INTERNA (ESCRITÓRIO)
-- =====================================================

-- Tabela de funcionários (usuários do sistema)
CREATE TABLE IF NOT EXISTS `funcionarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome_completo` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  `senha_hash` varchar(255) NOT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `cargo` varchar(100) DEFAULT NULL,
  `status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
  `id_supervisor` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `fk_supervisor` (`id_supervisor`),
  CONSTRAINT `fk_funcionario_supervisor` FOREIGN KEY (`id_supervisor`) REFERENCES `funcionarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de funções/papéis
CREATE TABLE IF NOT EXISTS `funcoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL UNIQUE,
  `descricao` text DEFAULT NULL,
  `permissoes` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relacionamento funcionário-função (N:M)
CREATE TABLE IF NOT EXISTS `funcionario_funcao` (
  `funcionario_id` int(11) NOT NULL,
  `funcao_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`funcionario_id`, `funcao_id`),
  KEY `fk_funcao` (`funcao_id`),
  CONSTRAINT `fk_funcionario_funcao_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_funcionario_funcao_funcao` FOREIGN KEY (`funcao_id`) REFERENCES `funcoes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BLOCO 2: GESTÃO DE CLIENTES (O CORAÇÃO DO DOMÍNIO)
-- =====================================================

-- Tabela de contas (agregado raiz)
CREATE TABLE IF NOT EXISTS `contas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome_conta` varchar(255) NOT NULL,
  `email_principal` varchar(255) NOT NULL,
  `telefone_principal` varchar(20) DEFAULT NULL,
  `data_inicio_contrato` date DEFAULT NULL,
  `status` enum('ATIVO','INATIVO','SUSPENSO') NOT NULL DEFAULT 'ATIVO',
  `tipo_relacionamento` enum('PADRAO','PRO_BONO','PARCERIA_ISENCAO','PARCERIA_REMUNERADA') NOT NULL DEFAULT 'PADRAO',
  `duracao_isencao` int(11) DEFAULT NULL COMMENT 'Duração da isenção em meses',
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nome` (`nome_conta`),
  KEY `idx_status` (`status`),
  KEY `idx_tipo` (`tipo_relacionamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de empresas (PJ) - PODE SER CLIENTE OU INDEPENDENTE
CREATE TABLE IF NOT EXISTS `empresas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conta_id` int(11) DEFAULT NULL COMMENT 'NULL para empresas independentes (não clientes)',
  `cnpj` varchar(18) NOT NULL UNIQUE,
  `razao_social` varchar(255) NOT NULL,
  `nome_fantasia` varchar(255) DEFAULT NULL,
  `inscricao_municipal` varchar(50) NOT NULL,
  `inscricao_estadual` varchar(50) DEFAULT NULL,
  `regime_tributario` varchar(50) DEFAULT NULL,
  `endereco` text DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `uf` varchar(2) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `dados_fiscais` json DEFAULT NULL COMMENT 'Dados específicos para integração fiscal',
  `focusnfe_id` varchar(100) DEFAULT NULL COMMENT 'ID da empresa na API FocusNFe',
  `nfeio_empresa_id` varchar(100) DEFAULT NULL COMMENT 'ID da empresa na API NFe.io',
  `codigo_servico_municipal` varchar(50) DEFAULT NULL COMMENT 'Código do serviço no município (obrigatório para emissão)',
  `codigo_servico_federal` varchar(50) DEFAULT NULL COMMENT 'Código federal do serviço (LC 116)',
  `cnae_code` varchar(10) DEFAULT NULL COMMENT 'Código CNAE',
  `nbs_code` varchar(50) DEFAULT NULL COMMENT 'Código NBS no município',
  `aliquota_iss` decimal(5,2) DEFAULT NULL COMMENT 'Alíquota padrão do ISS (%)',
  `codigo_tributacao` varchar(50) DEFAULT NULL COMMENT 'Código de tributação municipal',
  `certificado_digital_path` varchar(500) DEFAULT NULL COMMENT 'Caminho do certificado digital',
  `certificado_digital_senha` varchar(255) DEFAULT NULL COMMENT 'Senha do certificado (criptografada)',
  `certificado_digital_validade` date DEFAULT NULL COMMENT 'Data de validade do certificado',
  `nfeio_sync_at` datetime DEFAULT NULL COMMENT 'Última sincronização com NFe.io',
  `nfeio_sync_status` enum('pendente','sincronizada','erro') DEFAULT 'pendente' COMMENT 'Status da sincronização',
  `numero_rps` int(11) DEFAULT 1 COMMENT 'Número sequencial do RPS',
  `serie_rps` varchar(10) DEFAULT '1' COMMENT 'Série do RPS',
  `regime_tributario_detalhado` json DEFAULT NULL COMMENT 'Detalhes do regime tributário',
  `configuracoes_fiscais` json DEFAULT NULL COMMENT 'Configurações fiscais específicas',
  `status` enum('ativa','inativa') NOT NULL DEFAULT 'ativa',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cnpj` (`cnpj`),
  KEY `idx_conta` (`conta_id`),
  KEY `idx_status` (`status`),
  KEY `idx_nfeio_empresa_id` (`nfeio_empresa_id`),
  CONSTRAINT `fk_empresa_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de pessoas (PF) - SÓCIOS E FUNCIONÁRIOS
CREATE TABLE IF NOT EXISTS `pessoas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome_completo` varchar(255) NOT NULL,
  `cpf` varchar(14) NOT NULL UNIQUE,
  `email` varchar(255) DEFAULT NULL UNIQUE,
  `telefone` varchar(20) DEFAULT NULL,
  `data_nascimento` date DEFAULT NULL,
  `registro_profissional` varchar(50) DEFAULT NULL COMMENT 'Ex: CRM, CRC, OAB',
  `especialidade` varchar(100) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cpf` (`cpf`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relacionamento pessoa-empresa (N:M) - SÓCIOS E FUNCIONÁRIOS
CREATE TABLE IF NOT EXISTS `pessoa_empresa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pessoa_id` int(11) NOT NULL,
  `empresa_id` int(11) NOT NULL,
  `tipo_vinculo` enum('SOCIO','FUNCIONARIO','FAMILIAR','SECRETARIA') NOT NULL,
  `percentual_participacao` decimal(5,2) DEFAULT NULL COMMENT 'Percentual de participação na empresa',
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `ativo` boolean NOT NULL DEFAULT true COMMENT 'Se o vínculo está ativo',
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pessoa_empresa_ativo` (`pessoa_id`, `empresa_id`, `ativo`),
  KEY `fk_pessoa` (`pessoa_id`),
  KEY `idx_tipo_vinculo` (`tipo_vinculo`),
  KEY `idx_ativo` (`ativo`),
  CONSTRAINT `fk_pessoa_empresa_pessoa` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pessoa_empresa_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relacionamento pessoa-conta (N:M) - VINCULAÇÃO DIRETA
-- Permite vincular pessoas diretamente a contas, além da vinculação indireta através de empresas
CREATE TABLE IF NOT EXISTS `pessoa_conta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pessoa_id` int(11) NOT NULL,
  `conta_id` int(11) NOT NULL,
  `tipo_vinculo` enum('CONSULTOR','REPRESENTANTE','ADMINISTRADOR','OUTROS') NOT NULL DEFAULT 'CONSULTOR',
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `ativo` boolean NOT NULL DEFAULT true COMMENT 'Se o vínculo está ativo',
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pessoa_conta_ativo` (`pessoa_id`, `conta_id`, `ativo`),
  KEY `fk_pessoa_conta_pessoa` (`pessoa_id`),
  KEY `fk_pessoa_conta_conta` (`conta_id`),
  KEY `idx_tipo_vinculo` (`tipo_vinculo`),
  KEY `idx_ativo` (`ativo`),
  CONSTRAINT `fk_pessoa_conta_pessoa` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pessoa_conta_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BLOCO 3: TOMADORES E RELACIONAMENTOS COM SÓCIOS
-- =====================================================

-- Tabela de tomadores - PODE SER PESSOA OU EMPRESA (SIMPLIFICADA)
CREATE TABLE IF NOT EXISTS `tomadores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_tomador` enum('PESSOA','EMPRESA') NOT NULL DEFAULT 'PESSOA',
  `tipo_borrower` enum('NaturalPerson','LegalEntity') DEFAULT NULL COMMENT 'Tipo conforme API NFe.io',
  `pessoa_id` int(11) DEFAULT NULL COMMENT 'ID da pessoa se tipo_tomador = PESSOA',
  `empresa_id` int(11) DEFAULT NULL COMMENT 'ID da empresa se tipo_tomador = EMPRESA',
  `conta_id` int(11) DEFAULT NULL COMMENT 'NULL para tomadores independentes',
  `iss_retido` boolean NOT NULL DEFAULT false,
  `inscricao_municipal` varchar(50) DEFAULT NULL,
  `numero_inscricao_municipal` varchar(50) DEFAULT NULL COMMENT 'Inscrição municipal para PJ (conforme API)',
  `inscricao_estadual` varchar(50) DEFAULT NULL,
  `regime_tributario` enum('Isento','MicroempreendedorIndividual','SimplesNacional','LucroPresumido','LucroReal') DEFAULT NULL COMMENT 'Regime tributário conforme API NFe.io',
  `dados_fiscais_complementares` json DEFAULT NULL COMMENT 'Dados fiscais adicionais',
  `status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tipo_tomador` (`tipo_tomador`),
  KEY `idx_tipo_borrower` (`tipo_borrower`),
  KEY `idx_pessoa` (`pessoa_id`),
  KEY `idx_empresa` (`empresa_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_tomador_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tomador_pessoa` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tomador_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOVA: Tabela de relacionamento sócio-tomador (N:M)
-- Esta é a chave do sistema: quais sócios podem emitir nota para quais tomadores
CREATE TABLE IF NOT EXISTS `socio_tomador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pessoa_id` int(11) NOT NULL COMMENT 'ID do sócio',
  `tomador_id` int(11) NOT NULL COMMENT 'ID do tomador',
  `tipo_relacionamento` enum('CLIENTE','FORNECEDOR','PARCEIRO','OUTROS') NOT NULL DEFAULT 'CLIENTE',
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `ativo` boolean NOT NULL DEFAULT true,
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_socio_tomador_ativo` (`pessoa_id`, `tomador_id`, `ativo`),
  KEY `fk_tomador` (`tomador_id`),
  KEY `idx_tipo_relacionamento` (`tipo_relacionamento`),
  KEY `idx_ativo` (`ativo`),
  CONSTRAINT `fk_socio_tomador_pessoa` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_socio_tomador_tomador` FOREIGN KEY (`tomador_id`) REFERENCES `tomadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BLOCO 4: MODELOS E RELACIONAMENTOS COM TOMADORES
-- =====================================================

-- Tabela de modelos de discriminação
CREATE TABLE IF NOT EXISTS `modelos_discriminacao` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo_modelo` varchar(255) NOT NULL,
  `texto_modelo` text NOT NULL,
  `categoria` enum('MEDICO','JURIDICO','CONTABIL','TECNOLOGIA','CONSULTORIA','OUTROS') NOT NULL DEFAULT 'OUTROS',
  `variaveis_usadas` json DEFAULT NULL COMMENT 'Lista de variáveis usadas no template',
  `funcionario_criador_id` int(11) NOT NULL,
  `uso_frequente` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_titulo` (`titulo_modelo`),
  KEY `idx_categoria` (`categoria`),
  KEY `fk_criador` (`funcionario_criador_id`),
  CONSTRAINT `fk_modelo_funcionario` FOREIGN KEY (`funcionario_criador_id`) REFERENCES `funcionarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOVA: Tabela de relacionamento tomador-modelo (N:M)
-- Quais modelos cada tomador pode usar
CREATE TABLE IF NOT EXISTS `tomador_modelo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tomador_id` int(11) NOT NULL,
  `modelo_id` int(11) NOT NULL,
  `uso_frequente` boolean NOT NULL DEFAULT false,
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `ativo` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tomador_modelo_ativo` (`tomador_id`, `modelo_id`, `ativo`),
  KEY `fk_modelo` (`modelo_id`),
  KEY `idx_uso_frequente` (`uso_frequente`),
  KEY `idx_ativo` (`ativo`),
  CONSTRAINT `fk_tomador_modelo_tomador` FOREIGN KEY (`tomador_id`) REFERENCES `tomadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tomador_modelo_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `modelos_discriminacao` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BLOCO 5: NOTAS FISCAIS - FLUXO CORRETO
-- =====================================================

-- Tabela de notas fiscais de serviço
CREATE TABLE IF NOT EXISTS `notas_fiscais` (
  `id` char(36) NOT NULL COMMENT 'UUID',
  `empresa_id` int(11) NOT NULL COMMENT 'Empresa que emite a nota',
  `tomador_id` int(11) NOT NULL COMMENT 'Tomador que recebe a nota',
  `modelo_discriminacao_id` int(11) DEFAULT NULL COMMENT 'Modelo usado na discriminação (NULL para notas avulsas)',
  `status` enum('RASCUNHO','PROCESSANDO','AUTORIZADA','ERRO','CANCELADA') NOT NULL DEFAULT 'RASCUNHO',
  `valor_total` decimal(15,2) NOT NULL COMMENT 'Valor total da nota',
  `api_ref` varchar(255) DEFAULT NULL UNIQUE COMMENT 'Referência da transação na API externa',
  `api_provider` varchar(50) DEFAULT 'NFEIO' COMMENT 'Provedor da API (NFEIO, FOCUSNFE, etc)',
  `caminho_xml` varchar(500) DEFAULT NULL COMMENT 'URL ou path do arquivo XML',
  `caminho_pdf` varchar(500) DEFAULT NULL COMMENT 'URL ou path do arquivo PDF',
  `mensagem_erro` text DEFAULT NULL COMMENT 'Mensagem de erro da API',
  `data_emissao` datetime DEFAULT NULL COMMENT 'Data e hora em que a nota foi efetivamente autorizada',
  `mes_competencia` varchar(7) NOT NULL COMMENT 'Mês e ano de referência (YYYY-MM)',
  `discriminacao_final` text DEFAULT NULL COMMENT 'Texto final da discriminação',
  `funcionario_criador_id` int(11) NOT NULL,
  -- Campos NFe.io - Códigos de Serviço
  `codigo_servico_municipal` varchar(50) DEFAULT NULL COMMENT 'Código do serviço no município (cityServiceCode)',
  `codigo_servico_federal` varchar(50) DEFAULT NULL COMMENT 'Código federal do serviço (LC 116)',
  `cnae_code` varchar(10) DEFAULT NULL COMMENT 'Código CNAE',
  `nbs_code` varchar(50) DEFAULT NULL COMMENT 'Código NBS no município',
  -- Campos NFe.io - RPS
  `numero_rps` int(11) DEFAULT NULL COMMENT 'Número do RPS',
  `serie_rps` varchar(10) DEFAULT NULL COMMENT 'Série do RPS',
  `data_emissao_rps` datetime DEFAULT NULL COMMENT 'Data de emissão do RPS',
  -- Campos NFe.io - Tributação
  `tipo_tributacao` enum('None','WithinCity','OutsideCity','Export','Free','Immune','SuspendedCourtDecision','SuspendedAdministrativeProcedure','OutsideCityFree','OutsideCityImmune','OutsideCitySuspended','OutsideCitySuspendedAdministrativeProcedure','ObjectiveImune') DEFAULT NULL COMMENT 'Tipo de tributação',
  `aliquota_iss` decimal(5,2) DEFAULT NULL COMMENT 'Alíquota do ISS aplicada (%)',
  `valor_iss` decimal(15,2) DEFAULT NULL COMMENT 'Valor do ISS calculado',
  -- Campos NFe.io - Deduções e Descontos
  `valor_deducoes` decimal(15,2) DEFAULT NULL COMMENT 'Valor de deduções',
  `valor_desconto_incondicionado` decimal(15,2) DEFAULT NULL COMMENT 'Desconto incondicionado',
  `valor_desconto_condicionado` decimal(15,2) DEFAULT NULL COMMENT 'Desconto condicionado',
  -- Campos NFe.io - Retenções
  `valor_retencao_ir` decimal(15,2) DEFAULT NULL COMMENT 'Retenção de Imposto de Renda (IR)',
  `valor_retencao_pis` decimal(15,2) DEFAULT NULL COMMENT 'Retenção de PIS',
  `valor_retencao_cofins` decimal(15,2) DEFAULT NULL COMMENT 'Retenção de COFINS',
  `valor_retencao_csll` decimal(15,2) DEFAULT NULL COMMENT 'Retenção de CSLL',
  `valor_retencao_inss` decimal(15,2) DEFAULT NULL COMMENT 'Retenção de INSS',
  `valor_retencao_iss` decimal(15,2) DEFAULT NULL COMMENT 'Retenção de ISS',
  `valor_outras_retencoes` decimal(15,2) DEFAULT NULL COMMENT 'Outras retenções',
  -- Campos NFe.io - Informações Adicionais
  `informacoes_adicionais` text DEFAULT NULL COMMENT 'Informações adicionais',
  `external_id` varchar(255) DEFAULT NULL UNIQUE COMMENT 'ID externo para idempotência',
  `competencia_mes` int(2) DEFAULT NULL COMMENT 'Mês de competência (1-12)',
  `competencia_ano` int(4) DEFAULT NULL COMMENT 'Ano de competência',
  `tributos_aproximados` json DEFAULT NULL COMMENT 'Tributos aproximados (source, version, totalRate)',
  -- Campos NFe.io - Cálculo de Impostos
  `codigo_operacao` varchar(50) DEFAULT NULL COMMENT 'Código de operação fiscal',
  `finalidade_aquisicao` varchar(50) DEFAULT NULL COMMENT 'Finalidade de aquisição',
  `perfil_fiscal_emissor` varchar(50) DEFAULT NULL COMMENT 'Perfil fiscal do emissor',
  `perfil_fiscal_destinatario` varchar(50) DEFAULT NULL COMMENT 'Perfil fiscal do destinatário',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_empresa` (`empresa_id`),
  KEY `idx_tomador` (`tomador_id`),
  KEY `idx_status` (`status`),
  KEY `idx_competencia` (`mes_competencia`),
  KEY `idx_api_ref` (`api_ref`),
  KEY `idx_external_id` (`external_id`),
  KEY `fk_modelo` (`modelo_discriminacao_id`),
  KEY `fk_criador` (`funcionario_criador_id`),
  CONSTRAINT `fk_nota_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_nota_tomador` FOREIGN KEY (`tomador_id`) REFERENCES `tomadores` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_nota_modelo` FOREIGN KEY (`modelo_discriminacao_id`) REFERENCES `modelos_discriminacao` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_nota_funcionario` FOREIGN KEY (`funcionario_criador_id`) REFERENCES `funcionarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de sócios por nota fiscal - PERCENTUAIS DE PARTICIPAÇÃO
CREATE TABLE IF NOT EXISTS `nota_fiscal_pessoa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nota_fiscal_id` char(36) NOT NULL,
  `pessoa_id` int(11) NOT NULL COMMENT 'Sócio que participa da nota',
  `valor_prestado` decimal(15,2) NOT NULL COMMENT 'Valor do serviço prestado por esta pessoa',
  `percentual_participacao` decimal(5,2) NOT NULL COMMENT 'Percentual de participação no valor total',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nota_pessoa` (`nota_fiscal_id`, `pessoa_id`),
  KEY `fk_pessoa` (`pessoa_id`),
  CONSTRAINT `fk_nf_pessoa_nota` FOREIGN KEY (`nota_fiscal_id`) REFERENCES `notas_fiscais` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nf_pessoa_pessoa` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BLOCO 5.1: TABELAS ADICIONAIS PARA API NFE.IO
-- =====================================================

-- Tabela de localização da prestação de serviço
CREATE TABLE IF NOT EXISTS `nota_fiscal_localizacao` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nota_fiscal_id` char(36) NOT NULL,
  `estado` varchar(2) DEFAULT NULL COMMENT 'Estado',
  `pais` varchar(3) DEFAULT 'BRA' COMMENT 'País (ISO 3166-1)',
  `codigo_postal` varchar(10) DEFAULT NULL COMMENT 'CEP',
  `logradouro` varchar(255) DEFAULT NULL COMMENT 'Logradouro',
  `numero` varchar(20) DEFAULT NULL COMMENT 'Número',
  `bairro` varchar(100) DEFAULT NULL COMMENT 'Bairro',
  `complemento` varchar(100) DEFAULT NULL COMMENT 'Complemento',
  `cidade_codigo` varchar(10) DEFAULT NULL COMMENT 'Código IBGE da cidade',
  `cidade_nome` varchar(100) DEFAULT NULL COMMENT 'Nome da cidade',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nota_localizacao` (`nota_fiscal_id`),
  CONSTRAINT `fk_localizacao_nota` FOREIGN KEY (`nota_fiscal_id`) REFERENCES `notas_fiscais` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de eventos/atividades da nota fiscal
CREATE TABLE IF NOT EXISTS `nota_fiscal_evento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nota_fiscal_id` char(36) NOT NULL,
  `nome_evento` varchar(255) DEFAULT NULL COMMENT 'Nome do evento',
  `data_inicio` datetime DEFAULT NULL COMMENT 'Data de início',
  `data_fim` datetime DEFAULT NULL COMMENT 'Data de fim',
  `codigo_evento` varchar(50) DEFAULT NULL COMMENT 'Código do evento',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_evento_nota` (`nota_fiscal_id`),
  CONSTRAINT `fk_evento_nota_fiscal` FOREIGN KEY (`nota_fiscal_id`) REFERENCES `notas_fiscais` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de histórico de cálculos de impostos
CREATE TABLE IF NOT EXISTS `calculos_impostos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nota_fiscal_id` char(36) NOT NULL,
  `valor_base` decimal(15,2) NOT NULL COMMENT 'Valor base para cálculo',
  `municipio_prestacao` varchar(100) DEFAULT NULL COMMENT 'Município de prestação',
  `codigo_servico` varchar(50) DEFAULT NULL COMMENT 'Código do serviço',
  `codigo_operacao` varchar(50) DEFAULT NULL COMMENT 'Código de operação',
  `finalidade_aquisicao` varchar(50) DEFAULT NULL COMMENT 'Finalidade de aquisição',
  `perfil_fiscal_emissor` varchar(50) DEFAULT NULL COMMENT 'Perfil fiscal do emissor',
  `perfil_fiscal_destinatario` varchar(50) DEFAULT NULL COMMENT 'Perfil fiscal do destinatário',
  `valor_iss` decimal(15,2) DEFAULT NULL COMMENT 'Valor do ISS calculado',
  `aliquota_iss` decimal(5,2) DEFAULT NULL COMMENT 'Alíquota do ISS (%)',
  `base_calculo` decimal(15,2) DEFAULT NULL COMMENT 'Base de cálculo',
  `valor_liquido` decimal(15,2) DEFAULT NULL COMMENT 'Valor líquido',
  `detalhes_calculo` json DEFAULT NULL COMMENT 'Detalhes completos do cálculo',
  `fonte_calculo` varchar(50) DEFAULT NULL COMMENT 'Fonte da taxa (NFe.io, manual, etc)',
  `versao_calculo` varchar(20) DEFAULT NULL COMMENT 'Versão do cálculo',
  `calculado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_calculo_nota` (`nota_fiscal_id`),
  KEY `idx_calculado_em` (`calculado_em`),
  CONSTRAINT `fk_calculo_nota_fiscal` FOREIGN KEY (`nota_fiscal_id`) REFERENCES `notas_fiscais` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de cache de consultas CNPJ
CREATE TABLE IF NOT EXISTS `consultas_cnpj` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cnpj` varchar(18) NOT NULL UNIQUE,
  `razao_social` varchar(255) DEFAULT NULL,
  `nome_fantasia` varchar(255) DEFAULT NULL,
  `situacao_cadastral` varchar(50) DEFAULT NULL,
  `data_abertura` date DEFAULT NULL,
  `capital_social` decimal(15,2) DEFAULT NULL,
  `porte` varchar(50) DEFAULT NULL,
  `natureza_juridica` varchar(100) DEFAULT NULL,
  `endereco_completo` json DEFAULT NULL COMMENT 'Endereço completo em JSON',
  `telefones` json DEFAULT NULL COMMENT 'Lista de telefones',
  `emails` json DEFAULT NULL COMMENT 'Lista de emails',
  `atividades_principais` json DEFAULT NULL COMMENT 'Atividades principais',
  `atividades_secundarias` json DEFAULT NULL COMMENT 'Atividades secundárias',
  `socios` json DEFAULT NULL COMMENT 'Lista de sócios',
  `dados_fiscais` json DEFAULT NULL COMMENT 'Dados fiscais (inscrições, regime, etc)',
  `consultado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `valido_ate` datetime DEFAULT NULL COMMENT 'Validade do cache',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_cnpj` (`cnpj`),
  KEY `idx_valido_ate` (`valido_ate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de cache de consultas CPF
CREATE TABLE IF NOT EXISTS `consultas_cpf` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cpf` varchar(14) NOT NULL,
  `data_nascimento` date NOT NULL,
  `nome` varchar(255) DEFAULT NULL,
  `situacao_cadastral` varchar(50) DEFAULT NULL,
  `dados_complementares` json DEFAULT NULL COMMENT 'Dados complementares da consulta',
  `consultado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `valido_ate` datetime DEFAULT NULL COMMENT 'Validade do cache',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cpf_nascimento` (`cpf`, `data_nascimento`),
  KEY `idx_valido_ate` (`valido_ate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de cache de consultas de endereços (CEP)
CREATE TABLE IF NOT EXISTS `consultas_enderecos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cep` varchar(10) NOT NULL UNIQUE,
  `logradouro` varchar(255) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `cidade_codigo_ibge` varchar(10) DEFAULT NULL COMMENT 'Código IBGE da cidade',
  `estado` varchar(2) DEFAULT NULL,
  `dados_completos` json DEFAULT NULL COMMENT 'Dados completos da consulta',
  `consultado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_cep` (`cep`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de endereços completos de tomadores
CREATE TABLE IF NOT EXISTS `enderecos_tomador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tomador_id` int(11) NOT NULL,
  `tipo_endereco` enum('principal','cobranca','entrega') NOT NULL DEFAULT 'principal',
  `logradouro` varchar(255) NOT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL,
  `bairro` varchar(100) NOT NULL,
  `cidade` varchar(100) NOT NULL,
  `cidade_codigo_ibge` varchar(10) DEFAULT NULL COMMENT 'Código IBGE',
  `estado` varchar(2) NOT NULL,
  `cep` varchar(10) NOT NULL,
  `pais` varchar(3) DEFAULT 'BRA' COMMENT 'País (ISO 3166-1)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_endereco_tomador` (`tomador_id`),
  KEY `idx_tipo_endereco` (`tipo_endereco`),
  CONSTRAINT `fk_endereco_tomador_id` FOREIGN KEY (`tomador_id`) REFERENCES `tomadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BLOCO 6: MÓDULOS FUTUROS (PREPARAÇÃO)
-- =====================================================

-- Tabela de honorários (quanto cada conta deve pagar)
CREATE TABLE IF NOT EXISTS `honorarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conta_id` int(11) NOT NULL,
  `valor_base` decimal(15,2) DEFAULT NULL COMMENT 'Valor base dos honorários (NULL para PERCENTUAL)',
  `tipo_cobranca` enum('FIXO','PERCENTUAL','POR_NOTA','POR_SOCIO') NOT NULL DEFAULT 'FIXO',
  `percentual` decimal(5,2) DEFAULT NULL COMMENT 'Percentual quando tipo_cobranca = PERCENTUAL',
  `valor_por_nota` decimal(15,2) DEFAULT NULL COMMENT 'Valor por nota emitida',
  `considera_socios_ativos` boolean NOT NULL DEFAULT true COMMENT 'Se deve considerar apenas sócios que emitiram notas',
  `mes_referencia` varchar(7) NOT NULL COMMENT 'Mês de referência (YYYY-MM)',
  `status` enum('ATIVO','INATIVO','SUSPENSO') NOT NULL DEFAULT 'ATIVO',
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conta` (`conta_id`),
  KEY `idx_mes` (`mes_referencia`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_honorario_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de movimentações financeiras
CREATE TABLE IF NOT EXISTS `movimentacoes_financeiras` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conta_id` int(11) NOT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `tipo` enum('ENTRADA','SAIDA') NOT NULL,
  `categoria` enum('HONORARIOS','IMPOSTOS','TAXAS','DESCONTO','OUTROS') NOT NULL,
  `valor` decimal(15,2) NOT NULL,
  `descricao` text NOT NULL,
  `data_movimentacao` date NOT NULL,
  `mes_referencia` varchar(7) NOT NULL COMMENT 'Mês de referência (YYYY-MM)',
  `documento_referencia` varchar(255) DEFAULT NULL COMMENT 'Número do documento que originou a movimentação',
  `funcionario_criador_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conta` (`conta_id`),
  KEY `idx_empresa` (`empresa_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_mes` (`mes_referencia`),
  KEY `fk_criador` (`funcionario_criador_id`),
  CONSTRAINT `fk_movimentacao_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_movimentacao_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movimentacao_funcionario` FOREIGN KEY (`funcionario_criador_id`) REFERENCES `funcionarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de distribuição societária
CREATE TABLE IF NOT EXISTS `distribuicoes_societarias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `empresa_id` int(11) NOT NULL,
  `pessoa_id` int(11) NOT NULL,
  `mes_referencia` varchar(7) NOT NULL COMMENT 'Mês de referência (YYYY-MM)',
  `valor_total_notas` decimal(15,2) NOT NULL COMMENT 'Valor total das notas emitidas pela pessoa',
  `percentual_participacao` decimal(5,2) NOT NULL COMMENT 'Percentual de participação nos lucros',
  `valor_distribuicao` decimal(15,2) NOT NULL COMMENT 'Valor a ser distribuído para a pessoa',
  `status` enum('PENDENTE','PAGO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `data_pagamento` date DEFAULT NULL,
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_empresa` (`empresa_id`),
  KEY `idx_pessoa` (`pessoa_id`),
  KEY `idx_mes` (`mes_referencia`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_distribuicao_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribuicao_pessoa` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de serviços oferecidos
CREATE TABLE IF NOT EXISTS `servicos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome_servico` varchar(255) NOT NULL,
  `descricao` text NOT NULL,
  `categoria` enum('MEDICO','JURIDICO','CONTABIL','TECNOLOGIA','CONSULTORIA','OUTROS') NOT NULL DEFAULT 'OUTROS',
  `valor_base` decimal(15,2) DEFAULT NULL COMMENT 'Valor base do serviço',
  `tipo_cobranca` enum('FIXO','PERCENTUAL','POR_HORA','CUSTOMIZAVEL') NOT NULL DEFAULT 'FIXO',
  `disponivel_para` enum('TODOS','PADRAO','PRO_BONO','PARCERIA') NOT NULL DEFAULT 'TODOS',
  `requer_aprovacao` boolean NOT NULL DEFAULT false,
  `status` enum('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nome` (`nome_servico`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de serviços por conta
CREATE TABLE IF NOT EXISTS `conta_servicos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conta_id` int(11) NOT NULL,
  `servico_id` int(11) NOT NULL,
  `valor_customizado` decimal(15,2) DEFAULT NULL COMMENT 'Valor customizado para esta conta',
  `desconto_percentual` decimal(5,2) DEFAULT NULL COMMENT 'Desconto em percentual',
  `status` enum('ATIVO','INATIVO','SUSPENSO') NOT NULL DEFAULT 'ATIVO',
  `data_inicio` date NOT NULL,
  `data_fim` date DEFAULT NULL,
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conta` (`conta_id`),
  KEY `idx_servico` (`servico_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_conta_servico_conta` FOREIGN KEY (`conta_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conta_servico_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BLOCO 7: ENTIDADES GERAIS E DE SUPORTE
-- =====================================================

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS `documentos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome_arquivo` varchar(255) NOT NULL,
  `nome_original` varchar(255) NOT NULL,
  `url_storage` varchar(500) NOT NULL,
  `tipo_arquivo` varchar(50) NOT NULL,
  `tamanho_bytes` bigint NOT NULL,
  `entidade_tipo` enum('Pessoa','Empresa','Tomador') NOT NULL,
  `entidade_id` int(11) NOT NULL,
  `categoria` varchar(50) DEFAULT NULL COMMENT 'Ex: CNH, RG, Contrato, etc.',
  `funcionario_upload_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entidade` (`entidade_tipo`, `entidade_id`),
  KEY `fk_uploader` (`funcionario_upload_id`),
  CONSTRAINT `fk_documento_funcionario` FOREIGN KEY (`funcionario_upload_id`) REFERENCES `funcionarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de endereços
CREATE TABLE IF NOT EXISTS `enderecos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `logradouro` varchar(255) NOT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL,
  `bairro` varchar(100) NOT NULL,
  `municipio` varchar(100) NOT NULL,
  `uf` varchar(2) NOT NULL,
  `cep` varchar(10) NOT NULL,
  `entidade_tipo` enum('Pessoa','Empresa','Tomador') NOT NULL,
  `entidade_id` int(11) NOT NULL,
  `tipo_endereco` enum('residencial','comercial','correspondencia') NOT NULL DEFAULT 'comercial',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entidade` (`entidade_tipo`, `entidade_id`),
  KEY `idx_cep` (`cep`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================

-- Índices compostos para consultas frequentes
CREATE INDEX `idx_empresa_status_conta` ON `empresas` (`status`, `conta_id`);
CREATE INDEX `idx_pessoa_status_cpf` ON `pessoas` (`status`, `cpf`);
CREATE INDEX `idx_nota_status_competencia` ON `notas_fiscais` (`status`, `mes_competencia`);
CREATE INDEX `idx_nota_empresa_status` ON `notas_fiscais` (`empresa_id`, `status`);
CREATE INDEX `idx_tomador_status` ON `tomadores` (`status`);
CREATE INDEX `idx_pessoa_conta_ativo` ON `pessoa_conta` (`pessoa_id`, `conta_id`, `ativo`);

-- Índices adicionais para campos NFe.io
CREATE INDEX `idx_empresa_codigo_servico` ON `empresas` (`codigo_servico_municipal`);
CREATE INDEX `idx_empresa_nfeio_sync` ON `empresas` (`nfeio_sync_status`, `nfeio_sync_at`);
CREATE INDEX `idx_nota_codigo_servico` ON `notas_fiscais` (`codigo_servico_municipal`);
CREATE INDEX `idx_nota_rps` ON `notas_fiscais` (`numero_rps`, `serie_rps`);
CREATE INDEX `idx_nota_competencia_detalhada` ON `notas_fiscais` (`competencia_ano`, `competencia_mes`);
CREATE INDEX `idx_tomador_regime_tributario` ON `tomadores` (`regime_tributario`);
CREATE INDEX `idx_endereco_tomador_tipo` ON `enderecos_tomador` (`tomador_id`, `tipo_endereco`);

-- =====================================================
-- VIEWS PARA CONSULTAS COMPLEXAS
-- =====================================================

-- View para contas com contadores
CREATE OR REPLACE VIEW `vw_contas_completa` AS
SELECT 
    c.*,
    COUNT(DISTINCT e.id) as empresas_count,
    COUNT(DISTINCT COALESCE(pc.pessoa_id, ep.pessoa_id)) as pessoas_count,
    COUNT(DISTINCT t.id) as tomadores_count
FROM `contas` c
LEFT JOIN `empresas` e ON c.id = e.conta_id AND e.status = 'ativa'
LEFT JOIN `pessoa_empresa` ep ON e.id = ep.empresa_id AND ep.ativo = true
LEFT JOIN `pessoa_conta` pc ON c.id = pc.conta_id AND pc.ativo = true
LEFT JOIN `socio_tomador` st ON COALESCE(pc.pessoa_id, ep.pessoa_id) = st.pessoa_id AND st.ativo = true
LEFT JOIN `tomadores` t ON st.tomador_id = t.id AND t.status = 'ativo'
GROUP BY c.id;

-- View para empresas com dados da conta
CREATE OR REPLACE VIEW `vw_empresas_completa` AS
SELECT 
    e.*,
    c.nome_conta,
    c.tipo_relacionamento,
    COUNT(DISTINCT ep.pessoa_id) as pessoas_count
FROM `empresas` e
LEFT JOIN `contas` c ON e.conta_id = c.id
LEFT JOIN `pessoa_empresa` ep ON e.id = ep.empresa_id AND ep.ativo = true
GROUP BY e.id;

-- View para tomadores com dados completos
CREATE OR REPLACE VIEW `vw_tomadores_completos` AS
SELECT
    t.id,
    t.tipo_tomador,
    t.status,
    t.iss_retido,
    t.inscricao_municipal,
    t.inscricao_estadual,
    t.conta_id,
    c.nome_conta as conta_nome,
    t.created_at,
    t.updated_at,
    -- Dados da pessoa (se tipo_tomador = PESSOA)
    p.nome_completo as nome_razao_social,
    p.cpf as cpf_cnpj,
    p.email,
    p.telefone,
    p.registro_profissional,
    p.especialidade,
    -- Dados da empresa (se tipo_tomador = EMPRESA)
    e.razao_social as empresa_nome_razao,
    e.cnpj as empresa_cnpj,
    e.email as empresa_email,
    e.telefone as empresa_telefone,
    e.endereco as empresa_endereco,
    e.cidade as empresa_cidade,
    e.uf as empresa_uf,
    e.cep as empresa_cep,
    -- Campos unificados para compatibilidade
    CASE
        WHEN t.tipo_tomador = 'PESSOA' THEN p.nome_completo
        WHEN t.tipo_tomador = 'EMPRESA' THEN e.razao_social
    END as nome_razao_social_unificado,
    CASE
        WHEN t.tipo_tomador = 'PESSOA' THEN p.cpf
        WHEN t.tipo_tomador = 'EMPRESA' THEN e.cnpj
    END as cpf_cnpj_unificado,
    CASE
        WHEN t.tipo_tomador = 'PESSOA' THEN p.email
        WHEN t.tipo_tomador = 'EMPRESA' THEN e.email
    END as email_unificado,
    CASE
        WHEN t.tipo_tomador = 'PESSOA' THEN p.telefone
        WHEN t.tipo_tomador = 'EMPRESA' THEN e.telefone
    END as telefone_unificado,
    CASE
        WHEN t.tipo_tomador = 'EMPRESA' THEN CONCAT(e.endereco, ', ', e.cidade, ', ', e.uf, ' ', e.cep)
        ELSE NULL
    END as endereco_completo_unificado
FROM tomadores t
LEFT JOIN contas c ON t.conta_id = c.id
LEFT JOIN pessoas p ON t.pessoa_id = p.id AND t.tipo_tomador = 'PESSOA'
LEFT JOIN empresas e ON t.empresa_id = e.id AND t.tipo_tomador = 'EMPRESA';

-- View para notas fiscais com dados relacionados
CREATE OR REPLACE VIEW `vw_notas_completa` AS
SELECT 
    nf.*,
    e.razao_social as empresa_nome,
    e.cnpj as empresa_cnpj,
    vtc.nome_razao_social_unificado as tomador_nome,
    vtc.cpf_cnpj_unificado as tomador_documento,
    vtc.tipo_tomador as tomador_tipo,
    m.titulo_modelo,
    -- Sócios da nota
    GROUP_CONCAT(
        CONCAT(p.nome_completo, ' (', pe.tipo_vinculo, ')')
        SEPARATOR ', '
    ) as socios_nota
FROM `notas_fiscais` nf
LEFT JOIN `empresas` e ON nf.empresa_id = e.id
LEFT JOIN `vw_tomadores_completos` vtc ON nf.tomador_id = vtc.id
LEFT JOIN `modelos_discriminacao` m ON nf.modelo_discriminacao_id = m.id
LEFT JOIN `nota_fiscal_pessoa` nfp ON nf.id = nfp.nota_fiscal_id
LEFT JOIN `pessoas` p ON nfp.pessoa_id = p.id
LEFT JOIN `pessoa_empresa` pe ON p.id = pe.pessoa_id AND pe.empresa_id = e.id AND pe.ativo = true
GROUP BY nf.id, e.razao_social, e.cnpj, vtc.nome_razao_social_unificado, vtc.cpf_cnpj_unificado, vtc.tipo_tomador, m.titulo_modelo;

-- =====================================================
-- FUNÇÕES PARA VALIDAÇÃO DO FLUXO
-- =====================================================

-- Função para validar se sócio pode emitir nota para tomador
DELIMITER $$

CREATE FUNCTION IF NOT EXISTS `validar_socio_tomador`(
    p_empresa_id INT,
    p_tomador_id INT,
    p_pessoa_id INT
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_count INT DEFAULT 0;
    
    -- Verificar se a pessoa é sócio da empresa
    SELECT COUNT(*) INTO v_count
    FROM pessoa_empresa
    WHERE pessoa_id = p_pessoa_id 
    AND empresa_id = p_empresa_id
    AND tipo_vinculo = 'SOCIO'
    AND ativo = true;
    
    IF v_count = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se o sócio tem relacionamento com o tomador
    SELECT COUNT(*) INTO v_count
    FROM socio_tomador
    WHERE pessoa_id = p_pessoa_id 
    AND tomador_id = p_tomador_id
    AND ativo = true;
    
    RETURN v_count > 0;
END$$

DELIMITER ;

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- Estrutura aplicada com sucesso
