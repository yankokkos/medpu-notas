-- =====================================================
-- SEED CORRIGIDO - FLUXO DE EMISSÃO DE NOTAS
-- Sistema de Gestão Contábil - MVP Fase 1
-- Demonstra o fluxo correto: Empresa → Sócios → Tomadores → Modelos → Nota
-- =====================================================

-- Inserir funções/papéis
INSERT IGNORE INTO `funcoes` (`nome`, `descricao`, `permissoes`) VALUES
('Administrador', 'Acesso total ao sistema', '["*"]'),
('Funcionário', 'Acesso operacional básico', '["contas:read", "contas:write", "empresas:read", "empresas:write", "pessoas:read", "pessoas:write", "tomadores:read", "tomadores:write", "modelos:read", "modelos:write", "notas:read", "notas:write"]');

-- Inserir funcionário administrador
INSERT IGNORE INTO `funcionarios` (`nome_completo`, `email`, `senha_hash`, `telefone`, `status`) VALUES
('Administrador Sistema', 'admin@medup.com.br', '$2b$10$i/idIVCWSJ3Ra/4aj5StzOsPHH0Ol/3ym47wS.n4d2emom7Ar9vL.', '(11) 99999-9999', 'ativo');

-- Associar função de administrador
SET @admin_funcionario_id = (SELECT id FROM funcionarios WHERE email = 'admin@medup.com.br' LIMIT 1);
SET @admin_funcao_id = (SELECT id FROM funcoes WHERE nome = 'Administrador' LIMIT 1);

INSERT IGNORE INTO `funcionario_funcao` (`funcionario_id`, `funcao_id`) VALUES
(@admin_funcionario_id, @admin_funcao_id);

-- Inserir contas (clientes nossos)
INSERT IGNORE INTO `contas` (`nome_conta`, `email_principal`, `telefone_principal`, `data_inicio_contrato`, `status`, `tipo_relacionamento`, `observacoes`) VALUES
('Clínica Dr. Santos', 'contato@clinicasantos.com.br', '(11) 99999-9999', '2024-01-15', 'ATIVO', 'PADRAO', 'Cliente padrão'),
('Tech Solutions LTDA', 'admin@techsolutions.com.br', '(11) 88888-8888', '2024-01-20', 'ATIVO', 'PARCERIA_REMUNERADA', 'Parceria com remuneração'),
('Consultoria Médica XYZ', 'contato@consultoriaxyz.com.br', '(11) 66666-6666', '2024-03-01', 'ATIVO', 'PADRAO', 'Consultoria médica especializada');

-- Inserir empresas (CLIENTES E INDEPENDENTES)
SET @conta_clinica_id = (SELECT id FROM contas WHERE nome_conta = 'Clínica Dr. Santos' LIMIT 1);
SET @conta_tech_id = (SELECT id FROM contas WHERE nome_conta = 'Tech Solutions LTDA' LIMIT 1);
SET @conta_consultoria_id = (SELECT id FROM contas WHERE nome_conta = 'Consultoria Médica XYZ' LIMIT 1);

