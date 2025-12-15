import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { relatoriosService, empresasService } from '../services/api';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  FileText,
  Download,
  Calendar,
  Building2,
  Receipt,
  DollarSign,
  Users,
  AlertTriangle,
} from 'lucide-react';

export function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2024-01');
  const [reportType, setReportType] = useState('faturamento');
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar lista de empresas
  const loadEmpresas = async () => {
    try {
      setLoadingEmpresas(true);
      const response = await empresasService.listar({ status: 'ativa' });
      if (response.success) {
        setEmpresas(response.data.empresas || []);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoadingEmpresas(false);
    }
  };

  // Carregar dados de relatórios da API
  const loadReportData = async () => {
    try {
      setLoading(true);
      let response;
      
      const params: any = { periodo: selectedPeriod };
      if (selectedEmpresa) {
        params.empresa_id = selectedEmpresa;
      }
      
      switch (reportType) {
        case 'faturamento':
          response = await relatoriosService.getFaturamento(params);
          break;
        case 'empresas':
          response = await relatoriosService.getFaturamento(params);
          break;
        case 'operacional':
          response = await relatoriosService.getOperacional(params);
          break;
        default:
          response = await relatoriosService.getFaturamento(params);
      }

      if (response.success) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, reportType, selectedEmpresa]);

  // Dados carregados da API - não há mais dados mock

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const generatePDF = () => {
    // Simular geração de PDF
    const toast = (window as any).toast;
    if (toast) {
      toast.success('Relatório gerado com sucesso!', {
        description: 'O arquivo PDF foi baixado automaticamente.'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises e métricas do seu escritório contábil
          </p>
        </div>
        <Button onClick={generatePDF} className="bg-success hover:bg-success/90">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Período</Label>
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>
            <div>
              <Label>Empresa</Label>
              <Select value={selectedEmpresa || "ALL"} onValueChange={(value) => setSelectedEmpresa(value === "ALL" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={String(empresa.id)}>
                      {empresa.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faturamento">Faturamento</SelectItem>
                  <SelectItem value="empresas">Empresas</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={loadReportData}>
                <FileText className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatCurrency(reportData?.faturamento_total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData?.crescimento_faturamento ? (
                <span className={reportData.crescimento_faturamento >= 0 ? 'text-success' : 'text-destructive'}>
                  {reportData.crescimento_faturamento >= 0 ? '+' : ''}{reportData.crescimento_faturamento}%
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )} vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas Emitidas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : reportData?.total_notas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData?.crescimento_notas ? (
                <span className={reportData.crescimento_notas >= 0 ? 'text-success' : 'text-destructive'}>
                  {reportData.crescimento_notas >= 0 ? '+' : ''}{reportData.crescimento_notas}%
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )} vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : reportData?.top_empresas?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Empresas com notas emitidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `${reportData?.taxa_sucesso || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Notas autorizadas sem erro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-muted-foreground">Carregando dados...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData?.evolucao_mensal || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Valor']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#2CDE1F" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status das Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Notas Fiscais</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-muted-foreground">Carregando dados...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData?.distribuicao_status || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(reportData?.distribuicao_status || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Empresas */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Empresas por Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Carregando dados...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportData?.top_empresas || []).map((empresa, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{empresa.nome}</TableCell>
                      <TableCell>{empresa.notas}</TableCell>
                      <TableCell>{formatCurrency(empresa.valor)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{empresa.percentual}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Municípios */}
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Município</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Carregando dados...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportData?.faturamento_municipio || []).map((municipio, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{municipio.cidade}</TableCell>
                      <TableCell>{municipio.notas}</TableCell>
                      <TableCell>{formatCurrency(municipio.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por Sócio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Estatísticas por Sócio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando dados...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sócio</TableHead>
                  <TableHead>Total de Notas</TableHead>
                  <TableHead>Valor Total Emitido</TableHead>
                  <TableHead>% Médio Participação</TableHead>
                  <TableHead>Empresas Envolvidas</TableHead>
                  <TableHead>Proporção Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reportData?.socios_estatisticas || []).map((socio, index) => (
                  <TableRow key={socio.id || index}>
                    <TableCell className="font-medium">{socio.nome}</TableCell>
                    <TableCell>{socio.total_notas}</TableCell>
                    <TableCell>{formatCurrency(socio.valor_total_emitido)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{socio.percentual_medio.toFixed(1)}%</Badge>
                    </TableCell>
                    <TableCell>{socio.empresas_envolvidas}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{socio.proporcao_percentual.toFixed(2)}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!reportData?.socios_estatisticas || reportData.socios_estatisticas.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum dado de sócio disponível para este período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alertas e Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Insights e Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando insights...</div>
            </div>
          ) : (
            <>
              {(reportData?.alertas || []).map((alerta, index) => (
                <div key={index} className={`p-4 ${alerta.tipo === 'warning' ? 'bg-orange-50 border border-orange-200' : alerta.tipo === 'success' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'} rounded-lg`}>
                  <div className="flex items-start gap-3">
                    {alerta.tipo === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                    ) : alerta.tipo === 'success' ? (
                      <Building2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium ${alerta.tipo === 'warning' ? 'text-orange-900' : alerta.tipo === 'success' ? 'text-green-900' : 'text-blue-900'}`}>
                        {alerta.titulo}
                      </h4>
                      <p className={`text-sm ${alerta.tipo === 'warning' ? 'text-orange-700' : alerta.tipo === 'success' ? 'text-green-700' : 'text-blue-700'}`}>
                        {alerta.descricao}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {(!reportData?.alertas || reportData.alertas.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum alerta ou insight disponível para este período.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}