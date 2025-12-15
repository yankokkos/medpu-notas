import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { funcionariosService } from '../services/api';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';

interface Funcionario {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo: string;
  funcoes: string[];
  status: 'ativo' | 'inativo';
  data_cadastro: string;
  ultimo_acesso?: string;
}

interface Funcao {
  id: string;
  nome: string;
  descricao: string;
  permissoes: string[];
  cor: string;
}

// Dados carregados da API - não há mais dados mock

export function EmployeesPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcoes, setFuncoes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregar dados da API
  const loadFuncionarios = async () => {
    try {
      setLoading(true);
      const response = await funcionariosService.getAll();
      if (response.success) {
        setFuncionarios(response.data.funcionarios);
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const loadFuncoes = async () => {
    try {
      const response = await funcionariosService.listarFuncoes();
      if (response.success) {
        const funcoesComCor = response.data.funcoes.map((funcao, index) => ({
          ...funcao,
          cor: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-gray-500', 'bg-purple-500'][index % 5]
        }));
        setFuncoes(funcoesComCor);
      }
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
      // Fallback para dados básicos se a API falhar
      const basicFuncoes = [
        {
          id: '1',
          nome: 'Administrador',
          descricao: 'Acesso total ao sistema',
          permissoes: ['*'],
          cor: 'bg-red-500'
        },
        {
          id: '2',
          nome: 'Funcionário',
          descricao: 'Acesso operacional básico',
          permissoes: ['contas:read', 'contas:write', 'empresas:read', 'empresas:write'],
          cor: 'bg-blue-500'
        }
      ];
      setFuncoes(basicFuncoes);
    }
  };

  useEffect(() => {
    loadFuncionarios();
    loadFuncoes();
  }, []);

  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    senha: '',
    telefone: '',
    cargo: '',
    funcoes: [] as string[],
    status: 'ativo' as 'ativo' | 'inativo'
  });

  const filteredFuncionarios = funcionarios.filter(funcionario =>
    funcionario.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingFuncionario) {
        // Editar funcionário existente - remover senha se estiver vazia
        const dataToSend = { ...formData };
        if (!dataToSend.senha) {
          delete dataToSend.senha;
        }
        const response = await funcionariosService.atualizar(editingFuncionario.id, dataToSend);
        if (response.success) {
          toast.success('Funcionário atualizado com sucesso!');
          loadFuncionarios();
        }
      } else {
        // Criar novo funcionário
        const response = await funcionariosService.criar(formData);
        if (response.success) {
          toast.success('Funcionário cadastrado com sucesso!');
          loadFuncionarios();
        }
      }

      // Reset form
      setFormData({
        nome_completo: '',
        email: '',
        senha: '',
        telefone: '',
        cargo: '',
        funcoes: [],
        status: 'ativo'
      });
      setEditingFuncionario(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      toast.error('Erro ao salvar funcionário');
    }
  };

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setFormData({
      nome_completo: funcionario.nome_completo,
      email: funcionario.email,
      senha: '', // Não mostrar senha ao editar
      telefone: funcionario.telefone || '',
      cargo: funcionario.cargo,
      funcoes: funcionario.funcoes,
      status: funcionario.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await funcionariosService.deletar(id);
      if (response.success) {
        toast.success('Funcionário excluído com sucesso!');
        loadFuncionarios();
      }
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      toast.error('Erro ao excluir funcionário');
    }
    setDeleteDialogOpen(null);
  };

  const handleToggleStatus = (id: string) => {
    setFuncionarios(prev => prev.map(funcionario =>
      funcionario.id === id
        ? { ...funcionario, status: funcionario.status === 'ativo' ? 'inativo' : 'ativo' }
        : funcionario
    ));
    toast.success('Status do funcionário atualizado!');
  };

  const getFuncaoColor = (nomeFuncao: string) => {
    const funcao = funcoes.find(f => f.nome === nomeFuncao);
    return funcao?.cor || 'bg-gray-500';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-success hover:bg-success/90 text-success-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
              <DialogDescription>
                {editingFuncionario 
                  ? 'Altere as informações do funcionário selecionado.' 
                  : 'Preencha os dados para cadastrar um novo funcionário no sistema.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo</Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {!editingFuncionario && (
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                    required={!editingFuncionario}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Funções</Label>
                  <Select 
                    value={formData.funcoes[0] || ''} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, funcoes: [value] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      {funcoes.map((funcao) => (
                        <SelectItem key={funcao.id} value={funcao.nome}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${funcao.cor}`}></div>
                            {funcao.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: 'ativo' | 'inativo') => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingFuncionario(null);
                    setFormData({
                      nome_completo: '',
                      email: '',
                      senha: '',
                      telefone: '',
                      cargo: '',
                      funcoes: [],
                      status: 'ativo'
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-success hover:bg-success/90 text-success-foreground">
                  {editingFuncionario ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{funcionarios.length}</p>
              </div>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {funcionarios.filter(f => f.status === 'ativo').length}
                </p>
              </div>
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {funcionarios.filter(f => f.status === 'inativo').length}
                </p>
              </div>
              <UserX className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold text-red-600">
                  {funcionarios.filter(f => f.funcoes.includes('Administrador')).length}
                </p>
              </div>
              <Shield className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuncionarios.map((funcionario) => (
                  <TableRow key={funcionario.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{funcionario.nome_completo}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {funcionario.email}
                          </span>
                          {funcionario.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {funcionario.telefone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{funcionario.cargo}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {funcionario.funcoes.map((funcaoNome) => (
                          <Badge
                            key={funcaoNome}
                            className={`${getFuncaoColor(funcaoNome)} text-white`}
                          >
                            {funcaoNome}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={funcionario.status === 'ativo' ? 'default' : 'secondary'}>
                        {funcionario.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {funcionario.ultimo_acesso ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(funcionario.ultimo_acesso)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Nunca</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(funcionario)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(funcionario.id)}>
                            {funcionario.status === 'ativo' ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(funcionario.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredFuncionarios.length === 0 && (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Nenhum funcionário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialogOpen} onOpenChange={() => setDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O funcionário será permanentemente removido do sistema.
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
    </div>
  );
}