INSERT IGNORE INTO `empresas` (`conta_id`, `cnpj`, `razao_social`, `nome_fantasia`, `inscricao_municipal`, `inscricao_estadual`, `regime_tributario`, `endereco`, `cidade`, `uf`, `cep`, `telefone`, `email`, `codigo_servico_municipal`, `codigo_servico_federal`, `cnae_code`, `aliquota_iss`, `numero_rps`, `serie_rps`, `nfeio_sync_status`, `configuracoes_fiscais`, `status`) VALUES
-- Empresas clientes (conectadas a contas)
(@conta_clinica_id, '12.345.678/0001-90', 'Clínica Dr. Santos LTDA', 'Clínica Santos', '12345', '123.456.789.012', 'Simples Nacional', 'Rua das Flores, 123, Centro', 'São Paulo', 'SP', '01234-567', '(11) 1234-5678', 'contato@clinicasantos.com.br', '1401', '14.01', '8619-0/00', 2.01, 1, '1', 'sincronizada', '{"determinacao_impostos_federacao": "Definido pelo Simples Nacional", "determinacao_impostos_municipio": "Definido pelo Simples Nacional"}', 'ativa'),
(@conta_tech_id, '11.222.333/0001-44', 'Tech Solutions LTDA', 'TechSol', '11111', '111.222.333.444', 'Lucro Real', 'Av. Tecnologia, 789, Vila Tech', 'São Paulo', 'SP', '01234-567', '(11) 1111-2222', 'contato@techsol.com.br', '1501', '15.01', '6201-5/00', 2.01, 1, '1', 'sincronizada', '{"determinacao_impostos_federacao": "Definido pelo Simples Nacional", "determinacao_impostos_municipio": "Definido pelo Simples Nacional"}', 'ativa'),
(@conta_consultoria_id, '33.444.555/0001-66', 'Consultoria Médica XYZ LTDA', 'Consultoria XYZ', '33333', '333.444.555.666', 'Simples Nacional', 'Rua da Medicina, 111, Centro', 'São Paulo', 'SP', '01234-567', '(11) 3333-4444', 'contato@consultoriaxyz.com.br', '1401', '14.01', '8619-0/00', 2.01, 1, '1', 'sincronizada', '{"determinacao_impostos_federacao": "Definido pelo Simples Nacional", "determinacao_impostos_municipio": "Definido pelo Simples Nacional"}', 'ativa'),
-- Empresa independente (NÃO cliente)
(NULL, '99.888.777/0001-11', 'Hospital São Lucas LTDA', 'Hospital São Lucas', '99999', '999.888.777.666', 'Lucro Real', 'Av. das Américas, 1000, Barra da Tijuca', 'Rio de Janeiro', 'RJ', '22640-100', '(21) 3333-4444', 'contato@hospitalsaolucas.com.br', '1401', '14.01', '8619-0/00', 2.01, 1, '1', 'pendente', '{"determinacao_impostos_federacao": "Definido pelo Simples Nacional", "determinacao_impostos_municipio": "Definido pelo Simples Nacional"}', 'ativa');

-- Inserir pessoas (sócios e funcionários)
INSERT IGNORE INTO `pessoas` (`nome_completo`, `cpf`, `email`, `telefone`, `data_nascimento`, `registro_profissional`, `especialidade`, `status`) VALUES
('Dr. João Santos', '123.456.789-00', 'joao.santos@clinicasantos.com.br', '(11) 99999-1111', '1980-05-15', 'CRM-SP 123456', 'Cardiologia', 'ativo'),
('Dra. Maria Santos', '987.654.321-00', 'maria.santos@clinicasantos.com.br', '(11) 99999-2222', '1985-08-22', 'CRM-SP 654321', 'Pediatria', 'ativo'),
('Carlos Silva', '111.222.333-44', 'carlos@techsol.com.br', '(11) 99999-3333', '1982-03-10', 'CRC-SP 111222', 'Contabilidade', 'ativo'),
('Marcos Pereira', '444.555.666-77', 'marcos@techsol.com.br', '(11) 99999-8888', '1987-04-25', 'CRC-SP 444555', 'Contabilidade', 'ativo'),
('Dr. Pedro Oliveira', '222.333.444-55', 'pedro@consultoriaxyz.com.br', '(11) 99999-6666', '1978-09-20', 'CRM-SP 222333', 'Neurologia', 'ativo');

-- Inserir vínculos pessoa-empresa (SÓCIOS)
SET @empresa_clinica_id = (SELECT id FROM empresas WHERE cnpj = '12.345.678/0001-90' LIMIT 1);
SET @empresa_tech_id = (SELECT id FROM empresas WHERE cnpj = '11.222.333/0001-44' LIMIT 1);
SET @empresa_consultoria_id = (SELECT id FROM empresas WHERE cnpj = '33.444.555/0001-66' LIMIT 1);

SET @pessoa_joao_id = (SELECT id FROM pessoas WHERE cpf = '123.456.789-00' LIMIT 1);
SET @pessoa_maria_id = (SELECT id FROM pessoas WHERE cpf = '987.654.321-00' LIMIT 1);
SET @pessoa_carlos_id = (SELECT id FROM pessoas WHERE cpf = '111.222.333-44' LIMIT 1);
SET @pessoa_marcos_id = (SELECT id FROM pessoas WHERE cpf = '444.555.666-77' LIMIT 1);
SET @pessoa_pedro_id = (SELECT id FROM pessoas WHERE cpf = '222.333.444-55' LIMIT 1);

