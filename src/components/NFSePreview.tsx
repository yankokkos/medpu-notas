import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Building2, User, FileText, DollarSign } from 'lucide-react';

interface NFSePreviewProps {
  empresa: any;
  tomador: any;
  socios: any[];
  modelo: any;
  discriminacao: string;
  valores: Record<number, number>;
  mesCompetencia: string;
  calculoImpostos?: any;
  calculandoImpostos?: boolean;
}

export function NFSePreview({
  empresa,
  tomador,
  socios = [],
  modelo,
  discriminacao = '',
  valores = {},
  mesCompetencia = '',
  calculoImpostos = null,
  calculandoImpostos = false
}: NFSePreviewProps) {
  // Validar se há dados mínimos
  if (!empresa || !tomador) {
    return (
      <div className="space-y-4">
        <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Dados incompletos para visualização. Por favor, complete todos os passos anteriores.
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-2">
            Empresa: {empresa ? '✓' : '✗'} | Tomador: {tomador ? '✓' : '✗'}
          </p>
        </div>
      </div>
    );
  }

  // Calcular valor total
  const valorTotal = Object.values(valores || {}).reduce((sum: number, valor: number) => sum + (valor || 0), 0);
  
  // Usar cálculo de impostos da API se disponível, senão usar valores padrão
  const aliquotaISS = calculoImpostos?.aliquota_iss || 5.0;
  const valorISS = calculoImpostos?.valor_iss || (valorTotal * (aliquotaISS / 100));
  const valorLiquido = calculoImpostos?.valor_liquido || (valorTotal - valorISS);
  const baseCalculo = calculoImpostos?.base_calculo || valorTotal;

  // Formatar data
  const formatarData = (data: string) => {
    if (!data) return '';
    const [ano, mes] = data.split('-');
    return `${mes}/${ano}`;
  };

  // Formatar valor monetário
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pré-visualização da Nota Fiscal</h3>
        <Badge variant="outline">RASCUNHO</Badge>
      </div>

      <Card className="border-2">
        <CardContent className="p-6 space-y-6">
          {/* Cabeçalho */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-blue-600">NFS-e</h2>
                <p className="text-sm text-muted-foreground">Nota Fiscal de Serviços Eletrônica</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Mês de Competência</p>
                <p className="font-semibold">{formatarData(mesCompetencia)}</p>
              </div>
            </div>
          </div>

          {/* Prestador de Serviços */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">PRESTADOR DE SERVIÇOS</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">CPF/CNPJ:</p>
                <p className="font-medium">{empresa?.cnpj || '---'}</p>
              </div>
              {empresa?.inscricao_municipal && (
                <div>
                  <p className="text-muted-foreground">Inscrição Municipal:</p>
                  <p className="font-medium">{empresa.inscricao_municipal}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-muted-foreground">Nome/Razão Social:</p>
                <p className="font-medium">{empresa?.razao_social || '---'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Endereço:</p>
                <p className="font-medium">
                  {empresa?.endereco || '---'}
                  {empresa?.cidade && ` - ${empresa.cidade}`}
                  {empresa?.uf && `/${empresa.uf}`}
                  {empresa?.cep && ` - CEP: ${empresa.cep}`}
                </p>
              </div>
              {empresa?.email && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">E-mail:</p>
                  <p className="font-medium">{empresa.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tomador de Serviços */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">TOMADOR DE SERVIÇOS</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome/Razão Social:</p>
                <p className="font-medium">{tomador?.nome_razao_social_unificado || '---'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CPF/CNPJ:</p>
                <p className="font-medium">{tomador?.cpf_cnpj_unificado || '---'}</p>
              </div>
              {tomador?.inscricao_municipal && (
                <div>
                  <p className="text-muted-foreground">Inscrição Municipal:</p>
                  <p className="font-medium">{tomador.inscricao_municipal}</p>
                </div>
              )}
              {tomador?.endereco_completo_unificado && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Endereço:</p>
                  <p className="font-medium">{tomador.endereco_completo_unificado}</p>
                </div>
              )}
              {tomador?.email_unificado && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">E-mail:</p>
                  <p className="font-medium">{tomador.email_unificado}</p>
                </div>
              )}
            </div>
          </div>

          {/* Discriminação dos Serviços */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">DISCRIMINAÇÃO DOS SERVIÇOS</h3>
            </div>
            <div className="bg-muted/50 p-4 rounded-md min-h-[100px]">
              <p className="text-sm whitespace-pre-wrap">{discriminacao || modelo?.texto_modelo || '---'}</p>
            </div>
            {modelo && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Modelo: {modelo.titulo_modelo}
                </Badge>
              </div>
            )}
          </div>

          {/* Sócios/Prestadores */}
          {socios && socios.length > 0 && (
            <div className="border-b pb-4">
              <h3 className="font-semibold text-lg mb-3">PRESTADORES (SÓCIOS)</h3>
              <div className="space-y-2">
                {socios.map((socio: any) => {
                  const valorSocio = valores?.[socio.id] || 0;
                  const percentual = valorTotal > 0 ? (valorSocio / valorTotal) * 100 : 0;
                  return (
                    <div key={socio.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <div>
                        <p className="font-medium text-sm">{socio.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">CPF: {socio.cpf}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatarMoeda(valorSocio)}</p>
                        <p className="text-xs text-muted-foreground">{percentual.toFixed(2)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Valores e Impostos */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">VALOR TOTAL DA NOTA</h3>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md">
              <p className="text-2xl font-bold text-blue-600">
                {formatarMoeda(valorTotal)}
              </p>
            </div>
          </div>

          {/* Detalhes Fiscais */}
          <div>
            <h3 className="font-semibold text-lg mb-3">DETALHES FISCAIS</h3>
            {calculandoImpostos ? (
              <div className="flex items-center justify-center py-4">
                <p className="text-sm text-muted-foreground">Calculando impostos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base de Cálculo:</p>
                  <p className="font-medium">{formatarMoeda(baseCalculo)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Alíquota ISS:</p>
                  <p className="font-medium">
                    {aliquotaISS > 0 ? `${aliquotaISS.toFixed(2)}%` : 'A calcular'}
                    {calculoImpostos && !calculoImpostos.estimado && (
                      <span className="ml-2 text-xs text-green-600">✓ Calculado</span>
                    )}
                    {calculoImpostos?.estimado && (
                      <span className="ml-2 text-xs text-yellow-600">⚠ Estimado</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor do ISS:</p>
                  <p className="font-medium">{formatarMoeda(valorISS)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Líquido:</p>
                  <p className="font-medium">{formatarMoeda(valorLiquido)}</p>
                </div>
              </div>
            )}
            {calculoImpostos?.message && (
              <div className="mt-2 text-xs text-muted-foreground">
                {calculoImpostos.message}
              </div>
            )}
          </div>

          {/* Informações Adicionais */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">OUTRAS INFORMAÇÕES</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Esta NFS-e será emitida através da plataforma NFe.io</li>
              <li>O valor do ISS será calculado automaticamente conforme a legislação municipal</li>
              <li>Após a emissão, a nota estará disponível para download em XML e PDF</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

