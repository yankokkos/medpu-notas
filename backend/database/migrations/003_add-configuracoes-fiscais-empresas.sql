-- MIGRAÇÃO: Garantir campos de configurações fiscais e certificado digital na tabela empresas
-- Data: 2024-12-16
-- Descrição: Adiciona campos para configurações fiscais, certificado digital e sincronização NFe.io
-- NOTA: Esta migration é segura - pode ser executada mesmo se os campos já existirem
--       Se algum campo já existir, o MySQL retornará erro que pode ser ignorado

-- IMPORTANTE: Se você já tem o schema-corrected.sql aplicado, esta migration NÃO é necessária!
-- Esta migration é apenas para bancos criados antes desses campos serem adicionados.

-- Adicionar alíquota ISS
-- (Erro será ignorado se coluna já existir)
ALTER TABLE `empresas` 
ADD COLUMN `aliquota_iss` decimal(5,2) DEFAULT NULL COMMENT 'Alíquota padrão do ISS (%)';

-- Adicionar série RPS
ALTER TABLE `empresas` 
ADD COLUMN `serie_rps` varchar(10) DEFAULT '1' COMMENT 'Série do RPS';

-- Adicionar número RPS
ALTER TABLE `empresas` 
ADD COLUMN `numero_rps` int(11) DEFAULT 1 COMMENT 'Número sequencial do RPS';

-- Adicionar caminho do certificado digital
ALTER TABLE `empresas` 
ADD COLUMN `certificado_digital_path` varchar(500) DEFAULT NULL COMMENT 'Caminho do certificado digital';

-- Adicionar senha do certificado digital
ALTER TABLE `empresas` 
ADD COLUMN `certificado_digital_senha` varchar(255) DEFAULT NULL COMMENT 'Senha do certificado (criptografada)';

-- Adicionar validade do certificado digital
ALTER TABLE `empresas` 
ADD COLUMN `certificado_digital_validade` date DEFAULT NULL COMMENT 'Data de validade do certificado';

-- Adicionar configurações fiscais
ALTER TABLE `empresas` 
ADD COLUMN `configuracoes_fiscais` json DEFAULT NULL COMMENT 'Configurações fiscais específicas';

-- Adicionar status de sincronização NFe.io
ALTER TABLE `empresas` 
ADD COLUMN `nfeio_sync_status` enum('pendente','sincronizada','erro') DEFAULT 'pendente' COMMENT 'Status da sincronização';

-- Adicionar data de sincronização NFe.io
ALTER TABLE `empresas` 
ADD COLUMN `nfeio_sync_at` datetime DEFAULT NULL COMMENT 'Última sincronização com NFe.io';

