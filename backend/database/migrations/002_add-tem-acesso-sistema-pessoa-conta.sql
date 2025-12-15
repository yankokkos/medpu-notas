-- MIGRAÇÃO: Adicionar campos de acesso ao sistema na tabela pessoa_conta
-- Data: 2024
-- Descrição: Permite marcar quais sócios têm acesso ao sistema como cliente para visualizar relatórios

-- Adicionar coluna tem_acesso_sistema
ALTER TABLE `pessoa_conta` 
ADD COLUMN `tem_acesso_sistema` boolean NOT NULL DEFAULT false 
COMMENT 'Indica se a pessoa tem acesso ao sistema como cliente para visualizar relatórios' 
AFTER `ativo`;

-- Adicionar coluna login_cliente (email ou username único para login)
ALTER TABLE `pessoa_conta` 
ADD COLUMN `login_cliente` varchar(255) DEFAULT NULL 
COMMENT 'Login (email ou username) para acesso ao sistema como cliente' 
AFTER `tem_acesso_sistema`;

-- Adicionar coluna senha_hash (hash bcrypt da senha)
ALTER TABLE `pessoa_conta` 
ADD COLUMN `senha_hash` varchar(255) DEFAULT NULL 
COMMENT 'Hash bcrypt da senha para acesso ao sistema como cliente' 
AFTER `login_cliente`;

-- Criar índices para consultas rápidas
CREATE INDEX `idx_tem_acesso_sistema` ON `pessoa_conta` (`tem_acesso_sistema`);
CREATE UNIQUE INDEX `idx_login_cliente` ON `pessoa_conta` (`login_cliente`);

