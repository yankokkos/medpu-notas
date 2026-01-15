import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { toast } from "sonner";
import { empresasService, tomadoresService, modelosService, notasService, consultasService } from '../services/api';
import { NFSePreview } from './NFSePreview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Building2,
  Users,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  FileText,
  DollarSign,
  CheckCircle,
  Wand2,
  Loader2,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Receipt,
  Calculator,
  Percent,
} from 'lucide-react';

interface NFSeWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Empresa {
  id: number;
  razao_social: string;
  cnpj: string;
  nome_conta?: string;
}

interface Socio {
  id: number;
  nome_completo: string;
  cpf: string;
  percentual_participacao: number;
  registro_profissional?: string;
  especialidade?: string;
  email?: string;
  telefone?: string;
}

interface Tomador {
  id: number;
  tipo_tomador: 'PESSOA' | 'EMPRESA';
  nome_razao_social_unificado: string;
  cpf_cnpj_unificado: string;
  conta_nome?: string;
}

interface Modelo {
  id: number;
  titulo_modelo: string;
  texto_modelo: string;
  categoria: string;
}

interface TomadorAvulsa {
  tipo_tomador: 'PESSOA' | 'EMPRESA';
  nome_razao_social: string;
  cnpj_cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  inscricao_municipal: string;
  inscricao_estadual: string;
  data_nascimento: string;
}

