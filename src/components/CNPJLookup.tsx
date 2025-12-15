import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Search, CheckCircle, XCircle, Loader2, Building2, MapPin } from 'lucide-react';

interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao: string;
  atividade_principal: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;
  data_situacao: string;
}

interface CNPJLookupProps {
  onDataFound?: (data: CNPJData) => void;
  currentCNPJ?: string;
}

export function CNPJLookup({ onDataFound, currentCNPJ = '' }: CNPJLookupProps) {
  const [cnpj, setCNPJ] = useState(currentCNPJ);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CNPJData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatCNPJ = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Apply CNPJ mask
    if (digits.length <= 14) {
      return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return digits;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCNPJ(formatted);
  };

  const mockCNPJLookup = async (cnpjNumber: string): Promise<CNPJData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock data based on common CNPJs for demonstration
    const mockData: Record<string, CNPJData> = {
      '12345678000190': {
        cnpj: '12.345.678/0001-90',
        razao_social: 'CLINICA MEDICA SANTOS LTDA',
        nome_fantasia: 'Clínica Santos',
        situacao: 'ATIVA',
        atividade_principal: 'Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para cuidados prolongados',
        logradouro: 'RUA DAS FLORES',
        numero: '123',
        bairro: 'CENTRO',
        municipio: 'SAO PAULO',
        uf: 'SP',
        cep: '01234-567',
        telefone: '(11) 1234-5678',
        email: 'contato@clinicasantos.com.br',
        data_situacao: '2020-01-15',
      },
      '98765432000110': {
        cnpj: '98.765.432/0001-10',
        razao_social: 'TECH SOLUTIONS DESENVOLVIMENTO DE SOFTWARE LTDA',
        nome_fantasia: 'TechSol',
        situacao: 'ATIVA',
        atividade_principal: 'Desenvolvimento de programas de computador sob encomenda',
        logradouro: 'AVENIDA TECNOLOGIA',
        numero: '456',
        bairro: 'VILA TECH',
        municipio: 'SAO PAULO',
        uf: 'SP',
        cep: '04567-890',
        telefone: '(11) 9876-5432',
        data_situacao: '2021-03-20',
      },
    };

    const cleanCNPJ = cnpjNumber.replace(/\D/g, '');
    const foundData = mockData[cleanCNPJ];
    
    if (!foundData) {
      throw new Error('CNPJ não encontrado na base da Receita Federal');
    }
    
    if (foundData.situacao !== 'ATIVA') {
      throw new Error('CNPJ encontrado, mas empresa não está ativa');
    }
    
    return foundData;
  };

  const handleSearch = async () => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      setError('CNPJ deve ter 14 dígitos');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await mockCNPJLookup(cleanCNPJ);
      setData(result);
      onDataFound?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar CNPJ');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="cnpj-lookup">CNPJ</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="cnpj-lookup"
              value={cnpj}
              onChange={handleCNPJChange}
              onKeyPress={handleKeyPress}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            <Button 
              type="button"
              onClick={handleSearch} 
              disabled={loading || cnpj.replace(/\D/g, '').length !== 14}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados da Receita Federal
              <Badge variant="default" className="bg-success">
                <CheckCircle className="w-3 h-3 mr-1" />
                {data.situacao}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Razão Social</Label>
                <p className="text-sm">{data.razao_social}</p>
              </div>
              
              {data.nome_fantasia && (
                <div>
                  <Label className="text-sm font-medium">Nome Fantasia</Label>
                  <p className="text-sm">{data.nome_fantasia}</p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">CNPJ</Label>
                <p className="text-sm font-mono">{data.cnpj}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Situação desde</Label>
                <p className="text-sm">{new Date(data.data_situacao).toLocaleDateString('pt-BR')}</p>
              </div>
              
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">Atividade Principal</Label>
                <p className="text-sm">{data.atividade_principal}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium flex items-center gap-1 mb-2">
                <MapPin className="w-3 h-3" />
                Endereço
              </Label>
              <p className="text-sm">
                {data.logradouro}, {data.numero} - {data.bairro}
                <br />
                {data.municipio}/{data.uf} - CEP: {data.cep}
              </p>
            </div>

            {(data.telefone || data.email) && (
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">Contato</Label>
                <div className="space-y-1">
                  {data.telefone && (
                    <p className="text-sm">Telefone: {data.telefone}</p>
                  )}
                  {data.email && (
                    <p className="text-sm">E-mail: {data.email}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}