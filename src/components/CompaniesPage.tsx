import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { DocumentUpload } from './DocumentUpload';
import { CNPJLookup } from './CNPJLookup';
import { toast } from "sonner";
import { empresasService, contasService, pessoasService, consultasService } from '../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  Users,
  UserCheck,
  Link,
  RefreshCw,
  Download,
  Upload,
  X,
} from 'lucide-react';

// Componente para gerenciar pessoas vinculadas a uma empresa
function CompanyPeopleManager({ company, onClose, onUpdate }) {
  const [selectedPeople, setSelectedPeople] = useState<Record<string, { tipo_vinculo: string }>>({});
  const [availablePeople, setAvailablePeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchPeople, setSearchPeople] = useState('');

  // Carregar pessoas disponíveis e inicializar selecionadas
  useEffect(() => {
    const loadPeople = async () => {
      try {
        setLoading(true);
        const response = await pessoasService.listar({ limit: 1000 });
        
        if (response.success && response.data.pessoas) {
          setAvailablePeople(response.data.pessoas);
          
          // Inicializar pessoas já vinculadas como selecionadas
          const initialSelected: Record<string, { tipo_vinculo: string }> = {};
          if (company.pessoas_vinculadas) {
            company.pessoas_vinculadas.forEach((pessoa: any) => {
              initialSelected[pessoa.pessoa_id] = {
                tipo_vinculo: pessoa.tipo_vinculo || 'SOCIO'
              };
            });
          }
          setSelectedPeople(initialSelected);
        }
      } catch (error) {
        console.error('Erro ao carregar pessoas:', error);
        toast.error('Erro ao carregar pessoas disponíveis');
      } finally {
        setLoading(false);
      }
    };

    loadPeople();
  }, [company]);

  const handlePersonToggle = (personId: number) => {
    setSelectedPeople(prev => {
      const newSelected = { ...prev };
      if (newSelected[personId]) {
        delete newSelected[personId];
      } else {
        newSelected[personId] = {
          tipo_vinculo: 'SOCIO',
          percentual_participacao: null
        };
      }
      return newSelected;
    });
  };

  const handleTipoVinculoChange = (personId: number, tipoVinculo: string) => {
    setSelectedPeople(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        tipo_vinculo: tipoVinculo
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Preparar array de pessoas para enviar
      const pessoasArray = Object.entries(selectedPeople).map(([pessoaId, dados]) => ({
        pessoa_id: parseInt(pessoaId),
        tipo_vinculo: dados.tipo_vinculo
      }));

      console.log('💾 Salvando vinculações:', {
        empresa_id: company.id,
        pessoas_count: pessoasArray.length,
        pessoas: pessoasArray
      });

      // Enviar para API
      const response = await empresasService.gerenciarPessoas(company.id, pessoasArray, 'atualizar');
      
      console.log('✅ Resposta da API:', response);
      
      toast.success('Vinculações atualizadas com sucesso!');
      
      // Recarregar dados atualizados
      if (onUpdate) {
        console.log('🔄 Recarregando dados da empresa...');
        await onUpdate();
        console.log('✅ Dados recarregados');
      }
      
      if (onClose) onClose();
    } catch (error: any) {
      console.error('❌ Erro ao salvar vinculações:', error);
      console.error('   Response:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Erro ao salvar vinculações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Linked People */}
      {company.pessoas_vinculadas && company.pessoas_vinculadas.length > 0 && (
        <div>
          <h3 className="font-medium mb-3">Pessoas Atualmente Vinculadas</h3>
          <div className="space-y-2">
            {company.pessoas_vinculadas.map((pessoa) => (
              <div key={pessoa.pessoa_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{pessoa.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{pessoa.cpf}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {pessoa.tipo_vinculo === 'SOCIO' ? 'Sócio' : 
                       pessoa.tipo_vinculo === 'FAMILIAR' ? 'Familiar' : 'Secretária'}
                    </Badge>
                    {pessoa.percentual_participacao && (
                      <Badge variant="default" className="ml-2 text-xs">
                        {pessoa.percentual_participacao}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available People to Link */}
      <div>
        <h3 className="font-medium mb-3">Pessoas Disponíveis para Vinculação</h3>
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchPeople}
              onChange={(e) => setSearchPeople(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
            {availablePeople
              .filter((person: any) =>
                person.nome_completo?.toLowerCase().includes(searchPeople.toLowerCase()) ||
                person.cpf?.includes(searchPeople)
              )
              .map((person: any) => {
              const isSelected = selectedPeople[person.id];
              return (
                <div key={person.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted">
                  <Checkbox
                    id={`person-${person.id}`}
                    checked={!!isSelected}
                    onCheckedChange={() => handlePersonToggle(person.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <label htmlFor={`person-${person.id}`} className="cursor-pointer">
                      <div className="font-medium">{person.nome_completo}</div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono">{person.cpf}</span>
                      </div>
                    </label>
                    {isSelected && (
                      <div className="mt-2">
                        <Label htmlFor={`tipo-${person.id}`} className="text-xs">Tipo de Vínculo</Label>
                        <Select
                          value={isSelected.tipo_vinculo}
                          onValueChange={(value) => handleTipoVinculoChange(person.id, value)}
                        >
                          <SelectTrigger id={`tipo-${person.id}`} className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SOCIO">Sócio</SelectItem>
                            <SelectItem value="FAMILIAR">Familiar</SelectItem>
                            <SelectItem value="SECRETARIA">Secretária</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="mt-1">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Selecionada
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} className="bg-success hover:bg-success/90" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Vinculações'
          )}
        </Button>
      </div>
    </div>
  );
}

export function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Carregar empresas da API
  const loadCompanies = async (page = 1, search = '', contaId = '') => {
    try {
      setLoading(true);
      const response = await empresasService.listar({
        page,
        limit: 10,
        search,
        conta_id: contaId
      });
      
      if (response.success) {
        setCompanies(response.data.empresas);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  // Carregar contas para filtro
  const loadAccounts = async () => {
    try {
      const response = await contasService.listar({ limit: 100 });
      if (response.success) {
        setAccounts(response.data.contas);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadAccounts();
  }, []);

  // Dados carregados da API - não há mais dados mock

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
  const [isPeopleDialogOpen, setIsPeopleDialogOpen] = useState(false);
  const [selectedCompanyForPeople, setSelectedCompanyForPeople] = useState(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncData, setSyncData] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  const [sociosEncontrados, setSociosEncontrados] = useState([]);
  const [empresaCriadaId, setEmpresaCriadaId] = useState(null);
  const [showDialogSocios, setShowDialogSocios] = useState(false);
  const [sociosManuais, setSociosManuais] = useState<Array<{nome: string, cpf: string, qualificacao: string, registro_profissional: string}>>([]);
  const [mostrarFormSocios, setMostrarFormSocios] = useState(false);

  const [formData, setFormData] = useState({
    conta_id: '',
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    inscricao_municipal: '',
    inscricao_estadual: '',
    endereco: '',
    cidade: '',
    uf: '',
    cep: '',
    telefone: '',
    email: '',
  });

  // Dados carregados da API - não há mais dados mock

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
    'SP', 'SE', 'TO'
  ];

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = 
      company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj.includes(searchTerm) ||
      company.conta_nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCompany) {
        // Update existing company
        // Preparar dados incluindo sócios se houver
        const dadosEmpresa = {
          ...formData,
          socios: sociosManuais.length > 0 ? sociosManuais.filter(s => s.nome.trim()).map(s => ({
            nome: s.nome,
            cpf: s.cpf || undefined,
            qualificacao: s.qualificacao || undefined,
            registro_profissional: s.registro_profissional || undefined,
            pessoa_id: s.pessoa_id || undefined // Para identificar sócios existentes
          })) : undefined
        };
        
        const response = await empresasService.atualizar(editingCompany.id, dadosEmpresa);
        if (response.success) {
          toast.success('Empresa atualizada com sucesso!', {
            description: `${formData.razao_social} foi atualizada.`
          });
          resetForm();
          setIsAddDialogOpen(false);
          loadCompanies();
        }
      } else {
        // Add new company
        // Preparar dados incluindo sócios manuais se houver
        const dadosEmpresa = {
          ...formData,
          socios: sociosManuais.length > 0 ? sociosManuais.filter(s => s.nome.trim()).map(s => ({
            nome: s.nome,
            cpf: s.cpf || undefined,
            qualificacao: s.qualificacao || undefined,
            registro_profissional: s.registro_profissional || undefined
          })) : undefined
        };
        
        const response = await empresasService.criar(dadosEmpresa);
        if (response.success) {
          toast.success('Empresa cadastrada com sucesso!', {
            description: `${formData.razao_social} foi adicionada ao sistema.`
          });
          
          // Se houver sócios encontrados na consulta CNPJ, perguntar se deseja adicioná-los
          if (sociosEncontrados && sociosEncontrados.length > 0) {
            setEmpresaCriadaId(response.data?.empresa?.id || response.data?.id);
            setShowDialogSocios(true);
          } else {
            resetForm();
            setIsAddDialogOpen(false);
            loadCompanies();
          }
        }
      }
      
      if (editingCompany) {
        resetForm();
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error('Erro ao salvar empresa');
    }
  };

  const resetForm = () => {
    setFormData({
      conta_id: '',
      cnpj: '',
      razao_social: '',
      nome_fantasia: '',
      inscricao_municipal: '',
      inscricao_estadual: '',
      endereco: '',
      cidade: '',
      uf: '',
      cep: '',
      telefone: '',
      email: '',
    },);
    setEditingCompany(null);
    setIsAddDialogOpen(false);
    setSociosEncontrados([]);
    setEmpresaCriadaId(null);
    setSociosManuais([]);
    setMostrarFormSocios(false);
  };

  const handleEdit = async (company) => {
    setFormData({
      conta_id: company.conta_id,
      cnpj: company.cnpj,
      razao_social: company.razao_social,
      nome_fantasia: company.nome_fantasia || '',
      inscricao_municipal: company.inscricao_municipal,
      inscricao_estadual: company.inscricao_estadual || '',
      endereco: company.endereco,
      cidade: company.cidade,
      uf: company.uf,
      cep: company.cep,
      telefone: company.telefone || '',
      email: company.email || '',
    },);
    setEditingCompany(company);
    
    // Buscar sócios vinculados à empresa
    try {
      const sociosResponse = await empresasService.obterSocios(company.id);
      if (sociosResponse.success && sociosResponse.data?.socios) {
        const sociosFormatados = sociosResponse.data.socios.map((socio: any) => ({
          nome: socio.nome_completo || socio.nome || '',
          cpf: socio.cpf || '',
          qualificacao: '', // Não temos esse campo no retorno atual
          registro_profissional: socio.registro_profissional || '',
          pessoa_id: socio.id || socio.pessoa_id // Para identificar se já existe
        }));
        setSociosManuais(sociosFormatados);
        setMostrarFormSocios(true);
      } else {
        setSociosManuais([]);
        setMostrarFormSocios(false);
      }
    } catch (error) {
      console.error('Erro ao buscar sócios:', error);
      setSociosManuais([]);
      setMostrarFormSocios(false);
    }
    
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id) => {
    const company = companies.find(c => c.id === id);
    if (confirm(`Tem certeza que deseja excluir a empresa "${company?.razao_social}"?`)) {
      try {
        const response = await empresasService.deletar(id);
        if (response.success) {
          toast.success('Empresa removida', {
            description: `${company?.razao_social} foi removida do sistema.`
          });
          loadCompanies();
        }
      } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        toast.error('Erro ao excluir empresa');
      }
    }
  };

  const handleViewDocuments = (company) => {
    setViewingCompany(company);
    setIsDocumentsDialogOpen(true);
  };

  const handleViewPeople = (company) => {
    setSelectedCompanyForPeople(company);
    setIsPeopleDialogOpen(true);
  };

  const handleCNPJFound = (data) => {
    setFormData(prev => ({
      ...prev,
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || '',
      endereco: `${data.logradouro}, ${data.numero} - ${data.bairro}`,
      cidade: data.municipio,
      uf: data.uf,
      cep: data.cep,
      telefone: data.telefone || '',
      email: data.email || '',
    }));
  };

  const handleConsultarCNPJ = async () => {
    const cnpjLimpo = formData.cnpj.replace(/[^\d]/g, '');
    
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
        
        // Preencher campos apenas se estiverem vazios (não sobrescrever dados já preenchidos)
        setFormData(prev => ({
          ...prev,
          razao_social: prev.razao_social || dados.razao_social || '',
          nome_fantasia: prev.nome_fantasia || dados.nome_fantasia || '',
          endereco: prev.endereco || dados.endereco || '',
          cidade: prev.cidade || dados.cidade || '',
          uf: prev.uf || dados.uf || '',
          cep: prev.cep || dados.cep || '',
          telefone: prev.telefone || dados.telefone || '',
          email: prev.email || dados.email || '',
        }));

        // Verificar se há dados de sócios/quadro societário na resposta
        // A API NFe.io retorna em data.partners conforme documentação:
        // https://nfe.io/docs/desenvolvedores/rest-api/consulta-de-cnpj-v1/v-2-legalentities-basic-info-by-federal-tax-number-get/
        const socios = dados.partners || [];
        
        if (Array.isArray(socios) && socios.length > 0) {
          // Mapear os sócios para o formato esperado
          const sociosMapeados = socios.map(socio => ({
            nome: socio.name || socio.nome || '',
            qualificacao: socio.qualification?.description || socio.qualification?.code || socio.qualificacao || '',
            qualificacao_codigo: socio.qualification?.code || '',
            // Nota: A API não retorna CPF, participação ou outros dados dos sócios na consulta básica
          }));
          
          setSociosEncontrados(sociosMapeados);
          console.log('✅ Sócios encontrados:', sociosMapeados);
        } else {
          setSociosEncontrados([]);
        }

        // Se UF foi preenchida, consultar inscrição estadual
        if (dados.uf) {
          try {
            const ieResponse = await consultasService.consultarInscricaoEstadualEmissao(cnpjLimpo, dados.uf);
            if (ieResponse.success && ieResponse.inscricao_estadual) {
              setFormData(prev => ({
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
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error('Erro ao consultar CNPJ', {
        description: 'Verifique sua conexão e tente novamente'
      });
    } finally {
      setConsultandoCNPJ(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    loadCompanies(1, value, selectedAccount);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    loadCompanies(1, searchTerm, selectedAccount);
  };

  const handleAccountFilter = (value) => {
    setSelectedAccount(value);
    loadCompanies(1, searchTerm, value);
  };

  const handleSyncNFeio = async () => {
    try {
      setSyncLoading(true);
      const response = await empresasService.sincronizarComNFeio();
      if (response.success) {
        setSyncData(response.data);
      } else {
        toast.error('Erro ao sincronizar com NFe.io', {
          description: response.message || 'Não foi possível buscar empresas da NFe.io'
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar com NFe.io');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleImportEmpresa = async (nfeio_empresa_id) => {
    try {
      const response = await empresasService.importarEmpresaNFeio(nfeio_empresa_id);
      if (response.success) {
        toast.success('Empresa importada com sucesso!');
        loadCompanies();
        // Recarregar dados de sincronização
        handleSyncNFeio();
      } else {
        toast.error('Erro ao importar empresa', {
          description: response.message || 'Não foi possível importar a empresa'
        });
      }
    } catch (error) {
      console.error('Erro ao importar empresa:', error);
      toast.error('Erro ao importar empresa');
    }
  };

  const handleSyncEmpresa = async (id) => {
    try {
      const response = await empresasService.sincronizarEmpresaNFeio(id);
      if (response.success) {
        toast.success('Empresa sincronizada com sucesso!');
        loadCompanies();
        // Recarregar dados de sincronização
        handleSyncNFeio();
      } else {
        toast.error('Erro ao sincronizar empresa', {
          description: response.message || 'Não foi possível sincronizar a empresa'
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar empresa:', error);
      toast.error('Erro ao sincronizar empresa');
    }
  };

  const formatCNPJ = (cnpj) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie as pessoas jurídicas dos seus clientes
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isSyncDialogOpen} onOpenChange={(open) => {
            setIsSyncDialogOpen(open);
            if (open && !syncData) {
              handleSyncNFeio();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar com NFe.io
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Sincronizar Empresas com NFe.io</DialogTitle>
                <DialogDescription>
                  Compare e sincronize empresas locais com empresas cadastradas na NFe.io
                </DialogDescription>
              </DialogHeader>
              {syncLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Carregando empresas...</span>
                </div>
              ) : syncData ? (
                <SyncDialogContent 
                  syncData={syncData} 
                  onImport={handleImportEmpresa}
                  onSync={handleSyncEmpresa}
                  onClose={() => setIsSyncDialogOpen(false)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-success hover:bg-success/90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </DialogTitle>
              <DialogDescription>
                {editingCompany 
                  ? 'Altere as informações da empresa selecionada.'
                  : 'Preencha os dados para cadastrar uma nova empresa.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="conta_id">Conta</Label>
                    <Select 
                      value={formData.conta_id} 
                      onValueChange={(value) => setFormData({ ...formData, conta_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nome_conta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Empresas podem ser vinculadas a contas ou apenas a tomadores específicos
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <CNPJLookup currentCNPJ={formData.cnpj} onDataFound={handleCNPJFound} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        onBlur={() => {
                          const cnpjLimpo = formData.cnpj.replace(/[^\d]/g, '');
                          if (cnpjLimpo.length === 14) {
                            handleConsultarCNPJ();
                          }
                        }}
                        placeholder="00.000.000/0000-00"
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleConsultarCNPJ}
                        disabled={consultandoCNPJ || formData.cnpj.replace(/[^\d]/g, '').length !== 14}
                        title="Buscar dados do CNPJ na NFe.io"
                      >
                        {consultandoCNPJ ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite o CNPJ e clique no botão ou saia do campo para buscar dados automaticamente
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="inscricao_municipal">Inscrição Municipal *</Label>
                    <Input
                      id="inscricao_municipal"
                      value={formData.inscricao_municipal}
                      onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="razao_social">Razão Social *</Label>
                    <Input
                      id="razao_social"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                    <Input
                      id="inscricao_estadual"
                      value={formData.inscricao_estadual}
                      onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Textarea
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="uf">UF</Label>
                    <Select 
                      value={formData.uf} 
                      onValueChange={(value) => setFormData({ ...formData, uf: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Seção de Quadro Societário - Cadastro Manual */}
                {(sociosEncontrados.length === 0 || mostrarFormSocios || editingCompany) && (
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Quadro Societário</h3>
                        <p className="text-sm text-muted-foreground">
                          {editingCompany
                            ? 'Gerencie os sócios vinculados a esta empresa.'
                            : sociosEncontrados.length === 0 
                            ? 'Nenhum sócio encontrado na consulta. Você pode cadastrar manualmente.'
                            : 'Você também pode adicionar sócios manualmente.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSociosManuais([...sociosManuais, { nome: '', cpf: '', qualificacao: '', registro_profissional: '' }]);
                        }}
                      >
                        + Adicionar Sócio
                      </Button>
                    </div>

                    {sociosManuais.length > 0 && (
                      <div className="space-y-3">
                        {sociosManuais.map((socio, index) => (
                          <div key={index} className="space-y-3 p-3 border rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`socio-nome-${index}`}>Nome Completo *</Label>
                                <Input
                                  id={`socio-nome-${index}`}
                                  value={socio.nome}
                                  onChange={(e) => {
                                    const novosSocios = [...sociosManuais];
                                    novosSocios[index].nome = e.target.value;
                                    setSociosManuais(novosSocios);
                                  }}
                                  placeholder="Nome do sócio"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor={`socio-cpf-${index}`}>CPF (opcional)</Label>
                                <Input
                                  id={`socio-cpf-${index}`}
                                  value={socio.cpf}
                                  onChange={(e) => {
                                    const novosSocios = [...sociosManuais];
                                    novosSocios[index].cpf = e.target.value.replace(/[^\d]/g, '');
                                    setSociosManuais(novosSocios);
                                  }}
                                  placeholder="000.000.000-00"
                                  maxLength={11}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`socio-qualificacao-${index}`}>Qualificação (opcional)</Label>
                                <Input
                                  id={`socio-qualificacao-${index}`}
                                  value={socio.qualificacao}
                                  onChange={(e) => {
                                    const novosSocios = [...sociosManuais];
                                    novosSocios[index].qualificacao = e.target.value;
                                    setSociosManuais(novosSocios);
                                  }}
                                  placeholder="Ex: Sócio, Administrador"
                                />
                              </div>
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <Label htmlFor={`socio-registro-${index}`}>Registro Profissional (opcional)</Label>
                                  <Input
                                    id={`socio-registro-${index}`}
                                    value={socio.registro_profissional}
                                    onChange={(e) => {
                                      const novosSocios = [...sociosManuais];
                                      novosSocios[index].registro_profissional = e.target.value;
                                      setSociosManuais(novosSocios);
                                    }}
                                    placeholder="Ex: CRM, CRC, OAB"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSociosManuais(sociosManuais.filter((_, i) => i !== index));
                                  }}
                                  className="text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-success hover:bg-success/90">
                  {editingCompany ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por razão social, CNPJ ou conta..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Empresas Cadastradas ({filteredCompanies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{company.razao_social}</div>
                      {company.nome_fantasia && (
                        <div className="text-sm text-muted-foreground">
                          {company.nome_fantasia}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatCNPJ(company.cnpj)}
                  </TableCell>
                  <TableCell>{company.conta_nome}</TableCell>
                  <TableCell>{company.cidade}/{company.uf}</TableCell>
                  <TableCell>
                    <Badge variant={company.status === 'ativa' ? 'default' : 'secondary'}>
                      {company.status === 'ativa' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(company.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(company)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewPeople(company)}>
                          <Users className="w-4 h-4 mr-2" />
                          Pessoas Vinculadas
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDocuments(company)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(company.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">
              {companies.filter(c => c.status === 'ativa').length} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastros este Mês</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter(c => 
                new Date(c.created_at).getMonth() === new Date().getMonth()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Em {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cidades Atendidas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(companies.map(c => c.cidade)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Diferentes localidades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Dialog */}
      <Dialog open={isDocumentsDialogOpen} onOpenChange={setIsDocumentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos da Empresa</DialogTitle>
            <DialogDescription>
              Gerencie os documentos e arquivos da empresa {viewingCompany?.razao_social}
            </DialogDescription>
          </DialogHeader>
          
          {viewingCompany && (
            <DocumentUpload
              entityType="empresa"
              entityId={viewingCompany.id}
              entityName={viewingCompany.razao_social}
              onDocumentUploaded={(doc) => {
                toast.success('Documento adicionado com sucesso!');
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* People Management Dialog */}
      <Dialog open={isPeopleDialogOpen} onOpenChange={setIsPeopleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pessoas Vinculadas - {selectedCompanyForPeople?.razao_social}</DialogTitle>
          </DialogHeader>
          
          {selectedCompanyForPeople ? (
            <CompanyPeopleManager 
              company={selectedCompanyForPeople} 
              onClose={() => setIsPeopleDialogOpen(false)}
              onUpdate={async () => {
                // Recarregar empresa atualizada
                try {
                  const response = await empresasService.obter(selectedCompanyForPeople.id);
                  if (response.success) {
                    setSelectedCompanyForPeople(response.data.empresa);
                    // Atualizar na lista também
                    setCompanies((prev: any[]) =>
                      prev.map((c: any) => c.id === selectedCompanyForPeople.id ? response.data.empresa : c)
                    );
                  }
                } catch (error) {
                  console.error('Erro ao recarregar empresa:', error);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Diálogo para adicionar sócios */}
      <AlertDialog open={showDialogSocios} onOpenChange={setShowDialogSocios}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quadro Societário Encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              Foram encontrados {sociosEncontrados.length} sócio(s) no quadro societário desta empresa.
              Deseja adicionar {sociosEncontrados.length === 1 ? 'este sócio' : 'estes sócios'} na tabela de pessoas como sócio(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {sociosEncontrados.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2 py-4">
              {sociosEncontrados.map((socio, index) => (
                <div key={index} className="p-2 border rounded-md">
                  <p className="font-medium">{socio.nome || 'Sócio sem nome'}</p>
                  {socio.qualificacao && (
                    <p className="text-sm text-muted-foreground">
                      Qualificação: {socio.qualificacao}
                      {socio.qualificacao_codigo && ` (${socio.qualificacao_codigo})`}
                    </p>
                  )}
                  {!socio.qualificacao && (
                    <p className="text-sm text-muted-foreground italic">Qualificação não informada</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDialogSocios(false);
              resetForm();
              setIsAddDialogOpen(false);
              loadCompanies();
            }}>
              Não, obrigado
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                // Criar pessoas para cada sócio encontrado
                for (const socio of sociosEncontrados) {
                  const dadosPessoa = {
                    nome_completo: socio.nome || 'Sócio sem nome',
                    cpf: '', // A API não retorna CPF na consulta básica
                    email: '',
                    telefone: '',
                    registro_profissional: socio.qualificacao || '',
                    empresa_id: empresaCriadaId,
                    tipo_vinculo: 'SOCIO',
                    percentual_participacao: '0', // A API não retorna participação na consulta básica
                  };

                  try {
                    await pessoasService.criar(dadosPessoa);
                  } catch (error) {
                    console.error(`Erro ao criar pessoa para sócio ${socio.nome}:`, error);
                    // Continuar mesmo se uma pessoa falhar
                  }
                }

                toast.success(`${sociosEncontrados.length} sócio(s) adicionado(s) com sucesso!`);
                setShowDialogSocios(false);
                resetForm();
                setIsAddDialogOpen(false);
                loadCompanies();
              } catch (error) {
                console.error('Erro ao adicionar sócios:', error);
                toast.error('Erro ao adicionar sócios', {
                  description: 'Alguns sócios podem não ter sido adicionados'
                });
                setShowDialogSocios(false);
                resetForm();
                setIsAddDialogOpen(false);
                loadCompanies();
              }
            }}>
              Sim, adicionar sócios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente para o conteúdo do dialog de sincronização
function SyncDialogContent({ syncData, onImport, onSync, onClose }) {
  const { para_importar, para_atualizar, apenas_local } = syncData || {};

  return (
    <div className="space-y-6">
      <Tabs defaultValue="importar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="importar">
            Importar ({para_importar?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="atualizar">
            Atualizar ({para_atualizar?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="enviar">
            Enviar ({apenas_local?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Empresas que existem na NFe.io mas não no sistema local
          </p>
          {para_importar && para_importar.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {para_importar.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.nfeio.razao_social || item.nfeio.razaoSocial}</h4>
                      <p className="text-sm text-muted-foreground">
                        CNPJ: {item.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onImport(item.nfeio.id || item.nfeio._id || item.nfeio_empresa_id)}
                      className="bg-success hover:bg-success/90"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Importar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma empresa para importar
            </div>
          )}
        </TabsContent>

        <TabsContent value="atualizar" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Empresas que existem em ambos os sistemas
          </p>
          {para_atualizar && para_atualizar.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {para_atualizar.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.local.razao_social}</h4>
                      <p className="text-sm text-muted-foreground">
                        CNPJ: {item.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                      </p>
                      {!item.local.nfeio_empresa_id && (
                        <Badge variant="outline" className="mt-1">
                          Não vinculada
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSync(item.local.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma empresa para atualizar
            </div>
          )}
        </TabsContent>

        <TabsContent value="enviar" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Empresas que existem apenas no sistema local
          </p>
          {apenas_local && apenas_local.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {apenas_local.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.local.razao_social}</h4>
                      <p className="text-sm text-muted-foreground">
                        CNPJ: {item.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSync(item.local.id)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar para NFe.io
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma empresa para enviar
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
