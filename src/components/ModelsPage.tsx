import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { modelosService } from '../services/api';
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
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Star,
  Calendar,
  Users,
  Tag,
} from 'lucide-react';

interface DiscriminationModel {
  id: string;
  titulo_modelo: string;
  texto_modelo: string;
  categoria: string;
  variaveis_usadas: string[];
  tomadores_associados: number;
  uso_frequente: boolean;
  criador_nome: string;
  created_at: string;
  updated_at: string;
}

const categorias = [
  'MEDICO',
  'TECNOLOGIA',
  'CONTABIL',
  'JURIDICO',
  'CONSULTORIA',
  'EDUCACAO',
  'OUTROS',
];

const variaveisDisponiveis = [
  // Variáveis globais
  { key: '{{valor_total}}', desc: 'Valor total da nota' },
  { key: '{{periodo}}', desc: 'Período (Mês/Ano)' },
  { key: '{{mes_competencia}}', desc: 'Mês de competência (YYYY-MM)' },
  // Variáveis do sócio (dentro do loop)
  { key: '{{socio.nome}}', desc: 'Nome completo do sócio' },
  { key: '{{socio.nome_completo}}', desc: 'Nome completo do sócio' },
  { key: '{{socio.cpf}}', desc: 'CPF do sócio' },
  { key: '{{socio.crm}}', desc: 'CRM do médico' },
  { key: '{{socio.crc}}', desc: 'CRC do contador' },
  { key: '{{socio.registro_profissional}}', desc: 'Registro profissional' },
  { key: '{{socio.especialidade}}', desc: 'Especialidade' },
  { key: '{{socio.email}}', desc: 'Email do sócio' },
  { key: '{{socio.telefone}}', desc: 'Telefone do sócio' },
  { key: '{{valor}}', desc: 'Valor do sócio' },
  { key: '{{valor_socio}}', desc: 'Valor do sócio' },
  // Estruturas de loop
  { key: '{{#loop}}', desc: 'Início do loop (repetir para cada sócio)' },
  { key: '{{/loop}}', desc: 'Fim do loop' },
];

