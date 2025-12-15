-- Migração: Permitir NULL em modelo_discriminacao_id para notas avulsas
-- Data: 2025-01-XX
-- Descrição: Permite que notas avulsas sejam criadas sem modelo de discriminação

-- Remover constraint NOT NULL e foreign key se existir
ALTER TABLE `notas_fiscais` 
  MODIFY COLUMN `modelo_discriminacao_id` int(11) NULL COMMENT 'Modelo usado na discriminação (NULL para notas avulsas)';

-- Atualizar foreign key para permitir NULL
ALTER TABLE `notas_fiscais`
  DROP FOREIGN KEY IF EXISTS `fk_nota_modelo`;

ALTER TABLE `notas_fiscais`
  ADD CONSTRAINT `fk_nota_modelo` 
  FOREIGN KEY (`modelo_discriminacao_id`) 
  REFERENCES `modelos_discriminacao` (`id`) 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;

