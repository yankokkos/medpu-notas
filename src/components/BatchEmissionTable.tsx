import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
import { Plus, Trash2, X } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { empresasService, tomadoresService, pessoasService, modelosService, consultasService } from '../services/api';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

interface BatchRow {
  id: string;
  empresa_id: string;
  tomador_id: string;
  // Campos para tomador não cadastrado
  tomador_nome?: string;
  tomador_cpf_cnpj?: string;
  tomador_tipo?: 'PESSOA' | 'EMPRESA';
  tomador_email?: string;
  tomador_codigo_municipio?: string;
  tomador_cep?: string;
  tomador_logradouro?: string;
  tomador_numero?: string;
  tomador_complemento?: string;
  tomador_bairro?: string;
  tomador_cidade?: string;
  tomador_uf?: string;
  socios_ids: number[];
  valores: Record<number, number>;
  mes_competencia: string;
  modelo_id?: string;
  discriminacao?: string;
  codigo_servico_municipal?: string;
  cnae_code?: string; // CNAE do prestador para esta nota específica
}

interface BatchEmissionTableProps {
  rows: BatchRow[];
  onRowsChange: (rows: BatchRow[]) => void;
  validationErrors?: Record<string, string[]>;
}

export function BatchEmissionTable({ rows, onRowsChange, validationErrors = {} }: BatchEmissionTableProps) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [tomadores, setTomadores] = useState<any[]>([]);
  const [sociosPorEmpresa, setSociosPorEmpresa] = useState<Record<number, any[]>>({});
  const [modelos, setModelos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultandoCEP, setConsultandoCEP] = useState<Record<string, boolean>>({});

  // Carregar empresas
  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        const response = await empresasService.getAll({ status: 'ativa', pode_emitir: 'true' });
        if (response.success) {
          setEmpresas(response.data.empresas || []);
        }
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
      }
    };
    loadEmpresas();
  }, []);

  // Carregar tomadores
  useEffect(() => {
    const loadTomadores = async () => {
      try {
        const response = await tomadoresService.getAll({ status: 'ativo' });
        if (response.success) {
          setTomadores(response.data.tomadores || []);
        }
      } catch (error) {
        console.error('Erro ao carregar tomadores:', error);
      }
    };
    loadTomadores();
  }, []);

  // Carregar modelos
  useEffect(() => {
    const loadModelos = async () => {
      try {
        const response = await modelosService.listar({ limit: 1000 });
        if (response.success) {
          setModelos(response.data.modelos || []);
        }
      } catch (error) {
        console.error('Erro ao carregar modelos:', error);
      }
    };
    loadModelos();
  }, []);

  // Carregar sócios quando empresa muda
  const loadSocios = async (empresaId: number, rowId: string) => {
    if (!empresaId) {
      setSociosPorEmpresa(prev => {
        const newState = { ...prev };
        delete newState[empresaId];
        return newState;
      });
      return;
    }

    if (sociosPorEmpresa[empresaId]) {
      return; // Já carregado
    }

    try {
      setLoading(true);
      const response = await empresasService.obterSocios(empresaId);
      if (response.success) {
        setSociosPorEmpresa(prev => ({
          ...prev,
          [empresaId]: response.data.socios || []
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar sócios:', error);
      toast.error('Erro ao carregar sócios da empresa');
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow: BatchRow = {
      id: `row-${Date.now()}`,
      empresa_id: '',
      tomador_id: '',
      socios_ids: [],
      valores: {},
      mes_competencia: new Date().toISOString().slice(0, 7),
      codigo_servico_municipal: '',
    };
    onRowsChange([...rows, newRow]);
  };

  const removeRow = (rowId: string) => {
    onRowsChange(rows.filter(r => r.id !== rowId));
  };

  const updateRow = (rowId: string, updates: Partial<BatchRow>) => {
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, ...updates };
        
        // Se empresa mudou, limpar sócios e valores
        if (updates.empresa_id !== undefined && updates.empresa_id !== row.empresa_id) {
          updated.socios_ids = [];
          updated.valores = {};
          if (updates.empresa_id) {
            loadSocios(parseInt(updates.empresa_id), rowId);
          }
        }
        
        return updated;
      }
      return row;
    });
    onRowsChange(updatedRows);
  };

  const toggleSocio = (rowId: string, socioId: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const socios = row.socios_ids || [];
    const newSocios = socios.includes(socioId)
      ? socios.filter(id => id !== socioId)
      : [...socios, socioId];

    const valores = { ...row.valores };
    if (!socios.includes(socioId)) {
      valores[socioId] = 0;
    } else {
      delete valores[socioId];
    }

    updateRow(rowId, { socios_ids: newSocios, valores });
  };

  const updateValor = (rowId: string, socioId: number, valor: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    updateRow(rowId, {
      valores: { ...row.valores, [socioId]: valor }
    });
  };

  const getSociosDisponiveis = (empresaId: string) => {
    if (!empresaId) return [];
    const id = parseInt(empresaId);
    return sociosPorEmpresa[id] || [];
  };

  const getTotalRow = (row: BatchRow) => {
    return Object.values(row.valores || {}).reduce((sum, val) => sum + (parseFloat(String(val)) || 0), 0);
  };

  // Função para buscar CEP
  const handleConsultarCEP = async (rowId: string, cep: string) => {
    const cepLimpo = cep.replace(/[^\d]/g, '');
    
    if (cepLimpo.length !== 8) {
      toast.error('CEP inválido', {
        description: 'O CEP deve ter 8 dígitos'
      });
      return;
    }

    try {
      setConsultandoCEP(prev => ({ ...prev, [rowId]: true }));
      const response = await consultasService.consultarEnderecoPorCEP(cepLimpo);
      
      if (response.success && response.data) {
        const dados = response.data;
        const codigoMunicipio = dados.codigo_municipio || dados.codigoIbge || dados.ibge || '';
        updateRow(rowId, {
          tomador_logradouro: dados.logradouro || '',
          tomador_bairro: dados.bairro || '',
          tomador_cidade: dados.cidade || '',
          tomador_uf: dados.uf || '',
          tomador_cep: dados.cep || cepLimpo,
          tomador_codigo_municipio: (typeof codigoMunicipio === 'string' ? codigoMunicipio : String(codigoMunicipio || '')).trim()
        });

        toast.success('Endereço encontrado!', {
          description: 'Os dados do endereço foram preenchidos automaticamente'
        });
      } else {
        toast.error('Erro ao consultar CEP', {
          description: response.message || 'CEP não encontrado ou erro na consulta'
        });
      }
    } catch (error: any) {
      console.error('Erro ao consultar CEP:', error);
      toast.error('Erro ao consultar CEP', {
        description: error.response?.data?.message || 'Verifique sua conexão e tente novamente'
      });
    } finally {
      setConsultandoCEP(prev => ({ ...prev, [rowId]: false }));
    }
  };

  // Detectar se é CPF ou CNPJ
  const detectarTipoDocumento = (doc: string): 'PESSOA' | 'EMPRESA' => {
    const docLimpo = doc.replace(/[^\d]/g, '');
    return docLimpo.length === 11 ? 'PESSOA' : 'EMPRESA';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Linhas de Notas</Label>
        <Button onClick={addRow} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Linha
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Empresa</TableHead>
              <TableHead className="w-[200px]">Tomador (Cadastrado)</TableHead>
              <TableHead className="w-[300px]">Tomador (Não Cadastrado)</TableHead>
              <TableHead className="w-[300px]">Sócios e Valores</TableHead>
              <TableHead className="w-[120px]">Mês Competência</TableHead>
              <TableHead className="w-[150px]">Cód. Serviço Municipal *</TableHead>
              <TableHead className="w-[120px]">CNAE *</TableHead>
              <TableHead className="w-[200px]">Modelo (Opcional)</TableHead>
              <TableHead className="w-[250px]">Discriminação</TableHead>
              <TableHead className="w-[100px]">Total</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  Nenhuma linha adicionada. Clique em "Adicionar Linha" para começar.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const sociosDisponiveis = getSociosDisponiveis(row.empresa_id);
                const total = getTotalRow(row);
                const errors = validationErrors[row.id] || [];

                return (
                  <TableRow key={row.id} className={errors.length > 0 ? 'bg-red-50' : ''}>
                    <TableCell>
                      <div className="space-y-1">
                        <Select
                          value={row.empresa_id && empresas.find(e => String(e.id) === row.empresa_id) ? row.empresa_id : 'custom'}
                          onValueChange={(value) => {
                            if (value === 'custom') {
                              // Permitir edição manual do CNPJ
                              updateRow(row.id, { empresa_id: '' });
                            } else {
                              updateRow(row.id, { empresa_id: value });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione ou digite CNPJ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Digitar CNPJ manualmente</SelectItem>
                            {empresas.map((emp) => (
                              <SelectItem key={emp.id} value={String(emp.id)}>
                                {emp.razao_social} - {emp.cnpj}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(!row.empresa_id || !empresas.find(e => String(e.id) === row.empresa_id)) && (
                          <Input
                            type="text"
                            value={row.empresa_id || ''}
                            onChange={(e) => updateRow(row.id, { empresa_id: e.target.value })}
                            placeholder="CNPJ da empresa (apenas números)"
                            className="w-full h-7 text-xs mt-1"
                          />
                        )}
                      </div>
                      {errors.some(e => e.includes('empresa')) && (
                        <p className="text-xs text-red-500 mt-1">{errors.find(e => e.includes('empresa'))}</p>
                      )}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={row.tomador_id || 'none'}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            updateRow(row.id, { tomador_id: '', tomador_nome: '', tomador_cpf_cnpj: '', tomador_tipo: undefined, tomador_email: '', tomador_codigo_municipio: '' });
                          } else {
                            updateRow(row.id, { tomador_id: value, tomador_nome: '', tomador_cpf_cnpj: '', tomador_tipo: undefined, tomador_email: '', tomador_codigo_municipio: '' });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione ou preencha abaixo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Usar dados abaixo</SelectItem>
                          {tomadores.map((tom) => (
                            <SelectItem key={tom.id} value={String(tom.id)}>
                              {tom.nome_razao_social_unificado || tom.nome_razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.some(e => e.includes('tomador')) && (
                        <p className="text-xs text-red-500 mt-1">{errors.find(e => e.includes('tomador'))}</p>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Nome/Razão Social *</Label>
                          <Input
                            type="text"
                            value={row.tomador_nome || ''}
                            onChange={(e) => updateRow(row.id, { tomador_nome: e.target.value })}
                            placeholder="Nome ou Razão Social"
                            className="w-full h-7 text-xs"
                            disabled={!!row.tomador_id}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div>
                            <Label className="text-xs">CPF/CNPJ *</Label>
                            <Input
                              type="text"
                              value={row.tomador_cpf_cnpj || ''}
                              onChange={(e) => {
                                const doc = e.target.value;
                                const tipo = detectarTipoDocumento(doc);
                                updateRow(row.id, { 
                                  tomador_cpf_cnpj: doc,
                                  tomador_tipo: tipo
                                });
                              }}
                              placeholder="000.000.000-00 ou 00.000.000/0000-00"
                              className="w-full h-7 text-xs"
                              disabled={!!row.tomador_id}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">E-mail</Label>
                          <Input
                            type="email"
                            value={row.tomador_email || ''}
                            onChange={(e) => updateRow(row.id, { tomador_email: e.target.value })}
                            placeholder="email@exemplo.com"
                            className="w-full h-7 text-xs"
                            disabled={!!row.tomador_id}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">CEP</Label>
                            <div className="flex gap-1">
                              <Input
                                type="text"
                                value={row.tomador_cep || ''}
                                onChange={(e) => updateRow(row.id, { tomador_cep: e.target.value })}
                                onBlur={(e) => {
                                  const cep = e.target.value;
                                  if (cep && cep.replace(/[^\d]/g, '').length === 8) {
                                    handleConsultarCEP(row.id, cep);
                                  }
                                }}
                                placeholder="00000-000"
                                className="w-full h-7 text-xs"
                                disabled={!!row.tomador_id}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => row.tomador_cep && handleConsultarCEP(row.id, row.tomador_cep)}
                                disabled={!!row.tomador_id || !row.tomador_cep || consultandoCEP[row.id]}
                              >
                                <Search className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">UF</Label>
                            <Input
                              type="text"
                              value={row.tomador_uf || ''}
                              onChange={(e) => updateRow(row.id, { tomador_uf: e.target.value.toUpperCase().slice(0, 2) })}
                              placeholder="UF"
                              className="w-full h-7 text-xs"
                              maxLength={2}
                              disabled={!!row.tomador_id}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Logradouro</Label>
                          <Input
                            type="text"
                            value={row.tomador_logradouro || ''}
                            onChange={(e) => updateRow(row.id, { tomador_logradouro: e.target.value })}
                            placeholder="Rua, Avenida, etc"
                            className="w-full h-7 text-xs"
                            disabled={!!row.tomador_id}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Número</Label>
                            <Input
                              type="text"
                              value={row.tomador_numero || ''}
                              onChange={(e) => updateRow(row.id, { tomador_numero: e.target.value })}
                              placeholder="Número"
                              className="w-full h-7 text-xs"
                              disabled={!!row.tomador_id}
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Complemento</Label>
                            <Input
                              type="text"
                              value={row.tomador_complemento || ''}
                              onChange={(e) => updateRow(row.id, { tomador_complemento: e.target.value })}
                              placeholder="Apto, Sala, etc"
                              className="w-full h-7 text-xs"
                              disabled={!!row.tomador_id}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Bairro</Label>
                          <Input
                            type="text"
                            value={row.tomador_bairro || ''}
                            onChange={(e) => updateRow(row.id, { tomador_bairro: e.target.value })}
                            placeholder="Bairro"
                            className="w-full h-7 text-xs"
                            disabled={!!row.tomador_id}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cidade</Label>
                          <Input
                            type="text"
                            value={row.tomador_cidade || ''}
                            onChange={(e) => updateRow(row.id, { tomador_cidade: e.target.value })}
                            placeholder="Cidade"
                            className="w-full h-7 text-xs"
                            disabled={!!row.tomador_id}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Código IBGE (município)</Label>
                          <Input
                            type="text"
                            value={row.tomador_codigo_municipio || ''}
                            onChange={(e) => updateRow(row.id, { tomador_codigo_municipio: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                            placeholder="Ex: 2800308 (preenchido ao buscar CEP)"
                            className="w-full h-7 text-xs"
                            disabled={!!row.tomador_id}
                          />
                        </div>
                      </div>
                      {errors.some(e => e.includes('tomador') && !e.includes('cadastrado')) && (
                        <p className="text-xs text-red-500 mt-1">{errors.find(e => e.includes('tomador') && !e.includes('cadastrado'))}</p>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-2">
                        {sociosDisponiveis.length === 0 && row.empresa_id ? (
                          <p className="text-xs text-muted-foreground">Carregando sócios...</p>
                        ) : sociosDisponiveis.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Selecione uma empresa</p>
                        ) : (
                          sociosDisponiveis.map((socio) => {
                            const isSelected = row.socios_ids?.includes(socio.id || socio.pessoa_id);
                            const socioId = socio.id || socio.pessoa_id;
                            return (
                              <div key={socioId} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSocio(row.id, socioId)}
                                  className="w-4 h-4"
                                />
                                <Label className="text-xs flex-1">{socio.nome_completo}</Label>
                                {isSelected && (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={row.valores?.[socioId] || 0}
                                    onChange={(e) => updateValor(row.id, socioId, parseFloat(e.target.value) || 0)}
                                    className="w-24 h-7 text-xs"
                                    placeholder="0.00"
                                  />
                                )}
                              </div>
                            );
                          })
                        )}
                        {errors.some(e => e.includes('sócio') || e.includes('valor')) && (
                          <p className="text-xs text-red-500">{errors.find(e => e.includes('sócio') || e.includes('valor'))}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Input
                        type="month"
                        value={row.mes_competencia}
                        onChange={(e) => updateRow(row.id, { mes_competencia: e.target.value })}
                        className="w-full"
                      />
                      {errors.some(e => e.includes('competência')) && (
                        <p className="text-xs text-red-500 mt-1">{errors.find(e => e.includes('competência'))}</p>
                      )}
                    </TableCell>

                    <TableCell>
                      <Input
                        type="text"
                        value={row.codigo_servico_municipal || ''}
                        onChange={(e) => updateRow(row.id, { codigo_servico_municipal: e.target.value })}
                        placeholder="Ex: 12345"
                        className="w-full"
                      />
                      {errors.some(e => e.includes('serviço') || e.includes('cityServiceCode')) && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.find(e => e.includes('serviço') || e.includes('cityServiceCode'))}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Obrigatório para emissão
                      </p>
                    </TableCell>

                    <TableCell>
                      <Input
                        type="text"
                        value={row.cnae_code || ''}
                        onChange={(e) => updateRow(row.id, { cnae_code: e.target.value })}
                        placeholder="Ex: 6201-5/00"
                        className="w-full"
                      />
                      {errors.some(e => e.includes('CNAE') || e.includes('cnae')) && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.find(e => e.includes('CNAE') || e.includes('cnae'))}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        CNAE do prestador para esta nota
                      </p>
                    </TableCell>

                    <TableCell>
                      <Select
                        value={row.modelo_id || 'none'}
                        onValueChange={(value) => updateRow(row.id, { modelo_id: value === 'none' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {modelos.map((mod) => (
                            <SelectItem key={mod.id} value={String(mod.id)}>
                              {mod.titulo_modelo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Textarea
                        value={row.discriminacao || ''}
                        onChange={(e) => updateRow(row.id, { discriminacao: e.target.value })}
                        placeholder="Digite a discriminação do serviço..."
                        className="w-full min-h-[60px] text-xs"
                        rows={3}
                      />
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold">
                        R$ {total.toFixed(2).replace('.', ',')}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

