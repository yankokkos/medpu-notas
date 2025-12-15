import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { contasService, empresasService, pessoasService, tomadoresService, notasService } from '../services/api';
import { BatchEmissionDialog } from './BatchEmissionDialog';
import {
  Building2,
  Users,
  Receipt,
  TrendingUp,
  FileText,
  AlertTriangle,
  Plus,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Target,
  Activity,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
  onEmitNFSe: () => void;
}

export function Dashboard({ onNavigate, onEmitNFSe }: DashboardProps) {
  const [stats, setStats] = useState({
    notasEsteMes: 0,
    metaNotasMes: 60,
    valorTotal: 0,
    valorMeta: 150000,
    rascunhosPendentes: 0,
    contasAtivas: 0,
    empresasCadastradas: 0,
    pessoasCadastradas: 0,
    tomadoresCadastrados: 0,
    notasAutorizadas: 0,
    notasProcessando: 0,
    notasComErro: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  // Carregar dados da API
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados em paralelo
      const [contasRes, empresasRes, pessoasRes, tomadoresRes, notasRes] = await Promise.all([
        contasService.listar({ limit: 1000 }),
        empresasService.listar({ limit: 1000 }),
        pessoasService.listar({ limit: 1000 }),
        tomadoresService.listar({ limit: 1000 }),
        notasService.listar({ limit: 1000 })
      ]);

      // Calcular estatísticas baseadas na estrutura correta do banco
      const contasAtivas = contasRes.success ? contasRes.data.contas?.filter(c => c.status === 'ATIVO').length || 0 : 0;
      const empresasCadastradas = empresasRes.success ? empresasRes.data.empresas?.filter(e => e.status === 'ativa').length || 0 : 0;
      const pessoasCadastradas = pessoasRes.success ? pessoasRes.data.pessoas?.filter(p => p.status === 'ativo').length || 0 : 0;
      const tomadoresCadastrados = tomadoresRes.success ? tomadoresRes.data.tomadores?.filter(t => t.status === 'ativo').length || 0 : 0;
      
      // Calcular notas do mês atual (ou último mês com dados)
      const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
      const notasEsteMes = notasRes.success ? notasRes.data.notas?.filter(n => n.mes_competencia === mesAtual).length || 0 : 0;
      const valorTotal = notasRes.success ? notasRes.data.notas
        ?.filter(n => n.mes_competencia === mesAtual)
        .reduce((sum, n) => sum + (parseFloat(n.valor_total) || 0), 0) || 0 : 0;
      
      // Se não há notas no mês atual, mostrar dados do último mês com notas
      let notasParaExibir = notasEsteMes;
      let valorParaExibir = valorTotal;
      if (notasParaExibir === 0 && notasRes.success && notasRes.data.notas?.length > 0) {
        const ultimoMesComNotas = notasRes.data.notas
          .sort((a, b) => b.mes_competencia.localeCompare(a.mes_competencia))[0].mes_competencia;
        notasParaExibir = notasRes.data.notas.filter(n => n.mes_competencia === ultimoMesComNotas).length;
        valorParaExibir = notasRes.data.notas
          .filter(n => n.mes_competencia === ultimoMesComNotas)
          .reduce((sum, n) => sum + (parseFloat(n.valor_total) || 0), 0);
      }
      
      // Calcular status das notas
      const notasAutorizadas = notasRes.success ? notasRes.data.notas?.filter(n => n.status === 'AUTORIZADA').length || 0 : 0;
      const notasProcessando = notasRes.success ? notasRes.data.notas?.filter(n => n.status === 'PROCESSANDO').length || 0 : 0;
      const notasComErro = notasRes.success ? notasRes.data.notas?.filter(n => n.status === 'ERRO').length || 0 : 0;
      const rascunhosPendentes = notasRes.success ? notasRes.data.notas?.filter(n => n.status === 'RASCUNHO').length || 0 : 0;

      setStats({
        notasEsteMes: notasParaExibir,
        metaNotasMes: 60,
        valorTotal: valorParaExibir,
        valorMeta: 150000,
        rascunhosPendentes,
        contasAtivas,
        empresasCadastradas,
        pessoasCadastradas,
        tomadoresCadastrados,
        notasAutorizadas,
        notasProcessando,
        notasComErro,
      });

      // Atividade recente (últimas 5 notas)
      if (notasRes.success && notasRes.data.notas?.length > 0) {
        const atividadeRecente = notasRes.data.notas
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(nota => ({
            type: 'nota',
            empresa: nota.empresa_nome || 'Empresa não informada',
            valor: parseFloat(nota.valor_total) || 0,
            status: nota.status,
            time: new Date(nota.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          }));
        setRecentActivity(atividadeRecente);
      } else {
        setRecentActivity([]);
      }

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      // Em caso de erro, definir valores padrão
      setStats({
        notasEsteMes: 0,
        metaNotasMes: 60,
        valorTotal: 0,
        valorMeta: 150000,
        rascunhosPendentes: 0,
        contasAtivas: 0,
        empresasCadastradas: 0,
        pessoasCadastradas: 0,
        tomadoresCadastrados: 0,
        notasAutorizadas: 0,
        notasProcessando: 0,
        notasComErro: 0,
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const pendingTasks = [
    { tipo: 'Rascunho NFS-e', empresa: 'Advocacia Silva & Pereira', dias: 2, prioridade: 'alta' },
    { tipo: 'Documentos', empresa: 'Construtora Boa Vista', dias: 5, prioridade: 'média' },
    { tipo: 'Rascunho NFS-e', empresa: 'Design Studio Creative', dias: 1, prioridade: 'alta' },
    { tipo: 'Validação Fiscal', empresa: 'Clínica São Paulo', dias: 3, prioridade: 'baixa' },
  ];

  const monthlyGoals = {
    notas: { current: stats.notasEsteMes, target: stats.metaNotasMes },
    receita: { current: stats.valorTotal, target: stats.valorMeta },
  };

  // Cálculo de progresso para as metas
  const notasProgress = (monthlyGoals.notas.current / monthlyGoals.notas.target) * 100;
  const receitaProgress = (monthlyGoals.receita.current / monthlyGoals.receita.target) * 100;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando dados do dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao sistema de gestão MedUP
          </p>
        </div>
        <Button 
          onClick={onEmitNFSe}
          size="lg"
          className="bg-success hover:bg-success/90 text-success-foreground"
        >
          <Plus className="w-5 h-5 mr-2" />
          Emitir NFS-e
        </Button>
      </div>

      {/* Alerts for urgent items */}
      {pendingTasks.filter(task => task.dias <= 1).length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Atenção Requerida</AlertTitle>
          <AlertDescription className="text-orange-700">
            Você tem {pendingTasks.filter(task => task.dias <= 1).length} tarefa(s) com prazo vencendo hoje.
            <Button 
              variant="link" 
              className="p-0 ml-2 text-orange-800 underline" 
              onClick={() => onNavigate('notas-fiscais')}
            >
              Ver detalhes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas este Mês</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notasEsteMes}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Meta: {stats.metaNotasMes}
              </p>
              <Badge variant={notasProgress >= 100 ? "default" : "secondary"}>
                {Math.round(notasProgress)}%
              </Badge>
            </div>
            <Progress value={notasProgress} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.valorTotal.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Meta: R$ {stats.valorMeta.toLocaleString('pt-BR')}
              </p>
              <Badge variant={receitaProgress >= 100 ? "default" : "secondary"}>
                {Math.round(receitaProgress)}%
              </Badge>
            </div>
            <Progress value={receitaProgress} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status das Notas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-sm">Autorizadas</span>
                </div>
                <span className="text-sm font-medium">{stats.notasAutorizadas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span className="text-sm">Processando</span>
                </div>
                <span className="text-sm font-medium">{stats.notasProcessando}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  <span className="text-sm">Com Erro</span>
                </div>
                <span className="text-sm font-medium">{stats.notasComErro}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastros</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Contas Ativas</span>
                <span className="text-sm font-medium">{stats.contasAtivas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Empresas</span>
                <span className="text-sm font-medium">{stats.empresasCadastradas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pessoas</span>
                <span className="text-sm font-medium">{stats.pessoasCadastradas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tomadores</span>
                <span className="text-sm font-medium">{stats.tomadoresCadastrados}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Metas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notas Fiscais</span>
                <span className="text-sm text-muted-foreground">
                  {monthlyGoals.notas.current} / {monthlyGoals.notas.target}
                </span>
              </div>
              <Progress value={notasProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {monthlyGoals.notas.target - monthlyGoals.notas.current} notas restantes para atingir a meta
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Faturamento</span>
                <span className="text-sm text-muted-foreground">
                  R$ {monthlyGoals.receita.current.toLocaleString('pt-BR')} / R$ {monthlyGoals.receita.target.toLocaleString('pt-BR')}
                </span>
              </div>
              <Progress value={receitaProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                R$ {(monthlyGoals.receita.target - monthlyGoals.receita.current).toLocaleString('pt-BR')} restantes para atingir a meta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'nota' ? 
                    activity.status === 'AUTORIZADA' ? 'bg-green-500' : 
                    activity.status === 'PROCESSANDO' ? 'bg-blue-500' : 'bg-red-500'
                  : 'bg-primary'
                }`}></div>
                <div className="flex-1 min-w-0">
                  {activity.type === 'nota' ? (
                    <div>
                      <p className="text-sm font-medium">
                        NFS-e emitida para {activity.empresa}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        R$ {activity.valor?.toLocaleString('pt-BR')} • {activity.status}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">{activity.nome}</p>
                      <p className="text-xs text-muted-foreground">{activity.acao}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                  <Badge variant="secondary" className="text-xs">
                    {activity.type === 'nota' ? 'Fiscal' : 'Cadastro'}
                  </Badge>
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('notas-fiscais')}
            >
              Ver todas as atividades
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Tarefas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    task.prioridade === 'alta' ? 'bg-red-500' :
                    task.prioridade === 'média' ? 'bg-orange-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium">{task.tipo}</p>
                    <p className="text-xs text-muted-foreground">{task.empresa}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={`text-xs ${
                      task.prioridade === 'alta' ? 'border-red-500 text-red-700' :
                      task.prioridade === 'média' ? 'border-orange-500 text-orange-700' :
                      'border-green-500 text-green-700'
                    }`}
                  >
                    {task.prioridade}
                  </Badge>
                  <Badge 
                    variant={task.dias <= 1 ? 'destructive' : task.dias <= 3 ? 'default' : 'secondary'}
                  >
                    {task.dias} dia{task.dias > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('notas-fiscais')}
            >
              Ver todas as pendências
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              onClick={() => onNavigate('contas')}
              className="h-20 flex-col"
            >
              <Building2 className="w-6 h-6 mb-2" />
              <span className="text-xs">Nova Conta</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('empresas')}
              className="h-20 flex-col"
            >
              <Building2 className="w-6 h-6 mb-2" />
              <span className="text-xs">Nova Empresa</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('pessoas')}
              className="h-20 flex-col"
            >
              <Users className="w-6 h-6 mb-2" />
              <span className="text-xs">Nova Pessoa</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('tomadores')}
              className="h-20 flex-col"
            >
              <UserCheck className="w-6 h-6 mb-2" />
              <span className="text-xs">Novo Tomador</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={onEmitNFSe}
              className="h-20 flex-col bg-success/10 border-success hover:bg-success/20"
            >
              <Plus className="w-6 h-6 mb-2 text-success" />
              <span className="text-xs text-success">Emitir NFS-e</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsBatchDialogOpen(true)}
              className="h-20 flex-col"
            >
              <FileSpreadsheet className="w-6 h-6 mb-2" />
              <span className="text-xs">Emitir em Lote</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <BatchEmissionDialog
        isOpen={isBatchDialogOpen}
        onClose={() => setIsBatchDialogOpen(false)}
        onSuccess={() => {
          loadDashboardData();
          setIsBatchDialogOpen(false);
        }}
      />
        </>
      )}
    </div>
  );
}