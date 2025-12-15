import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from './ui/command';
import { Dialog, DialogContent } from './ui/dialog';
import { Badge } from './ui/badge';
import { buscaService } from '../services/api';
import { 
  Search, 
  Building2, 
  Users, 
  UserCheck, 
  Receipt, 
  FileText,
  Plus,
  ArrowRight,
  Hash,
  Calendar
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'conta' | 'empresa' | 'pessoa' | 'tomador' | 'nota' | 'acao';
  category: string;
  url?: string;
  action?: () => void;
  metadata?: {
    status?: string;
    valor?: number;
    data?: string;
  };
}

// Mock data para demonstração
const mockSearchData: SearchResult[] = [
  // Contas
  {
    id: 'conta-1',
    title: 'Tech Solutions Contabilidade',
    subtitle: 'Conta ativa • 3 empresas • 12 pessoas',
    type: 'conta',
    category: 'Contas',
    url: 'contas',
    metadata: { status: 'ativa' }
  },
  {
    id: 'conta-2',
    title: 'Clínica Dr. Santos',
    subtitle: 'Conta ativa • 1 empresa • 8 pessoas',
    type: 'conta',
    category: 'Contas',
    url: 'contas',
    metadata: { status: 'ativa' }
  },

  // Empresas
  {
    id: 'empresa-1',
    title: 'Tech Solutions LTDA',
    subtitle: 'CNPJ: 12.345.678/0001-90 • São Paulo/SP',
    type: 'empresa',
    category: 'Empresas',
    url: 'empresas',
    metadata: { status: 'ativa' }
  },
  {
    id: 'empresa-2',
    title: 'Consultoria ABC ME',
    subtitle: 'CNPJ: 98.765.432/0001-10 • Rio de Janeiro/RJ',
    type: 'empresa',
    category: 'Empresas',
    url: 'empresas',
    metadata: { status: 'ativa' }
  },

  // Pessoas
  {
    id: 'pessoa-1',
    title: 'João Silva',
    subtitle: 'CPF: 123.456.789-00 • Sócio da Tech Solutions',
    type: 'pessoa',
    category: 'Pessoas',
    url: 'pessoas',
    metadata: { status: 'ativo' }
  },
  {
    id: 'pessoa-2',
    title: 'Maria Santos',
    subtitle: 'CPF: 987.654.321-00 • Sócia da Clínica Dr. Santos',
    type: 'pessoa',
    category: 'Pessoas',
    url: 'pessoas',
    metadata: { status: 'ativo' }
  },

  // Tomadores
  {
    id: 'tomador-1',
    title: 'Empresa ABC Ltda',
    subtitle: 'CNPJ: 11.222.333/0001-44 • ISS Retido',
    type: 'tomador',
    category: 'Tomadores',
    url: 'tomadores'
  },
  {
    id: 'tomador-2',
    title: 'Carlos Eduardo Cliente',
    subtitle: 'CPF: 555.666.777-88 • Pessoa Física',
    type: 'tomador',
    category: 'Tomadores',
    url: 'tomadores'
  },

  // Notas Fiscais
  {
    id: 'nota-1',
    title: 'NFS-e #12345',
    subtitle: 'Tech Solutions → Empresa ABC • Autorizada',
    type: 'nota',
    category: 'Notas Fiscais',
    url: 'notas-fiscais',
    metadata: { 
      status: 'Autorizada', 
      valor: 2500,
      data: '2024-12-05'
    }
  },
  {
    id: 'nota-2',
    title: 'NFS-e #12346',
    subtitle: 'Consultoria ABC → Carlos Cliente • Processando',
    type: 'nota',
    category: 'Notas Fiscais',
    url: 'notas-fiscais',
    metadata: { 
      status: 'Processando', 
      valor: 1800,
      data: '2024-12-05'
    }
  }
];