-- Vínculos empresa-pessoa (sócios)
INSERT IGNORE INTO `pessoa_empresa` (`empresa_id`, `pessoa_id`, `tipo_vinculo`, `percentual_participacao`, `data_inicio`, `ativo`) VALUES
-- Clínica Dr. Santos: Dr. João (70%) e Dra. Maria (30%)
(@empresa_clinica_id, @pessoa_joao_id, 'SOCIO', 70.00, '2024-01-15', true),
(@empresa_clinica_id, @pessoa_maria_id, 'SOCIO', 30.00, '2024-01-15', true),
-- Tech Solutions: Carlos (60%) e Marcos (40%)
(@empresa_tech_id, @pessoa_carlos_id, 'SOCIO', 60.00, '2024-01-20', true),
(@empresa_tech_id, @pessoa_marcos_id, 'SOCIO', 40.00, '2024-01-20', true),
-- Consultoria XYZ: Dr. Pedro (100%)
(@empresa_consultoria_id, @pessoa_pedro_id, 'SOCIO', 100.00, '2024-03-01', true);

-- Vínculos pessoa-conta (vinculação direta)
-- Permite vincular pessoas diretamente a contas, além da vinculação indireta através de empresas
INSERT IGNORE INTO `pessoa_conta` (`pessoa_id`, `conta_id`, `tipo_vinculo`, `data_inicio`, `ativo`) VALUES
-- Dr. João Santos vinculado diretamente à conta Clínica Dr. Santos (além de ser sócio da empresa)
(@pessoa_joao_id, @conta_clinica_id, 'CONSULTOR', '2024-01-15', true),
-- Dra. Maria Santos vinculada diretamente à conta Clínica Dr. Santos
(@pessoa_maria_id, @conta_clinica_id, 'CONSULTOR', '2024-01-15', true),
-- Carlos Silva vinculado diretamente à conta Tech Solutions
(@pessoa_carlos_id, @conta_tech_id, 'CONSULTOR', '2024-01-20', true),
-- Marcos Pereira vinculado diretamente à conta Tech Solutions
(@pessoa_marcos_id, @conta_tech_id, 'CONSULTOR', '2024-01-20', true),
-- Dr. Pedro Oliveira vinculado diretamente à conta Consultoria XYZ
(@pessoa_pedro_id, @conta_consultoria_id, 'CONSULTOR', '2024-03-01', true);

-- Inserir tomadores (SIMPLIFICADO - SEM CAMPOS DUPLICADOS)
INSERT IGNORE INTO `tomadores` (`tipo_tomador`, `pessoa_id`, `empresa_id`, `conta_id`, `iss_retido`, `inscricao_municipal`, `inscricao_estadual`, `status`) VALUES
-- Tomador PESSOA (Dr. Pedro Oliveira)
('PESSOA', @pessoa_pedro_id, NULL, @conta_consultoria_id, true, NULL, NULL, 'ativo'),
-- Tomadores EMPRESA (clientes)
('EMPRESA', NULL, @empresa_clinica_id, @conta_clinica_id, false, '12345', '123.456.789.012', 'ativo'),
('EMPRESA', NULL, @empresa_tech_id, @conta_tech_id, false, '11111', '111.222.333.444', 'ativo'),
-- Tomador EMPRESA INDEPENDENTE (Hospital São Lucas - NÃO cliente)
('EMPRESA', NULL, (SELECT id FROM empresas WHERE cnpj = '99.888.777/0001-11' LIMIT 1), NULL, false, '99999', '999.888.777.666', 'ativo');

-- Inserir relacionamentos sócio-tomador (CHAVE DO SISTEMA)
SET @tomador_pedro_id = (SELECT id FROM tomadores WHERE tipo_tomador = 'PESSOA' AND pessoa_id = @pessoa_pedro_id LIMIT 1);
SET @tomador_clinica_id = (SELECT id FROM tomadores WHERE tipo_tomador = 'EMPRESA' AND empresa_id = @empresa_clinica_id LIMIT 1);
SET @tomador_tech_id = (SELECT id FROM tomadores WHERE tipo_tomador = 'EMPRESA' AND empresa_id = @empresa_tech_id LIMIT 1);
SET @tomador_hospital_id = (SELECT id FROM tomadores WHERE tipo_tomador = 'EMPRESA' AND empresa_id = (SELECT id FROM empresas WHERE cnpj = '99.888.777/0001-11' LIMIT 1) LIMIT 1);

