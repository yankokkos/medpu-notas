import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  FileText,
  UserCheck,
  Building2,
  Percent,
  Loader2,
} from 'lucide-react';
import { pessoasService, empresasService, consultasService, tomadoresService } from '../services/api';
import { toast } from 'sonner';
import { Checkbox } from './ui/checkbox';


const tipoVinculoLabels = {
  SOCIO: 'Sócio',
  FAMILIAR: 'Familiar',
  SECRETARIA: 'Secretária',
};

const tipoVinculoColors = {
  SOCIO: 'default',
  FAMILIAR: 'secondary',
  SECRETARIA: 'outline',
} as const;

export function PeoplePage() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vinculoFilter, setVinculoFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [consultandoCPF, setConsultandoCPF] = useState(false);
  const [pessoasExistentes, setPessoasExistentes] = useState([]);
  const [vincularPessoaExistente, setVincularPessoaExistente] = useState(false);

  // Carregar pessoas da API
  const loadPeople = async () => {
    try {
      setLoading(true);
      const response = await pessoasService.listar({ 
        page: 1, 
        limit: 1000,
        status: '' // Não filtrar por status para mostrar todas
      });
      if (response.success) {
        setPeople(response.data.pessoas || []);
      } else {
        setPeople([]);
      }
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
      toast.error('Erro ao carregar pessoas');
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar empresas para filtro
  const loadCompanies = async () => {
    try {
      const response = await empresasService.listar({ limit: 100 });
      if (response.success) {
        setCompanies(response.data.empresas);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  useEffect(() => {
    loadPeople();
    loadCompanies();
  }, []);

  // Atualizar lista de pessoas existentes quando people mudar
  useEffect(() => {
    setPessoasExistentes(people);
  }, [people]);

  const [formData, setFormData] = useState({
    pessoa_id: null,
    nome_completo: '',
    cpf: '',
    email: '',
    telefone: '',
    registro_profissional: '',
    empresa_id: '',
    tipo_vinculo: '' as 'SOCIO' | 'FAMILIAR' | 'SECRETARIA' | '',
    percentual_participacao: '',
    data_nascimento: '',
  });

  // Dados carregados da API - não há mais dados mock

  const filteredPeople = people.filter((person) => {
    const matchesSearch = 
      person.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.cpf.includes(searchTerm) ||
      (person.email && person.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
    
    const matchesVinculo = vinculoFilter === 'all' || 
      person.empresas.some(emp => emp.tipo_vinculo === vinculoFilter);
    
    return matchesSearch && matchesStatus && matchesVinculo;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPerson) {
        // Update existing person
        const response = await pessoasService.atualizar(editingPerson.id, formData);
        if (response.success) {
          toast.success('Pessoa atualizada com sucesso!');
          loadPeople();
        }
      } else {
        // Add new person
        const dadosParaEnvio = {
          ...formData,
          // Incluir pessoa_id se estiver vinculando a existente
          ...(formData.pessoa_id ? { pessoa_id: formData.pessoa_id } : {})
        };
        const response = await pessoasService.criar(dadosParaEnvio);
        if (response.success) {
          toast.success('Pessoa cadastrada com sucesso!');
          loadPeople();
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar pessoa:', error);
      toast.error('Erro ao salvar pessoa');
    }
  };

  const resetForm = () => {
    setVincularPessoaExistente(false);
    setFormData({
      pessoa_id: null,
      nome_completo: '',
      cpf: '',
      email: '',
      telefone: '',
      registro_profissional: '',
      empresa_id: '',
      tipo_vinculo: '',
      percentual_participacao: '',
      data_nascimento: '',
    });
    setEditingPerson(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (person) => {
    // For simplicity, edit the first empresa vinculo
    const firstEmpresa = person.empresas?.[0];
    setFormData({
      nome_completo: person.nome_completo,
      cpf: person.cpf,
      email: person.email || '',
      telefone: person.telefone || '',
      registro_profissional: person.registro_profissional || '',
      empresa_id: firstEmpresa?.empresa_id || '',
      tipo_vinculo: firstEmpresa?.tipo_vinculo || '',
      percentual_participacao: firstEmpresa?.percentual_participacao?.toString() || '',
      data_nascimento: person.data_nascimento || '',
    });
    setEditingPerson(person);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta pessoa?')) {
      try {
        const response = await pessoasService.deletar(id);
        if (response.success) {
          toast.success('Pessoa excluída com sucesso!');
          loadPeople();
        }
      } catch (error) {
        console.error('Erro ao excluir pessoa:', error);
        toast.error('Erro ao excluir pessoa');
      }
    }
  };

  const formatCPF = (cpf) => {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  };

  const handleConsultarCPF = async () => {
    const cpfLimpo = formData.cpf.replace(/[^\d]/g, '');
    
    if (cpfLimpo.length !== 11) {
      toast.error('CPF inválido', {
        description: 'O CPF deve ter 11 dígitos'
      });
      return;
    }

    if (!formData.data_nascimento) {
      toast.warning('Data de nascimento necessária', {
        description: 'Informe a data de nascimento para consultar o CPF'
      });
      return;
    }

    try {
      setConsultandoCPF(true);
      const response = await consultasService.consultarCPF(cpfLimpo, formData.data_nascimento);
      
      if (response.success && response.data) {
        const dados = response.data;
        
        // Preencher campos apenas se estiverem vazios
        setFormData(prev => ({
          ...prev,
          nome_completo: prev.nome_completo || dados.nome || dados.name || dados.nome_completo || '',
          email: prev.email || dados.email || '',
          telefone: prev.telefone || dados.telefone || '',
        }));

        toast.success('Dados consultados com sucesso!', {
          description: `Status: ${dados.status || dados.situacao || 'Ativo'}`
        });
      } else {
        toast.error('Erro ao consultar CPF', {
          description: response.message || 'CPF não encontrado ou erro na consulta'
        });
      }
    } catch (error) {
      console.error('Erro ao consultar CPF:', error);
      toast.error('Erro ao consultar CPF', {
        description: 'Verifique sua conexão e tente novamente'
      });
    } finally {
      setConsultandoCPF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pessoas</h1>
          <p className="text-muted-foreground">
            Gerencie pessoas físicas, sócios e contatos das empresas
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-success hover:bg-success/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Pessoa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}
              </DialogTitle>
              <DialogDescription>
                {editingPerson 
                  ? 'Altere as informações da pessoa selecionada.'
                  : 'Cadastre uma nova pessoa e defina seu vínculo com uma empresa.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Opção de vincular a pessoa existente */}
              {!editingPerson && (
                <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                  <Checkbox
                    id="vincular_pessoa_existente"
                    checked={vincularPessoaExistente}
                    onCheckedChange={(checked) => {
                      setVincularPessoaExistente(checked as boolean);
                      if (!checked) {
                        setFormData({ ...formData, pessoa_id: null });
                      }
                    }}
                  />
                  <Label htmlFor="vincular_pessoa_existente" className="cursor-pointer">
                    Vincular a pessoa existente
                  </Label>
                </div>
              )}

              {/* Seleção de pessoa existente */}
              {vincularPessoaExistente && !editingPerson && (
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                  <Label htmlFor="pessoa_existente">Selecione a Pessoa *</Label>
                  <Select
                    value={formData.pessoa_id?.toString() || ''}
                    onValueChange={(value) => {
                      const id = parseInt(value);
                      const pessoa = pessoasExistentes.find(p => p.id === id);
                      if (pessoa) {
                        setFormData({
                          ...formData,
                          pessoa_id: id,
                          nome_completo: pessoa.nome_completo || '',
                          cpf: pessoa.cpf || '',
                          email: pessoa.email || '',
                          telefone: pessoa.telefone || '',
                          registro_profissional: pessoa.registro_profissional || '',
                          data_nascimento: pessoa.data_nascimento || '',
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma pessoa" />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoasExistentes.map((pessoa) => (
                        <SelectItem key={pessoa.id} value={pessoa.id.toString()}>
                          {pessoa.nome_completo} - {pessoa.cpf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Os dados serão preenchidos automaticamente ao selecionar
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(!vincularPessoaExistente || editingPerson) && (
                <div className="md:col-span-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                      required={!vincularPessoaExistente}
                      disabled={vincularPessoaExistente && !editingPerson}
                  />
                </div>
                )}

                {(!vincularPessoaExistente || editingPerson) && (
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                    <div className="flex gap-2">
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        onBlur={() => {
                          const cpfLimpo = formData.cpf.replace(/[^\d]/g, '');
                          if (cpfLimpo.length === 11 && formData.data_nascimento) {
                            handleConsultarCPF();
                          }
                        }}
                    placeholder="000.000.000-00"
                        required={!vincularPessoaExistente}
                        disabled={vincularPessoaExistente && !editingPerson}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleConsultarCPF}
                        disabled={consultandoCPF || 
                          formData.cpf.replace(/[^\d]/g, '').length !== 11 ||
                          !formData.data_nascimento}
                        title="Buscar dados do CPF na NFe.io (requer data de nascimento)"
                      >
                        {consultandoCPF ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.cpf.replace(/[^\d]/g, '').length === 11 && !formData.data_nascimento
                        ? '⚠️ Informe a data de nascimento para consultar CPF'
                        : 'Digite o CPF e informe a data de nascimento para buscar dados automaticamente'}
                    </p>
                  </div>
                )}

                {(!vincularPessoaExistente || editingPerson) && (
                  <div>
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Obrigatório para consulta de CPF na NFe.io
                    </p>
                </div>
                )}

                <div>
                  <Label htmlFor="registro_profissional">Registro Profissional</Label>
                  <Input
                    id="registro_profissional"
                    value={formData.registro_profissional}
                    onChange={(e) => setFormData({ ...formData, registro_profissional: e.target.value })}
                    placeholder="CRM, OAB, CRC, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="md:col-span-2 border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Vínculo com Empresa</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="empresa_id">Empresa *</Label>
                      <Select 
                        value={formData.empresa_id} 
                        onValueChange={(value) => setFormData({ ...formData, empresa_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tipo_vinculo">Tipo de Vínculo *</Label>
                      <Select 
                        value={formData.tipo_vinculo} 
                        onValueChange={(value: any) => setFormData({ ...formData, tipo_vinculo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOCIO">Sócio</SelectItem>
                          <SelectItem value="FAMILIAR">Familiar</SelectItem>
                          <SelectItem value="SECRETARIA">Secretária</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.tipo_vinculo === 'SOCIO' && (
                      <div>
                        <Label htmlFor="percentual_participacao">Participação (%) *</Label>
                        <Input
                          id="percentual_participacao"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.percentual_participacao}
                          onChange={(e) => setFormData({ ...formData, percentual_participacao: e.target.value })}
                          required={formData.tipo_vinculo === 'SOCIO'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-success hover:bg-success/90">
                  {editingPerson ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={vinculoFilter} onValueChange={(value: any) => setVinculoFilter(value)}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vínculos</SelectItem>
                <SelectItem value="SOCIO">Sócios</SelectItem>
                <SelectItem value="FAMILIAR">Familiares</SelectItem>
                <SelectItem value="SECRETARIA">Secretárias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* People Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pessoas Cadastradas ({filteredPeople.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{person.nome_completo}</div>
                      {person.registro_profissional && (
                        <div className="text-sm text-muted-foreground">
                          {person.registro_profissional}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatCPF(person.cpf)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {person.empresas.map((empresa, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge variant={tipoVinculoColors[empresa.tipo_vinculo]}>
                            {tipoVinculoLabels[empresa.tipo_vinculo]}
                          </Badge>
                          <span className="text-sm">{empresa.empresa_nome}</span>
                          {empresa.percentual_participacao && (
                            <Badge variant="outline" className="text-xs">
                              {empresa.percentual_participacao}%
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {person.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {person.email}
                        </div>
                      )}
                      {person.telefone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {person.telefone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={person.status === 'ativo' ? 'default' : 'secondary'}>
                      {person.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(person.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(person)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(person.id)}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pessoas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{people.length}</div>
            <p className="text-xs text-muted-foreground">
              {people.filter(p => p.status === 'ativo').length} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sócios</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {people.filter(p => p.empresas.some(e => e.tipo_vinculo === 'SOCIO')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com participação societária
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Familiares</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {people.filter(p => p.empresas.some(e => e.tipo_vinculo === 'FAMILIAR')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Dependentes cadastrados
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
              {people.filter(p => 
                new Date(p.created_at).getMonth() === new Date().getMonth()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Em {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}