import React, { useState } from 'react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import {
  Building2,
  Users,
  FileText,
  Settings,
  Home,
  UserCheck,
  Receipt,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../imports/Logo';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from './GlobalSearch';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onEmitNFSe: () => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, section: 'main' },
  { id: 'contas', label: 'Contas', icon: Briefcase, section: 'cadastros' },
  { id: 'empresas', label: 'Empresas', icon: Building2, section: 'cadastros' },
  { id: 'pessoas', label: 'Pessoas', icon: Users, section: 'cadastros' },
  { id: 'tomadores', label: 'Tomadores', icon: UserCheck, section: 'cadastros' },
  { id: 'notas-fiscais', label: 'Notas Fiscais', icon: Receipt, section: 'fiscal' },
  { id: 'modelos', label: 'Modelos', icon: FileText, section: 'fiscal' },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, section: 'fiscal' },
  { id: 'honorarios', label: 'Honorários', icon: Calculator, section: 'futuro', disabled: true },
  { id: 'financeiro', label: 'Financeiro', icon: TrendingUp, section: 'futuro', disabled: true },
  { id: 'societario', label: 'Societário', icon: FileSpreadsheet, section: 'futuro', disabled: true },
  { id: 'funcionarios', label: 'Funcionários', icon: Users, section: 'admin' },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, section: 'admin' },
];

const sectionLabels = {
  main: '',
  cadastros: 'CADASTROS',
  fiscal: 'OPERAÇÕES FISCAIS',
  futuro: 'EM DESENVOLVIMENTO',
  admin: 'ADMINISTRAÇÃO',
};

export function Layout({ children, currentPage, onNavigate, onEmitNFSe }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const groupedNavItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navigationItems>);

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-4 flex-shrink-0" style={{ fill: 'white' }}>
              <Logo />
            </div>
            {!sidebarCollapsed && (
              <h1 className="text-sidebar-foreground font-medium">MedUP</h1>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {Object.entries(groupedNavItems).map(([section, items]) => (
            <div key={section}>
              {section !== 'main' && !sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
                  {sectionLabels[section as keyof typeof sectionLabels]}
                </div>
              )}
              
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const isDisabled = item.disabled;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && onNavigate(item.id)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {isDisabled && (
                          <Badge variant="secondary" className="text-xs">
                            Em breve
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-background flex items-center justify-between px-6">
          {/* Search and Action */}
          <div className="flex items-center gap-4">
            <GlobalSearch onNavigate={onNavigate} onEmitNFSe={onEmitNFSe} />
            <Button 
              onClick={onEmitNFSe}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Emitir NFS-e
            </Button>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <NotificationCenter onNavigate={onNavigate} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user ? getInitials(user.nome_completo) : 'AD'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user?.nome_completo || 'Usuário'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.nome_completo}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}