-- Relacionamentos sócio-tomador (quais sócios podem emitir nota para quais tomadores)
INSERT IGNORE INTO `socio_tomador` (`pessoa_id`, `tomador_id`, `tipo_relacionamento`, `data_inicio`, `ativo`) VALUES
-- Dr. João Santos pode emitir nota para Hospital São Lucas (empresa independente)
(@pessoa_joao_id, @tomador_hospital_id, 'CLIENTE', '2024-01-15', true),
-- Dra. Maria Santos pode emitir nota para Dr. Pedro Oliveira
(@pessoa_maria_id, @tomador_pedro_id, 'CLIENTE', '2024-01-15', true),
-- Carlos Silva pode emitir nota para Tech Solutions
(@pessoa_carlos_id, @tomador_tech_id, 'CLIENTE', '2024-01-20', true),
-- Marcos Pereira também pode emitir nota para Tech Solutions
(@pessoa_marcos_id, @tomador_tech_id, 'CLIENTE', '2024-01-20', true),
-- Dr. Pedro Oliveira pode emitir nota para Clínica Dr. Santos
(@pessoa_pedro_id, @tomador_clinica_id, 'CLIENTE', '2024-03-01', true);

-- Inserir modelos de discriminação
INSERT IGNORE INTO `modelos_discriminacao` (`titulo_modelo`, `texto_modelo`, `categoria`, `variaveis_usadas`, `funcionario_criador_id`, `uso_frequente`) VALUES
('Consultoria Médica - Cardiologia', 'Consultoria médica especializada em cardiologia, incluindo análise de exames, orientação clínica e acompanhamento de pacientes. Prestador: {{socio.nome}} - CRM {{socio.crm}}. Valor: R$ {{valor}}', 'MEDICO', '["socio.nome", "socio.crm", "valor"]', @admin_funcionario_id, true),
('Consultoria Médica - Pediatria', 'Consultoria médica especializada em pediatria, incluindo acompanhamento do desenvolvimento infantil, orientação nutricional e vacinação. Prestador: {{socio.nome}} - CRM {{socio.crm}}. Valor: R$ {{valor}}', 'MEDICO', '["socio.nome", "socio.crm", "valor"]', @admin_funcionario_id, true),
('Consultoria Contábil', 'Serviços de consultoria contábil, incluindo análise de balanços, orientação fiscal e planejamento tributário. Prestador: {{socio.nome}} - CRC {{socio.crc}}. Valor: R$ {{valor}}', 'CONTABIL', '["socio.nome", "socio.crc", "valor"]', @admin_funcionario_id, true),
('Consultoria Médica - Neurologia', 'Consultoria médica especializada em neurologia, incluindo análise de exames neurológicos, orientação clínica e acompanhamento de pacientes. Prestador: {{socio.nome}} - CRM {{socio.crm}}. Valor: R$ {{valor}}', 'MEDICO', '["socio.nome", "socio.crm", "valor"]', @admin_funcionario_id, true);

-- Inserir relacionamentos tomador-modelo
SET @modelo_cardiologia_id = (SELECT id FROM modelos_discriminacao WHERE titulo_modelo = 'Consultoria Médica - Cardiologia' LIMIT 1);
SET @modelo_pediatria_id = (SELECT id FROM modelos_discriminacao WHERE titulo_modelo = 'Consultoria Médica - Pediatria' LIMIT 1);
SET @modelo_contabil_id = (SELECT id FROM modelos_discriminacao WHERE titulo_modelo = 'Consultoria Contábil' LIMIT 1);
SET @modelo_neurologia_id = (SELECT id FROM modelos_discriminacao WHERE titulo_modelo = 'Consultoria Médica - Neurologia' LIMIT 1);

-- Relacionamentos tomador-modelo (quais modelos cada tomador pode usar)
INSERT IGNORE INTO `tomador_modelo` (`tomador_id`, `modelo_id`, `uso_frequente`, `data_inicio`, `ativo`) VALUES
-- Hospital São Lucas (empresa independente) pode usar modelo de cardiologia
(@tomador_hospital_id, @modelo_cardiologia_id, true, '2024-01-15', true),
-- Dr. Pedro Oliveira pode usar modelo de pediatria
(@tomador_pedro_id, @modelo_pediatria_id, true, '2024-01-15', true),
-- Tech Solutions pode usar modelo contábil
(@tomador_tech_id, @modelo_contabil_id, true, '2024-01-20', true),
-- Clínica Dr. Santos pode usar modelo de neurologia
(@tomador_clinica_id, @modelo_neurologia_id, true, '2024-03-01', true);

