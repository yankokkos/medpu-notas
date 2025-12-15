import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import {
  Settings,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  MapPin,
  TrendingUp,
  Link2,
  Copy,
  CheckCircle,
  Calendar,
  Target,
  Users
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface MunicipioConfig {
  id: string;
  municipio: string;
  uf: string;
  permite_editar_competencia: boolean;
  competencia_default: string;
  codigo_servico_default?: string;
  observacoes?: string;
}

interface ProgramaIndicacao {
  id: string;
  nome_programa: string;
  descricao: string;
  tipo: 'PRO_BONO' | 'PARCERIA_ISENCAO' | 'PARCERIA_REMUNERADA';
  percentual_remuneracao: number;
  meta_clientes: number;
  duracao_meses: number;
  status: 'ativo' | 'inativo';
  data_criacao: string;
  indicadores_ativos: number;
  clientes_indicados: number;
}

interface Indicador {
  id: string;
  programa_id: string;
  nome: string;
  email: string;
  link_indicacao: string;
  clientes_indicados: number;
  valor_comissao_total: number;
  data_vinculo: string;
  status: 'ativo' | 'inativo';
}

const mockMunicipios: MunicipioConfig[] = [
  {
    id: '1',
    municipio: 'São Paulo',
    uf: 'SP',
    permite_editar_competencia: true,
    competencia_default: 'mes_atual',
    codigo_servico_default: '01.01',
    observacoes: 'Permite retroativo até 60 dias'
  },
  {
    id: '2',
    municipio: 'Rio de Janeiro',
    uf: 'RJ',
    permite_editar_competencia: false,
    competencia_default: 'mes_atual',
    codigo_servico_default: '01.02'
  },
  {
    id: '3',
    municipio: 'Belo Horizonte',
    uf: 'MG',
    permite_editar_competencia: true,
    competencia_default: 'mes_anterior',
    codigo_servico_default: '01.01',
    observacoes: 'Competência pode ser editada até o dia 10'
  }
];

const mockProgramas: ProgramaIndicacao[] = [
  {
    id: '1',
    nome_programa: 'Parceiros Premium',
    descricao: 'Programa para consultores e escritórios parceiros',
    tipo: 'PARCERIA_REMUNERADA',
    percentual_remuneracao: 15,
    meta_clientes: 10,
    duracao_meses: 12,
    status: 'ativo',
    data_criacao: '2024-01-15',
    indicadores_ativos: 5,
    clientes_indicados: 23
  },
  {
    id: '2',
    nome_programa: 'Clientes Satisfeitos',
    descricao: 'Incentivo para indicações de clientes atuais',
    tipo: 'PARCERIA_ISENCAO',
    percentual_remuneracao: 0,
    meta_clientes: 3,
    duracao_meses: 6,
    status: 'ativo',
    data_criacao: '2024-02-01',
    indicadores_ativos: 12,
    clientes_indicados: 8
  },
  {
    id: '3',
    nome_programa: 'Boa Fé Contábil',
    descricao: 'Pro bono para entidades beneficentes',
    tipo: 'PRO_BONO',
    percentual_remuneracao: 0,
    meta_clientes: 5,
    duracao_meses: 24,
    status: 'ativo',
    data_criacao: '2024-03-10',
    indicadores_ativos: 3,
    clientes_indicados: 15
  }
];

const mockIndicadores: Indicador[] = [
  {
    id: '1',
    programa_id: '1',
    nome: 'Consultoria ABC Ltda',
    email: 'contato@consultoriaabc.com.br',
    link_indicacao: 'https://medup.com.br/cadastro?ref=abc123',
    clientes_indicados: 8,
    valor_comissao_total: 12500,
    data_vinculo: '2024-01-20',
    status: 'ativo'
  },
  {
    id: '2',
    programa_id: '1',
    nome: 'João Silva - Consultor',
    email: 'joao.silva@email.com',
    link_indicacao: 'https://medup.com.br/cadastro?ref=js456',
    clientes_indicados: 5,
    valor_comissao_total: 7800,
    data_vinculo: '2024-02-15',
    status: 'ativo'
  },
  {
    id: '3',
    programa_id: '2',
    nome: 'Maria Santos - Cliente',
    email: 'maria.santos@email.com',
    link_indicacao: 'https://medup.com.br/cadastro?ref=ms789',
    clientes_indicados: 3,
    valor_comissao_total: 0,
    data_vinculo: '2024-03-01',
    status: 'ativo'
  }
];

export function SettingsPage() {
  const [municipios, setMunicipios] = useState<MunicipioConfig[]>(mockMunicipios);
  const [programas, setProgramas] = useState<ProgramaIndicacao[]>(mockProgramas);
  const [indicadores, setIndicadores] = useState<Indicador[]>(mockIndicadores);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('municipios');

  // Estados dos modais
  const [municipioDialogOpen, setMunicipioDialogOpen] = useState(false);
  const [programaDialogOpen, setProgramaDialogOpen] = useState(false);
  const [indicadorDialogOpen, setIndicadorDialogOpen] = useState(false);

  // Estados de formulário
  const [municipioForm, setMunicipioForm] = useState<Partial<MunicipioConfig>>({});
  const [programaForm, setProgramaForm] = useState<Partial<ProgramaIndicacao>>({});
  const [indicadorForm, setIndicadorForm] = useState<Partial<Indicador>>({});

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência!');
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'PRO_BONO':
        return 'bg-green-500';
      case 'PARCERIA_ISENCAO':
        return 'bg-blue-500';
      case 'PARCERIA_REMUNERADA':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'PRO_BONO':
        return 'Pro Bono';
      case 'PARCERIA_ISENCAO':
        return 'Isenção';
      case 'PARCERIA_REMUNERADA':
        return 'Remunerada';
      default:
        return tipo;
    }
  };

  const filteredMunicipios = municipios.filter(municipio =>
    municipio.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    municipio.uf.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProgramas = programas.filter(programa =>
    programa.nome_programa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    programa.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIndicadoresPorPrograma = (programaId: string) => {
    return indicadores.filter(ind => ind.programa_id === programaId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Configure parâmetros do sistema e gerencie programas de indicação
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="municipios">Configurações Municipais</TabsTrigger>
          <TabsTrigger value="programas">Programas de Indicação</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        {/* Configurações Municipais */}
        <TabsContent value="municipios" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Configurações por Município
                </CardTitle>
                <Dialog open={municipioDialogOpen} onOpenChange={setMunicipioDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-success hover:bg-success/90 text-success-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Município
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Nova Configuração Municipal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Município</Label>
                          <Input
                            value={municipioForm.municipio || ''}
                            onChange={(e) => setMunicipioForm(prev => ({ ...prev, municipio: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>UF</Label>
                          <Input
                            value={municipioForm.uf || ''}
                            onChange={(e) => setMunicipioForm(prev => ({ ...prev, uf: e.target.value }))}
                            maxLength={2}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={municipioForm.permite_editar_competencia || false}
                          onCheckedChange={(checked) => setMunicipioForm(prev => ({ ...prev, permite_editar_competencia: checked }))}
                        />
                        <Label>Permite editar competência</Label>
                      </div>

                      <div className="space-y-2">
                        <Label>Competência Padrão</Label>
                        <Select 
                          value={municipioForm.competencia_default || ''} 
                          onValueChange={(value) => setMunicipioForm(prev => ({ ...prev, competencia_default: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mes_atual">Mês Atual</SelectItem>
                            <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Código de Serviço Padrão</Label>
                        <Input
                          value={municipioForm.codigo_servico_default || ''}
                          onChange={(e) => setMunicipioForm(prev => ({ ...prev, codigo_servico_default: e.target.value }))}
                          placeholder="Ex: 01.01"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={municipioForm.observacoes || ''}
                          onChange={(e) => setMunicipioForm(prev => ({ ...prev, observacoes: e.target.value }))}
                          placeholder="Observações específicas do município..."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setMunicipioDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          className="bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => {
                            toast.success('Configuração municipal salva!');
                            setMunicipioDialogOpen(false);
                            setMunicipioForm({});
                          }}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar município..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Município/UF</TableHead>
                        <TableHead>Editar Competência</TableHead>
                        <TableHead>Competência Padrão</TableHead>
                        <TableHead>Código Serviço</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMunicipios.map((municipio) => (
                        <TableRow key={municipio.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{municipio.municipio}</p>
                              <p className="text-sm text-muted-foreground">{municipio.uf}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={municipio.permite_editar_competencia ? 'default' : 'secondary'}>
                              {municipio.permite_editar_competencia ? 'Permitido' : 'Bloqueado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {municipio.competencia_default === 'mes_atual' ? 'Mês Atual' : 'Mês Anterior'}
                          </TableCell>
                          <TableCell>{municipio.codigo_servico_default || '-'}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Programas de Indicação */}
        <TabsContent value="programas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Programas Ativos</p>
                    <p className="text-2xl font-bold">{programas.filter(p => p.status === 'ativo').length}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Indicadores</p>
                    <p className="text-2xl font-bold">
                      {programas.reduce((acc, p) => acc + p.indicadores_ativos, 0)}
                    </p>
                  </div>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Clientes Indicados</p>
                    <p className="text-2xl font-bold">
                      {programas.reduce((acc, p) => acc + p.clientes_indicados, 0)}
                    </p>
                  </div>
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Programas de Indicação</CardTitle>
                <Dialog open={programaDialogOpen} onOpenChange={setProgramaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-success hover:bg-success/90 text-success-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Programa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Novo Programa de Indicação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome do Programa</Label>
                          <Input
                            value={programaForm.nome_programa || ''}
                            onChange={(e) => setProgramaForm(prev => ({ ...prev, nome_programa: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select 
                            value={programaForm.tipo || ''} 
                            onValueChange={(value: any) => setProgramaForm(prev => ({ ...prev, tipo: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PRO_BONO">Pro Bono</SelectItem>
                              <SelectItem value="PARCERIA_ISENCAO">Parceria com Isenção</SelectItem>
                              <SelectItem value="PARCERIA_REMUNERADA">Parceria Remunerada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={programaForm.descricao || ''}
                          onChange={(e) => setProgramaForm(prev => ({ ...prev, descricao: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>% Remuneração</Label>
                          <Input
                            type="number"
                            value={programaForm.percentual_remuneracao || 0}
                            onChange={(e) => setProgramaForm(prev => ({ ...prev, percentual_remuneracao: Number(e.target.value) }))}
                            disabled={programaForm.tipo === 'PRO_BONO' || programaForm.tipo === 'PARCERIA_ISENCAO'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Meta de Clientes</Label>
                          <Input
                            type="number"
                            value={programaForm.meta_clientes || 0}
                            onChange={(e) => setProgramaForm(prev => ({ ...prev, meta_clientes: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duração (meses)</Label>
                          <Input
                            type="number"
                            value={programaForm.duracao_meses || 0}
                            onChange={(e) => setProgramaForm(prev => ({ ...prev, duracao_meses: Number(e.target.value) }))}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setProgramaDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          className="bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => {
                            toast.success('Programa de indicação criado!');
                            setProgramaDialogOpen(false);
                            setProgramaForm({});
                          }}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar programa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid gap-4">
                  {filteredProgramas.map((programa) => (
                    <Card key={programa.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{programa.nome_programa}</h3>
                            <Badge className={`${getTipoColor(programa.tipo)} text-white`}>
                              {getTipoLabel(programa.tipo)}
                            </Badge>
                            <Badge variant={programa.status === 'ativo' ? 'default' : 'secondary'}>
                              {programa.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{programa.descricao}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Remuneração</p>
                              <p className="font-medium">{programa.percentual_remuneracao}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Meta</p>
                              <p className="font-medium">{programa.meta_clientes} clientes</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Indicadores</p>
                              <p className="font-medium">{programa.indicadores_ativos} ativos</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Indicados</p>
                              <p className="font-medium">{programa.clientes_indicados} clientes</p>
                            </div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              Ver Indicadores
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indicadores */}
        <TabsContent value="indicadores" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Indicadores Ativos</CardTitle>
                <Dialog open={indicadorDialogOpen} onOpenChange={setIndicadorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-success hover:bg-success/90 text-success-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Indicador
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Vincular Novo Indicador</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Programa</Label>
                        <Select 
                          value={indicadorForm.programa_id || ''} 
                          onValueChange={(value) => setIndicadorForm(prev => ({ ...prev, programa_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {programas.filter(p => p.status === 'ativo').map(programa => (
                              <SelectItem key={programa.id} value={programa.id}>
                                {programa.nome_programa}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome/Empresa</Label>
                          <Input
                            value={indicadorForm.nome || ''}
                            onChange={(e) => setIndicadorForm(prev => ({ ...prev, nome: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <Input
                            type="email"
                            value={indicadorForm.email || ''}
                            onChange={(e) => setIndicadorForm(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIndicadorDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          className="bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => {
                            toast.success('Indicador vinculado com sucesso!');
                            setIndicadorDialogOpen(false);
                            setIndicadorForm({});
                          }}
                        >
                          Vincular
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicador</TableHead>
                      <TableHead>Programa</TableHead>
                      <TableHead>Link de Indicação</TableHead>
                      <TableHead>Indicações</TableHead>
                      <TableHead>Comissão Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicadores.map((indicador) => {
                      const programa = programas.find(p => p.id === indicador.programa_id);
                      return (
                        <TableRow key={indicador.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{indicador.nome}</p>
                              <p className="text-sm text-muted-foreground">{indicador.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {programa && (
                              <Badge className={`${getTipoColor(programa.tipo)} text-white`}>
                                {programa.nome_programa}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {indicador.link_indicacao.split('?ref=')[1]}
                              </code>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleCopyLink(indicador.link_indicacao)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              {indicador.clientes_indicados}
                            </div>
                          </TableCell>
                          <TableCell>
                            R$ {indicador.valor_comissao_total.toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={indicador.status === 'ativo' ? 'default' : 'secondary'}>
                              {indicador.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleCopyLink(indicador.link_indicacao)}>
                                  <Link2 className="mr-2 h-4 w-4" />
                                  Copiar Link
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Desvincular
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}