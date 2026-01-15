import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { BatchEmissionTable } from './BatchEmissionTable';
import { notasService, empresasService, tomadoresService } from '../services/api';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle, Eye, ExternalLink, FileCheck } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';

interface BatchEmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BatchRow {
  id: string;
  empresa_id: string;
  tomador_id: string;
  // Campos para tomador não cadastrado
  tomador_nome?: string;
  tomador_cpf_cnpj?: string;
  tomador_tipo?: 'PESSOA' | 'EMPRESA';
  tomador_cep?: string;
  tomador_logradouro?: string;
  tomador_numero?: string;
  tomador_complemento?: string;
  tomador_bairro?: string;
  tomador_cidade?: string;
  tomador_uf?: string;
  socios_ids: number[];
  valores: Record<number, number>;
  mes_competencia: string;
  modelo_id?: string;
  discriminacao?: string;
  codigo_servico_municipal?: string;
}

export function BatchEmissionDialog({ isOpen, onClose, onSuccess }: BatchEmissionDialogProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'create' | 'select'>('import');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdNotas, setCreatedNotas] = useState<string[]>([]);
  const [createdNotasDetails, setCreatedNotasDetails] = useState<any[]>([]);
  const [emissionResults, setEmissionResults] = useState<any[]>([]);
  const [viewingNotaId, setViewingNotaId] = useState<string | null>(null);
  
  // Estados para seleção de rascunhos
  const [rascunhos, setRascunhos] = useState<any[]>([]);
  const [selectedRascunhos, setSelectedRascunhos] = useState<Set<string>>(new Set());
  const [loadingRascunhos, setLoadingRascunhos] = useState(false);

  // Resetar estado quando fechar
  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setValidationErrors({});
      setValidationResult(null);
      setCreatedNotas([]);
      setCreatedNotasDetails([]);
      setEmissionResults([]);
      setProgress(0);
      setActiveTab('import');
      setViewingNotaId(null);
      setRascunhos([]);
      setSelectedRascunhos(new Set());
    }
  }, [isOpen]);

  // Carregar rascunhos quando abrir a aba de seleção
  useEffect(() => {
    if (isOpen && activeTab === 'select') {
      loadRascunhos();
    }
  }, [isOpen, activeTab]);

  // Carregar notas em rascunho
  const loadRascunhos = async () => {
    try {
      setLoadingRascunhos(true);
      const response = await notasService.listar({
        page: 1,
        limit: 1000, // Carregar muitas notas para seleção
        status: 'RASCUNHO'
      });
      
      if (response.success) {
        setRascunhos(response.data.notas || []);
      } else {
        toast.error('Erro ao carregar rascunhos');
        setRascunhos([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar rascunhos:', error);
      toast.error('Erro ao carregar rascunhos');
      setRascunhos([]);
    } finally {
      setLoadingRascunhos(false);
    }
  };

  // Toggle seleção de rascunho
  const toggleRascunhoSelection = (notaId: string) => {
    const newSelected = new Set(selectedRascunhos);
    if (newSelected.has(notaId)) {
      newSelected.delete(notaId);
    } else {
      newSelected.add(notaId);
    }
    setSelectedRascunhos(newSelected);
  };

  // Selecionar todos os rascunhos
  const selectAllRascunhos = () => {
    if (selectedRascunhos.size === rascunhos.length) {
      setSelectedRascunhos(new Set());
    } else {
      setSelectedRascunhos(new Set(rascunhos.map(n => n.id)));
    }
  };

  // Validar rascunhos selecionados
  const handleValidateSelected = async () => {
    if (selectedRascunhos.size === 0) {
      toast.error('Selecione pelo menos um rascunho para validar');
      return;
    }

    try {
      setLoading(true);
      setValidationErrors({});
      
      // Buscar dados completos dos rascunhos selecionados
      const notasParaValidar = await Promise.all(
        Array.from(selectedRascunhos).map(async (id) => {
          try {
            const response = await notasService.obter(id);
            if (response.success && response.data?.nota) {
              const nota = response.data.nota;
              const socios = response.data.socios || [];
              
              // Converter sócios para o formato esperado pela validação
              const sociosFormatados = socios.map((s: any) => ({
                pessoa_id: s.pessoa_id,
                valor_prestado: parseFloat(s.valor_prestado || 0)
              }));

              return {
                id: nota.id,
                empresa_id: nota.empresa_id,
                tomador_id: nota.tomador_id,
                socios: sociosFormatados,
                mes_competencia: nota.mes_competencia,
                modelo_discriminacao_id: nota.modelo_discriminacao_id,
                discriminacao_final: nota.discriminacao_final,
              };
            }
          } catch (error) {
            console.error(`Erro ao buscar nota ${id}:`, error);
          }
          return null;
        })
      );

      const notasValidas = notasParaValidar.filter(n => n !== null);
      
      if (notasValidas.length === 0) {
        toast.error('Não foi possível carregar os dados dos rascunhos selecionados');
        return;
      }

      // Preparar dados para validação (formato esperado pelo backend)
      // O backend espera socios_ids (array) e valores (objeto), não socios (array de objetos)
      const dadosParaValidar = notasValidas.map(nota => {
        // Converter socios (array de objetos) para socios_ids e valores
        const socios_ids = nota.socios.map((s: any) => s.pessoa_id);
        const valores: Record<number, number> = {};
        nota.socios.forEach((s: any) => {
          valores[s.pessoa_id] = parseFloat(s.valor_prestado || 0);
        });

        return {
          id: nota.id,
          empresa_id: nota.empresa_id,
          tomador_id: nota.tomador_id,
          socios_ids: socios_ids,
          valores: valores,
          mes_competencia: nota.mes_competencia,
          modelo_id: nota.modelo_discriminacao_id,
          discriminacao: nota.discriminacao_final,
          codigo_servico_municipal: (nota as any).codigo_servico_municipal,
        };
      });

      const response = await notasService.validarLote(dadosParaValidar);
      
      if (response.success) {
        setValidationResult(response.data);
        
        // Mapear erros para as notas selecionadas
        const errors: Record<string, string[]> = {};
        if (response.data.erros && Array.isArray(response.data.erros)) {
          response.data.erros.forEach((erro: any) => {
            // erro.linha é o índice no array dadosParaValidar
            if (erro.linha !== undefined && dadosParaValidar[erro.linha]) {
              const notaId = dadosParaValidar[erro.linha].id;
              if (!errors[notaId]) errors[notaId] = [];
              errors[notaId].push(erro.mensagem);
            }
          });
        }
        setValidationErrors(errors);
        
        if (response.data.erros && response.data.erros.length > 0) {
          toast.warning(`Validação concluída com ${response.data.erros.length} erro(s)`);
        } else {
          toast.success('Validação concluída com sucesso! Todos os dados estão corretos.');
        }
      } else {
        toast.error(response.message || 'Erro na validação');
      }
    } catch (error: any) {
      console.error('Erro ao validar:', error);
      toast.error(error.response?.data?.message || 'Erro ao validar dados');
    } finally {
      setLoading(false);
    }
  };

  // Emitir rascunhos selecionados
  const handleEmitSelected = async () => {
    if (selectedRascunhos.size === 0) {
      toast.error('Selecione pelo menos um rascunho para emitir');
      return;
    }

    if (!confirm(`Tem certeza que deseja emitir ${selectedRascunhos.size} nota(s) em lote?`)) {
      return;
    }

    try {
      setEmitting(true);
      setProgress(0);
      setEmissionResults([]);

      const ids = Array.from(selectedRascunhos);
      const response = await notasService.emitirLote(ids);
      
      if (response.success) {
        setEmissionResults(response.data.resultados || []);
        const sucessos = response.data.resultados?.filter((r: any) => r.success).length || 0;
        const erros = response.data.resultados?.filter((r: any) => !r.success).length || 0;
        
        toast.success(`Emissão concluída: ${sucessos} sucesso(s), ${erros} erro(s)`);
        setProgress(100);
        
        // Recarregar rascunhos após emissão
        await loadRascunhos();
        setSelectedRascunhos(new Set());
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.message || 'Erro ao emitir em lote');
      }
    } catch (error: any) {
      console.error('Erro ao emitir em lote:', error);
      toast.error(error.response?.data?.message || 'Erro ao emitir em lote');
    } finally {
      setEmitting(false);
    }
  };

  // Baixar modelo XLSX
  const handleDownloadModel = async () => {
    try {
      setLoading(true);
      await notasService.baixarModeloXLSX();
      toast.success('Modelo baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao baixar modelo:', error);
      toast.error(error.response?.data?.message || 'Erro ao baixar modelo');
    } finally {
      setLoading(false);
    }
  };

  // Processar arquivo XLSX importado
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('O arquivo está vazio');
        return;
      }

      // Converter dados do XLSX para formato de linhas
      // Primeiro, buscar empresas e tomadores para resolver CNPJs/CPFs
      const empresasList = await empresasService.getAll({ status: 'ativa', pode_emitir: 'true' });
      const tomadoresList = await tomadoresService.getAll({ status: 'ativo' });
      
      const empresasMap = new Map();
      empresasList.data?.empresas?.forEach((emp: any) => {
        if (emp.cnpj) {
          empresasMap.set(emp.cnpj.replace(/[^\d]/g, ''), emp.id);
        }
      });
      
      const tomadoresMap = new Map();
      tomadoresList.data?.tomadores?.forEach((tom: any) => {
        const doc = tom.cnpj_cpf?.replace(/[^\d]/g, '') || '';
        if (doc) {
          tomadoresMap.set(doc, tom.id);
        }
      });

      const newRows: BatchRow[] = jsonData.map((row: any, index) => {
        // Empresa - resolver CNPJ para ID se possível
        let empresa_id = '';
        if (row.empresa_cnpj) {
          const cnpjLimpo = row.empresa_cnpj.replace(/[^\d]/g, '');
          const empresaIdEncontrado = empresasMap.get(cnpjLimpo);
          if (empresaIdEncontrado) {
            empresa_id = String(empresaIdEncontrado);
          } else {
            // Se não encontrou, manter CNPJ para exibição (será resolvido no backend)
            empresa_id = cnpjLimpo;
          }
        } else if (row.empresa_id) {
          // Fallback para compatibilidade com planilhas antigas
          empresa_id = String(row.empresa_id);
        }

        // Tomador - resolver CPF/CNPJ para ID se possível, senão usar dados não cadastrados
        let tomador_id = '';
        const tomadorData: any = {};
        
        if (row.tomador_cpf_cnpj) {
          const docLimpo = row.tomador_cpf_cnpj.replace(/[^\d]/g, '');
          const tomadorIdEncontrado = tomadoresMap.get(docLimpo);
          if (tomadorIdEncontrado) {
            // Tomador cadastrado encontrado
            tomador_id = String(tomadorIdEncontrado);
            // Mesmo sendo cadastrado, incluir CEP se fornecido para permitir edição/verificação
            if (row.tomador_cep) {
              tomadorData.tomador_cep = row.tomador_cep;
            }
          } else if (row.tomador_nome || row.tomador_cep || row.tomador_logradouro) {
            // Tomador não cadastrado - usar dados completos (pode ter apenas CEP ou endereço)
            tomadorData.tomador_nome = row.tomador_nome || '';
            tomadorData.tomador_cpf_cnpj = docLimpo;
            tomadorData.tomador_cep = row.tomador_cep || '';
            tomadorData.tomador_logradouro = row.tomador_logradouro || '';
            tomadorData.tomador_numero = row.tomador_numero || '';
            tomadorData.tomador_complemento = row.tomador_complemento || '';
            tomadorData.tomador_bairro = row.tomador_bairro || '';
            tomadorData.tomador_cidade = row.tomador_cidade || '';
            tomadorData.tomador_uf = row.tomador_uf || '';
          } else {
            // CPF/CNPJ fornecido mas não encontrado e sem dados completos
            // Manter CPF/CNPJ para que possa ser editado depois
            tomador_id = docLimpo;
          }
        } else if (row.tomador_id) {
          // Fallback para compatibilidade com planilhas antigas
          tomador_id = String(row.tomador_id);
        }
        
        // Se tem CEP mas não tem tomador_id nem dados completos, incluir CEP para edição
        if (row.tomador_cep && !tomador_id && !tomadorData.tomador_nome) {
          tomadorData.tomador_cep = row.tomador_cep;
        }

        // Processar sócios - usar CPFs como chave principal (não IDs)
        const sociosInput = row.socios_cpfs || row.socios_ids || '';
        const sociosArray = sociosInput ? String(sociosInput).split(',').map(s => s.trim()) : [];
        // Se são CPFs, manter como string; se são IDs (compatibilidade), converter para número
        const socios_ids = sociosArray.map(s => {
          const num = parseInt(s);
          return !isNaN(num) ? num : 0; // IDs numéricos ou 0 para CPFs (será resolvido no backend)
        }).filter(id => id > 0);

        // Processar valores (separados por vírgula, mesma ordem dos sócios)
        const valoresInput = row.valores || '';
        const valoresArray = valoresInput ? String(valoresInput).split(',').map(v => parseFloat(v.trim()) || 0) : [];
        const valores: Record<number, number> = {};
        socios_ids.forEach((socioId, idx) => {
          valores[socioId] = valoresArray[idx] || 0;
        });

        return {
          id: `row-${Date.now()}-${index}`,
          empresa_id,
          tomador_id,
          // Dados do tomador não cadastrado (se houver)
          ...(tomadorData.tomador_nome || tomadorData.tomador_cep || tomadorData.tomador_cpf_cnpj ? {
            tomador_nome: tomadorData.tomador_nome || '',
            tomador_cpf_cnpj: tomadorData.tomador_cpf_cnpj || '',
            tomador_cep: tomadorData.tomador_cep || '',
            tomador_logradouro: tomadorData.tomador_logradouro || '',
            tomador_numero: tomadorData.tomador_numero || '',
            tomador_complemento: tomadorData.tomador_complemento || '',
            tomador_bairro: tomadorData.tomador_bairro || '',
            tomador_cidade: tomadorData.tomador_cidade || '',
            tomador_uf: tomadorData.tomador_uf || '',
            tomador_tipo: tomadorData.tomador_cpf_cnpj?.length === 11 ? 'PESSOA' : (tomadorData.tomador_cpf_cnpj?.length === 14 ? 'EMPRESA' : undefined),
          } : {}),
          socios_ids,
          valores,
          mes_competencia: row.mes_competencia || new Date().toISOString().slice(0, 7),
          modelo_id: row.modelo_discriminacao_id ? String(row.modelo_discriminacao_id) : undefined,
          discriminacao: row.discriminacao || '',
          codigo_servico_municipal: row.codigo_servico_municipal || row.codigo_servico || '',
          cnae_code: row.cnae_code || row.cnae || '',
        };
      });

      setRows(newRows);
      toast.success(`${newRows.length} linha(s) importada(s) com sucesso!`);
      setActiveTab('create'); // Mudar para aba de criação para visualizar
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Verifique o formato.');
    } finally {
      setLoading(false);
      // Limpar input
      event.target.value = '';
    }
  };

  // Validar dados
  const handleValidate = async () => {
    if (rows.length === 0) {
      toast.error('Adicione pelo menos uma linha antes de validar');
      return;
    }

    try {
      setLoading(true);
      setValidationErrors({});
      
      // Preparar dados para validação
      const dadosParaValidar = rows.map(row => {
        const dados: any = {
          empresa_id: row.empresa_id,
          tomador_id: row.tomador_id,
          socios_ids: row.socios_ids,
          valores: row.valores,
          mes_competencia: row.mes_competencia,
          modelo_id: row.modelo_id,
          discriminacao: row.discriminacao,
          codigo_servico_municipal: row.codigo_servico_municipal,
          cnae_code: row.cnae_code,
        };

        // Se não tem tomador_id, incluir dados do tomador não cadastrado
        if (!row.tomador_id && row.tomador_nome && row.tomador_cpf_cnpj) {
          dados.tomador_nao_cadastrado = {
            nome_razao_social: row.tomador_nome,
            cpf_cnpj: row.tomador_cpf_cnpj.replace(/[^\d]/g, ''),
            tipo_tomador: row.tomador_tipo || (row.tomador_cpf_cnpj.replace(/[^\d]/g, '').length === 11 ? 'PESSOA' : 'EMPRESA'),
            cep: row.tomador_cep?.replace(/[^\d]/g, '') || null,
            logradouro: row.tomador_logradouro || null,
            numero: row.tomador_numero || null,
            complemento: row.tomador_complemento || null,
            bairro: row.tomador_bairro || null,
            cidade: row.tomador_cidade || null,
            uf: row.tomador_uf || null,
          };
        }

        return dados;
      });

      const response = await notasService.validarLote(dadosParaValidar);
      
      if (response.success) {
        setValidationResult(response.data);
        
        // Mapear erros para as linhas
        const errors: Record<string, string[]> = {};
        if (response.data.erros) {
          response.data.erros.forEach((erro: any, index: number) => {
            if (erro.linha !== undefined && rows[erro.linha]) {
              const rowId = rows[erro.linha].id;
              if (!errors[rowId]) errors[rowId] = [];
              errors[rowId].push(erro.mensagem);
            }
          });
        }
        setValidationErrors(errors);

        if (response.data.erros && response.data.erros.length > 0) {
          toast.warning(`Validação concluída com ${response.data.erros.length} erro(s)`);
        } else {
          toast.success('Validação concluída com sucesso! Todos os dados estão corretos.');
        }
      } else {
        toast.error(response.message || 'Erro na validação');
      }
    } catch (error: any) {
      console.error('Erro ao validar:', error);
      toast.error(error.response?.data?.message || 'Erro ao validar dados');
    } finally {
      setLoading(false);
    }
  };

  // Criar rascunhos
  const handleCreateDrafts = async () => {
    if (rows.length === 0) {
      toast.error('Adicione pelo menos uma linha antes de criar rascunhos');
      return;
    }

    try {
      setCreating(true);
      setProgress(0);
      
      // Preparar dados
      const dadosParaCriar = rows.map(row => {
        // Processar sócios - se temos CPFs, usar CPFs; senão usar IDs
        // Nota: No formato atual, socios_ids contém IDs numéricos
        // Para usar CPFs, precisaríamos de uma estrutura diferente
        // Por enquanto, manteremos IDs mas o backend já suporta buscar por CPF se fornecido
        const socios = row.socios_ids.map(socioId => ({
          pessoa_id: socioId, // ID numérico
          valor_prestado: parseFloat(String(row.valores[socioId] || 0)),
        }));

        const dados: any = {
          empresa_id: parseInt(row.empresa_id),
          tomador_id: row.tomador_id ? parseInt(row.tomador_id) : null,
          socios: socios,
          mes_competencia: row.mes_competencia,
          modelo_discriminacao_id: row.modelo_id ? parseInt(row.modelo_id) : null,
          discriminacao_final: row.discriminacao || null,
          codigo_servico_municipal: row.codigo_servico_municipal || null,
          cnae_code: row.cnae_code || null, // CNAE do prestador para esta nota
        };

        // Se não tem tomador_id, incluir dados do tomador não cadastrado
        if (!row.tomador_id && row.tomador_nome && row.tomador_cpf_cnpj) {
          dados.tomador_nao_cadastrado = {
            nome_razao_social: row.tomador_nome,
            cpf_cnpj: row.tomador_cpf_cnpj.replace(/[^\d]/g, ''),
            tipo_tomador: row.tomador_tipo || (row.tomador_cpf_cnpj.replace(/[^\d]/g, '').length === 11 ? 'PESSOA' : 'EMPRESA'),
            cep: row.tomador_cep?.replace(/[^\d]/g, '') || null,
            logradouro: row.tomador_logradouro || null,
            numero: row.tomador_numero || null,
            complemento: row.tomador_complemento || null,
            bairro: row.tomador_bairro || null,
            cidade: row.tomador_cidade || null,
            uf: row.tomador_uf || null,
          };
        }

        return dados;
      });

      const response = await notasService.criarRascunhosLote(dadosParaCriar);
      
      if (response.success) {
        const notas = response.data.notas || [];
        const notasIds = notas.map((n: any) => n.id);
        setCreatedNotas(notasIds);
        setCreatedNotasDetails(notas);
        toast.success(`${notasIds.length} rascunho(s) criado(s) com sucesso!`);
        setProgress(100);
      } else {
        toast.error(response.message || 'Erro ao criar rascunhos');
      }
    } catch (error: any) {
      console.error('Erro ao criar rascunhos:', error);
      toast.error(error.response?.data?.message || 'Erro ao criar rascunhos');
    } finally {
      setCreating(false);
    }
  };

  // Emitir em lote
  const handleEmitBatch = async () => {
    if (createdNotas.length === 0) {
      toast.error('Crie os rascunhos primeiro');
      return;
    }

    if (!confirm(`Tem certeza que deseja emitir ${createdNotas.length} nota(s) em lote?`)) {
      return;
    }

    try {
      setEmitting(true);
      setProgress(0);
      setEmissionResults([]);

      const response = await notasService.emitirLote(createdNotas);
      
      if (response.success) {
        setEmissionResults(response.data.resultados || []);
        const sucessos = response.data.resultados?.filter((r: any) => r.success).length || 0;
        const erros = response.data.resultados?.filter((r: any) => !r.success).length || 0;
        
        toast.success(`Emissão concluída: ${sucessos} sucesso(s), ${erros} erro(s)`);
        setProgress(100);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.message || 'Erro ao emitir em lote');
      }
    } catch (error: any) {
      console.error('Erro ao emitir em lote:', error);
      toast.error(error.response?.data?.message || 'Erro ao emitir em lote');
    } finally {
      setEmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir Notas em Lote</DialogTitle>
          <DialogDescription>
            Importe um arquivo XLSX ou crie as notas diretamente no sistema
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'create' | 'select')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Importar XLSX
            </TabsTrigger>
            <TabsTrigger value="create">
              <Upload className="w-4 h-4 mr-2" />
              Criar no Sistema
            </TabsTrigger>
            <TabsTrigger value="select">
              <FileCheck className="w-4 h-4 mr-2" />
              Selecionar Rascunhos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importar Planilha XLSX</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={handleDownloadModel} disabled={loading} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Modelo
                  </Button>
                  
                  <div className="flex-1">
                    <label className="flex items-center justify-center w-full h-10 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-accent">
                      <Upload className="w-4 h-4 mr-2" />
                      <span>Selecionar arquivo XLSX</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Baixe o modelo, preencha com os dados das notas e importe o arquivo. 
                    Após a importação, você poderá visualizar e validar os dados na aba "Criar no Sistema".
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Criar Notas no Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <BatchEmissionTable
                  rows={rows}
                  onRowsChange={setRows}
                  validationErrors={validationErrors}
                />
              </CardContent>
            </Card>

            {validationResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado da Validação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {validationResult.erros && validationResult.erros.length > 0 ? (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          {validationResult.erros.length} erro(s) encontrado(s). 
                          Corrija os erros antes de criar os rascunhos.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Validação concluída com sucesso! Todos os dados estão corretos.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {createdNotasDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Rascunhos Criados ({createdNotasDetails.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {createdNotasDetails.map((nota: any) => (
                      <div
                        key={nota.id}
                        className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Rascunho</Badge>
                            <span className="text-sm font-medium">
                              {nota.empresa_nome || nota.empresa || 'Empresa não informada'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Tomador: {nota.tomador_nome || nota.tomador || 'Não informado'} | 
                            Valor: R$ {parseFloat(nota.valor_total || 0).toFixed(2).replace('.', ',')} | 
                            Competência: {nota.mes_competencia || '-'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onClose();
                            // Navegar para página de notas e abrir modal de visualização
                            setTimeout(() => {
                              window.location.hash = 'notas-fiscais';
                              // Disparar evento para abrir modal de visualização
                              window.dispatchEvent(new CustomEvent('view-nota', { detail: { id: nota.id } }));
                            }, 100);
                          }}
                          title="Ver detalhes do rascunho"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        if (onSuccess) {
                          onSuccess(); // Recarregar notas
                        }
                        // Navegar para página de notas filtrando por rascunhos
                        setTimeout(() => {
                          window.location.hash = 'notas-fiscais';
                          // Disparar evento para aplicar filtro
                          window.dispatchEvent(new CustomEvent('filter-notas', { detail: { status: 'RASCUNHO' } }));
                        }, 100);
                      }}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver todos os rascunhos na página de Notas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {emissionResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado da Emissão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {emissionResults.map((result: any, index: number) => (
                      <div
                        key={index}
                        className={`p-2 rounded flex items-center gap-2 ${
                          result.success ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          Nota {result.nota_id || index + 1}: {result.message || (result.success ? 'Emitida com sucesso' : 'Erro na emissão')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleValidate}
                disabled={loading || rows.length === 0}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Validar'
                )}
              </Button>

              <Button
                onClick={handleCreateDrafts}
                disabled={creating || rows.length === 0 || (validationResult && validationResult.erros?.length > 0)}
                variant="outline"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Rascunhos'
                )}
              </Button>

              <Button
                onClick={handleEmitBatch}
                disabled={emitting || createdNotas.length === 0}
                className="bg-success hover:bg-success/90"
              >
                {emitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Emitindo...
                  </>
                ) : (
                  'Emitir em Lote'
                )}
              </Button>
            </div>

            {(creating || emitting) && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  {creating ? 'Criando rascunhos...' : 'Emitindo notas...'}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="select" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Selecionar Rascunhos para Emitir</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadRascunhos}
                      disabled={loadingRascunhos}
                    >
                      {loadingRascunhos ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileCheck className="w-4 h-4 mr-2" />
                      )}
                      Atualizar
                    </Button>
                    {rascunhos.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllRascunhos}
                      >
                        {selectedRascunhos.size === rascunhos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRascunhos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Carregando rascunhos...</span>
                  </div>
                ) : rascunhos.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum rascunho encontrado. Crie rascunhos primeiro ou importe uma planilha.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {rascunhos.map((nota: any) => {
                      const notaErrors = validationErrors[nota.id] || [];
                      return (
                        <div
                          key={nota.id}
                          className={`p-3 border rounded-lg flex items-start gap-3 hover:bg-accent/50 ${
                            selectedRascunhos.has(nota.id) ? 'bg-accent border-primary' : ''
                          } ${notaErrors.length > 0 ? 'border-destructive' : ''}`}
                        >
                          <Checkbox
                            checked={selectedRascunhos.has(nota.id)}
                            onCheckedChange={() => toggleRascunhoSelection(nota.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">Rascunho</Badge>
                              {notaErrors.length > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {notaErrors.length} erro(s)
                                </Badge>
                              )}
                              <span className="text-sm font-medium truncate">
                                {nota.empresa_nome || 'Empresa não informada'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>
                                Tomador: {nota.tomador_nome || 'Não informado'} | 
                                Valor: R$ {parseFloat(nota.valor_total || 0).toFixed(2).replace('.', ',')}
                              </div>
                              <div>
                                Competência: {nota.mes_competencia || '-'} | 
                                Criado em: {new Date(nota.created_at).toLocaleDateString('pt-BR')}
                              </div>
                              {nota.discriminacao_final && (
                                <div className="truncate max-w-2xl">
                                  {nota.discriminacao_final.substring(0, 100)}
                                  {nota.discriminacao_final.length > 100 ? '...' : ''}
                                </div>
                              )}
                              {notaErrors.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {notaErrors.map((erro: string, idx: number) => (
                                    <div key={idx} className="text-destructive text-xs">
                                      • {erro}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onClose();
                              setTimeout(() => {
                                window.location.hash = 'notas-fiscais';
                                window.dispatchEvent(new CustomEvent('view-nota', { detail: { id: nota.id } }));
                              }, 100);
                            }}
                            title="Ver detalhes do rascunho"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {rascunhos.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedRascunhos.size} de {rascunhos.length} rascunho(s) selecionado(s)
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleValidateSelected}
                        disabled={loading || selectedRascunhos.size === 0}
                        variant="outline"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Validando...
                          </>
                        ) : (
                          'Validar Selecionados'
                        )}
                      </Button>

                      <Button
                        onClick={handleEmitSelected}
                        disabled={emitting || selectedRascunhos.size === 0}
                        className="bg-success hover:bg-success/90"
                      >
                        {emitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Emitindo...
                          </>
                        ) : (
                          `Emitir ${selectedRascunhos.size > 0 ? `(${selectedRascunhos.size})` : ''}`
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {validationResult && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Resultado da Validação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {validationResult.erros && validationResult.erros.length > 0 ? (
                          <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              {validationResult.erros.length} erro(s) encontrado(s). 
                              Corrija os erros antes de emitir.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Validação concluída com sucesso! Todos os dados estão corretos.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {emissionResults.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Resultado da Emissão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {emissionResults.map((result: any, index: number) => (
                          <div
                            key={index}
                            className={`p-2 rounded flex items-center gap-2 ${
                              result.success ? 'bg-green-50' : 'bg-red-50'
                            }`}
                          >
                            {result.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm">
                              Nota {result.nota_id || index + 1}: {result.message || (result.success ? 'Emitida com sucesso' : 'Erro na emissão')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(emitting) && (
                  <div className="mt-4 space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground text-center">
                      Emitindo notas...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