-- Inserir notas fiscais (DEMONSTRANDO O FLUXO CORRETO)
INSERT IGNORE INTO `notas_fiscais` (`id`, `empresa_id`, `tomador_id`, `modelo_discriminacao_id`, `status`, `valor_total`, `mes_competencia`, `discriminacao_final`, `funcionario_criador_id`, `codigo_servico_municipal`, `codigo_servico_federal`, `cnae_code`, `numero_rps`, `serie_rps`, `data_emissao_rps`, `tipo_tributacao`, `aliquota_iss`, `valor_iss`, `competencia_mes`, `competencia_ano`, `external_id`) VALUES
-- Nota 1: Clínica Dr. Santos → Hospital São Lucas (empresa independente) - Dr. João Santos
('550e8400-e29b-41d4-a716-446655440001', @empresa_clinica_id, @tomador_hospital_id, @modelo_cardiologia_id, 'AUTORIZADA', 1500.00, '2024-10', 'Consultoria médica especializada em cardiologia, incluindo análise de exames, orientação clínica e acompanhamento de pacientes. Prestador: Dr. João Santos - CRM 123456. Valor: R$ 1500,00', @admin_funcionario_id, '1401', '14.01', '8619-0/00', 1, '1', NOW(), 'WithinCity', 5.00, 75.00, 10, 2024, '550e8400-e29b-41d4-a716-446655440001'),
-- Nota 2: Clínica Dr. Santos → Dr. Pedro Oliveira - Dra. Maria Santos
('550e8400-e29b-41d4-a716-446655440002', @empresa_clinica_id, @tomador_pedro_id, @modelo_pediatria_id, 'AUTORIZADA', 800.00, '2024-10', 'Consultoria médica especializada em pediatria, incluindo acompanhamento do desenvolvimento infantil, orientação nutricional e vacinação. Prestador: Dra. Maria Santos - CRM 654321. Valor: R$ 800,00', @admin_funcionario_id, '1401', '14.01', '8619-0/00', 2, '1', NOW(), 'WithinCity', 5.00, 40.00, 10, 2024, '550e8400-e29b-41d4-a716-446655440002'),
-- Nota 3: Tech Solutions → Tech Solutions (própria empresa) - Carlos Silva e Marcos Pereira
('550e8400-e29b-41d4-a716-446655440003', @empresa_tech_id, @tomador_tech_id, @modelo_contabil_id, 'AUTORIZADA', 2500.00, '2024-10', 'Serviços de consultoria contábil, incluindo análise de balanços, orientação fiscal e planejamento tributário. Prestador: Carlos Silva - CRC 111222. Valor: R$ 2500,00', @admin_funcionario_id, '1501', '15.01', '6201-5/00', 1, '1', NOW(), 'WithinCity', 5.00, 125.00, 10, 2024, '550e8400-e29b-41d4-a716-446655440003'),
-- Nota 4: Consultoria XYZ → Clínica Dr. Santos - Dr. Pedro Oliveira
('550e8400-e29b-41d4-a716-446655440004', @empresa_consultoria_id, @tomador_clinica_id, @modelo_neurologia_id, 'AUTORIZADA', 1800.00, '2024-10', 'Consultoria médica especializada em neurologia, incluindo análise de exames neurológicos, orientação clínica e acompanhamento de pacientes. Prestador: Dr. Pedro Oliveira - CRM 222333. Valor: R$ 1800,00', @admin_funcionario_id, '1401', '14.01', '8619-0/00', 1, '1', NOW(), 'WithinCity', 5.00, 90.00, 10, 2024, '550e8400-e29b-41d4-a716-446655440004');