export function NFSeWizard({ isOpen, onClose }: NFSeWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    empresa_id: '',
    socio_ids: [] as number[],
    tomador_id: '',
    tomadorMode: 'cadastrado' as 'cadastrado' | 'avulsa',
    modelo_id: '',
    valores: {} as Record<string, number>,
    mes_competencia: new Date().toISOString().slice(0, 7), // YYYY-MM format
    discriminacao: '',
    // Códigos de Serviço
    codigo_servico_municipal: '',
    codigo_servico_federal: '',
    cnae_code: '',
    nbs_code: '',
    // Tributação
    tipo_tributacao: '',
    aliquota_iss: 0,
    valor_iss: 0, // calculado
    // Retenções
    retencao_ir: 0,
    retencao_pis: 0,
    retencao_cofins: 0,
    retencao_csll: 0,
    retencao_inss: 0,
    retencao_iss: 0,
    outras_retencoes: 0,
    // Deduções e Descontos
    valor_deducoes: 0,
    desconto_incondicionado: 0,
    desconto_condicionado: 0,
    // Localização da Prestação
    localizacao_estado: '',
    localizacao_cidade: '',
    localizacao_cep: '',
    localizacao_logradouro: '',
    localizacao_numero: '',
    localizacao_bairro: '',
    localizacao_complemento: '',
    // RPS
    rps_numero: '',
    rps_serie: '',
    rps_data_emissao: '',
    // Informações Adicionais
    informacoes_adicionais: '',
  });

  // Dados do tomador avulsa
  const [tomadorAvulsa, setTomadorAvulsa] = useState<TomadorAvulsa>({
    tipo_tomador: 'EMPRESA',
    nome_razao_social: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    inscricao_municipal: '',
    inscricao_estadual: '',
    data_nascimento: '',
  });

  // Dados carregados
  const [empresas, setEmpresas] = useState([] as Empresa[]);
  const [socios, setSocios] = useState([] as Socio[]);
  const [tomadores, setTomadores] = useState([] as Tomador[]);
  const [modelos, setModelos] = useState([] as Modelo[]);
  const [empresaCompleta, setEmpresaCompleta] = useState(null as any);
  const [codigosFrequentes, setCodigosFrequentes] = useState<{codigos_servico: string[], cnaes: string[]}>({codigos_servico: [], cnaes: []});
  const [loadingCodigos, setLoadingCodigos] = useState(false);

  // Estados para seções colapsáveis
  const [showRetencoes, setShowRetencoes] = useState(false);
  const [showDeducoes, setShowDeducoes] = useState(false);
  const [showLocalizacao, setShowLocalizacao] = useState(false);
  const [showRPS, setShowRPS] = useState(false);

  // Resetar dados quando fechar
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setFormData({
        empresa_id: '',
        socio_ids: [],
        tomador_id: '',
        tomadorMode: 'cadastrado',
        modelo_id: '',
        valores: {},
        mes_competencia: new Date().toISOString().slice(0, 7),
        discriminacao: '',
        codigo_servico_municipal: '',
        codigo_servico_federal: '',
        cnae_code: '',
        nbs_code: '',
        tipo_tributacao: '',
        aliquota_iss: 0,
        valor_iss: 0,
        retencao_ir: 0,
        retencao_pis: 0,
        retencao_cofins: 0,
        retencao_csll: 0,
        retencao_inss: 0,
        retencao_iss: 0,
        outras_retencoes: 0,
        valor_deducoes: 0,
        desconto_incondicionado: 0,
        desconto_condicionado: 0,
        localizacao_estado: '',
        localizacao_cidade: '',
        localizacao_cep: '',
        localizacao_logradouro: '',
        localizacao_numero: '',
        localizacao_bairro: '',
        localizacao_complemento: '',
        rps_numero: '',
        rps_serie: '',
        rps_data_emissao: '',
        informacoes_adicionais: '',
      });
      setShowRetencoes(false);
      setShowDeducoes(false);
      setShowLocalizacao(false);
      setShowRPS(false);
      setTomadorAvulsa({
        tipo_tomador: 'EMPRESA',
        nome_razao_social: '',
        cnpj_cpf: '',
        email: '',
        telefone: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
        inscricao_municipal: '',
        inscricao_estadual: '',
        data_nascimento: '',
      });
      setEmpresas([]);
      setSocios([]);
      setTomadores([]);
      setModelos([]);
      setEmpresaCompleta(null);
      setConsultandoCNPJ(false);
    }
  }, [isOpen]);

  // Carregar empresas (apenas as que podem emitir - sincronizadas com NFe.io)
  const loadEmpresas = async () => {
    try {
      setLoading(true);
      // Filtrar apenas empresas que têm nfeio_empresa_id (sincronizadas com NFe.io)
      const response = await empresasService.getAll({ 
        status: 'ativa',
        pode_emitir: 'true'
      });
      if (response.success && response.data) {
        const empresasDisponiveis = response.data.empresas || [];
        setEmpresas(empresasDisponiveis);
        
        // Se não houver empresas sincronizadas, mostrar aviso
        if (empresasDisponiveis.length === 0) {
          toast.warning('Nenhuma empresa sincronizada com NFe.io encontrada. Por favor, sincronize as empresas na página de Empresas antes de emitir notas.', {
            duration: 6000
          });
        }
      } else {
        setEmpresas([]);
        toast.error(response.message || 'Erro ao carregar empresas');
      }
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      setEmpresas([]);
      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (!error.response) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        toast.error(error.response.data?.message || 'Erro ao carregar empresas');
      }
    } finally {
      setLoading(false);
    }
  };

  // Carregar sócios da empresa
  const loadSocios = async (empresaId: number) => {
    try {
      setLoading(true);
      const response = await empresasService.obterSocios(empresaId);
      if (response.success && response.data) {
        setSocios(response.data.socios || []);
      } else {
        setSocios([]);
        toast.error(response.message || 'Erro ao carregar sócios');
      }
    } catch (error: any) {
      console.error('Erro ao carregar sócios:', error);
      setSocios([]);
      if (error.response?.status === 404) {
        toast.error('Empresa não encontrada');
      } else if (!error.response) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        toast.error(error.response.data?.message || 'Erro ao carregar sócios');
      }
    } finally {
      setLoading(false);
    }
  };

  // Carregar tomadores por sócios
  const loadTomadores = async (socioIds: number[]) => {
    if (socioIds.length === 0) {
      setTomadores([]);
      return;
    }

    try {
      setLoading(true);
      const response = await tomadoresService.obterPorSocios(socioIds);
      if (response.success && response.data) {
        setTomadores(response.data.tomadores || []);
      } else {
        setTomadores([]);
        if (response.message) {
          toast.error(response.message);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar tomadores:', error);
      setTomadores([]);
      if (!error.response) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        toast.error(error.response.data?.message || 'Erro ao carregar tomadores');
      }
    } finally {
      setLoading(false);
    }
  };

  // Carregar modelos por tomador
  const loadModelos = async (tomadorId: number) => {
    try {
      setLoading(true);
      // Usar o endpoint de tomadores para obter modelos vinculados
      const response = await tomadoresService.obterModelos(tomadorId);
      if (response && response.success && response.data) {
        const modelosList = response.data.modelos || [];
        setModelos(modelosList);
        // Não mostrar erro se simplesmente não houver modelos (caso válido)
      } else {
        setModelos([]);
        // Só mostrar erro se a resposta indicar um problema real
        if (response && !response.success) {
          const errorMsg = response.message || 'Erro ao carregar modelos';
          toast.error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar modelos:', error);
      setModelos([]);
      // Só mostrar toast se for um erro de rede ou servidor (não 404)
      if (error.response?.status) {
        if (error.response.status >= 500) {
          toast.error('Erro no servidor ao carregar modelos. Tente novamente mais tarde.');
        } else if (error.response.status === 404) {
          // 404 é válido - tomador pode não ter modelos vinculados
        } else {
          toast.error(`Erro ao carregar modelos: ${error.response.data?.message || 'Erro desconhecido'}`);
        }
      } else if (!error.response) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error('Erro ao carregar modelos. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados completos da empresa
  const loadEmpresaCompleta = async (empresaId: number) => {
    try {
      const response = await empresasService.obter(empresaId);
      if (response.success) {
        const empresa = response.data.empresa;
        setEmpresaCompleta(empresa);
        // Preencher automaticamente código de serviço municipal e alíquota ISS
        if (empresa) {
          setFormData(prev => ({
            ...prev,
            codigo_servico_municipal: empresa.codigo_servico_municipal || '',
            cnae_code: empresa.cnae_code || '',
            aliquota_iss: empresa.aliquota_iss ? parseFloat(empresa.aliquota_iss) : 0,
          }));
        }
      }
      
      // Buscar códigos frequentemente usados
      await loadCodigosFrequentes(empresaId);
    } catch (error) {
      console.error('Erro ao carregar dados completos da empresa:', error);
    }
  };

  // Carregar códigos de serviço e CNAEs frequentemente usados
  const loadCodigosFrequentes = async (empresaId: number) => {
    try {
      setLoadingCodigos(true);
      const response = await empresasService.buscarCodigosFrequentes(empresaId);
      if (response.success) {
        setCodigosFrequentes({
          codigos_servico: response.data.codigos_servico || [],
          cnaes: response.data.cnaes || []
        });
      }
    } catch (error) {
      console.error('Erro ao carregar códigos frequentes:', error);
      setCodigosFrequentes({ codigos_servico: [], cnaes: [] });
    } finally {
      setLoadingCodigos(false);
    }
  };

  // Calcular valor do ISS automaticamente
  useEffect(() => {
    const valorTotal = Object.values(formData.valores)
      .map((valor: any) => typeof valor === 'number' ? valor : parseFloat(String(valor || 0)))
      .filter((valor: number) => !isNaN(valor) && valor > 0)
      .reduce((sum: number, valor: number) => sum + valor, 0);
    
    const baseCalculo = valorTotal - formData.valor_deducoes - formData.desconto_incondicionado - formData.desconto_condicionado;
    const valorISS = baseCalculo > 0 && formData.aliquota_iss > 0 
      ? (baseCalculo * formData.aliquota_iss) / 100 
      : 0;
    
    setFormData(prev => ({ ...prev, valor_iss: valorISS }));
  }, [formData.valores, formData.aliquota_iss, formData.valor_deducoes, formData.desconto_incondicionado, formData.desconto_condicionado]);


  // Handlers
  const handleEmpresaChange = async (empresaId: string) => {
    const id = parseInt(empresaId);
    setFormData(prev => ({
      ...prev,
      empresa_id: empresaId,
      socio_ids: [],
      tomador_id: '',
      modelo_id: '',
      valores: {},
    }));
    
    if (id) {
      await loadSocios(id);
      await loadEmpresaCompleta(id);
    } else {
      setSocios([]);
      setTomadores([]);
      setModelos([]);
      setEmpresaCompleta(null);
    }
  };

  const handleSocioToggle = (socioId: number) => {
    setFormData(prev => {
      const newSocioIds = prev.socio_ids.includes(socioId)
        ? prev.socio_ids.filter(id => id !== socioId)
        : [...prev.socio_ids, socioId];
      
      // Limpar valores do sócio removido
      const novosValores = { ...prev.valores };
      if (!newSocioIds.includes(socioId)) {
        delete novosValores[socioId];
      }

      // Se houver modelo selecionado, reprocessar template quando sócios mudarem
      let novaDiscriminacao = prev.discriminacao;
      if (prev.modelo_id) {
        const modelo = modelos.find(m => m.id === parseInt(prev.modelo_id));
        if (modelo) {
          const sociosSelecionados = newSocioIds
            .map(id => socios.find(s => s.id === id))
            .filter(s => s !== undefined) as Socio[];
          
          novaDiscriminacao = processarTemplate(
            modelo.texto_modelo,
            sociosSelecionados,
            novosValores,
            prev.mes_competencia
          );
        }
      }
      
      return {
        ...prev,
        socio_ids: newSocioIds,
        valores: novosValores,
        discriminacao: novaDiscriminacao,
        tomador_id: '',
        modelo_id: '',
      };
    });
  };

  const handleTomadorChange = async (tomadorId: string) => {
    const id = parseInt(tomadorId);
    setFormData(prev => ({
      ...prev,
      tomador_id: tomadorId,
      modelo_id: '',
      valores: {},
    }));
    
    if (id) {
      await loadModelos(id);
    } else {
      setModelos([]);
    }
  };

  const handleTomadorModeChange = (mode: 'cadastrado' | 'avulsa') => {
    setFormData(prev => ({
      ...prev,
      tomadorMode: mode,
      tomador_id: '',
      modelo_id: '',
      valores: {},
    }));
    setModelos([]);
  };

  const handleBuscarCNPJ = async () => {
    const cnpjLimpo = tomadorAvulsa.cnpj_cpf.replace(/[^\d]/g, '');
    
    if (cnpjLimpo.length !== 14) {
      toast.error('CNPJ inválido', {
        description: 'O CNPJ deve ter 14 dígitos'
      });
      return;
    }

    try {
      setConsultandoCNPJ(true);
      const response = await consultasService.consultarCNPJ(cnpjLimpo);
      
      if (response.success && response.data) {
        const dados = response.data;
        
        setTomadorAvulsa(prev => ({
          ...prev,
          nome_razao_social: prev.nome_razao_social || dados.razao_social || '',
          email: prev.email || dados.email || '',
          telefone: prev.telefone || dados.telefone || '',
          endereco: prev.endereco || dados.endereco || '',
          numero: prev.numero || dados.numero || '',
          complemento: prev.complemento || dados.complemento || '',
          bairro: prev.bairro || dados.bairro || '',
          cidade: prev.cidade || dados.cidade || '',
          uf: prev.uf || dados.uf || '',
          cep: prev.cep || dados.cep || '',
          tipo_tomador: 'EMPRESA',
        }));

        // Se UF foi preenchida, consultar inscrição estadual
        if (dados.uf) {
          try {
            const ieResponse = await consultasService.consultarInscricaoEstadualEmissao(cnpjLimpo, dados.uf);
            if (ieResponse.success && ieResponse.inscricao_estadual) {
              setTomadorAvulsa(prev => ({
                ...prev,
                inscricao_estadual: prev.inscricao_estadual || ieResponse.inscricao_estadual || ''
              }));
            }
          } catch (ieError) {
            console.log('Não foi possível consultar inscrição estadual:', ieError);
          }
        }

        toast.success('Dados consultados com sucesso!', {
          description: 'Os dados foram preenchidos automaticamente'
        });
      } else {
        toast.error('Erro ao consultar CNPJ', {
          description: response.message || 'CNPJ não encontrado ou erro na consulta'
        });
      }
    } catch (error: any) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ', {
        description: error.response?.data?.message || 'Erro ao buscar dados do CNPJ'
      });
    } finally {
      setConsultandoCNPJ(false);
    }
  };

  // Função para processar template com variáveis e loop
  const processarTemplate = (template: string, sociosSelecionados: Socio[], valores: Record<number, number>, mesCompetencia: string): string => {
    if (!template) return '';

    // Separar template em partes: antes do loop, loop, depois do loop
    const loopRegex = /{{#loop}}([\s\S]*?){{\/loop}}/g;
    const partesLoop: string[] = [];
    let templateProcessado = template;
    let match;

    // Extrair todas as seções de loop
    while ((match = loopRegex.exec(template)) !== null) {
      partesLoop.push(match[1]);
      templateProcessado = templateProcessado.replace(match[0], '{{LOOP_PLACEHOLDER}}');
    }

    // Se não houver loop, processar variáveis globais apenas
    if (partesLoop.length === 0) {
      // Substituir variáveis globais (sem loop)
      templateProcessado = templateProcessado.replace(/\{\{valor_total\}\}/g, () => {
        const total = Object.values(valores).reduce((sum, val) => sum + (val || 0), 0);
        return total.toFixed(2).replace('.', ',');
      });
      templateProcessado = templateProcessado.replace(/\{\{periodo\}\}/g, () => {
        if (!mesCompetencia) return '';
        const [ano, mes] = mesCompetencia.split('-');
        return `${mes}/${ano}`;
      });
      templateProcessado = templateProcessado.replace(/\{\{mes_competencia\}\}/g, mesCompetencia || '');
      return templateProcessado;
    }

    // Processar cada seção de loop
    let resultadoLoop = '';
    if (partesLoop.length > 0 && sociosSelecionados.length > 0) {
      const templateLoop = partesLoop[0]; // Usar a primeira seção de loop encontrada
      
      sociosSelecionados.forEach((socio) => {
        let linhaLoop = templateLoop;
        const valorSocio = valores[socio.id] || 0;
        
        // Substituir variáveis do sócio
        linhaLoop = linhaLoop.replace(/\{\{socio\.nome\}\}/g, socio.nome_completo || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.nome_completo\}\}/g, socio.nome_completo || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.cpf\}\}/g, socio.cpf || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.crm\}\}/g, socio.registro_profissional || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.crc\}\}/g, socio.registro_profissional || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.registro_profissional\}\}/g, socio.registro_profissional || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.especialidade\}\}/g, socio.especialidade || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.email\}\}/g, socio.email || '');
        linhaLoop = linhaLoop.replace(/\{\{socio\.telefone\}\}/g, socio.telefone || '');
        linhaLoop = linhaLoop.replace(/\{\{valor\}\}/g, valorSocio.toFixed(2).replace('.', ','));
        linhaLoop = linhaLoop.replace(/\{\{valor_socio\}\}/g, valorSocio.toFixed(2).replace('.', ','));
        
        resultadoLoop += linhaLoop;
      });
    }

    // Substituir placeholder do loop pelo resultado processado
    templateProcessado = templateProcessado.replace(/\{\{LOOP_PLACEHOLDER\}\}/g, resultadoLoop);

    // Substituir variáveis globais (fora do loop)
    const valorTotal = Object.values(valores).reduce((sum, val) => sum + (val || 0), 0);
    templateProcessado = templateProcessado.replace(/\{\{valor_total\}\}/g, valorTotal.toFixed(2).replace('.', ','));
    templateProcessado = templateProcessado.replace(/\{\{periodo\}\}/g, () => {
      if (!mesCompetencia) return '';
      const [ano, mes] = mesCompetencia.split('-');
      return `${mes}/${ano}`;
    });
    templateProcessado = templateProcessado.replace(/\{\{mes_competencia\}\}/g, mesCompetencia || '');

    return templateProcessado;
  };

  const handleModeloChange = (modeloId: string) => {
    const modelo = modelos.find(m => m.id === parseInt(modeloId));
    
    if (!modelo) {
      setFormData(prev => ({
        ...prev,
        modelo_id: modeloId,
      }));
      return;
    }

    // Obter sócios selecionados com dados completos
    const sociosSelecionados = formData.socio_ids
      .map(id => socios.find(s => s.id === id))
      .filter(s => s !== undefined) as Socio[];

    // Processar template com variáveis e loop
    const discriminacaoProcessada = processarTemplate(
      modelo.texto_modelo,
      sociosSelecionados,
      formData.valores,
      formData.mes_competencia
    );

    setFormData(prev => ({
      ...prev,
      modelo_id: modeloId,
      // Se for nota avulsa e já houver discriminação preenchida, não sobrescrever
      // Se for tomador cadastrado ou não houver discriminação, usar o texto processado do modelo
      discriminacao: (prev.tomadorMode === 'avulsa' && prev.discriminacao.trim()) 
        ? prev.discriminacao 
        : (discriminacaoProcessada || prev.discriminacao || ''),
    }));
  };

  const handleValorChange = (socioId: number, valor: number) => {
    setFormData(prev => {
      // Atualizar valores
      const novosValores = {
        ...prev.valores,
        [socioId]: valor,
      };

      // Se houver modelo selecionado, reprocessar template quando valores mudarem
      let novaDiscriminacao = prev.discriminacao;
      if (prev.modelo_id) {
        const modelo = modelos.find(m => m.id === parseInt(prev.modelo_id));
        if (modelo) {
          const sociosSelecionados = prev.socio_ids
            .map(id => socios.find(s => s.id === id))
            .filter(s => s !== undefined) as Socio[];
          
          novaDiscriminacao = processarTemplate(
            modelo.texto_modelo,
            sociosSelecionados,
            novosValores,
            prev.mes_competencia
          );
        }
      }

      return {
        ...prev,
        valores: novosValores,
        discriminacao: novaDiscriminacao,
      };
    });
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Validar dados obrigatórios e coletar campos faltantes
      const camposFaltantes: string[] = [];
      
      if (!formData.empresa_id) {
        camposFaltantes.push('Empresa');
      }
      
      if (formData.socio_ids.length === 0) {
        camposFaltantes.push('Pelo menos um sócio');
      }

      let tomadorIdFinal = formData.tomador_id;

      // Se for nota avulsa, criar tomador temporário
      if (formData.tomadorMode === 'avulsa') {
        // Validar campos obrigatórios do tomador avulsa
        if (!tomadorAvulsa.cnpj_cpf.trim()) {
          camposFaltantes.push('CNPJ/CPF do tomador');
        }
        if (!tomadorAvulsa.nome_razao_social.trim()) {
          camposFaltantes.push(tomadorAvulsa.tipo_tomador === 'EMPRESA' ? 'Razão Social do tomador' : 'Nome Completo do tomador');
        }
      } else {
        if (!formData.tomador_id) {
          camposFaltantes.push('Tomador');
        }
      }
      
      // Modelo é obrigatório apenas para tomador cadastrado
      if (formData.tomadorMode === 'cadastrado' && !formData.modelo_id) {
        camposFaltantes.push('Modelo de Discriminação');
      }
      
      // Discriminação é sempre obrigatória
      if (!formData.discriminacao.trim()) {
        camposFaltantes.push('Discriminação do Serviço');
      }
      
      // Código de serviço municipal é obrigatório
      if (!formData.codigo_servico_municipal?.trim()) {
        camposFaltantes.push('Código de Serviço Municipal');
      }
      
      // CNAE é obrigatório em produção
      if (!formData.cnae_code?.trim()) {
        camposFaltantes.push('CNAE');
      }
      
      if (camposFaltantes.length > 0) {
        toast.error('Por favor, preencha todos os campos obrigatórios', {
          description: `Campos obrigatórios faltantes: ${camposFaltantes.join(', ')}`
        });
        return;
      }

      // Se for nota avulsa, criar tomador temporário
      if (formData.tomadorMode === 'avulsa') {
        try {
          // Criar tomador temporário
          // O backend espera tipo_pessoa ('PF' ou 'PJ') e cria pessoa/empresa primeiro, depois o tomador
          // Criar objeto de dados do tomador
          // O backend espera tipo_pessoa ('PF' ou 'PJ') e cria pessoa/empresa primeiro, depois o tomador
          const tomadorData: any = {
            tipo_pessoa: tomadorAvulsa.tipo_tomador === 'PESSOA' ? 'PF' : 'PJ', // Mapear PESSOA->PF, EMPRESA->PJ
            nome_razao_social: tomadorAvulsa.nome_razao_social.trim(),
            cnpj_cpf: tomadorAvulsa.cnpj_cpf.replace(/[^\d]/g, ''),
          };
          
          // Campos opcionais - só adicionar se tiverem valor
          if (tomadorAvulsa.email?.trim()) {
            tomadorData.email = tomadorAvulsa.email.trim();
          }
          if (tomadorAvulsa.telefone?.trim()) {
            tomadorData.telefone = tomadorAvulsa.telefone.trim();
          }
          if (tomadorAvulsa.inscricao_municipal?.trim()) {
            tomadorData.inscricao_municipal = tomadorAvulsa.inscricao_municipal.trim();
          }
          if (tomadorAvulsa.inscricao_estadual?.trim()) {
            tomadorData.inscricao_estadual = tomadorAvulsa.inscricao_estadual.trim();
          }
          
          // Campos de endereço (obrigatório para empresas, opcional para pessoa física)
          // Usar logradouro como preferência (backend aceita logradouro ou endereco)
          if (tomadorAvulsa.endereco?.trim()) {
            tomadorData.logradouro = tomadorAvulsa.endereco.trim();
          }
          if (tomadorAvulsa.numero?.trim()) {
            tomadorData.numero = tomadorAvulsa.numero.trim();
          }
          if (tomadorAvulsa.complemento?.trim()) {
            tomadorData.complemento = tomadorAvulsa.complemento.trim();
          }
          if (tomadorAvulsa.bairro?.trim()) {
            tomadorData.bairro = tomadorAvulsa.bairro.trim();
          }
          if (tomadorAvulsa.cidade?.trim()) {
            tomadorData.cidade = tomadorAvulsa.cidade.trim();
          }
          if (tomadorAvulsa.uf?.trim()) {
            tomadorData.uf = tomadorAvulsa.uf.trim();
          }
            if (tomadorAvulsa.cep?.trim()) {
              const cepLimpo = tomadorAvulsa.cep.replace(/[^\d]/g, '');
              if (cepLimpo) tomadorData.cep = cepLimpo;
            }
          
          // Data de nascimento para pessoa física (obrigatório para consulta de CPF)
          if (tomadorAvulsa.tipo_tomador === 'PESSOA' && tomadorAvulsa.data_nascimento) {
            tomadorData.data_nascimento = tomadorAvulsa.data_nascimento;
          }

          const tomadorResponse = await tomadoresService.criar(tomadorData);
          
          if (!tomadorResponse.success) {
            toast.error('Erro ao criar tomador', {
              description: tomadorResponse.message || 'Não foi possível criar o tomador temporário'
            });
            return;
          }

          tomadorIdFinal = tomadorResponse.data.tomador.id.toString();
          
          // Carregar modelos para o tomador criado (se não houver modelo selecionado ainda)
          if (!formData.modelo_id) {
            await loadModelos(tomadorResponse.data.tomador.id);
          }
        } catch (error: any) {
          console.error('Erro ao criar tomador:', error);
          toast.error('Erro ao criar tomador', {
            description: error.response?.data?.message || 'Não foi possível criar o tomador temporário'
          });
          return;
        }
      }

      if (!tomadorIdFinal) {
        toast.error('Tomador não selecionado');
        return;
      }

      // Validar e calcular valor total
      const valoresValidos = Object.entries(formData.valores)
        .filter(([_, valor]) => {
          const numValor = typeof valor === 'number' ? valor : parseFloat(String(valor || 0));
          return !isNaN(numValor) && numValor > 0;
        })
        .map(([_, valor]) => typeof valor === 'number' ? valor : parseFloat(String(valor || 0)));

      if (valoresValidos.length === 0) {
        toast.error('Por favor, informe valores válidos para os sócios', {
          description: 'É necessário informar pelo menos um valor maior que zero para um dos sócios selecionados'
        });
        return;
      }

      const valorTotal = valoresValidos.reduce((sum: number, valor: number) => sum + valor, 0);
      
      if (valorTotal <= 0) {
        toast.error('O valor total deve ser maior que zero', {
          description: 'A soma dos valores informados para os sócios deve ser maior que zero'
        });
        return;
      }
      
      // Validar discriminação (sempre obrigatória)
      if (!formData.discriminacao.trim()) {
        toast.error('Por favor, preencha a discriminação do serviço', {
          description: 'A discriminação do serviço é obrigatória para emitir a nota fiscal'
        });
        return;
      }

      // Modelo é obrigatório apenas para tomador cadastrado
      let modeloIdFinal = formData.modelo_id;
      
      if (formData.tomadorMode === 'cadastrado' && !modeloIdFinal) {
        toast.error('Por favor, selecione um modelo de discriminação', {
          description: 'É necessário selecionar um modelo de discriminação para continuar'
        });
        return;
      }
      
      // Para nota avulsa, modelo é opcional - se não houver, usar apenas a discriminação
      // Se houver modelo selecionado, usar ele; caso contrário, usar apenas a discriminação manual
      
      // Validar código de serviço municipal (obrigatório)
      if (!formData.codigo_servico_municipal?.trim()) {
        camposFaltantes.push('Código de Serviço Municipal');
      }
      
      // Validar CNAE (obrigatório em produção)
      if (!formData.cnae_code?.trim()) {
        camposFaltantes.push('CNAE');
      }
      
      if (camposFaltantes.length > 0) {
        toast.error('Por favor, preencha todos os campos obrigatórios', {
          description: `Campos obrigatórios faltantes: ${camposFaltantes.join(', ')}`
        });
        return;
      }
      
      // Criar nota fiscal (será emitida automaticamente via NFe.io)
      // Para nota avulsa sem modelo, usar null no modelo_discriminacao_id
      // Para tomador cadastrado, modelo é obrigatório
      const notaData: any = {
        empresa_id: parseInt(formData.empresa_id),
        tomador_id: parseInt(tomadorIdFinal),
        modelo_discriminacao_id: modeloIdFinal ? parseInt(modeloIdFinal) : null,
        valor_total: valorTotal,
        mes_competencia: formData.mes_competencia,
        discriminacao_final: formData.discriminacao,
        status: 'PROCESSANDO', // Status que indica que deve ser emitida
        socios: formData.socio_ids.map(socioId => {
          const valorPrestado = typeof formData.valores[socioId] === 'number' 
            ? formData.valores[socioId] 
            : parseFloat(String(formData.valores[socioId] || 0));
          return {
            pessoa_id: socioId,
            valor_prestado: valorPrestado,
            percentual_participacao: valorTotal > 0 ? (valorPrestado / valorTotal * 100) : 0,
          };
        }),
        // Códigos de Serviço
        codigo_servico_municipal: formData.codigo_servico_municipal.trim(),
        ...(formData.codigo_servico_federal?.trim() && { codigo_servico_federal: formData.codigo_servico_federal.trim() }),
        cnae_code: formData.cnae_code.trim(), // CNAE é obrigatório
        ...(formData.nbs_code?.trim() && { nbs_code: formData.nbs_code.trim() }),
        // Tributação
        ...(formData.tipo_tributacao && { tipo_tributacao: formData.tipo_tributacao }),
        ...(formData.aliquota_iss > 0 && { aliquota_iss: formData.aliquota_iss }),
        ...(formData.valor_iss > 0 && { valor_iss: formData.valor_iss }),
        // Retenções
        ...(formData.retencao_ir > 0 && { valor_retencao_ir: formData.retencao_ir }),
        ...(formData.retencao_pis > 0 && { valor_retencao_pis: formData.retencao_pis }),
        ...(formData.retencao_cofins > 0 && { valor_retencao_cofins: formData.retencao_cofins }),
        ...(formData.retencao_csll > 0 && { valor_retencao_csll: formData.retencao_csll }),
        ...(formData.retencao_inss > 0 && { valor_retencao_inss: formData.retencao_inss }),
        ...(formData.retencao_iss > 0 && { valor_retencao_iss: formData.retencao_iss }),
        ...(formData.outras_retencoes > 0 && { valor_outras_retencoes: formData.outras_retencoes }),
        // Deduções e Descontos
        ...(formData.valor_deducoes > 0 && { valor_deducoes: formData.valor_deducoes }),
        ...(formData.desconto_incondicionado > 0 && { valor_desconto_incondicionado: formData.desconto_incondicionado }),
        ...(formData.desconto_condicionado > 0 && { valor_desconto_condicionado: formData.desconto_condicionado }),
        // Informações Adicionais
        ...(formData.informacoes_adicionais?.trim() && { informacoes_adicionais: formData.informacoes_adicionais.trim() }),
        // RPS
        ...(formData.rps_numero?.trim() && { numero_rps: formData.rps_numero.trim() }),
        ...(formData.rps_serie?.trim() && { serie_rps: formData.rps_serie.trim() }),
        ...(formData.rps_data_emissao && { data_emissao_rps: formData.rps_data_emissao }),
        // Localização da Prestação (se preenchida)
        ...(showLocalizacao && (formData.localizacao_estado?.trim() || formData.localizacao_cidade?.trim()) && {
          localizacao: {
            ...(formData.localizacao_estado?.trim() && { estado: formData.localizacao_estado.trim() }),
            ...(formData.localizacao_cidade?.trim() && { cidade: { name: formData.localizacao_cidade.trim() } }),
            ...(formData.localizacao_cep?.trim() && { postalCode: formData.localizacao_cep.replace(/[^\d]/g, '') }),
            ...(formData.localizacao_logradouro?.trim() && { street: formData.localizacao_logradouro.trim() }),
            ...(formData.localizacao_numero?.trim() && { number: formData.localizacao_numero.trim() }),
            ...(formData.localizacao_bairro?.trim() && { district: formData.localizacao_bairro.trim() }),
            ...(formData.localizacao_complemento?.trim() && { additionalInformation: formData.localizacao_complemento.trim() }),
          }
        }),
      };

      const response = await notasService.criar(notaData);
      if (response.success) {
        if (response.data.status === 'AUTORIZADA') {
          toast.success('Nota fiscal emitida com sucesso!', {
            description: `Nota ${response.data.id} autorizada pela NFe.io`
          });
          onClose(); // Fechar modal apenas em caso de sucesso
        } else if (response.data.status === 'PROCESSANDO') {
          toast.success('Nota fiscal criada e sendo processada!', {
            description: 'A nota está sendo processada pela NFe.io. Você será notificado quando estiver pronta.'
          });
          onClose(); // Fechar modal quando está processando
        } else if (response.data.status === 'ERRO') {
          // Não fechar modal em caso de erro - mostrar detalhes
          const errorData = response.error || response.data?.error || {};
          
          let errorMessage = 'Erro ao emitir nota fiscal';
          let suggestion = '';
          
          // Verificar se o erro vem no novo formato (com sugestões)
          if (typeof errorData === 'object' && errorData !== null) {
            errorMessage = errorData.message || errorMessage;
            suggestion = errorData.suggestion || '';
            
            // Se houver diagnósticos, adicionar informações
            if (errorData.diagnosticos && Array.isArray(errorData.diagnosticos)) {
              const erros = errorData.diagnosticos.filter((d: any) => d.tipo === 'ERRO');
              if (erros.length > 0) {
                errorMessage = erros.map((e: any) => e.mensagem).join('; ');
              }
            }
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
            // Tentar extrair sugestão do texto
            if (errorData.includes('API') || errorData.includes('api_key') || errorData.includes('authentication')) {
              suggestion = 'Verifique se a chave da API NFe.io está configurada corretamente no servidor.';
            } else if (errorData.includes('empresa') || errorData.includes('company')) {
              suggestion = 'Verifique se a empresa está sincronizada com NFe.io e possui todos os dados necessários.';
            } else if (errorData.includes('tomador') || errorData.includes('taker')) {
              suggestion = 'Verifique se o tomador possui CPF/CNPJ válido e endereço completo.';
            } else if (errorData.includes('valor') || errorData.includes('value')) {
              suggestion = 'Verifique se o valor total é maior que zero e está no formato correto.';
            } else if (errorData.includes('servico') || errorData.includes('service')) {
              suggestion = 'Verifique se o código de serviço municipal está correto.';
            }
          }
          
          toast.error(errorMessage, {
            description: suggestion || 'A nota foi criada mas houve erro na emissão. Verifique os dados e tente novamente.',
            duration: 10000
          });
          
          // Não fechar o modal para que o usuário possa corrigir
        } else {
          toast.success('Nota fiscal criada com sucesso!');
          onClose();
        }
      } else {
        // Resposta com success: false
        const errorData = response.error || response.message || 'Erro desconhecido';
        toast.error('Erro ao criar nota fiscal', {
          description: typeof errorData === 'string' ? errorData : JSON.stringify(errorData),
          duration: 10000
        });
        // Não fechar modal em caso de erro
      }
    } catch (error: any) {
      console.error('Erro ao criar nota fiscal:', error);
      
      let errorMessage = 'Erro ao criar nota fiscal';
      let suggestion = '';
      
      // Analisar tipo de erro
      if (error.response?.status === 401) {
        errorMessage = 'Sessão expirada';
        suggestion = 'Por favor, faça login novamente.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Sem permissão';
        suggestion = 'Você não tem permissão para criar notas fiscais.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Recurso não encontrado';
        suggestion = 'Verifique se a empresa ou tomador selecionados ainda existem.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Dados inválidos';
        suggestion = error.response?.data?.message || 'Verifique se todos os campos obrigatórios estão preenchidos corretamente.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erro no servidor';
        suggestion = 'O servidor encontrou um erro. Tente novamente em alguns instantes ou entre em contato com o suporte.';
      } else if (!error.response) {
        errorMessage = 'Erro de conexão';
        suggestion = 'Verifique sua conexão com a internet e tente novamente.';
      } else {
        errorMessage = error.response?.data?.message || error.message || 'Erro ao criar nota fiscal';
        suggestion = 'Verifique os dados informados e tente novamente.';
      }
      
      toast.error(errorMessage, {
        description: suggestion,
        duration: 10000
      });
      // Não fechar modal em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // Carregar empresas quando abrir
  useEffect(() => {
    if (isOpen && empresas.length === 0) {
      loadEmpresas();
    }
  }, [isOpen]);

  // Carregar tomadores quando sócios mudarem
  useEffect(() => {
    if (formData.socio_ids.length > 0) {
      loadTomadores(formData.socio_ids);
    } else {
      setTomadores([]);
      setModelos([]);
    }
  }, [formData.socio_ids]);

  const steps = [
    { id: 1, title: 'Empresa', icon: Building2 },
    { id: 2, title: 'Sócios', icon: Users },
    { id: 3, title: 'Tomador', icon: UserCheck },
    { id: 4, title: 'Modelo', icon: FileText },
    { id: 5, title: 'Preview', icon: Eye },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.empresa_id !== '';
      case 2: return formData.socio_ids.length > 0;
      case 3: {
        if (formData.tomadorMode === 'cadastrado') {
          return formData.tomador_id !== '';
        } else {
          // Validar campos obrigatórios do tomador avulsa
          return (
            tomadorAvulsa.cnpj_cpf.trim() !== '' &&
            tomadorAvulsa.nome_razao_social.trim() !== ''
          );
        }
      }
      case 4: {
        const valoresValidos = Object.values(formData.valores)
          .map((valor: any) => typeof valor === 'number' ? valor : parseFloat(String(valor || 0)))
          .filter((valor: number) => !isNaN(valor) && valor > 0);
        // Discriminação é sempre obrigatória
        const temDiscriminacao = formData.discriminacao.trim() !== '';
        // Código de serviço municipal é obrigatório
        const temCodigoServico = formData.codigo_servico_municipal?.trim() !== '';
        // Se for nota avulsa, não precisa de modelo, só discriminação, valores e código de serviço
        if (formData.tomadorMode === 'avulsa') {
          return valoresValidos.length > 0 && temDiscriminacao && temCodigoServico;
        }
        // Para tomador cadastrado, precisa de modelo, valores e código de serviço (discriminação pode vir do modelo)
        return formData.modelo_id !== '' && valoresValidos.length > 0 && temCodigoServico;
      }
      case 5: return true; // Preview sempre pode prosseguir
      default: return false;
    }
  };

  const canSubmit = () => {
    if (!formData.empresa_id) {
      return false;
    }
    // Modelo é obrigatório apenas para tomador cadastrado
    if (formData.tomadorMode === 'cadastrado' && !formData.modelo_id) {
      return false;
    }
    // Discriminação é sempre obrigatória
    if (!formData.discriminacao.trim()) {
      return false;
    }
    // Código de serviço municipal é obrigatório
    if (!formData.codigo_servico_municipal?.trim()) {
      return false;
    }
    if (formData.tomadorMode === 'cadastrado' && !formData.tomador_id) {
      return false;
    }
    if (formData.tomadorMode === 'avulsa') {
      if (!tomadorAvulsa.cnpj_cpf.trim() || !tomadorAvulsa.nome_razao_social.trim()) {
        return false;
      }
    }
    if (formData.socio_ids.length === 0) {
      return false;
    }
    const valoresValidos = Object.values(formData.valores)
      .map((valor: any) => typeof valor === 'number' ? valor : parseFloat(String(valor || 0)))
      .filter((valor: number) => !isNaN(valor) && valor > 0);
    return valoresValidos.length > 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Assistente de Emissão de NFSe
          </DialogTitle>
          <DialogDescription>
            Siga os passos para emitir uma nota fiscal de serviço
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive ? 'border-blue-500 bg-blue-500 text-white' :
                  isCompleted ? 'border-green-500 bg-green-500 text-white' :
                  'border-gray-300 text-gray-500'
                }`}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-4" />
                )}
              </div>
            );
          })}
        </div>

        <Separator className="mb-6" />

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Selecione a Empresa</h3>
            {empresas.length === 0 && !loading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ Nenhuma empresa sincronizada com NFe.io encontrada
                </p>
                <p className="text-sm text-yellow-700">
                  Para emitir notas fiscais, é necessário sincronizar as empresas com o NFe.io primeiro.
                  Vá para a página de <strong>Empresas</strong> e clique em <strong>"Sincronizar com NFe.io"</strong>.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa Emissora</Label>
              <Select value={formData.empresa_id} onValueChange={handleEmpresaChange} disabled={empresas.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={empresas.length === 0 ? "Nenhuma empresa disponível" : "Selecione uma empresa"} />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{empresa.razao_social}</span>
                        <span className="text-sm text-gray-500">{empresa.cnpj}</span>
                        {empresa.nome_conta && (
                          <span className="text-xs text-blue-600">{empresa.nome_conta}</span>
                        )}
                        {empresa.nfeio_empresa_id && (
                          <span className="text-xs text-green-600">✓ Sincronizada com NFe.io</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Selecione os Sócios</h3>
            <p className="text-sm text-gray-600">
              Selecione quais sócios participarão desta nota fiscal
            </p>
            <div className="space-y-3">
              {socios.map((socio) => (
                <div key={socio.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`socio-${socio.id}`}
                    checked={formData.socio_ids.includes(socio.id)}
                    onCheckedChange={() => handleSocioToggle(socio.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`socio-${socio.id}`} className="font-medium">
                      {socio.nome_completo}
                    </Label>
                    <div className="text-sm text-gray-500">
                      CPF: {socio.cpf}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Selecione o Tomador</h3>
              <p className="text-sm text-gray-600 mb-4">
                Escolha entre um tomador cadastrado ou preencha os dados manualmente para uma nota avulsa
              </p>
              
              {/* Toggle entre Tomador Cadastrado e Nota Avulsa */}
              <div className="flex gap-4 mb-6">
                <Button
                  type="button"
                  variant={formData.tomadorMode === 'cadastrado' ? 'default' : 'outline'}
                  onClick={() => handleTomadorModeChange('cadastrado')}
                  className="flex-1"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Tomador Cadastrado
                </Button>
                <Button
                  type="button"
                  variant={formData.tomadorMode === 'avulsa' ? 'default' : 'outline'}
                  onClick={() => handleTomadorModeChange('avulsa')}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Nota Avulsa
                </Button>
              </div>
            </div>

            {formData.tomadorMode === 'cadastrado' ? (
              <div className="space-y-2">
                <Label htmlFor="tomador">Tomador</Label>
                <Select value={formData.tomador_id} onValueChange={handleTomadorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tomador" />
                  </SelectTrigger>
                  <SelectContent>
                    {tomadores.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhum tomador disponível para os sócios selecionados
                      </div>
                    ) : (
                      tomadores.map((tomador) => (
                        <SelectItem key={tomador.id} value={tomador.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{tomador.nome_razao_social_unificado}</span>
                            <span className="text-sm text-gray-500">{tomador.cpf_cnpj_unificado}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{tomador.tipo_tomador}</Badge>
                              {tomador.conta_nome && (
                                <Badge variant="secondary">{tomador.conta_nome}</Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dados do Tomador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Coluna Esquerda */}
                      <div className="space-y-4">
                        {/* Tipo de Tomador */}
                        <div className="space-y-2">
                          <Label htmlFor="tipo_tomador">Tipo de Tomador</Label>
                          <Select
                            value={tomadorAvulsa.tipo_tomador}
                            onValueChange={(value: 'PESSOA' | 'EMPRESA') =>
                              setTomadorAvulsa(prev => ({ ...prev, tipo_tomador: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EMPRESA">Empresa</SelectItem>
                              <SelectItem value="PESSOA">Pessoa Física</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* CNPJ/CPF com botão de buscar */}
                        <div className="space-y-2">
                          <Label htmlFor="cnpj_cpf">
                            {tomadorAvulsa.tipo_tomador === 'EMPRESA' ? 'CNPJ' : 'CPF'} *
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="cnpj_cpf"
                              placeholder={tomadorAvulsa.tipo_tomador === 'EMPRESA' ? '00.000.000/0000-00' : '000.000.000-00'}
                              value={tomadorAvulsa.cnpj_cpf}
                              onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, cnpj_cpf: e.target.value }))}
                              className="flex-1"
                            />
                            {tomadorAvulsa.tipo_tomador === 'EMPRESA' && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBuscarCNPJ}
                                disabled={consultandoCNPJ || !tomadorAvulsa.cnpj_cpf}
                                title="Buscar dados por CNPJ"
                              >
                                {consultandoCNPJ ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Search className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Nome/Razão Social */}
                        <div className="space-y-2">
                          <Label htmlFor="nome_razao_social">
                            {tomadorAvulsa.tipo_tomador === 'EMPRESA' ? 'Razão Social' : 'Nome Completo'} *
                          </Label>
                          <Input
                            id="nome_razao_social"
                            placeholder={tomadorAvulsa.tipo_tomador === 'EMPRESA' ? 'Razão Social' : 'Nome Completo'}
                            value={tomadorAvulsa.nome_razao_social}
                            onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, nome_razao_social: e.target.value }))}
                          />
                        </div>

                        {/* Data de Nascimento (apenas para pessoa física) */}
                        {tomadorAvulsa.tipo_tomador === 'PESSOA' && (
                          <div className="space-y-2">
                            <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                            <Input
                              id="data_nascimento"
                              type="date"
                              value={tomadorAvulsa.data_nascimento}
                              onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, data_nascimento: e.target.value }))}
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Obrigatório para consulta de CPF na NFe.io
                            </p>
                          </div>
                        )}

                        {/* Email e Telefone */}
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@exemplo.com"
                            value={tomadorAvulsa.email}
                            onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone">Telefone</Label>
                          <Input
                            id="telefone"
                            placeholder="(00) 00000-0000"
                            value={tomadorAvulsa.telefone}
                            onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, telefone: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Coluna Direita - Endereço */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm mb-2">Endereço</h4>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="endereco">Logradouro</Label>
                            <Input
                              id="endereco"
                              placeholder="Rua, Avenida, etc."
                              value={tomadorAvulsa.endereco}
                              onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, endereco: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="numero">Número</Label>
                            <Input
                              id="numero"
                              placeholder="123"
                              value={tomadorAvulsa.numero}
                              onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, numero: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="complemento">Complemento</Label>
                            <Input
                              id="complemento"
                              placeholder="Apto, Sala, etc."
                              value={tomadorAvulsa.complemento}
                              onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, complemento: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bairro">Bairro</Label>
                            <Input
                              id="bairro"
                              placeholder="Bairro"
                              value={tomadorAvulsa.bairro}
                              onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, bairro: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="cidade">Cidade</Label>
                            <Input
                              id="cidade"
                              placeholder="Cidade"
                              value={tomadorAvulsa.cidade}
                              onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, cidade: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="uf">UF</Label>
                            <Select
                              value={tomadorAvulsa.uf}
                              onValueChange={(value) => setTomadorAvulsa(prev => ({ ...prev, uf: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                              <SelectContent>
                                {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
                                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP</Label>
                          <Input
                            id="cep"
                            placeholder="00000-000"
                            value={tomadorAvulsa.cep}
                            onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, cep: e.target.value }))}
                          />
                        </div>

                        {/* Inscrições */}
                        <div className="space-y-3 pt-3 border-t">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                              <Input
                                id="inscricao_municipal"
                                placeholder="Opcional"
                                value={tomadorAvulsa.inscricao_municipal}
                                onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, inscricao_municipal: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                              <Input
                                id="inscricao_estadual"
                                placeholder="Opcional"
                                value={tomadorAvulsa.inscricao_estadual}
                                onChange={(e) => setTomadorAvulsa(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Modelo, Valores e Configurações</h3>
              <p className="text-sm text-gray-600">
                Configure o modelo de discriminação, valores e informações fiscais da nota
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda */}
              <div className="space-y-4">
                {/* Modelo de Discriminação */}
                <div>
                  <Label htmlFor="modelo">
                    Modelo de Discriminação {formData.tomadorMode === 'cadastrado' ? '*' : '(Opcional)'}
                  </Label>
                  {formData.tomadorMode === 'avulsa' && (
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                      Para nota avulsa, você pode preencher a discriminação manualmente abaixo
                    </p>
                  )}
                  {modelos.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground border rounded-md bg-muted mt-2">
                      {formData.tomadorMode === 'avulsa' 
                        ? 'Nenhum modelo disponível. Você pode preencher a discriminação manualmente abaixo.'
                        : 'Nenhum modelo disponível para este tomador. Por favor, associe modelos a este tomador primeiro.'}
                    </div>
                  ) : (
                    <Select value={formData.modelo_id} onValueChange={handleModeloChange}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={formData.tomadorMode === 'avulsa' ? "Selecione um modelo (opcional)" : "Selecione um modelo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {modelos.map((modelo) => (
                          <SelectItem key={modelo.id} value={modelo.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{modelo.titulo_modelo || 'Sem título'}</span>
                              {modelo.categoria && (
                                <span className="text-sm text-gray-500">{modelo.categoria}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Códigos de Serviço */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Códigos de Serviço
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="codigo_servico_municipal">Código de Serviço Municipal *</Label>
                      <div className="flex gap-2 mt-2">
                        {codigosFrequentes.codigos_servico.length > 0 ? (
                          <Select
                            value={codigosFrequentes.codigos_servico.includes(formData.codigo_servico_municipal) ? formData.codigo_servico_municipal : 'custom'}
                            onValueChange={(value) => {
                              if (value === 'custom') {
                                setFormData(prev => ({ ...prev, codigo_servico_municipal: '' }));
                              } else {
                                setFormData(prev => ({ ...prev, codigo_servico_municipal: value }));
                              }
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Selecione ou digite" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Digitar manualmente</SelectItem>
                              {codigosFrequentes.codigos_servico.map((codigo) => (
                                <SelectItem key={codigo} value={codigo}>
                                  {codigo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <Input
                          id="codigo_servico_municipal"
                          value={formData.codigo_servico_municipal}
                          onChange={(e) => setFormData(prev => ({ ...prev, codigo_servico_municipal: e.target.value }))}
                          placeholder="Ex: 01.01"
                          className={codigosFrequentes.codigos_servico.length > 0 ? "flex-1" : "w-full"}
                        />
                      </div>
                      {loadingCodigos && (
                        <p className="text-xs text-muted-foreground mt-1">Carregando códigos frequentes...</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="codigo_servico_federal">Código Federal do Serviço</Label>
                      <Input
                        id="codigo_servico_federal"
                        value={formData.codigo_servico_federal}
                        onChange={(e) => setFormData(prev => ({ ...prev, codigo_servico_federal: e.target.value }))}
                        placeholder="Opcional"
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="cnae_code">Código CNAE *</Label>
                        <div className="flex gap-2 mt-2">
                          {codigosFrequentes.cnaes.length > 0 ? (
                            <Select
                              value={codigosFrequentes.cnaes.includes(formData.cnae_code) ? formData.cnae_code : 'custom'}
                              onValueChange={(value) => {
                                if (value === 'custom') {
                                  setFormData(prev => ({ ...prev, cnae_code: '' }));
                                } else {
                                  setFormData(prev => ({ ...prev, cnae_code: value }));
                                }
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Selecione ou digite" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="custom">Digitar manualmente</SelectItem>
                                {codigosFrequentes.cnaes.map((cnae) => (
                                  <SelectItem key={cnae} value={cnae}>
                                    {cnae}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                          <Input
                            id="cnae_code"
                            value={formData.cnae_code}
                            onChange={(e) => setFormData(prev => ({ ...prev, cnae_code: e.target.value }))}
                            placeholder="Ex: 6201-5/00"
                            className={codigosFrequentes.cnaes.length > 0 ? "flex-1" : "w-full"}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="nbs_code">Código NBS</Label>
                        <Input
                          id="nbs_code"
                          value={formData.nbs_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, nbs_code: e.target.value }))}
                          placeholder="Opcional"
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mês de Competência */}
                <div>
                  <Label htmlFor="mes_competencia">Mês de Competência *</Label>
                  <Input
                    id="mes_competencia"
                    type="month"
                    value={formData.mes_competencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, mes_competencia: e.target.value }))}
                    className="mt-2"
                  />
                </div>

                {/* Discriminação */}
                <div>
                  <Label htmlFor="discriminacao">Discriminação do Serviço *</Label>
                  <Textarea
                    id="discriminacao"
                    value={formData.discriminacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, discriminacao: e.target.value }))}
                    placeholder="Descreva os serviços prestados..."
                    rows={6}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-4">
                {/* Valores por Sócio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Valores por Sócio *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {formData.socio_ids.map((socioId) => {
                        const socio = socios.find(s => s.id === socioId);
                        return (
                          <div key={socioId} className="space-y-2">
                            <Label className="text-sm font-medium">{socio?.nome_completo}</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.valores[socioId] || ''}
                                onChange={(e) => handleValorChange(socioId, parseFloat(e.target.value) || 0)}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        );
                      })}
                      {formData.socio_ids.length > 0 && (
                        <div className="pt-4 border-t mt-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Valor Total:</span>
                            <span className="font-bold text-lg text-primary">
                              R$ {Object.values(formData.valores)
                                .map((valor: any) => typeof valor === 'number' ? valor : parseFloat(String(valor || 0)))
                                .filter((valor: number) => !isNaN(valor) && valor > 0)
                                .reduce((sum: number, valor: number) => sum + valor, 0)
                                .toFixed(2)
                                .replace('.', ',')
                                .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            </span>
                          </div>
                          {formData.valor_iss > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Valor do ISS:</span>
                              <span className="font-medium">
                                R$ {formData.valor_iss.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tributação */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Tributação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="tipo_tributacao">Tipo de Tributação</Label>
                      <Select
                        value={formData.tipo_tributacao}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_tributacao: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">Nenhuma</SelectItem>
                          <SelectItem value="WithinCity">Dentro do Município</SelectItem>
                          <SelectItem value="OutsideCity">Fora do Município</SelectItem>
                          <SelectItem value="Export">Exportação</SelectItem>
                          <SelectItem value="Free">Livre</SelectItem>
                          <SelectItem value="Immune">Imune</SelectItem>
                          <SelectItem value="SuspendedCourtDecision">Suspenso por Decisão Judicial</SelectItem>
                          <SelectItem value="SuspendedAdministrativeProcedure">Suspenso por Procedimento Administrativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="aliquota_iss">Alíquota ISS (%)</Label>
                        <Input
                          id="aliquota_iss"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.aliquota_iss || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, aliquota_iss: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="valor_iss">Valor do ISS</Label>
                        <Input
                          id="valor_iss"
                          type="text"
                          value={`R$ ${formData.valor_iss.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`}
                          readOnly
                          className="mt-2 bg-muted"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Retenções - Seção Colapsável */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Retenções
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRetencoes(!showRetencoes)}
                      >
                        {showRetencoes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  {showRetencoes && (
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="retencao_ir">Retenção de IR</Label>
                          <Input
                            id="retencao_ir"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.retencao_ir || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, retencao_ir: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="retencao_pis">Retenção de PIS</Label>
                          <Input
                            id="retencao_pis"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.retencao_pis || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, retencao_pis: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="retencao_cofins">Retenção de COFINS</Label>
                          <Input
                            id="retencao_cofins"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.retencao_cofins || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, retencao_cofins: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="retencao_csll">Retenção de CSLL</Label>
                          <Input
                            id="retencao_csll"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.retencao_csll || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, retencao_csll: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="retencao_inss">Retenção de INSS</Label>
                          <Input
                            id="retencao_inss"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.retencao_inss || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, retencao_inss: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="retencao_iss">Retenção de ISS</Label>
                          <Input
                            id="retencao_iss"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.retencao_iss || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, retencao_iss: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="outras_retencoes">Outras Retenções</Label>
                        <Input
                          id="outras_retencoes"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.outras_retencoes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, outras_retencoes: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Deduções e Descontos - Seção Colapsável */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Deduções e Descontos
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeducoes(!showDeducoes)}
                      >
                        {showDeducoes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  {showDeducoes && (
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor="valor_deducoes">Valor de Deduções</Label>
                        <Input
                          id="valor_deducoes"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.valor_deducoes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, valor_deducoes: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="desconto_incondicionado">Desconto Incondicionado</Label>
                        <Input
                          id="desconto_incondicionado"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.desconto_incondicionado || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, desconto_incondicionado: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="desconto_condicionado">Desconto Condicionado</Label>
                        <Input
                          id="desconto_condicionado"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.desconto_condicionado || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, desconto_condicionado: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Localização da Prestação - Seção Colapsável */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Localização da Prestação
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLocalizacao(!showLocalizacao)}
                      >
                        {showLocalizacao ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  {showLocalizacao && (
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="localizacao_estado">Estado</Label>
                          <Input
                            id="localizacao_estado"
                            value={formData.localizacao_estado}
                            onChange={(e) => setFormData(prev => ({ ...prev, localizacao_estado: e.target.value }))}
                            placeholder="Ex: SP"
                            maxLength={2}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="localizacao_cep">CEP</Label>
                          <Input
                            id="localizacao_cep"
                            value={formData.localizacao_cep}
                            onChange={(e) => setFormData(prev => ({ ...prev, localizacao_cep: e.target.value }))}
                            placeholder="00000-000"
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="localizacao_cidade">Cidade</Label>
                        <Input
                          id="localizacao_cidade"
                          value={formData.localizacao_cidade}
                          onChange={(e) => setFormData(prev => ({ ...prev, localizacao_cidade: e.target.value }))}
                          placeholder="Nome da cidade"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="localizacao_logradouro">Logradouro</Label>
                        <Input
                          id="localizacao_logradouro"
                          value={formData.localizacao_logradouro}
                          onChange={(e) => setFormData(prev => ({ ...prev, localizacao_logradouro: e.target.value }))}
                          placeholder="Rua, Avenida, etc"
                          className="mt-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="localizacao_numero">Número</Label>
                          <Input
                            id="localizacao_numero"
                            value={formData.localizacao_numero}
                            onChange={(e) => setFormData(prev => ({ ...prev, localizacao_numero: e.target.value }))}
                            placeholder="Ex: 185"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="localizacao_bairro">Bairro</Label>
                          <Input
                            id="localizacao_bairro"
                            value={formData.localizacao_bairro}
                            onChange={(e) => setFormData(prev => ({ ...prev, localizacao_bairro: e.target.value }))}
                            placeholder="Nome do bairro"
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="localizacao_complemento">Complemento</Label>
                        <Input
                          id="localizacao_complemento"
                          value={formData.localizacao_complemento}
                          onChange={(e) => setFormData(prev => ({ ...prev, localizacao_complemento: e.target.value }))}
                          placeholder="Apto, Sala, etc"
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* RPS - Seção Colapsável */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Dados do RPS
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRPS(!showRPS)}
                      >
                        {showRPS ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  {showRPS && (
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="rps_numero">Número do RPS</Label>
                          <Input
                            id="rps_numero"
                            value={formData.rps_numero}
                            onChange={(e) => setFormData(prev => ({ ...prev, rps_numero: e.target.value }))}
                            placeholder="Opcional"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="rps_serie">Série do RPS</Label>
                          <Input
                            id="rps_serie"
                            value={formData.rps_serie}
                            onChange={(e) => setFormData(prev => ({ ...prev, rps_serie: e.target.value }))}
                            placeholder="Opcional"
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="rps_data_emissao">Data de Emissão do RPS</Label>
                        <Input
                          id="rps_data_emissao"
                          type="datetime-local"
                          value={formData.rps_data_emissao}
                          onChange={(e) => setFormData(prev => ({ ...prev, rps_data_emissao: e.target.value }))}
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Informações Adicionais */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Informações Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.informacoes_adicionais}
                      onChange={(e) => setFormData(prev => ({ ...prev, informacoes_adicionais: e.target.value }))}
                      placeholder="Informações adicionais sobre a nota fiscal..."
                      rows={3}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <NFSePreview
            empresa={empresaCompleta || empresas.find(e => e.id === parseInt(formData.empresa_id))}
            tomador={
              formData.tomadorMode === 'avulsa'
                ? {
                    id: 0,
                    tipo_tomador: tomadorAvulsa.tipo_tomador,
                    nome_razao_social_unificado: tomadorAvulsa.nome_razao_social,
                    cpf_cnpj_unificado: tomadorAvulsa.cnpj_cpf,
                    email_unificado: tomadorAvulsa.email,
                    telefone_unificado: tomadorAvulsa.telefone,
                    endereco_unificado: tomadorAvulsa.endereco,
                    numero_unificado: tomadorAvulsa.numero,
                    complemento_unificado: tomadorAvulsa.complemento,
                    bairro_unificado: tomadorAvulsa.bairro,
                    cidade_unificado: tomadorAvulsa.cidade,
                    uf_unificado: tomadorAvulsa.uf,
                    cep_unificado: tomadorAvulsa.cep,
                  }
                : tomadores.find(t => t.id === parseInt(formData.tomador_id))
            }
            socios={socios.filter(s => formData.socio_ids.includes(s.id))}
            modelo={modelos.find(m => m.id === parseInt(formData.modelo_id))}
            discriminacao={formData.discriminacao}
            valores={formData.valores}
            mesCompetencia={formData.mes_competencia}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || loading}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit() || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirmar e Emitir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}