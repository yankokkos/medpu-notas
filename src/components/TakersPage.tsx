import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { tomadoresService, modelosService, consultasService, pessoasService, empresasService } from '../services/api';
import { toast } from 'sonner';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Link,
} from 'lucide-react';


export function TakersPage() {
  const [takers, setTakers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTaker, setEditingTaker] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(null);
  const [isModelsDialogOpen, setIsModelsDialogOpen] = useState(false);
  const [selectedTakerForModels, setSelectedTakerForModels] = useState(null);
  const [isVincularSocioDialogOpen, setIsVincularSocioDialogOpen] = useState(false);
  const [selectedTakerForSocio, setSelectedTakerForSocio] = useState(null);
  const [selectedSocioId, setSelectedSocioId] = useState(null);
  const [sociosVinculados, setSociosVinculados] = useState([]);
  const [loadingSocios, setLoadingSocios] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consultandoDocumento, setConsultandoDocumento] = useState(false);
  const [consultandoCEP, setConsultandoCEP] = useState(false);
  const [pessoas, setPessoas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [socios, setSocios] = useState([]); // Sócios de todas as empresas
  const [vincularExistente, setVincularExistente] = useState(false);
  const [vincularSocio, setVincularSocio] = useState(false);
  const [formData, setFormData] = useState({
    tipo_tomador: 'PESSOA',
    pessoa_id: null,
    empresa_id: null,
    socio_id: null, // ID do sócio que presta serviço para este tomador
    conta_id: null,
    nome_razao_social: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    // Endereço completo (obrigatório para emissão de nota)
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    // Campos fiscais
    iss_retido: false,
    inscricao_municipal: '',
    inscricao_estadual: '',
    status: 'ativo',
    // Para pessoa física
    data_nascimento: '',
  });

  // Carregar dados da API
  const loadTakers = async () => {
    try {
      setLoading(true);
      const response = await tomadoresService.listar();
      if (response.success) {
        setTakers(response.data.tomadores || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tomadores:', error);
      toast.error('Erro ao carregar tomadores');
    } finally {
      setLoading(false);
    }
  };

  // Carregar pessoas e empresas para vincular
  const loadPessoas = async () => {
    try {
      const response = await pessoasService.listar({ limit: 1000, status: '' });
      if (response.success) {
        setPessoas(response.data.pessoas || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
    }
  };

  const loadEmpresas = async () => {
    try {
      const response = await empresasService.listar({ limit: 1000 });
      if (response.success) {
        setEmpresas(response.data.empresas || []);
        
        // Buscar sócios de todas as empresas
        const todosSocios: any[] = [];
        for (const empresa of response.data.empresas || []) {
          try {
            const sociosResponse = await empresasService.obterSocios(empresa.id);
            if (sociosResponse.success && sociosResponse.data?.socios) {
              sociosResponse.data.socios.forEach((socio: any) => {
                // Adicionar informação da empresa ao sócio
                todosSocios.push({
                  ...socio,
                  pessoa_id: socio.id, // Garantir que tenha pessoa_id
                  empresa_id: empresa.id,
                  empresa_nome: empresa.razao_social,
                  empresa_cnpj: empresa.cnpj
                });
              });
            }
          } catch (error) {
            console.error(`Erro ao buscar sócios da empresa ${empresa.id}:`, error);
          }
        }
        setSocios(todosSocios);
        console.log(`✅ ${todosSocios.length} sócio(s) carregado(s) para vinculação`);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadSociosVinculados = async (tomadorId: number) => {
    try {
      setLoadingSocios(true);
      const response = await tomadoresService.obterSocios(tomadorId);
      if (response.success) {
        setSociosVinculados(response.data.socios || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sócios vinculados:', error);
      setSociosVinculados([]);
    } finally {
      setLoadingSocios(false);
    }
  };

  useEffect(() => {
    loadTakers();
    loadPessoas();
    loadEmpresas();
  }, []);

  const filteredTakers = takers.filter((taker) => {
    const matchesSearch = 
      (taker.nome_razao_social_unificado && taker.nome_razao_social_unificado.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (taker.cpf_cnpj_unificado && taker.cpf_cnpj_unificado.includes(searchTerm)) ||
      (taker.email_unificado && taker.email_unificado.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || taker.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || taker.tipo_tomador === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Preparar dados para envio
      // Converter tipo_tomador (PESSOA/EMPRESA) para tipo_pessoa (PF/PJ) que o backend espera
      const tipoPessoa = formData.tipo_tomador === 'PESSOA' ? 'PF' : 'PJ';
      
      // Preparar dados de endereço - usar logradouro como preferência, endereco como fallback
      const enderecoData = {
        logradouro: formData.logradouro || formData.endereco || '',
        numero: formData.numero || '',
        complemento: formData.complemento || '',
        bairro: formData.bairro || '',
        cidade: formData.cidade || '',
        uf: formData.uf || '',
        cep: formData.cep ? formData.cep.replace(/[^\d]/g, '') : ''
      };

      const dadosParaEnvio = {
        tipo_pessoa: tipoPessoa, // Backend espera PF ou PJ
        nome_razao_social: formData.nome_razao_social || '',
        cnpj_cpf: formData.cnpj_cpf ? formData.cnpj_cpf.replace(/[^\d]/g, '') : '',
        email: formData.email || '',
        telefone: formData.telefone || '',
        iss_retido: formData.iss_retido || false,
        inscricao_municipal: formData.inscricao_municipal || '',
        inscricao_estadual: formData.inscricao_estadual || '',
        // Campos de endereço
        ...enderecoData,
        // Incluir socio_id se estiver vinculando a um sócio (indica que o tomador recebe serviços deste sócio)
        ...(formData.socio_id ? { socio_id: formData.socio_id } : {}),
        // Remover pessoa_id e empresa_id se não estiver vinculando a existente
        // (o backend criará nova pessoa/empresa se necessário)
        ...(formData.pessoa_id && !vincularSocio ? { pessoa_id: formData.pessoa_id } : {}),
        ...(formData.empresa_id ? { empresa_id: formData.empresa_id } : {}),
        // Remover conta_id se for null para não causar erro de validação
        ...(formData.conta_id ? { conta_id: formData.conta_id } : {}),
        // Data de nascimento para pessoa física
        ...(formData.tipo_tomador === 'PESSOA' && formData.data_nascimento ? { data_nascimento: formData.data_nascimento } : {}),
        // Status apenas para atualização
        ...(editingTaker && formData.status ? { status: formData.status } : {})
      };

      if (editingTaker) {
        // Update existing taker
        const response = await tomadoresService.atualizar(editingTaker.id, dadosParaEnvio);
        if (response.success) {
          toast.success('Tomador atualizado com sucesso!');
          loadTakers();
        }
      } else {
        // Add new taker
        const response = await tomadoresService.criar(dadosParaEnvio);
        if (response.success) {
          toast.success('Tomador cadastrado com sucesso!');
          loadTakers();
        }
      }
    
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar tomador:', error);
      toast.error('Erro ao salvar tomador', {
        description: error.response?.data?.message || error.message
      });
    }
  };

  const resetForm = () => {
    setVincularExistente(false);
    setVincularSocio(false);
    setFormData({
      tipo_tomador: 'PESSOA',
      pessoa_id: null,
      empresa_id: null,
      socio_id: null,
      conta_id: null,
      nome_razao_social: '',
      cnpj_cpf: '',
      email: '',
      telefone: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: '',
      iss_retido: false,
      inscricao_municipal: '',
      inscricao_estadual: '',
      status: 'ativo',
      data_nascimento: '',
    });
    setEditingTaker(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = async (taker) => {
    try {
      // Buscar dados completos do tomador incluindo endereços
      const response = await tomadoresService.obter(taker.id);
      
      if (!response.success || !response.data?.tomador) {
        toast.error('Erro ao carregar dados do tomador');
        return;
      }

      const tomadorCompleto = response.data.tomador;
      
      // Pegar o primeiro endereço (geralmente é o principal)
      const endereco = tomadorCompleto.enderecos && tomadorCompleto.enderecos.length > 0 
        ? tomadorCompleto.enderecos[0] 
        : {};

      setEditingTaker(tomadorCompleto);
    setFormData({
        tipo_tomador: tomadorCompleto.tipo_tomador,
        pessoa_id: tomadorCompleto.pessoa_id || null,
        empresa_id: tomadorCompleto.empresa_id || null,
        conta_id: tomadorCompleto.conta_id || null,
        nome_razao_social: tomadorCompleto.nome_razao_social_unificado || '',
        cnpj_cpf: tomadorCompleto.cpf_cnpj_unificado || '',
        email: tomadorCompleto.email_unificado || '',
        telefone: tomadorCompleto.telefone_unificado || '',
        logradouro: endereco.logradouro || '',
        numero: endereco.numero || '',
        complemento: endereco.complemento || '',
        bairro: endereco.bairro || '',
        cidade: endereco.cidade || endereco.municipio || '',
        uf: endereco.uf || endereco.estado || '',
        cep: endereco.cep || '',
        iss_retido: tomadorCompleto.iss_retido || false,
        inscricao_municipal: tomadorCompleto.inscricao_municipal || '',
        inscricao_estadual: tomadorCompleto.inscricao_estadual || '',
        status: tomadorCompleto.status || 'ativo',
        data_nascimento: tomadorCompleto.data_nascimento || '',
    });
    setIsAddDialogOpen(true);
    } catch (error) {
      console.error('Erro ao carregar tomador para edição:', error);
      toast.error('Erro ao carregar dados do tomador');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await tomadoresService.deletar(id);
      if (response.success) {
        toast.success('Tomador excluído com sucesso!');
        loadTakers();
      }
    } catch (error) {
      console.error('Erro ao excluir tomador:', error);
      toast.error('Erro ao excluir tomador');
    }
    setDeleteDialogOpen(null);
  };

  const handleToggleStatus = async (id) => {
    try {
      const taker = takers.find(t => t.id === id);
      if (taker) {
        const newStatus = taker.status === 'ativo' ? 'inativo' : 'ativo';
        const response = await tomadoresService.atualizar(id, { status: newStatus });
        if (response.success) {
          toast.success(`Tomador ${newStatus === 'ativo' ? 'ativado' : 'inativado'} com sucesso!`);
          loadTakers();
        }
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleConsultarCEP = async () => {
    const cepLimpo = formData.cep.replace(/[^\d]/g, '');
    
    if (cepLimpo.length !== 8) {
      toast.error('CEP inválido', {
        description: 'O CEP deve ter 8 dígitos'
      });
      return;
    }

    try {
      setConsultandoCEP(true);
      const response = await consultasService.consultarEnderecoPorCEP(cepLimpo);
      
      if (response.success && response.data) {
        const dados = response.data;
        
        setFormData(prev => ({
          ...prev,
          logradouro: prev.logradouro || dados.logradouro || dados.street || '',
          bairro: prev.bairro || dados.bairro || dados.district || '',
          cidade: prev.cidade || dados.cidade || dados.city?.name || '',
          uf: prev.uf || dados.uf || dados.state || '',
          cep: dados.cep || cepLimpo
        }));

        toast.success('Endereço encontrado!', {
          description: 'Os dados do endereço foram preenchidos automaticamente'
        });
      } else {
        toast.error('Erro ao consultar CEP', {
          description: response.message || 'CEP não encontrado ou erro na consulta'
        });
      }
    } catch (error: any) {
      console.error('Erro ao consultar CEP:', error);
      toast.error('Erro ao consultar CEP', {
        description: error.response?.data?.message || 'Verifique sua conexão e tente novamente'
      });
    } finally {
      setConsultandoCEP(false);
    }
  };

  const handleConsultarDocumento = async () => {
    const documentoLimpo = formData.cnpj_cpf.replace(/[^\d]/g, '');
    const isCNPJ = documentoLimpo.length === 14;
    const isCPF = documentoLimpo.length === 11;

    if (!isCNPJ && !isCPF) {
      toast.error('Documento inválido', {
        description: 'O CNPJ deve ter 14 dígitos ou o CPF deve ter 11 dígitos'
      });
      return;
    }

    if (isCPF && !formData.data_nascimento) {
      toast.warning('Data de nascimento necessária', {
        description: 'Informe a data de nascimento para consultar o CPF'
      });
      return;
    }

    try {
      setConsultandoDocumento(true);
      
      if (isCNPJ) {
        const response = await consultasService.consultarCNPJ(documentoLimpo);
        
        if (response.success && response.data) {
          const dados = response.data;
          
          setFormData(prev => ({
            ...prev,
            nome_razao_social: prev.nome_razao_social || dados.razao_social || '',
            email: prev.email || dados.email || '',
            telefone: prev.telefone || dados.telefone || '',
            // Preencher endereço completo
            logradouro: prev.logradouro || dados.endereco || '',
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
              const ieResponse = await consultasService.consultarInscricaoEstadualEmissao(documentoLimpo, dados.uf);
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
      } else if (isCPF) {
        // Validar data de nascimento antes de consultar (obrigatório conforme documentação NFe.io)
        if (!formData.data_nascimento) {
          toast.warning('Data de nascimento necessária', {
            description: 'A data de nascimento é obrigatória para consultar CPF na NFe.io. Por favor, informe a data de nascimento primeiro.'
          });
          return;
        }

        // Formatar data de nascimento para YYYY-MM-DD (já vem nesse formato do input type="date")
        const dataNascimentoFormatada = formData.data_nascimento;
        
        const response = await consultasService.consultarCPF(documentoLimpo, dataNascimentoFormatada);
        
        if (response.success && response.data) {
          const dados = response.data;
          
          setFormData(prev => ({
            ...prev,
            nome_razao_social: prev.nome_razao_social || dados.nome || dados.name || '',
            tipo_tomador: 'PESSOA',
          }));

          toast.success('Dados consultados com sucesso!', {
            description: `Status: ${dados.status || dados.situacao || 'Ativo'}`
          });
        } else {
          toast.error('Erro ao consultar CPF', {
            description: response.message || 'CPF não encontrado ou data de nascimento divergente. Verifique os dados informados.'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao consultar documento:', error);
      toast.error('Erro ao consultar documento', {
        description: 'Verifique sua conexão e tente novamente'
      });
    } finally {
      setConsultandoDocumento(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tomadores</h1>
          <p className="text-muted-foreground">
            Gerencie os tomadores de serviços para emissão de NFS-e
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tomador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTaker ? 'Editar Tomador' : 'Novo Tomador'}
              </DialogTitle>
              <DialogDescription>
                {editingTaker 
                  ? 'Atualize as informações do tomador.' 
                  : 'Adicione um novo tomador de serviços.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de Pessoa - Primeiro campo */}
              <div className="space-y-2">
                <Label htmlFor="tipo_pessoa">Tipo de Pessoa *</Label>
                <Select 
                  value={formData.tipo_tomador} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, tipo_tomador: value, pessoa_id: null, empresa_id: null });
                    setVincularExistente(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PESSOA">Pessoa Física (CPF)</SelectItem>
                    <SelectItem value="EMPRESA">Pessoa Jurídica (CNPJ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Opção de vincular a sócio (apenas para pessoa física) */}
              {formData.tipo_tomador === 'PESSOA' && !editingTaker && (
                <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                  <Checkbox
                    id="vincular_socio"
                    checked={vincularSocio}
                    onCheckedChange={(checked) => {
                      setVincularSocio(checked as boolean);
                      if (!checked) {
                        setFormData({ ...formData, socio_id: null });
                        setVincularExistente(false);
                      } else {
                        setVincularExistente(false); // Desmarcar vincular existente se marcar sócio
                      }
                    }}
                  />
                  <Label htmlFor="vincular_socio" className="cursor-pointer">
                    Vincular a sócio de empresa
                  </Label>
                </div>
              )}

              {/* Seleção de sócio - indica que este tomador recebe serviços deste sócio */}
              {vincularSocio && !editingTaker && (
                <div className="space-y-2 p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20">
                  <Label htmlFor="socio_prestador">
                    Este tomador recebe serviços de qual sócio? *
                  </Label>
                  <Select
                    value={formData.socio_id?.toString() || ''}
                    onValueChange={(value) => {
                      const id = parseInt(value);
                      setFormData({
                        ...formData,
                        socio_id: id
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sócio que presta serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {socios.length === 0 ? (
                        <SelectItem value="no-socios" disabled>
                          Nenhum sócio encontrado
                        </SelectItem>
                      ) : (
                        socios.map((socio: any) => (
                          <SelectItem 
                            key={socio.id || socio.pessoa_id} 
                            value={(socio.id || socio.pessoa_id).toString()}
                          >
                            {socio.nome_completo || socio.nome} - {socio.cpf || 'Sem CPF'}
                            {socio.empresa_nome && ` (Sócio de ${socio.empresa_nome})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {socios.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum sócio cadastrado. Cadastre sócios nas empresas primeiro.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Este vínculo indica que o tomador recebe serviços prestados por este sócio (cliente nosso).
                  </p>
                </div>
              )}

              {/* Opção de vincular a pessoa/empresa existente */}
              {!vincularSocio && !editingTaker && (
                <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                  <Checkbox
                    id="vincular_existente"
                    checked={vincularExistente}
                    onCheckedChange={(checked) => {
                      setVincularExistente(checked as boolean);
                      if (!checked) {
                        setFormData({ ...formData, pessoa_id: null, empresa_id: null });
                      }
                    }}
                  />
                  <Label htmlFor="vincular_existente" className="cursor-pointer">
                    Vincular a {formData.tipo_tomador === 'PESSOA' ? 'pessoa' : 'empresa'} existente
                  </Label>
                </div>
              )}

              {/* Seleção de pessoa/empresa existente */}
              {vincularExistente && !vincularSocio && !editingTaker && (
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                  <Label htmlFor="pessoa_empresa_existente">
                    Selecione a {formData.tipo_tomador === 'PESSOA' ? 'Pessoa' : 'Empresa'} *
                  </Label>
                  <Select
                    value={formData.tipo_tomador === 'PESSOA' 
                      ? formData.pessoa_id?.toString() || '' 
                      : formData.empresa_id?.toString() || ''}
                    onValueChange={(value) => {
                      const id = parseInt(value);
                      if (formData.tipo_tomador === 'PESSOA') {
                        const pessoa = pessoas.find(p => p.id === id);
                        if (pessoa) {
                          setFormData({
                            ...formData,
                            pessoa_id: id,
                            nome_razao_social: pessoa.nome_completo || '',
                            cnpj_cpf: pessoa.cpf || '',
                            email: pessoa.email || '',
                            telefone: pessoa.telefone || '',
                          });
                        }
                      } else {
                        const empresa = empresas.find(e => e.id === id);
                        if (empresa) {
                          setFormData({
                            ...formData,
                            empresa_id: id,
                            nome_razao_social: empresa.razao_social || '',
                            cnpj_cpf: empresa.cnpj || '',
                            email: empresa.email || '',
                            telefone: empresa.telefone || '',
                            logradouro: empresa.endereco || '',
                            cidade: empresa.cidade || '',
                            uf: empresa.uf || '',
                            cep: empresa.cep || '',
                            inscricao_municipal: empresa.inscricao_municipal || '',
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Selecione uma ${formData.tipo_tomador === 'PESSOA' ? 'pessoa' : 'empresa'}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.tipo_tomador === 'PESSOA' ? (
                        pessoas.map((pessoa) => (
                          <SelectItem key={pessoa.id} value={pessoa.id.toString()}>
                            {pessoa.nome_completo} - {pessoa.cpf}
                          </SelectItem>
                        ))
                      ) : (
                        empresas.map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.id.toString()}>
                            {empresa.razao_social} - {empresa.cnpj}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Os dados serão preenchidos automaticamente ao selecionar
                  </p>
                </div>
              )}

              {/* Nome/Razão Social e Documento - Aparecem após selecionar tipo */}
              {(!vincularExistente && !vincularSocio || editingTaker) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_razao_social">
                      {formData.tipo_tomador === 'PESSOA' ? 'Nome Completo *' : 'Razão Social *'}
                    </Label>
                    <Input
                      id="nome_razao_social"
                      value={formData.nome_razao_social}
                      onChange={(e) => setFormData({ ...formData, nome_razao_social: e.target.value })}
                      required={!vincularExistente}
                      disabled={vincularExistente && !editingTaker}
                      placeholder={formData.tipo_tomador === 'PESSOA' ? 'Nome completo da pessoa' : 'Razão social da empresa'}
                    />
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj_cpf">
                    {formData.tipo_tomador === 'PESSOA' ? 'CPF *' : 'CNPJ *'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="cnpj_cpf"
                      value={formData.cnpj_cpf}
                      onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                      onBlur={() => {
                        const docLimpo = formData.cnpj_cpf.replace(/[^\d]/g, '');
                        const isCPF = docLimpo.length === 11;
                        const isCNPJ = docLimpo.length === 14;
                        
                        // Para CPF, só consulta se tiver data de nascimento
                        if (isCNPJ) {
                          handleConsultarDocumento();
                        } else if (isCPF && formData.data_nascimento) {
                          handleConsultarDocumento();
                        }
                      }}
                      required
                      className="flex-1"
                      placeholder={formData.tipo_tomador === 'PESSOA' ? '000.000.000-00' : '00.000.000/0000-00'}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleConsultarDocumento}
                      disabled={consultandoDocumento || 
                        (formData.cnpj_cpf.replace(/[^\d]/g, '').length !== 14 && 
                         formData.cnpj_cpf.replace(/[^\d]/g, '').length !== 11) ||
                        (formData.cnpj_cpf.replace(/[^\d]/g, '').length === 11 && !formData.data_nascimento)}
                      title={formData.tipo_tomador === 'PESSOA' 
                        ? 'Buscar dados do CPF na NFe.io (requer data de nascimento)'
                        : 'Buscar dados do CNPJ na NFe.io'}
                    >
                      {consultandoDocumento ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.tipo_tomador === 'PESSOA' ? (
                      formData.cnpj_cpf.replace(/[^\d]/g, '').length === 11 && !formData.data_nascimento
                        ? '⚠️ Informe a data de nascimento para consultar CPF'
                        : 'Digite o CPF e informe a data de nascimento para buscar dados automaticamente'
                    ) : (
                      'Digite o CNPJ e clique no botão ou saia do campo para buscar dados automaticamente'
                    )}
                  </p>
                </div>
                </div>
              )}

              {/* Data de Nascimento (apenas para PF) e Email */}
              <div className="grid grid-cols-2 gap-4">
                {formData.tipo_tomador === 'PESSOA' && (
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                      required={formData.tipo_tomador === 'PESSOA'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Obrigatório para consulta de CPF na NFe.io
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.tipo_tomador === 'PESSOA' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>

              {/* Endereço completo - Obrigatório para emissão de nota fiscal */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">Endereço Completo</Label>
                  {formData.tipo_tomador === 'EMPRESA' && (
                    <span className="text-xs text-muted-foreground">* Obrigatório para emissão de nota</span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="logradouro">Logradouro {formData.tipo_tomador === 'EMPRESA' && '*'}</Label>
                    <Input
                      id="logradouro"
                      value={formData.logradouro}
                      onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                      required={formData.tipo_tomador === 'EMPRESA'}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número {formData.tipo_tomador === 'EMPRESA' && '*'}</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      required={formData.tipo_tomador === 'EMPRESA'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                      placeholder="Apto, Sala, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro {formData.tipo_tomador === 'EMPRESA' && '*'}</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      required={formData.tipo_tomador === 'EMPRESA'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade {formData.tipo_tomador === 'EMPRESA' && '*'}</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      required={formData.tipo_tomador === 'EMPRESA'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uf">UF {formData.tipo_tomador === 'EMPRESA' && '*'}</Label>
                    <Input
                      id="uf"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      maxLength={2}
                      required={formData.tipo_tomador === 'EMPRESA'}
                      placeholder="SP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP {formData.tipo_tomador === 'EMPRESA' && '*'}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cep"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2') })}
                        onBlur={() => {
                          const cepLimpo = formData.cep.replace(/[^\d]/g, '');
                          if (cepLimpo.length === 8) {
                            handleConsultarCEP();
                          }
                        }}
                        maxLength={9}
                        required={formData.tipo_tomador === 'EMPRESA'}
                        placeholder="00000-000"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleConsultarCEP}
                        disabled={consultandoCEP || formData.cep.replace(/[^\d]/g, '').length !== 8}
                        title="Buscar endereço por CEP na NFe.io"
                      >
                        {consultandoCEP ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Digite o CEP e clique no botão ou saia do campo para buscar automaticamente
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                  <Input
                    id="inscricao_municipal"
                    value={formData.inscricao_municipal}
                    onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                  <Input
                    id="inscricao_estadual"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                  />
                </div>
                </div>


              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTaker ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tomadores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{takers.length}</div>
            <p className="text-xs text-muted-foreground">
              {takers.filter(t => t.status === 'ativo').length} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoas Físicas</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {takers.filter(t => t.tipo_tomador === 'PESSOA').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {takers.filter(t => t.tipo_tomador === 'PESSOA' && t.status === 'ativo').length} ativas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoas Jurídicas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {takers.filter(t => t.tipo_tomador === 'EMPRESA').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {takers.filter(t => t.tipo_tomador === 'EMPRESA' && t.status === 'ativo').length} ativas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {takers.reduce((sum, t) => sum + (parseFloat(t.valor_total_notas) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {takers.reduce((sum, t) => sum + (parseInt(t.notas_emitidas) || 0), 0)} notas emitidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ/CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={(value: any) => setTipoFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PESSOA">Pessoa Física</SelectItem>
                    <SelectItem value="EMPRESA">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tomadores ({filteredTakers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando tomadores...</div>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>Nome/Razão Social</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTakers.map((taker) => (
                <TableRow key={taker.id}>
                  <TableCell>
                      <div>
                        <div className="font-medium">{taker.nome_razao_social_unificado}</div>
                        {taker.email_unificado && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {taker.email_unificado}
                        </div>
                        )}
                    </div>
                  </TableCell>
                    <TableCell>{taker.cpf_cnpj_unificado}</TableCell>
                  <TableCell>
                      <Badge variant={taker.tipo_tomador === 'EMPRESA' ? 'default' : 'secondary'}>
                        {taker.tipo_tomador === 'EMPRESA' ? 'PJ' : 'PF'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={taker.status === 'ativo' ? 'default' : 'secondary'}>
                        {taker.status}
                    </Badge>
                  </TableCell>
                    <TableCell>{taker.notas_emitidas || 0}</TableCell>
                    <TableCell>
                      R$ {(taker.valor_total_notas || 0).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Vincular Modelos"
                        onClick={() => {
                          setSelectedTakerForModels(taker);
                          setIsModelsDialogOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(taker)}>
                              <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            setSelectedTakerForSocio(taker);
                            setSelectedSocioId(null);
                            setIsVincularSocioDialogOpen(true);
                            // Carregar sócios vinculados
                            if (taker) {
                              loadSociosVinculados(taker.id);
                            }
                          }}>
                            <Link className="mr-2 h-4 w-4" />
                            Vincular a Sócio
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedTakerForModels(taker);
                            setIsModelsDialogOpen(true);
                          }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Gerenciar Modelos
                          </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(taker.id)}>
                              {taker.status === 'ativo' ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Inativar
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Ativar
                                </>
                              )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                              onClick={() => setDeleteDialogOpen(taker.id)}
                            className="text-destructive"
                          >
                              <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen !== null} onOpenChange={() => setDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tomador? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDialogOpen && handleDelete(deleteDialogOpen)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vincular Sócio Dialog */}
      <Dialog open={isVincularSocioDialogOpen} onOpenChange={setIsVincularSocioDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Sócios - {selectedTakerForSocio?.nome_razao_social_unificado}</DialogTitle>
            <DialogDescription>
              Adicione ou remova sócios que prestam serviços para este tomador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Lista de sócios vinculados */}
            <div className="space-y-2">
              <Label>Sócios Vinculados</Label>
              {loadingSocios ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Carregando...</span>
                </div>
              ) : sociosVinculados.length === 0 ? (
                <div className="p-4 border rounded-md text-center text-muted-foreground">
                  Nenhum sócio vinculado
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sociosVinculados.map((socio: any) => (
                    <div
                      key={socio.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div>
                        <p className="font-medium">{socio.nome_completo}</p>
                        {socio.cpf && (
                          <p className="text-sm text-muted-foreground">CPF: {socio.cpf}</p>
                        )}
                        {socio.email && (
                          <p className="text-sm text-muted-foreground">Email: {socio.email}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await tomadoresService.removerSocio(
                              selectedTakerForSocio.id,
                              socio.id
                            );
                            
                            if (response.success) {
                              toast.success('Vínculo removido com sucesso!');
                              // Recarregar lista de sócios vinculados
                              if (selectedTakerForSocio) {
                                loadSociosVinculados(selectedTakerForSocio.id);
                              }
                            }
                          } catch (error: any) {
                            console.error('Erro ao remover vínculo:', error);
                            toast.error('Erro ao remover vínculo', {
                              description: error.response?.data?.message || error.message
                            });
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar novo sócio */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="socio_vincular">Adicionar Sócio</Label>
              <Select
                value={selectedSocioId?.toString() || ''}
                onValueChange={(value) => setSelectedSocioId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sócio para adicionar" />
                </SelectTrigger>
                <SelectContent>
                  {socios.length === 0 ? (
                    <SelectItem value="no-socios" disabled>
                      Nenhum sócio encontrado
                    </SelectItem>
                  ) : (
                    socios
                      .filter((socio: any) => 
                        !sociosVinculados.some((sv: any) => sv.id === (socio.id || socio.pessoa_id))
                      )
                      .map((socio: any) => (
                        <SelectItem 
                          key={socio.id || socio.pessoa_id} 
                          value={(socio.id || socio.pessoa_id).toString()}
                        >
                          {socio.nome_completo || socio.nome} - {socio.cpf || 'Sem CPF'}
                          {socio.empresa_nome && ` (Sócio de ${socio.empresa_nome})`}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              {socios.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum sócio cadastrado. Cadastre sócios nas empresas primeiro.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsVincularSocioDialogOpen(false);
                  setSelectedTakerForSocio(null);
                  setSelectedSocioId(null);
                  setSociosVinculados([]);
                }}
              >
                Fechar
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedSocioId || !selectedTakerForSocio) {
                    toast.error('Selecione um sócio');
                    return;
                  }
                  
                  try {
                    const response = await tomadoresService.vincularSocio(
                      selectedTakerForSocio.id,
                      selectedSocioId
                    );
                    
                    if (response.success) {
                      toast.success('Tomador vinculado ao sócio com sucesso!');
                      setSelectedSocioId(null);
                      // Recarregar lista de sócios vinculados
                      loadSociosVinculados(selectedTakerForSocio.id);
                    }
                  } catch (error: any) {
                    console.error('Erro ao vincular sócio:', error);
                    toast.error('Erro ao vincular sócio', {
                      description: error.response?.data?.message || error.message
                    });
                  }
                }}
                disabled={!selectedSocioId}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Models Management Dialog */}
      <Dialog open={isModelsDialogOpen} onOpenChange={setIsModelsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modelos Vinculados - {selectedTakerForModels?.nome_razao_social_unificado}</DialogTitle>
          </DialogHeader>
          
          {selectedTakerForModels && (
            <TakerModelsManager 
              taker={selectedTakerForModels} 
              onClose={() => setIsModelsDialogOpen(false)}
              onUpdate={async () => {
                // Recarregar tomador atualizado
                try {
                  const response = await tomadoresService.obter(selectedTakerForModels.id);
                  if (response.success) {
                    setSelectedTakerForModels(response.data.tomador);
                    // Atualizar na lista também
                    setTakers((prev: any[]) =>
                      prev.map((t: any) => t.id === selectedTakerForModels.id ? response.data.tomador : t)
                    );
                  }
                } catch (error) {
                  console.error('Erro ao recarregar tomador:', error);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TakerModelsManager({ taker, onClose, onUpdate }: { taker: any; onClose: () => void; onUpdate?: () => void }) {
  const [selectedModels, setSelectedModels] = useState<Record<string, { uso_frequente: boolean }>>({});
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar modelos disponíveis e inicializar selecionados
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        
        // Carregar todos os modelos
        const allModelsRes = await modelosService.getAll({ limit: 1000 });
        
        // Carregar modelos já vinculados ao tomador
        let linkedModelsRes;
        try {
          linkedModelsRes = await tomadoresService.obterModelos(taker.id);
        } catch (linkError) {
          // Erro ao carregar modelos vinculados é válido (tomador pode não ter modelos)
          linkedModelsRes = { success: true, data: { modelos: [] } };
        }
        
        // Verificar estrutura da resposta
        if (allModelsRes && allModelsRes.success) {
          // Extrair modelos da resposta (pode estar em data.modelos ou data)
          let modelos = [];
          if (allModelsRes.data) {
            if (Array.isArray(allModelsRes.data.modelos)) {
              modelos = allModelsRes.data.modelos;
            } else if (Array.isArray(allModelsRes.data)) {
              modelos = allModelsRes.data;
            }
          }
          
          setAvailableModels(modelos);
          
          // Inicializar modelos já vinculados como selecionados
          const initialSelected: Record<string, { uso_frequente: boolean }> = {};
          if (linkedModelsRes && linkedModelsRes.success && linkedModelsRes.data) {
            let modelosVinculados = [];
            if (Array.isArray(linkedModelsRes.data.modelos)) {
              modelosVinculados = linkedModelsRes.data.modelos;
            } else if (Array.isArray(linkedModelsRes.data)) {
              modelosVinculados = linkedModelsRes.data;
            }
            
            modelosVinculados.forEach((modelo: any) => {
              if (modelo && modelo.id) {
                initialSelected[modelo.id] = {
                  uso_frequente: modelo.uso_frequente || false
                };
              }
            });
          }
          setSelectedModels(initialSelected);
        } else {
          console.error('Resposta inválida do servidor:', allModelsRes);
          // Mesmo com erro, permitir que o usuário veja a interface vazia
          setAvailableModels([]);
          toast.error('Erro ao carregar modelos. Verifique se há modelos cadastrados.');
        }
      } catch (error: any) {
        console.error('Erro ao carregar modelos:', error);
        toast.error(error.message || 'Erro ao carregar modelos disponíveis');
      } finally {
        setLoading(false);
      }
    };

    if (taker && taker.id) {
      loadModels();
    }
  }, [taker]);

  const handleModelToggle = (modelId: number) => {
    setSelectedModels(prev => {
      const newSelected = { ...prev };
      if (newSelected[modelId]) {
        delete newSelected[modelId];
      } else {
        newSelected[modelId] = {
          uso_frequente: false
        };
      }
      return newSelected;
    });
  };

  const handleUsoFrequenteChange = (modelId: number, usoFrequente: boolean) => {
    setSelectedModels(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        uso_frequente: usoFrequente
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Preparar array de modelos para enviar
      const modelosArray = Object.entries(selectedModels).map(([modelId, dados]) => {
        const dadosTyped = dados as { uso_frequente: boolean };
        return {
          modelo_id: parseInt(modelId),
          uso_frequente: dadosTyped.uso_frequente
        };
      });

      // Enviar para API
      await tomadoresService.gerenciarModelos(taker.id, modelosArray, 'atualizar');
      
      toast.success('Modelos vinculados com sucesso!');
      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (error: any) {
      console.error('Erro ao salvar vinculações:', error);
      toast.error(error.message || 'Erro ao salvar vinculações de modelos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Linked Models */}
      {Object.keys(selectedModels).length > 0 && (
        <div>
          <h3 className="font-medium mb-3">Modelos Atualmente Vinculados</h3>
          <div className="space-y-2">
            {Object.entries(selectedModels).map(([modelId, dados]) => {
              const modelo = availableModels.find((m: any) => m.id === parseInt(modelId));
              if (!modelo) return null;
              const dadosTyped = dados as { uso_frequente: boolean };
              
              return (
                <div key={modelId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{modelo.titulo_modelo}</div>
                    <div className="text-sm text-muted-foreground">
                      <Badge variant="outline" className="mr-2 text-xs">
                        {modelo.categoria}
                      </Badge>
                      {dadosTyped.uso_frequente && (
                        <Badge variant="default" className="text-xs">
                          Uso Frequente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Models to Link */}
      <div>
        <h3 className="font-medium mb-3">Modelos Disponíveis para Vinculação</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando modelos...</div>
          </div>
        ) : availableModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
            <div className="text-muted-foreground">Nenhum modelo disponível</div>
            <div className="text-sm text-muted-foreground mt-1">
              Crie modelos na página de Modelos primeiro
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
            {availableModels.map((modelo: any) => {
              const isSelected = selectedModels[modelo.id];
              return (
                <div key={modelo.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted">
                  <Checkbox
                    id={`model-${modelo.id}`}
                    checked={!!isSelected}
                    onCheckedChange={() => handleModelToggle(modelo.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <label htmlFor={`model-${modelo.id}`} className="cursor-pointer">
                      <div className="font-medium">{modelo.titulo_modelo}</div>
                      <div className="text-sm text-muted-foreground">
                        <Badge variant="outline" className="mr-2 text-xs">
                          {modelo.categoria}
                        </Badge>
                        <span className="line-clamp-2">{modelo.texto_modelo}</span>
                      </div>
                    </label>
                    {isSelected && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id={`uso-freq-${modelo.id}`}
                          checked={isSelected.uso_frequente}
                          onCheckedChange={(checked) => handleUsoFrequenteChange(modelo.id, checked === true)}
                        />
                        <Label htmlFor={`uso-freq-${modelo.id}`} className="text-xs cursor-pointer">
                          Marcar como uso frequente
                        </Label>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="mt-1">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Selecionado
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
          {saving ? 'Salvando...' : 'Salvar Vinculações'}
        </Button>
      </div>
    </div>
  );
}