-- Inserir dados de exemplo para nota_fiscal_pessoa (PERCENTUAIS DE PARTICIPAÇÃO)
INSERT IGNORE INTO `nota_fiscal_pessoa` (`nota_fiscal_id`, `pessoa_id`, `valor_prestado`, `percentual_participacao`) VALUES
-- Nota 1: Dr. João Santos (100% - único sócio)
('550e8400-e29b-41d4-a716-446655440001', @pessoa_joao_id, 1500.00, 100.00),
-- Nota 2: Dra. Maria Santos (100% - única sócia)
('550e8400-e29b-41d4-a716-446655440002', @pessoa_maria_id, 800.00, 100.00),
-- Nota 3: MÚLTIPLOS SÓCIOS - Carlos Silva (60%) e Marcos Pereira (40%)
('550e8400-e29b-41d4-a716-446655440003', @pessoa_carlos_id, 1500.00, 60.00),
('550e8400-e29b-41d4-a716-446655440003', @pessoa_marcos_id, 1000.00, 40.00),
-- Nota 4: Dr. Pedro Oliveira (100% - único sócio)
('550e8400-e29b-41d4-a716-446655440004', @pessoa_pedro_id, 1800.00, 100.00);

-- Inserir dados de exemplo para honorários
INSERT IGNORE INTO `honorarios` (`conta_id`, `valor_base`, `tipo_cobranca`, `percentual`, `valor_por_nota`, `considera_socios_ativos`, `mes_referencia`, `status`, `observacoes`) VALUES
(@conta_clinica_id, 500.00, 'FIXO', NULL, NULL, true, '2024-10', 'ATIVO', 'Honorário fixo mensal'),
(@conta_tech_id, 0.00, 'PERCENTUAL', 5.00, NULL, true, '2024-10', 'ATIVO', '5% sobre o faturamento'),
(@conta_consultoria_id, 300.00, 'POR_NOTA', NULL, 50.00, true, '2024-10', 'ATIVO', 'R$ 50 por nota emitida');

-- Inserir dados de exemplo para movimentações financeiras
INSERT IGNORE INTO `movimentacoes_financeiras` (`conta_id`, `empresa_id`, `tipo`, `categoria`, `valor`, `descricao`, `data_movimentacao`, `mes_referencia`, `documento_referencia`, `funcionario_criador_id`) VALUES
(@conta_clinica_id, @empresa_clinica_id, 'ENTRADA', 'HONORARIOS', 500.00, 'Honorários mensais - Clínica Dr. Santos', '2024-10-01', '2024-10', 'HON-2024-10-001', @admin_funcionario_id),
(@conta_tech_id, @empresa_tech_id, 'ENTRADA', 'HONORARIOS', 125.00, 'Honorários percentuais - Tech Solutions (5% de R$ 2.500)', '2024-10-01', '2024-10', 'HON-2024-10-002', @admin_funcionario_id),
(@conta_consultoria_id, @empresa_consultoria_id, 'ENTRADA', 'HONORARIOS', 50.00, 'Honorários por nota - Consultoria XYZ', '2024-10-01', '2024-10', 'HON-2024-10-003', @admin_funcionario_id);

-- Inserir dados de exemplo para distribuições societárias
INSERT IGNORE INTO `distribuicoes_societarias` (`empresa_id`, `pessoa_id`, `mes_referencia`, `valor_total_notas`, `percentual_participacao`, `valor_distribuicao`, `status`, `observacoes`) VALUES
(@empresa_clinica_id, @pessoa_joao_id, '2024-10', 1500.00, 70.00, 1050.00, 'PENDENTE', 'Distribuição proporcional aos sócios'),
(@empresa_clinica_id, @pessoa_maria_id, '2024-10', 800.00, 30.00, 240.00, 'PENDENTE', 'Distribuição proporcional aos sócios'),
(@empresa_tech_id, @pessoa_carlos_id, '2024-10', 1500.00, 60.00, 900.00, 'PENDENTE', 'Distribuição proporcional aos sócios'),
(@empresa_tech_id, @pessoa_marcos_id, '2024-10', 1000.00, 40.00, 600.00, 'PENDENTE', 'Distribuição proporcional aos sócios'),
(@empresa_consultoria_id, @pessoa_pedro_id, '2024-10', 1800.00, 100.00, 1800.00, 'PENDENTE', 'Distribuição integral');

