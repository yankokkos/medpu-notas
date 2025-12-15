import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Search,
  Download,
  Eye,
  XCircle,
  Plus,
  Calendar,
  Building2,
  Users,
  Loader2,
  FileText,
  File,
  FileSpreadsheet,
  User,
  DollarSign,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { notasService, empresasService, pessoasService, tomadoresService } from '../services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { BatchEmissionDialog } from './BatchEmissionDialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Checkbox } from './ui/checkbox';
import { X } from 'lucide-react';

interface NotasPageProps {
  onEmitNFSe: () => void;
}

export function NotasPage({ onEmitNFSe }: NotasPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [competenciaFilter, setCompetenciaFilter] = useState('');
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingNota, setLoadingNota] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [notaParaCancelar, setNotaParaCancelar] = useState<any>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [selectedNotas, setSelectedNotas] = useState<Set<string>>(new Set());
  const [sincronizando, setSincronizando] = useState(false);
  const [baixandoXMLs, setBaixandoXMLs] = useState(false);
  const [baixandoPDFs, setBaixandoPDFs] = useState(false);
  const [agrupamento, setAgrupamento] = useState('nenhum');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [selectedSocios, setSelectedSocios] = useState<number[]>([]);
  const [selectedTomadores, setSelectedTomadores] = useState<number[]>([]);
  const [dataEmissaoInicio, setDataEmissaoInicio] = useState('');
  const [dataEmissaoFim, setDataEmissaoFim] = useState('');
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [socios, setSocios] = useState<any[]>([]);
  const [tomadores, setTomadores] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Carregar dados para filtros
  const loadFilterData = async () => {
    try {
      setLoadingFilters(true);
      
      // Carregar empresas
      const empresasResponse = await empresasService.listar({ status: 'ativa' });
      if (empresasResponse.success) {
        setEmpresas(empresasResponse.data.empresas || []);
      }

      // Carregar sócios (pessoas que são sócios)
      const pessoasResponse = await pessoasService.listar();
      if (pessoasResponse.success) {
        setSocios(pessoasResponse.data.pessoas || []);
      }

      // Carregar tomadores
      const tomadoresResponse = await tomadoresService.listar();
      if (tomadoresResponse.success) {
        setTomadores(tomadoresResponse.data.tomadores || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados dos filtros:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Carregar notas da API
  const loadNotas = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 100,
        search: searchTerm,
        status: statusFilter,
        mes_competencia: competenciaFilter
      };

      if (empresaFilter) {
        params.empresa_id = empresaFilter;
      }

      if (selectedSocios.length > 0) {
        params.socios_ids = selectedSocios.join(',');
      }

      if (selectedTomadores.length > 0) {
        params.tomador_id = selectedTomadores.join(','); // Múltiplos tomadores
      }

      if (dataEmissaoInicio) {
        params.data_emissao_inicio = dataEmissaoInicio;
      }

      if (dataEmissaoFim) {
        params.data_emissao_fim = dataEmissaoFim;
      }

      const response = await notasService.listar(params);
      
      if (response.success) {
        setNotas(response.data.notas || []);
        setPagination(response.data.pagination || { page: 1, limit: 100, total: 0, pages: 1 });
      } else {
        setNotas([]);
        setPagination({ page: 1, limit: 100, total: 0, pages: 1 });
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      toast.error('Erro ao carregar notas');
      setNotas([]);
      setPagination({ page: 1, limit: 100, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    loadNotas();
  }, [searchTerm, statusFilter, competenciaFilter, empresaFilter, selectedSocios, selectedTomadores, dataEmissaoInicio, dataEmissaoFim]);

  useEffect(() => {
    // Listener para evento de visualizar nota
    const handleViewNota = (event: CustomEvent) => {
      if (event.detail?.id) {
        handleVisualizarNota(event.detail.id);
      }
    };
    
    // Listener para evento de filtrar notas
    const handleFilterNotas = (event: CustomEvent) => {
      if (event.detail?.status) {
        setStatusFilter(event.detail.status);
      }
    };
    
    window.addEventListener('view-nota', handleViewNota as EventListener);
    window.addEventListener('filter-notas', handleFilterNotas as EventListener);
    
    // Verificar se há parâmetro na URL
    const hash = window.location.hash;
    const match = hash.match(/notas-fiscais\?view=([^&]+)/);
    if (match && match[1]) {
      setTimeout(() => {
        handleVisualizarNota(match[1]);
        // Limpar URL
        window.history.replaceState(null, '', '#notas-fiscais');
      }, 500);
    }
    
    return () => {
      window.removeEventListener('view-nota', handleViewNota as EventListener);
      window.removeEventListener('filter-notas', handleFilterNotas as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Função para emitir nota
  const handleEmitirNota = async (id: string) => {
    try {
      const response = await notasService.emitir(id);
      if (response.success) {
        toast.success('Nota enviada para processamento!');
        loadNotas();
      }
    } catch (error) {
      console.error('Erro ao emitir nota:', error);
      toast.error('Erro ao emitir nota');
    }
  };

  // Função para deletar rascunho
  const handleDeletarRascunho = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este rascunho?')) {
      try {
        const response = await notasService.deletarRascunho(id);
        if (response.success) {
          toast.success('Rascunho excluído com sucesso!');
          loadNotas();
        }
      } catch (error) {
        console.error('Erro ao excluir rascunho:', error);
        toast.error('Erro ao excluir rascunho');
      }
    }
  };

  // Função para visualizar nota
  const handleVisualizarNota = async (id: string) => {
    try {
      setLoadingNota(true);
      
      // Primeiro, obter a nota
      const response = await notasService.obter(id);
      if (response.success) {
        const nota = response.data.nota;
        
        // Se a nota estiver em PROCESSANDO e tiver api_ref, sincronizar automaticamente
        if (nota?.status?.toUpperCase() === 'PROCESSANDO' && nota?.api_ref) {
          try {
            await notasService.sincronizar(id);
            // Recarregar a nota após sincronização
            const responseAtualizado = await notasService.obter(id);
            if (responseAtualizado.success) {
              setSelectedNota(responseAtualizado.data);
            } else {
              setSelectedNota(response.data);
            }
          } catch (syncError) {
            console.error('Erro ao sincronizar nota:', syncError);
            // Continuar mesmo se a sincronização falhar
            setSelectedNota(response.data);
          }
        } else {
          setSelectedNota(response.data);
        }
        
        setShowModal(true);
      } else {
        toast.error('Erro ao carregar nota');
      }
    } catch (error) {
      console.error('Erro ao carregar nota:', error);
      toast.error('Erro ao carregar nota');
    } finally {
      setLoadingNota(false);
    }
  };

  // Função para baixar XML
  const handleBaixarXML = async (id: string) => {
    try {
      await notasService.baixarXML(id);
      toast.success('XML baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao baixar XML:', error);
      const errorMessage = error.response?.data?.message || 
                          (error.response?.status === 404 ? 'Nota não encontrada ou XML não disponível' : 
                           error.response?.status === 400 ? 'Nota não possui XML disponível (ainda não foi emitida)' :
                           'Erro ao baixar XML');
      toast.error(errorMessage);
    }
  };

  // Função para baixar PDF
  const handleBaixarPDF = async (id: string) => {
    try {
      await notasService.baixarPDF(id);
      toast.success('PDF baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao baixar PDF:', error);
      const errorMessage = error.response?.data?.message || 
                          (error.response?.status === 404 ? 'Nota não encontrada ou PDF não disponível' : 
                           error.response?.status === 400 ? 'Nota não possui PDF disponível (ainda não foi emitida)' :
                           'Erro ao baixar PDF');
      toast.error(errorMessage);
    }
  };

  // Função para cancelar nota
  const handleCancelarNota = (nota: any) => {
    setNotaParaCancelar(nota);
    setMotivoCancelamento('');
    setIsCancelDialogOpen(true);
  };

  const confirmarCancelamento = async () => {
    if (!notaParaCancelar) return;
    
    if (!motivoCancelamento.trim()) {
      toast.error('Por favor, informe o motivo do cancelamento');
      return;
    }

    try {
      setCancelando(true);
      const response = await notasService.cancelar(notaParaCancelar.id, motivoCancelamento);
      if (response.success) {
        toast.success('Nota fiscal cancelada com sucesso!');
        setIsCancelDialogOpen(false);
        setNotaParaCancelar(null);
        setMotivoCancelamento('');
        loadNotas();
      } else {
        toast.error(response.message || 'Erro ao cancelar nota');
      }
    } catch (error: any) {
      console.error('Erro ao cancelar nota:', error);
      toast.error(error.response?.data?.message || error.message || 'Erro ao cancelar nota');
    } finally {
      setCancelando(false);
    }
  };

  // Dados carregados da API - não há mais dados mock

  const getStatusBadge = (status: string) => {
    // Normalizar status para maiúsculas para garantir compatibilidade
    const statusNormalizado = (status || '').toUpperCase().trim();
    
    const variants = {
      RASCUNHO: { label: 'Rascunho', variant: 'secondary' as const },
      PROCESSANDO: { label: 'Processando', variant: 'default' as const },
      AUTORIZADA: { label: 'Autorizada', variant: 'default' as const },
      ERRO: { label: 'Erro', variant: 'destructive' as const },
      CANCELADA: { label: 'Cancelada', variant: 'outline' as const },
    };
    const config = variants[statusNormalizado as keyof typeof variants] || variants.RASCUNHO;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredNotas = notas.filter(nota => {
    const empresaNome = nota.empresa_nome || nota.empresa || '';
    const tomadorNome = nota.tomador_nome || nota.tomador || '';
    const matchesSearch = 
      empresaNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tomadorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (nota.numero && nota.numero.includes(searchTerm));
    
    const matchesStatus = !statusFilter || (nota.status?.toUpperCase() || '') === statusFilter.toUpperCase();
    const matchesCompetencia = !competenciaFilter || nota.mes_competencia === competenciaFilter;
    
    return matchesSearch && matchesStatus && matchesCompetencia;
  });

  const competencias = [...new Set(notas.map(n => n.mes_competencia))].sort().reverse();

  // Toggle seleção de nota
  const toggleNotaSelection = (notaId: string) => {
    const newSelected = new Set(selectedNotas);
    if (newSelected.has(notaId)) {
      newSelected.delete(notaId);
    } else {
      newSelected.add(notaId);
    }
    setSelectedNotas(newSelected);
  };

  // Selecionar todas as notas
  const selectAllNotas = () => {
    if (selectedNotas.size === filteredNotas.length) {
      setSelectedNotas(new Set());
    } else {
      setSelectedNotas(new Set(filteredNotas.map(n => n.id)));
    }
  };

  // Sincronizar notas selecionadas
  const handleSincronizarLote = async () => {
    if (selectedNotas.size === 0) {
      toast.error('Selecione pelo menos uma nota para sincronizar');
      return;
    }

    try {
      setSincronizando(true);
      const ids = Array.from(selectedNotas);
      const response = await notasService.sincronizarLote(ids);
      
      if (response.success) {
        const sucessos = response.data.sucessos || 0;
        const erros = response.data.erros || 0;
        toast.success(`Sincronização concluída: ${sucessos} sucesso(s), ${erros} erro(s)`);
        setSelectedNotas(new Set());
        loadNotas();
      } else {
        toast.error(response.message || 'Erro ao sincronizar notas');
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar notas:', error);
      toast.error(error.response?.data?.message || 'Erro ao sincronizar notas');
    } finally {
      setSincronizando(false);
    }
  };

  // Baixar XMLs em lote
  const handleBaixarXMLsLote = async () => {
    if (selectedNotas.size === 0) {
      toast.error('Selecione pelo menos uma nota para baixar XML');
      return;
    }

    try {
      setBaixandoXMLs(true);
      const ids = Array.from(selectedNotas);
      await notasService.baixarXMLsLote(ids, agrupamento);
      toast.success('XMLs baixados com sucesso!');
      setSelectedNotas(new Set());
    } catch (error: any) {
      console.error('Erro ao baixar XMLs:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao baixar XMLs';
      toast.error(errorMessage);
    } finally {
      setBaixandoXMLs(false);
    }
  };

  // Baixar PDFs em lote
  const handleBaixarPDFsLote = async () => {
    if (selectedNotas.size === 0) {
      toast.error('Selecione pelo menos uma nota para baixar PDF');
      return;
    }

    try {
      setBaixandoPDFs(true);
      const ids = Array.from(selectedNotas);
      await notasService.baixarPDFsLote(ids, agrupamento);
      toast.success('PDFs baixados com sucesso!');
      setSelectedNotas(new Set());
    } catch (error: any) {
      console.error('Erro ao baixar PDFs:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao baixar PDFs';
      toast.error(errorMessage);
    } finally {
      setBaixandoPDFs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notas Fiscais</h1>
          <p className="text-muted-foreground">
            Gerencie todas as notas fiscais emitidas
          </p>
        </div>
        
        <div className="flex gap-2">
        <Button onClick={onEmitNFSe} className="bg-success hover:bg-success/90">
          <Plus className="w-4 h-4 mr-2" />
          Emitir NFS-e
        </Button>
          <Button onClick={() => setIsBatchDialogOpen(true)} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Emitir em Lote
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Empresa */}
            <Select value={empresaFilter || "ALL"} onValueChange={(value) => setEmpresaFilter(value === "ALL" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={String(empresa.id)}>
                    {empresa.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sócios - Combobox */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  {selectedSocios.length > 0 
                    ? `${selectedSocios.length} sócio(s) selecionado(s)`
                    : 'Selecionar sócios'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar sócio..." />
                  <CommandList>
                    <CommandEmpty>Nenhum sócio encontrado.</CommandEmpty>
                    <CommandGroup>
                      {socios.map((socio) => (
                        <CommandItem
                          key={socio.id}
                          onSelect={() => {
                            setSelectedSocios(prev => 
                              prev.includes(socio.id)
                                ? prev.filter(id => id !== socio.id)
                                : [...prev, socio.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={selectedSocios.includes(socio.id)}
                            className="mr-2"
                          />
                          {socio.nome_completo}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Competência */}
            <Select value={competenciaFilter || "ALL"} onValueChange={(value) => setCompetenciaFilter(value === "ALL" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Competência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as competências</SelectItem>
                {competencias.map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    {new Date(comp + '-01').toLocaleDateString('pt-BR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Período de Emissão - Início */}
            <div>
              <Label className="text-xs text-muted-foreground">Emissão de</Label>
              <Input
                type="date"
                value={dataEmissaoInicio}
                onChange={(e) => setDataEmissaoInicio(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Período de Emissão - Fim */}
            <div>
              <Label className="text-xs text-muted-foreground">Emissão até</Label>
              <Input
                type="date"
                value={dataEmissaoFim}
                onChange={(e) => setDataEmissaoFim(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Tomador - Combobox */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <User className="w-4 h-4 mr-2" />
                  {selectedTomadores.length > 0 
                    ? `${selectedTomadores.length} tomador(es) selecionado(s)`
                    : 'Selecionar tomador'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar tomador..." />
                  <CommandList>
                    <CommandEmpty>Nenhum tomador encontrado.</CommandEmpty>
                    <CommandGroup>
                      {tomadores.map((tomador) => (
                        <CommandItem
                          key={tomador.id}
                          onSelect={() => {
                            setSelectedTomadores(prev => 
                              prev.includes(tomador.id)
                                ? prev.filter(id => id !== tomador.id)
                                : [...prev, tomador.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={selectedTomadores.includes(tomador.id)}
                            className="mr-2"
                          />
                          {tomador.nome_razao_social_unificado || tomador.nome || tomador.razao_social || `Tomador ${tomador.id}`}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Status */}
            <Select value={statusFilter || "ALL"} onValueChange={(value) => setStatusFilter(value === "ALL" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                <SelectItem value="PROCESSANDO">Processando</SelectItem>
                <SelectItem value="AUTORIZADA">Autorizada</SelectItem>
                <SelectItem value="ERRO">Erro</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter || competenciaFilter || searchTerm) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setStatusFilter('');
                  setCompetenciaFilter('');
                  setSearchTerm('');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {notas.filter(n => (n.status?.toUpperCase() || '') === 'AUTORIZADA').length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Autorizadas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {notas.filter(n => (n.status?.toUpperCase() || '') === 'PROCESSANDO').length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Processando</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {notas.filter(n => (n.status?.toUpperCase() || '') === 'RASCUNHO').length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Rascunhos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {notas.filter(n => (n.status?.toUpperCase() || '') === 'ERRO').length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Com Erro</div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {notas.filter(n => (n.status?.toUpperCase() || '') === 'CANCELADA').length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Canceladas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações em Lote */}
      {selectedNotas.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedNotas.size} nota{selectedNotas.size !== 1 ? 's' : ''} selecionada{selectedNotas.size !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNotas(new Set())}
                  >
                    Limpar seleção
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="agrupamento" className="text-sm">Agrupar por:</Label>
                  <Select value={agrupamento} onValueChange={setAgrupamento}>
                    <SelectTrigger id="agrupamento" className="w-48">
                      <SelectValue placeholder="Selecione o agrupamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhum agrupamento</SelectItem>
                      <SelectItem value="prestador">Prestador</SelectItem>
                      <SelectItem value="tomador">Tomador</SelectItem>
                      <SelectItem value="competencia">Competência</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSincronizarLote}
                  disabled={sincronizando}
                >
                  {sincronizando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBaixarXMLsLote}
                  disabled={baixandoXMLs}
                >
                  {baixandoXMLs ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Baixando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Baixar XMLs
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBaixarPDFsLote}
                  disabled={baixandoPDFs}
                >
                  {baixandoPDFs ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Baixando...
                    </>
                  ) : (
                    <>
                      <File className="w-4 h-4 mr-2" />
                      Baixar PDFs
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filteredNotas.length} nota{filteredNotas.length !== 1 ? 's' : ''} encontrada{filteredNotas.length !== 1 ? 's' : ''}
            </CardTitle>
            {filteredNotas.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllNotas}
                className="text-sm"
              >
                {selectedNotas.size === filteredNotas.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Desmarcar todas
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Selecionar todas
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={selectAllNotas}
                  >
                    {selectedNotas.size === filteredNotas.length && filteredNotas.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Empresa/Tomador</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotas.map((nota) => (
                <TableRow key={nota.id} className={selectedNotas.has(nota.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleNotaSelection(nota.id)}
                    >
                      {selectedNotas.has(nota.id) ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    {nota.numero || (
                      <Badge variant="secondary">Rascunho</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Building2 className="w-3 h-3" />
                        {nota.empresa_nome || nota.empresa || '-'}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {nota.tomador_nome || nota.tomador || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      R$ {parseFloat(nota.valor_total || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(nota.status)}
                    {(nota.status?.toUpperCase() || '') === 'ERRO' && nota.mensagem_erro && (
                      <div className="text-xs text-destructive mt-1">
                        {typeof nota.mensagem_erro === 'string' ? nota.mensagem_erro : JSON.stringify(nota.mensagem_erro)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3" />
                      {nota.mes_competencia ? new Date(nota.mes_competencia + '-01').toLocaleDateString('pt-BR', { 
                        month: 'short', 
                        year: 'numeric' 
                      }) : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {nota.data_emissao ? (
                      new Date(nota.data_emissao).toLocaleDateString('pt-BR')
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Visualizar"
                        onClick={() => handleVisualizarNota(nota.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {(nota.caminho_xml || nota.api_ref) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Baixar XML"
                          onClick={() => handleBaixarXML(nota.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {(nota.caminho_pdf || nota.api_ref) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Baixar PDF"
                          onClick={() => handleBaixarPDF(nota.id)}
                        >
                          <File className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {(nota.status?.toUpperCase() === 'AUTORIZADA') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Cancelar nota fiscal"
                          onClick={() => handleCancelarNota(nota)}
                        >
                          <XCircle className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Visualização */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Nota Fiscal</DialogTitle>
            <DialogDescription>
              Informações completas da nota fiscal
            </DialogDescription>
          </DialogHeader>
          
          {loadingNota ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : selectedNota ? (
            <div className="space-y-6">
              {/* Dados da Nota Fiscal */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados da Nota Fiscal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <div className="font-medium">{getStatusBadge(selectedNota.nota?.status || 'RASCUNHO')}</div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Número</p>
                      <p className="font-medium">{selectedNota.nota?.numero || selectedNota.nota?.numero_rps || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cód. Verificação</p>
                      <p className="font-medium">{selectedNota.nota?.api_ref || selectedNota.nota?.codigo_verificacao || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Competência</p>
                      <p className="font-medium">
                        {selectedNota.nota?.mes_competencia 
                          ? (() => {
                              const [ano, mes] = selectedNota.nota.mes_competencia.split('-');
                              const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                              return `${parseInt(mes)} de ${meses[parseInt(mes) - 1]} de ${ano}`;
                            })()
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cancelada em</p>
                      <p className="font-medium">{selectedNota.nota?.data_cancelamento ? new Date(selectedNota.nota.data_cancelamento).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Prestador */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Prestador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">CNPJ</p>
                      <p className="font-medium">{selectedNota.nota?.empresa_cnpj || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Razão Social</p>
                      <p className="font-medium">{selectedNota.nota?.empresa_nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Inscrição Municipal</p>
                      <p className="font-medium">{selectedNota.nota?.empresa_inscricao_municipal || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Regime Tributário</p>
                      <p className="font-medium">{selectedNota.nota?.empresa_regime_tributario || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Regime Especial de Tributação</p>
                      <p className="font-medium">Automatico</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Natureza Jurídica</p>
                      <p className="font-medium">--</p>
                    </div>
                    {selectedNota.enderecoEmpresa && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Endereço</p>
                          <p className="font-medium">{selectedNota.enderecoEmpresa.logradouro || 'NAO INFORMADO'}, {selectedNota.enderecoEmpresa.numero || 'SN'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bairro</p>
                          <p className="font-medium">{selectedNota.enderecoEmpresa.bairro || '--'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Complemento</p>
                          <p className="font-medium">{selectedNota.enderecoEmpresa.complemento || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CEP</p>
                          <p className="font-medium">{selectedNota.enderecoEmpresa.cep || '--'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cidade/UF</p>
                          <p className="font-medium">{selectedNota.enderecoEmpresa.municipio || 'NAO INFORMADO'}/{selectedNota.enderecoEmpresa.uf || 'NI'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">País</p>
                          <p className="font-medium">BRA</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Tomador */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Tomador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">CNPJ</p>
                      <p className="font-medium">{selectedNota.nota?.tomador_documento || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Razão Social</p>
                      <p className="font-medium">{selectedNota.nota?.tomador_nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedNota.nota?.tomador_email || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Regime Tributário</p>
                      <p className="font-medium">{selectedNota.nota?.tomador_regime_tributario || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Regime Especial de Tributação</p>
                      <p className="font-medium">--</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Natureza Jurídica</p>
                      <p className="font-medium">--</p>
                    </div>
                    {selectedNota.enderecoTomador && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Endereço</p>
                          <p className="font-medium">{selectedNota.enderecoTomador.logradouro || 'NAO INFORMADO'}, {selectedNota.enderecoTomador.numero || 'SN'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bairro</p>
                          <p className="font-medium">{selectedNota.enderecoTomador.bairro || '--'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Complemento</p>
                          <p className="font-medium">{selectedNota.enderecoTomador.complemento || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CEP</p>
                          <p className="font-medium">{selectedNota.enderecoTomador.cep || '--'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cidade/UF</p>
                          <p className="font-medium">{selectedNota.enderecoTomador.municipio || 'NAO INFORMADO'}/{selectedNota.enderecoTomador.uf || 'NI'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">País</p>
                          <p className="font-medium">BRA</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Descrição do Serviço */}
              <Card>
                <CardHeader>
                  <CardTitle>Descrição do Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedNota.nota?.discriminacao_final || selectedNota.nota?.texto_modelo || '---'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Sócios e Valores */}
              {selectedNota.socios && selectedNota.socios.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sócios e Valores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedNota.socios.map((socio: any, index: number) => {
                        const valorPrestado = parseFloat(socio.valor_prestado || 0);
                        const percentual = parseFloat(socio.percentual_participacao || 0);
                        const valorTotal = parseFloat(selectedNota.nota?.valor_total || 0);
                        return (
                          <div key={socio.id || index} className="flex justify-between items-center p-3 bg-muted/30 rounded-md border">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{socio.nome_completo || `Sócio ${index + 1}`}</p>
                              {socio.cpf && (
                                <p className="text-xs text-muted-foreground">CPF: {socio.cpf}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                R$ {valorPrestado.toFixed(2).replace('.', ',')}
                              </p>
                              {valorTotal > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {percentual.toFixed(2)}% do total
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">Valor Total</p>
                          <p className="font-bold text-lg">
                            R$ {parseFloat(selectedNota.nota?.valor_total || 0).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Valores do Serviço */}
              <Card>
                <CardHeader>
                  <CardTitle>Valores do Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cód. do Serviço Municipal</p>
                      <p className="font-medium">{selectedNota.nota?.codigo_servico_municipal || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lei Complementar 116</p>
                      <p className="font-medium">{selectedNota.nota?.codigo_servico_federal || selectedNota.nota?.codigo_servico_municipal || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CNAE</p>
                      <p className="font-medium">{selectedNota.nota?.cnae_code || '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor do serviço</p>
                      <p className="font-medium">R$ {parseFloat(selectedNota.nota?.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor deduções</p>
                      <p className="font-medium">R$ {parseFloat(selectedNota.nota?.valor_deducoes || 0).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Base de cálculo</p>
                      <p className="font-medium">R$ {(parseFloat(selectedNota.nota?.valor_total || 0) - parseFloat(selectedNota.nota?.valor_deducoes || 0)).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alíquota do ISS (%)</p>
                      <p className="font-medium">{selectedNota.nota?.aliquota_iss ? parseFloat(selectedNota.nota.aliquota_iss).toFixed(2) + '%' : '--'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor do ISS</p>
                      <p className="font-medium">R$ {parseFloat(selectedNota.nota?.valor_iss || 0).toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                  
                  {/* Impostos Retidos */}
                  <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold mb-3">Impostos Retidos</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Valor do ISS</p>
                        <p className="font-medium">R$ {parseFloat(selectedNota.nota?.retencao_iss || 0).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor do IRRF</p>
                        <p className="font-medium">R$ {parseFloat(selectedNota.nota?.retencao_ir || 0).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor do PIS</p>
                        <p className="font-medium">R$ {parseFloat(selectedNota.nota?.retencao_pis || 0).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor do COFINS</p>
                        <p className="font-medium">R$ {parseFloat(selectedNota.nota?.retencao_cofins || 0).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor do CSLL</p>
                        <p className="font-medium">R$ {parseFloat(selectedNota.nota?.retencao_csll || 0).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor do INSS</p>
                        <p className="font-medium">R$ {parseFloat(selectedNota.nota?.retencao_inss || 0).toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <p className="text-muted-foreground font-semibold">Valor Líquido</p>
                        <p className="font-bold text-lg">
                          R$ {(
                            parseFloat(selectedNota.nota?.valor_total || 0) - 
                            parseFloat(selectedNota.nota?.retencao_iss || 0) -
                            parseFloat(selectedNota.nota?.retencao_ir || 0) -
                            parseFloat(selectedNota.nota?.retencao_pis || 0) -
                            parseFloat(selectedNota.nota?.retencao_cofins || 0) -
                            parseFloat(selectedNota.nota?.retencao_csll || 0) -
                            parseFloat(selectedNota.nota?.retencao_inss || 0)
                          ).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes Adicionais */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes Adicionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Identificador (ID)</p>
                      <p className="font-medium font-mono text-xs">{selectedNota.nota?.id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Criado em</p>
                      <p className="font-medium">{selectedNota.nota?.created_at ? new Date(selectedNota.nota.created_at).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Modificado em</p>
                      <p className="font-medium">{selectedNota.nota?.updated_at ? new Date(selectedNota.nota.updated_at).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Processado em</p>
                      <p className="font-medium">{selectedNota.nota?.data_emissao ? new Date(selectedNota.nota.data_emissao).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Série do RPS</p>
                      <p className="font-medium">{selectedNota.nota?.serie_rps || 'IO'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Número do RPS</p>
                      <p className="font-medium">{selectedNota.nota?.numero_rps || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status do RPS</p>
                      <p className="font-medium">Normal</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo do RPS</p>
                      <p className="font-medium">Rps</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Número do Lote</p>
                      <p className="font-medium">{selectedNota.nota?.api_ref || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Número Verificação do Lote</p>
                      <p className="font-medium">{selectedNota.nota?.api_ref || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status processamento</p>
                      <p className="font-medium">{selectedNota.nota?.status === 'AUTORIZADA' ? 'Emitida' : selectedNota.nota?.status || 'Rascunho'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Motivo processamento</p>
                      <p className="font-medium">{selectedNota.nota?.mensagem_erro || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ações */}
              <div className="flex gap-2 justify-end">
                {(selectedNota.nota?.caminho_xml || selectedNota.nota?.api_ref) && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      handleBaixarXML(selectedNota.nota.id);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Baixar XML
                  </Button>
                )}
                {(selectedNota.nota?.caminho_pdf || selectedNota.nota?.api_ref) && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      handleBaixarPDF(selectedNota.nota.id);
                    }}
                  >
                    <File className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
                {(selectedNota.nota?.status?.toUpperCase() === 'AUTORIZADA') && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      handleCancelarNota(selectedNota.nota);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar Nota
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <BatchEmissionDialog
        isOpen={isBatchDialogOpen}
        onClose={() => setIsBatchDialogOpen(false)}
        onSuccess={() => {
          loadNotas();
          setIsBatchDialogOpen(false);
        }}
      />

      {/* Dialog de Cancelamento */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Nota Fiscal</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar esta nota fiscal? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {notaParaCancelar && (
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Número:</strong> {notaParaCancelar.numero || 'Rascunho'}
                </div>
                <div className="text-sm">
                  <strong>Empresa:</strong> {notaParaCancelar.empresa_nome || notaParaCancelar.empresa || '-'}
                </div>
                <div className="text-sm">
                  <strong>Valor:</strong> R$ {parseFloat(notaParaCancelar.valor_total || 0).toFixed(2).replace('.', ',')}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo do cancelamento..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="min-h-[100px]"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setNotaParaCancelar(null);
                setMotivoCancelamento('');
              }}
              disabled={cancelando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarCancelamento}
              disabled={cancelando || !motivoCancelamento.trim()}
            >
              {cancelando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirmar Cancelamento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}