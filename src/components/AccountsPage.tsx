import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
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
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Eye,
  Users,
  Phone,
  Mail,
  Link,
  UserCheck,
  X,
  Loader2,
} from 'lucide-react';
import { contasService, empresasService, pessoasService } from '../services/api';
import { toast } from 'sonner';

export function AccountsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome_conta: '',
    email_principal: '',
    telefone_principal: '',
    data_inicio_contrato: '',
    status: 'ATIVO',
    tipo_relacionamento: 'PADRAO',
    duracao_isencao: '',
    observacoes: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Carregar contas da API
  const loadAccounts = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await contasService.listar({
        page,
        limit: 10,
        search
      });
      
      if (response.success) {
        setAccounts(response.data.contas);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Dados carregados da API - não há mais dados mock

  const getRelationshipBadge = (tipo) => {
    const variants = {
      PADRAO: { label: 'Padrão', variant: 'default' as const },
      PRO_BONO: { label: 'Pro Bono', variant: 'secondary' as const },
      PARCERIA_ISENCAO: { label: 'Parceria c/ Isenção', variant: 'outline' as const },
      PARCERIA_REMUNERADA: { label: 'Parceria Remunerada', variant: 'default' as const },
    };
    const config = variants[tipo] || variants.PADRAO;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Função de busca
  const handleSearch = (value) => {
    setSearchTerm(value);
    loadAccounts(1, value);
  };

  // Função para criar conta
  const handleCreateAccount = async (formData) => {
    try {
      const response = await contasService.criar(formData);
      if (response.success) {
        toast.success('Conta criada com sucesso!');
        setIsDialogOpen(false);
        resetForm();
        loadAccounts();
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao criar conta');
    }
  };

  // Função para editar conta
  const handleEditAccount = async (id, formData) => {
    try {
      const response = await contasService.atualizar(id, formData);
      if (response.success) {
        toast.success('Conta atualizada com sucesso!');
        setIsDialogOpen(false);
        resetForm();
        loadAccounts();
      }
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta');
    }
  };

  // Função para deletar conta
  const handleDeleteAccount = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        const response = await contasService.deletar(id);
        if (response.success) {
          toast.success('Conta excluída com sucesso!');
          loadAccounts();
        }
      } catch (error) {
        console.error('Erro ao excluir conta:', error);
        toast.error('Erro ao excluir conta');
      }
    }
  };

  // Função para resetar formulário
  const resetForm = () => {
    setFormData({
      nome_conta: '',
      email_principal: '',
      telefone_principal: '',
      data_inicio_contrato: '',
      status: 'ATIVO',
      tipo_relacionamento: 'PADRAO',
      duracao_isencao: '',
      observacoes: ''
    });
    setIsEditMode(false);
    setSelectedAccount(null);
  };

  // Função para abrir modal de edição
  const openEditModal = (account) => {
    setSelectedAccount(account);
    setFormData({
      nome_conta: account.nome_conta || '',
      email_principal: account.email_principal || '',
      telefone_principal: account.telefone_principal || '',
      data_inicio_contrato: account.data_inicio_contrato || '',
      status: account.status || 'ATIVO',
      tipo_relacionamento: account.tipo_relacionamento || 'PADRAO',
      duracao_isencao: account.duracao_isencao || '',
      observacoes: account.observacoes || ''
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Função para abrir modal de visualização
  const openViewModal = (account) => {
    setSelectedAccount(account);
    setIsLinkDialogOpen(true);
  };

  // Função para submeter formulário
  const handleSubmit = () => {
    if (isEditMode) {
      handleEditAccount(selectedAccount.id, formData);
    } else {
      handleCreateAccount(formData);
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.nome_conta.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email_principal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas</h1>
          <p className="text-muted-foreground">
            Gerencie as contas dos seus clientes
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-success hover:bg-success/90" onClick={() => {
              resetForm();
              setIsEditMode(false);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Editar Conta' : 'Criar Nova Conta'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Atualize as informações da conta.' : 'Preencha as informações para criar uma nova conta no sistema.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome_conta">Nome da Conta</Label>
                <Input
                  id="nome_conta"
                  placeholder="Ex: Clínica Dr. Santos"
                  value={formData.nome_conta}
                  onChange={(e) => setFormData({...formData, nome_conta: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Principal</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com.br"
                  value={formData.email_principal}
                  onChange={(e) => setFormData({...formData, email_principal: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone Principal</Label>
                <Input
                  id="telefone"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone_principal}
                  onChange={(e) => setFormData({...formData, telefone_principal: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início do Contrato</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio_contrato}
                  onChange={(e) => setFormData({...formData, data_inicio_contrato: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tipo_relacionamento">Tipo de Relacionamento</Label>
                <Select value={formData.tipo_relacionamento} onValueChange={(value) => setFormData({...formData, tipo_relacionamento: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PADRAO">Padrão</SelectItem>
                    <SelectItem value="PRO_BONO">Pro Bono</SelectItem>
                    <SelectItem value="PARCERIA_ISENCAO">Parceria com Isenção</SelectItem>
                    <SelectItem value="PARCERIA_REMUNERADA">Parceria Remunerada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                    <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  placeholder="Observações adicionais..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button 
                className="bg-success hover:bg-success/90"
                onClick={handleSubmit}
              >
                {isEditMode ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredAccounts.length} conta{filteredAccounts.length !== 1 ? 's' : ''} encontrada{filteredAccounts.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Carregando contas...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Conta</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresas/Pessoas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {account.nome_conta}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-3 h-3" />
                        {account.email_principal}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {account.telefone_principal}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRelationshipBadge(account.tipo_relacionamento)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {account.empresas_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {account.pessoas_count}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.status === 'ATIVO' ? 'default' : 'secondary'}>
                      {account.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(account.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openViewModal(account)}
                        title="Gerenciar Vinculações"
                      >
                        <Link className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openViewModal(account)}
                        title="Visualizar Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditModal(account)}
                        title="Editar Conta"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {pagination.pages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} contas
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAccounts(pagination.page - 1, searchTerm)}
                  disabled={pagination.page <= 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {pagination.page} de {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAccounts(pagination.page + 1, searchTerm)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Entities Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Vinculações - {selectedAccount?.nome_conta}
            </DialogTitle>
            <DialogDescription>
              Configure as empresas e pessoas vinculadas a esta conta.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <AccountLinksManager 
              account={selectedAccount} 
              onClose={() => setIsLinkDialogOpen(false)}
              onUpdate={async () => {
                // Recarregar conta atualizada
                try {
                  const response = await contasService.obter(selectedAccount.id);
                  if (response.success) {
                    setSelectedAccount(response.data.conta);
                    // Atualizar na lista também
                    setAccounts((prev: any[]) =>
                      prev.map((a: any) => a.id === selectedAccount.id ? response.data.conta : a)
                    );
                  }
                } catch (error) {
                  console.error('Erro ao recarregar conta:', error);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountLinksManager({ account, onClose, onUpdate }: { account: any; onClose?: () => void; onUpdate?: () => void }) {
  const [selectedCompanies, setSelectedCompanies] = useState(
    (account.empresas_vinculadas?.map((e: any) => e.id) || []) as number[]
  );
  const [selectedPeople, setSelectedPeople] = useState(
    (account.pessoas_vinculadas?.map((p: any) => p.id) || []) as number[]
  );
  // Estado para controlar quais pessoas têm acesso ao sistema
  const [pessoasComAcesso, setPessoasComAcesso] = useState<Set<number>>(
    new Set(
      (account.pessoas_vinculadas || [])
        .filter((p: any) => p.tem_acesso_sistema)
        .map((p: any) => p.id)
    )
  );
  // Estado para armazenar login e senha de cada pessoa
  const [credenciaisPessoas, setCredenciaisPessoas] = useState<Record<number, { login: string; senha: string }>>(
    (() => {
      const credenciais: Record<number, { login: string; senha: string }> = {};
      (account.pessoas_vinculadas || []).forEach((p: any) => {
        if (p.tem_acesso_sistema && p.login_cliente) {
          credenciais[p.id] = { login: p.login_cliente, senha: '' };
        }
      });
      return credenciais;
    })()
  );
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [availablePeople, setAvailablePeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchCompanies, setSearchCompanies] = useState('');
  const [searchPeople, setSearchPeople] = useState('');

  // Sincronizar estado de acesso quando a conta for atualizada
  useEffect(() => {
    if (account.pessoas_vinculadas) {
      const pessoasComAcessoSet = new Set(
        account.pessoas_vinculadas
          .filter((p: any) => p.tem_acesso_sistema === true || p.tem_acesso_sistema === 1)
          .map((p: any) => p.id)
      );
      setPessoasComAcesso(pessoasComAcessoSet);
      
      // Sincronizar credenciais
      const novasCredenciais: Record<number, { login: string; senha: string }> = {};
      account.pessoas_vinculadas.forEach((p: any) => {
        if (p.tem_acesso_sistema && p.login_cliente) {
          novasCredenciais[p.id] = { login: p.login_cliente, senha: '' };
        }
      });
      setCredenciaisPessoas(prev => ({ ...novasCredenciais, ...prev }));
    }
  }, [account.pessoas_vinculadas]);

  // Carregar empresas e pessoas disponíveis
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Carregar todas as empresas
        const empresasRes = await empresasService.getAll({ limit: 1000 });
        if (empresasRes.success && empresasRes.data.empresas) {
          setAvailableCompanies(empresasRes.data.empresas);
        }
        
        // Carregar todas as pessoas
        const pessoasRes = await pessoasService.getAll({ limit: 1000 });
        if (pessoasRes.success && pessoasRes.data.pessoas) {
          setAvailablePeople(pessoasRes.data.pessoas);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar empresas e pessoas');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCompanyToggle = (companyId: number) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handlePersonToggle = (personId: number) => {
    setSelectedPeople(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
    // Se desmarcar pessoa, remover acesso também
    if (selectedPeople.includes(personId)) {
      setPessoasComAcesso(prev => {
        const newSet = new Set(prev);
        newSet.delete(personId);
        return newSet;
      });
    }
  };

  const handleAcessoToggle = (personId: number, checked: boolean) => {
    setPessoasComAcesso(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(personId);
        // Inicializar credenciais se não existirem
        if (!credenciaisPessoas[personId]) {
          setCredenciaisPessoas(prev => ({
            ...prev,
            [personId]: { login: '', senha: '' }
          }));
        }
      } else {
        newSet.delete(personId);
        // Limpar credenciais ao desativar acesso
        setCredenciaisPessoas(prev => {
          const newCreds = { ...prev };
          delete newCreds[personId];
          return newCreds;
        });
      }
      return newSet;
    });
  };

  const handleCredencialChange = (personId: number, field: 'login' | 'senha', value: string) => {
    setCredenciaisPessoas(prev => ({
      ...prev,
      [personId]: {
        ...(prev[personId] || { login: '', senha: '' }),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validar se pessoas com acesso têm login definido
      for (const pessoaId of pessoasComAcesso) {
        const credenciais = credenciaisPessoas[pessoaId] || { login: '', senha: '' };
        if (!credenciais.login || credenciais.login.trim() === '') {
          toast.error('Pessoas com acesso ao sistema devem ter um login definido');
          setSaving(false);
          return;
        }
      }
      
      // Preparar dados de empresas (array de IDs)
      const empresasIds = selectedCompanies;
      
      // Preparar dados de pessoas (array de objetos com pessoa_id, tipo_vinculo, tem_acesso_sistema, login_cliente e senha)
      const pessoasArray = selectedPeople.map((pessoaId: number) => {
        // Buscar tipo_vinculo da pessoa vinculada ou usar padrão
        const pessoaVinculada = account.pessoas_vinculadas?.find((p: any) => p.id === pessoaId);
        const temAcesso = pessoasComAcesso.has(pessoaId);
        const credenciais = credenciaisPessoas[pessoaId] || { login: '', senha: '' };
        
        return {
          pessoa_id: pessoaId,
          tipo_vinculo: pessoaVinculada?.tipo_vinculo || 'CONSULTOR',
          tem_acesso_sistema: temAcesso,
          login_cliente: temAcesso ? credenciais.login.trim() : null,
          senha: temAcesso && credenciais.senha && credenciais.senha.trim() !== '' ? credenciais.senha : null
        };
      });
      
      // Atualizar vinculações via API
      await Promise.all([
        contasService.gerenciarEmpresas(account.id, empresasIds),
        contasService.gerenciarPessoas(account.id, pessoasArray)
      ]);
      
      toast.success('Vinculações atualizadas com sucesso!');
      
      // Recarregar dados da conta atualizada
      if (onUpdate) {
        await onUpdate();
      }
      
      if (onClose) onClose();
    } catch (error: any) {
      console.error('Erro ao salvar vinculações:', error);
      toast.error(error.response?.data?.message || error.message || 'Erro ao salvar vinculações');
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = availableCompanies.filter((company: any) =>
    company.razao_social?.toLowerCase().includes(searchCompanies.toLowerCase()) ||
    company.cnpj?.includes(searchCompanies)
  );

  const filteredPeople = availablePeople.filter((person: any) =>
    person.nome_completo?.toLowerCase().includes(searchPeople.toLowerCase()) ||
    person.cpf?.includes(searchPeople)
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="empresas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="empresas" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Empresas ({account.empresas_vinculadas?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pessoas" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pessoas ({account.pessoas_vinculadas?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="space-y-4">
          {/* Empresas já vinculadas */}
          {account.empresas_vinculadas && account.empresas_vinculadas.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Empresas Atualmente Vinculadas</h3>
              <div className="space-y-2 mb-4">
                {account.empresas_vinculadas.map((empresa: any) => (
                  <div key={empresa.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{empresa.razao_social}</div>
                      <div className="text-sm text-muted-foreground font-mono">{empresa.cnpj}</div>
                    </div>
                    <Badge variant="default">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Vinculada
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Busca e lista de empresas disponíveis */}
          <div>
            <h3 className="font-medium mb-3">Empresas Disponíveis</h3>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por razão social ou CNPJ..."
                  value={searchCompanies}
                  onChange={(e) => setSearchCompanies(e.target.value)}
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
                {filteredCompanies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma empresa encontrada
                  </div>
                ) : (
                  filteredCompanies.map((company: any) => (
                    <div key={company.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted">
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={selectedCompanies.includes(company.id)}
                        onCheckedChange={() => handleCompanyToggle(company.id)}
                      />
                      <div className="flex-1">
                        <label htmlFor={`company-${company.id}`} className="cursor-pointer">
                          <div className="font-medium">{company.razao_social}</div>
                          <div className="text-sm text-muted-foreground font-mono">{company.cnpj}</div>
                        </label>
                      </div>
                      {selectedCompanies.includes(company.id) && (
                        <Badge variant="default">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Selecionada
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pessoas" className="space-y-4">
          {/* Pessoas já vinculadas */}
          {account.pessoas_vinculadas && account.pessoas_vinculadas.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Pessoas Atualmente Vinculadas</h3>
              <div className="space-y-2 mb-4">
                {account.pessoas_vinculadas.map((pessoa: any) => {
                  const temAcesso = pessoasComAcesso.has(pessoa.id);
                  const credenciais = credenciaisPessoas[pessoa.id] || { login: pessoa.login_cliente || '', senha: '' };
                  
                  return (
                    <div key={pessoa.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{pessoa.nome_completo}</div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-mono">{pessoa.cpf}</span>
                            {pessoa.tipo_vinculo && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {pessoa.tipo_vinculo === 'SOCIO' ? 'Sócio' : 
                                 pessoa.tipo_vinculo === 'FAMILIAR' ? 'Familiar' : 
                                 pessoa.tipo_vinculo === 'CONSULTOR' ? 'Consultor' :
                                 pessoa.tipo_vinculo === 'REPRESENTANTE' ? 'Representante' :
                                 pessoa.tipo_vinculo === 'ADMINISTRADOR' ? 'Administrador' : 'Outros'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`acesso-${pessoa.id}`} className="text-sm cursor-pointer whitespace-nowrap">
                              Acesso ao sistema
                            </Label>
                            <Switch
                              id={`acesso-${pessoa.id}`}
                              checked={temAcesso}
                              onCheckedChange={(checked) => handleAcessoToggle(pessoa.id, checked)}
                            />
                          </div>
                          <Badge variant="default">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Vinculada
                          </Badge>
                        </div>
                      </div>
                      
                      {temAcesso && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div className="space-y-1">
                            <Label htmlFor={`login-${pessoa.id}`} className="text-xs">Login</Label>
                            <Input
                              id={`login-${pessoa.id}`}
                              type="text"
                              placeholder="email@exemplo.com ou username"
                              value={credenciais.login}
                              onChange={(e) => handleCredencialChange(pessoa.id, 'login', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`senha-${pessoa.id}`} className="text-xs">Senha {credenciais.senha ? '(deixe em branco para manter)' : ''}</Label>
                            <Input
                              id={`senha-${pessoa.id}`}
                              type="password"
                              placeholder={credenciais.senha ? '••••••••' : 'Nova senha'}
                              value={credenciais.senha}
                              onChange={(e) => handleCredencialChange(pessoa.id, 'senha', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Busca e lista de pessoas disponíveis */}
          <div>
            <h3 className="font-medium mb-3">Pessoas Disponíveis</h3>
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
                {filteredPeople.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma pessoa encontrada
                  </div>
                ) : (
                  filteredPeople.map((person: any) => {
                    const isSelected = selectedPeople.includes(person.id);
                    const temAcesso = pessoasComAcesso.has(person.id);
                    const credenciais = credenciaisPessoas[person.id] || { login: '', senha: '' };
                    
                    return (
                      <div key={person.id} className={`p-3 border rounded-lg ${isSelected ? 'bg-muted/50' : 'hover:bg-muted'}`}>
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`person-${person.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handlePersonToggle(person.id)}
                          />
                          <div className="flex-1">
                            <label htmlFor={`person-${person.id}`} className="cursor-pointer">
                              <div className="font-medium">{person.nome_completo}</div>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-mono">{person.cpf}</span>
                                {person.empresas && person.empresas.length > 0 && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {person.empresas.length} empresa(s)
                                  </Badge>
                                )}
                              </div>
                            </label>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`acesso-new-${person.id}`} className="text-sm cursor-pointer whitespace-nowrap">
                                  Acesso
                                </Label>
                                <Switch
                                  id={`acesso-new-${person.id}`}
                                  checked={temAcesso}
                                  onCheckedChange={(checked) => handleAcessoToggle(person.id, checked)}
                                />
                              </div>
                              <Badge variant="default">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Selecionada
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        {isSelected && temAcesso && (
                          <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t">
                            <div className="space-y-1">
                              <Label htmlFor={`login-new-${person.id}`} className="text-xs">Login</Label>
                              <Input
                                id={`login-new-${person.id}`}
                                type="text"
                                placeholder="email@exemplo.com ou username"
                                value={credenciais.login}
                                onChange={(e) => handleCredencialChange(person.id, 'login', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`senha-new-${person.id}`} className="text-xs">Senha</Label>
                              <Input
                                id={`senha-new-${person.id}`}
                                type="password"
                                placeholder="Nova senha"
                                value={credenciais.senha}
                                onChange={(e) => handleCredencialChange(person.id, 'senha', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

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