-- Inserir dados de exemplo para serviços
INSERT IGNORE INTO `servicos` (`nome_servico`, `descricao`, `categoria`, `valor_base`, `tipo_cobranca`, `disponivel_para`, `requer_aprovacao`, `status`) VALUES
('Consultoria Médica', 'Consultoria médica especializada em diversas especialidades', 'MEDICO', 200.00, 'POR_HORA', 'TODOS', false, 'ATIVO'),
('Consultoria Contábil', 'Consultoria contábil e fiscal', 'CONTABIL', 150.00, 'POR_HORA', 'TODOS', false, 'ATIVO');

-- Inserir dados de exemplo para conta_servicos
INSERT IGNORE INTO `conta_servicos` (`conta_id`, `servico_id`, `valor_customizado`, `desconto_percentual`, `status`, `data_inicio`, `observacoes`) VALUES
((SELECT id FROM contas WHERE nome_conta = 'Clínica Dr. Santos' LIMIT 1), (SELECT id FROM servicos WHERE nome_servico = 'Consultoria Médica' LIMIT 1), 180.00, 10.00, 'ATIVO', '2024-01-15', 'Desconto de 10% para cliente padrão'),
((SELECT id FROM contas WHERE nome_conta = 'Tech Solutions LTDA' LIMIT 1), (SELECT id FROM servicos WHERE nome_servico = 'Consultoria Contábil' LIMIT 1), 120.00, 20.00, 'ATIVO', '2024-01-20', 'Desconto de 20% para parceiro'),
((SELECT id FROM contas WHERE nome_conta = 'Consultoria Médica XYZ' LIMIT 1), (SELECT id FROM servicos WHERE nome_servico = 'Consultoria Médica' LIMIT 1), 200.00, 0.00, 'ATIVO', '2024-03-01', 'Valor padrão');

-- =====================================================
-- DADOS ADICIONAIS PARA TABELAS NFE.IO
-- =====================================================

-- Inserir localização de prestação de serviço para notas fiscais
INSERT IGNORE INTO `nota_fiscal_localizacao` (`nota_fiscal_id`, `estado`, `pais`, `codigo_postal`, `logradouro`, `numero`, `bairro`, `cidade_nome`, `cidade_codigo`) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'RJ', 'BRA', '22640-100', 'Av. das Américas', '1000', 'Barra da Tijuca', 'Rio de Janeiro', '3304557'),
('550e8400-e29b-41d4-a716-446655440002', 'SP', 'BRA', '01234-567', 'Rua da Medicina', '111', 'Centro', 'São Paulo', '3550308'),
('550e8400-e29b-41d4-a716-446655440003', 'SP', 'BRA', '01234-567', 'Av. Tecnologia', '789', 'Vila Tech', 'São Paulo', '3550308'),
('550e8400-e29b-41d4-a716-446655440004', 'SP', 'BRA', '01234-567', 'Rua das Flores', '123', 'Centro', 'São Paulo', '3550308');

-- Inserir cálculos de impostos para notas fiscais
INSERT IGNORE INTO `calculos_impostos` (`nota_fiscal_id`, `valor_base`, `municipio_prestacao`, `codigo_servico`, `valor_iss`, `aliquota_iss`, `base_calculo`, `valor_liquido`, `fonte_calculo`, `versao_calculo`) VALUES
('550e8400-e29b-41d4-a716-446655440001', 1500.00, 'Rio de Janeiro', '1401', 75.00, 5.00, 1500.00, 1425.00, 'NFe.io', '1.0'),
('550e8400-e29b-41d4-a716-446655440002', 800.00, 'São Paulo', '1401', 40.00, 5.00, 800.00, 760.00, 'NFe.io', '1.0'),
('550e8400-e29b-41d4-a716-446655440003', 2500.00, 'São Paulo', '1501', 125.00, 5.00, 2500.00, 2375.00, 'NFe.io', '1.0'),
('550e8400-e29b-41d4-a716-446655440004', 1800.00, 'São Paulo', '1401', 90.00, 5.00, 1800.00, 1710.00, 'NFe.io', '1.0');