export function ModelsPage() {
  const [models, setModels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [usoFilter, setUsoFilter] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [previewModel, setPreviewModel] = useState(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar dados da API
  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await modelosService.getAll();
      if (response.success) {
        setModels(response.data.modelos);
      }
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const [formData, setFormData] = useState({
    titulo_modelo: '',
    texto_modelo: '',
    categoria: '',
    uso_frequente: false,
  });

  const filteredModels = models.filter((model) => {
    const matchesSearch = 
      model.titulo_modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.texto_modelo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = categoriaFilter === '' || categoriaFilter === 'all' || model.categoria === categoriaFilter;
    const matchesUso = usoFilter === '' || usoFilter === 'all' || 
      (usoFilter === 'frequente' && model.uso_frequente) ||
      (usoFilter === 'normal' && !model.uso_frequente);

    
    return matchesSearch && matchesCategoria && matchesUso;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Extrair variáveis usadas no texto (novo formato {{variavel}})
      const variaveisEncontradas: string[] = [];
      
      // Buscar todas as variáveis no formato {{...}}
      const regexVariaveis = /\{\{([^}]+)\}\}/g;
      let match;
      const variaveisUnicas = new Set<string>();
      
      while ((match = regexVariaveis.exec(formData.texto_modelo)) !== null) {
        const variavel = match[0]; // {{variavel}}
        variaveisUnicas.add(variavel);
      }
      
      // Converter Set para Array
      const variaveisArray = Array.from(variaveisUnicas);
      
      // Garantir que seja sempre um array válido
      const variaveisParaEnviar = Array.isArray(variaveisArray) && variaveisArray.length > 0 
        ? variaveisArray 
        : [];

      if (editingModel) {
        // Update existing model
        const response = await modelosService.atualizar(editingModel.id, {
          ...formData,
          variaveis_usadas: variaveisParaEnviar,
        });
        if (response.success) {
          toast.success('Modelo atualizado com sucesso!');
          loadModels();
        }
      } else {
        // Add new model
        const response = await modelosService.criar({
          ...formData,
          variaveis_usadas: variaveisParaEnviar,
        });
        if (response.success) {
          toast.success('Modelo criado com sucesso!');
          loadModels();
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar modelo');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo_modelo: '',
      texto_modelo: '',
      categoria: '',
      uso_frequente: false,
    });
    setEditingModel(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (model: DiscriminationModel) => {
    setFormData({
      titulo_modelo: model.titulo_modelo,
      texto_modelo: model.texto_modelo,
      categoria: model.categoria,
      uso_frequente: model.uso_frequente || false,
    });
    setEditingModel(model);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await modelosService.deletar(id);
      if (response.success) {
        toast.success('Modelo excluído com sucesso!');
        loadModels();
      }
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Erro ao excluir modelo');
    }
  };

  const handleCopy = (model: DiscriminationModel) => {
    navigator.clipboard.writeText(model.texto_modelo);
    toast.success('Texto copiado para a área de transferência!');
  };

  const handlePreview = (model: DiscriminationModel) => {
    setPreviewModel(model);
    setIsPreviewDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('texto_modelo') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.texto_modelo;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + variable + after;
      
      setFormData({ ...formData, texto_modelo: newText });
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modelos de Discriminação</h1>
          <p className="text-muted-foreground">
            Gerencie os modelos de texto para discriminação de serviços nas NFS-e
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? 'Editar Modelo' : 'Novo Modelo'}
              </DialogTitle>
              <DialogDescription>
                {editingModel 
                  ? 'Atualize as informações do modelo de discriminação.' 
                  : 'Crie um novo modelo de discriminação para serviços.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo_modelo">Título do Modelo *</Label>
                  <Input
                    id="titulo_modelo"
                    value={formData.titulo_modelo}
                    onChange={(e) => setFormData({ ...formData, titulo_modelo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="texto_modelo">Texto do Modelo *</Label>
                <Textarea
                  id="texto_modelo"
                  value={formData.texto_modelo}
                  onChange={(e) => setFormData({ ...formData, texto_modelo: e.target.value })}
                  placeholder="Digite o texto do modelo. Use as variáveis disponíveis abaixo."
                  className="min-h-[200px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Variáveis Disponíveis</Label>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis Globais (fora do loop):</p>
                    <div className="grid grid-cols-3 gap-2">
                      {variaveisDisponiveis.filter(v => !v.key.includes('socio.') && !v.key.includes('valor') && !v.key.includes('loop')).map((variavel) => (
                        <Button
                          key={variavel.key}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variavel.key)}
                          className="justify-start"
                          title={variavel.desc}
                        >
                          <Tag className="mr-2 h-3 w-3" />
                          {variavel.key}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Estrutura de Loop (repetir para cada sócio):</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable('{{#loop}}\n\n{{/loop}}')}
                        className="justify-start"
                        title="Insere estrutura de loop"
                      >
                        <Tag className="mr-2 h-3 w-3" />
                        {'{{#loop}}...{{/loop}}'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis do Sócio (dentro do loop):</p>
                    <div className="grid grid-cols-3 gap-2">
                      {variaveisDisponiveis.filter(v => v.key.includes('socio.') || v.key.includes('valor')).map((variavel) => (
                        <Button
                          key={variavel.key}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variavel.key)}
                          className="justify-start"
                          title={variavel.desc}
                        >
                          <Tag className="mr-2 h-3 w-3" />
                          {variavel.key}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Dica:</strong> Use {'{{#loop}}...{{/loop}}'} para repetir uma seção para cada sócio. Variáveis como {'{{socio.nome}}'} só funcionam dentro do loop.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingModel ? 'Atualizar' : 'Criar'}
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
            <CardTitle className="text-sm font-medium">Total de Modelos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground">
              {models.filter(m => m.uso_frequente).length} em uso frequente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(models.map(m => m.categoria)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Categorias diferentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tomadores Associados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.reduce((sum, m) => sum + m.tomadores_associados, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de associações
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.length > 0 ? new Date(Math.max(...models.map(m => new Date(m.updated_at).getTime()))).toLocaleDateString('pt-BR') : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              Modelo mais recente
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
                  placeholder="Buscar por título ou texto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoriaFilter || 'all'} onValueChange={(value) => setCategoriaFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={usoFilter || 'all'} onValueChange={(value) => setUsoFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Uso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="frequente">Frequente</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Modelos ({filteredModels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando modelos...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Criador</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead>Tomadores</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{model.titulo_modelo}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {model.texto_modelo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {model.criador_nome || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {model.variaveis_usadas.slice(0, 3).map((variavel) => (
                          <Badge key={variavel} variant="secondary" className="text-xs">
                            {variavel}
                          </Badge>
                        ))}
                        {model.variaveis_usadas.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{model.variaveis_usadas.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{model.tomadores_associados}</TableCell>
                    <TableCell>
                      {model.uso_frequente ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <Star className="h-3 w-3" />
                          Frequente
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(model.updated_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(model)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(model)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar Texto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(model)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(model.id)}
                            className="text-destructive"
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
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visualizar Modelo</DialogTitle>
            <DialogDescription>
              {previewModel?.titulo_modelo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Categoria</Label>
              <Badge variant="outline" className="mt-1">
                {previewModel?.categoria}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Variáveis Utilizadas</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {previewModel?.variaveis_usadas.map((variavel) => (
                  <Badge key={variavel} variant="secondary">
                    {variavel}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Texto do Modelo</Label>
              <div className="mt-2 p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap text-sm">
                  {previewModel?.texto_modelo}
                </pre>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => previewModel && handleCopy(previewModel)}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Texto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}