// Ações rápidas
const quickActions: SearchResult[] = [
  {
    id: 'acao-emitir-nfse',
    title: 'Emitir NFS-e',
    subtitle: 'Iniciar wizard de emissão de nota fiscal',
    type: 'acao',
    category: 'Ações Rápidas'
  },
  {
    id: 'acao-nova-conta',
    title: 'Nova Conta',
    subtitle: 'Cadastrar nova conta contábil',
    type: 'acao',
    category: 'Ações Rápidas'
  },
  {
    id: 'acao-nova-empresa',
    title: 'Nova Empresa',
    subtitle: 'Cadastrar nova empresa (PJ)',
    type: 'acao',
    category: 'Ações Rápidas'
  },
  {
    id: 'acao-nova-pessoa',
    title: 'Nova Pessoa',
    subtitle: 'Cadastrar nova pessoa (PF)',
    type: 'acao',
    category: 'Ações Rápidas'
  }
];

interface GlobalSearchProps {
  onNavigate: (page: string) => void;
  onEmitNFSe: () => void;
}

export function GlobalSearch({ onNavigate, onEmitNFSe }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter results based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredResults(quickActions);
      return;
    }

    const allData = [...mockSearchData, ...quickActions];
    const filtered = allData.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredResults(filtered);
  }, [searchTerm]);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'conta':
        return <Building2 className="w-4 h-4" />;
      case 'empresa':
        return <Building2 className="w-4 h-4" />;
      case 'pessoa':
        return <Users className="w-4 h-4" />;
      case 'tomador':
        return <UserCheck className="w-4 h-4" />;
      case 'nota':
        return <Receipt className="w-4 h-4" />;
      case 'acao':
        return <Plus className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Autorizada':
      case 'ativa':
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'Processando':
        return 'bg-blue-100 text-blue-800';
      case 'Erro':
      case 'inativa':
      case 'inativo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelect = (item: SearchResult) => {
    if (item.type === 'acao') {
      switch (item.id) {
        case 'acao-emitir-nfse':
          onEmitNFSe();
          break;
        case 'acao-nova-conta':
          onNavigate('contas');
          break;
        case 'acao-nova-empresa':
          onNavigate('empresas');
          break;
        case 'acao-nova-pessoa':
          onNavigate('pessoas');
          break;
      }
    } else if (item.url) {
      onNavigate(item.url);
    }
    
    setIsOpen(false);
    setSearchTerm('');
  };

  // Group results by category
  const groupedResults = filteredResults.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Search Trigger Button */}
      <Button 
        variant="outline" 
        className="relative w-64 justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-4 h-4 mr-2" />
        <span>Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 max-w-2xl">
          <Command className="rounded-lg border-0 shadow-md">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Busque por contas, empresas, pessoas, notas ou ações..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="border-0 outline-none ring-0 focus:ring-0"
              />
            </div>
            
            <CommandList className="max-h-[400px] overflow-y-auto">
              {Object.keys(groupedResults).length === 0 ? (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhum resultado encontrado
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tente buscar por nomes, CPFs, CNPJs ou números de notas
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                Object.entries(groupedResults).map(([category, items], groupIndex) => (
                  <div key={category}>
                    <CommandGroup heading={category}>
                      {items.map((item, index) => (
                        <CommandItem
                          key={item.id}
                          value={item.title}
                          onSelect={() => handleSelect(item)}
                          className="flex items-center justify-between py-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                              {getItemIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{item.title}</p>
                                {item.metadata?.status && (
                                  <Badge className={`text-xs ${getStatusColor(item.metadata.status)}`}>
                                    {item.metadata.status}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {item.subtitle}
                              </p>
                              {item.metadata && (item.metadata.valor || item.metadata.data) && (
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {item.metadata.valor && (
                                    <span className="flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      R$ {item.metadata.valor.toLocaleString('pt-BR')}
                                    </span>
                                  )}
                                  {item.metadata.data && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(item.metadata.data).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {groupIndex < Object.keys(groupedResults).length - 1 && <CommandSeparator />}
                  </div>
                ))
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}