-- Inserir endereços completos de tomadores
INSERT IGNORE INTO `enderecos_tomador` (`tomador_id`, `tipo_endereco`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `cidade_codigo_ibge`, `estado`, `cep`, `pais`) VALUES
(@tomador_hospital_id, 'principal', 'Av. das Américas', '1000', 'Bloco A', 'Barra da Tijuca', 'Rio de Janeiro', '3304557', 'RJ', '22640-100', 'BRA'),
(@tomador_pedro_id, 'principal', 'Rua da Medicina', '111', 'Apto 101', 'Centro', 'São Paulo', '3550308', 'SP', '01234-567', 'BRA'),
(@tomador_tech_id, 'principal', 'Av. Tecnologia', '789', 'Sala 501', 'Vila Tech', 'São Paulo', '3550308', 'SP', '01234-567', 'BRA'),
(@tomador_clinica_id, 'principal', 'Rua das Flores', '123', 'Conjunto 10', 'Centro', 'São Paulo', '3550308', 'SP', '01234-567', 'BRA');

-- Inserir dados de exemplo para consultas CNPJ (cache)
INSERT IGNORE INTO `consultas_cnpj` (`cnpj`, `razao_social`, `nome_fantasia`, `situacao_cadastral`, `data_abertura`, `capital_social`, `porte`, `natureza_juridica`, `valido_ate`) VALUES
('99.888.777/0001-11', 'Hospital São Lucas LTDA', 'Hospital São Lucas', 'ATIVA', '2010-01-15', 1000000.00, 'DEMAIS', '2062 - Sociedade Empresária Limitada', DATE_ADD(NOW(), INTERVAL 30 DAY)),
('12.345.678/0001-90', 'Clínica Dr. Santos LTDA', 'Clínica Santos', 'ATIVA', '2020-05-20', 500000.00, 'DEMAIS', '2062 - Sociedade Empresária Limitada', DATE_ADD(NOW(), INTERVAL 30 DAY));

-- Inserir dados de exemplo para consultas CPF (cache)
INSERT IGNORE INTO `consultas_cpf` (`cpf`, `data_nascimento`, `nome`, `situacao_cadastral`, `valido_ate`) VALUES
('222.333.444-55', '1978-09-20', 'Dr. Pedro Oliveira', 'REGULAR', DATE_ADD(NOW(), INTERVAL 30 DAY)),
('123.456.789-00', '1980-05-15', 'Dr. João Santos', 'REGULAR', DATE_ADD(NOW(), INTERVAL 30 DAY));

-- Inserir dados de exemplo para consultas de endereços (cache)
INSERT IGNORE INTO `consultas_enderecos` (`cep`, `logradouro`, `bairro`, `cidade`, `cidade_codigo_ibge`, `estado`) VALUES
('22640-100', 'Av. das Américas', 'Barra da Tijuca', 'Rio de Janeiro', '3304557', 'RJ'),
('01234-567', 'Rua das Flores', 'Centro', 'São Paulo', '3550308', 'SP');

-- Comentários finais
-- Este script cria:
-- - 1 usuário administrador
-- - 3 contas de exemplo (clientes)
-- - 4 empresas (3 clientes + 1 independente) com campos NFe.io e configurações fiscais
-- - 5 pessoas de exemplo
-- - 5 vínculos empresa-pessoa (sócios)
-- - 4 tomadores (1 pessoa + 3 empresas, incluindo 1 independente) com campos NFe.io
-- - 5 relacionamentos sócio-tomador (CHAVE DO SISTEMA)
-- - 4 modelos de discriminação
-- - 4 relacionamentos tomador-modelo
-- - 4 notas fiscais (demonstrando o fluxo correto) com campos NFe.io completos
-- - 5 vínculos nota-pessoa (incluindo nota com múltiplos sócios)
-- - 4 localizações de prestação de serviço
-- - 4 cálculos de impostos
-- - 4 endereços completos de tomadores
-- - 2 consultas CNPJ em cache
-- - 2 consultas CPF em cache
-- - 2 consultas de endereços em cache
-- - 3 honorários de exemplo
-- - 3 movimentações financeiras
-- - 5 distribuições societárias
-- - 2 serviços de exemplo
-- - 3 vínculos conta-serviço
-- - FLUXO CORRETO: Empresa → Sócios → Tomadores → Modelos → Nota
-- - EMPRESA INDEPENDENTE: Hospital São Lucas (não cliente, mas tomador)
-- - COMPATIBILIDADE COMPLETA COM API NFE.IO
-- - CONFIGURAÇÕES FISCAIS: Determinação de impostos, alíquota ISS (2.01%), série/número RPS
-- - CERTIFICADO DIGITAL: Campos preparados para upload (path, senha, validade)
