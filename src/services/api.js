import axios from 'axios';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Criar instância do axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se o token expirou ou é inválido, redirecionar para login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    
    // Tratar erros de rede
    if (!error.response) {
      console.error('Erro de rede:', error.message);
      throw new Error('Erro de conexão. Verifique sua internet.');
    }
    
    // Tratar erros de validação
    if (error.response?.status === 400) {
      const message = error.response.data?.message || 'Dados inválidos';
      throw new Error(message);
    }
    
    // Tratar outros erros
    const message = error.response.data?.message || 'Erro interno do servidor';
    throw new Error(message);
  }
);

// Serviços de autenticação
export const authService = {
  async login(email, senha) {
    const response = await api.post('/auth/login', { email, senha });
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async refreshToken() {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

// Serviços de contas
export const contasService = {
  async listar(params = {}) {
    const response = await api.get('/contas', { params });
    return response.data;
  },

  async obter(id) {
    const response = await api.get(`/contas/${id}`);
    return response.data;
  },

  async criar(dados) {
    const response = await api.post('/contas', dados);
    return response.data;
  },

  async atualizar(id, dados) {
    const response = await api.patch(`/contas/${id}`, dados);
    return response.data;
  },

  async deletar(id) {
    const response = await api.delete(`/contas/${id}`);
    return response.data;
  },

  async gerenciarEmpresas(id, empresas, acao = 'atualizar') {
    const response = await api.post(`/contas/${id}/empresas`, { empresas, acao });
    return response.data;
  },

  async gerenciarPessoas(id, pessoas, acao = 'atualizar') {
    const response = await api.post(`/contas/${id}/pessoas`, { pessoas, acao });
    return response.data;
  }
};

// Serviços de empresas
export const empresasService = {
  async listar(params = {}) {
    const response = await api.get('/empresas', { params });
    return response.data;
  },

  async getAll(params = {}) {
    const response = await api.get('/empresas', { params });
    return response.data;
  },

  async obter(id) {
    const response = await api.get(`/empresas/${id}`);
    return response.data;
  },

  async criar(dados) {
    const response = await api.post('/empresas', dados);
    return response.data;
  },

  async atualizar(id, dados) {
    const response = await api.patch(`/empresas/${id}`, dados);
    return response.data;
  },

  async deletar(id) {
    const response = await api.delete(`/empresas/${id}`);
    return response.data;
  },

  async gerenciarPessoas(id, pessoas, acao = 'atualizar') {
    const response = await api.post(`/empresas/${id}/pessoas`, {
      pessoas,
      acao
    });
    return response.data;
  },

  async obterSocios(empresaId) {
    const response = await api.get(`/empresas/${empresaId}/socios`);
    return response.data;
  },

  async sincronizarComNFeio() {
    const response = await api.post('/empresas/sincronizar-nfeio');
    return response.data;
  },

  async importarEmpresaNFeio(nfeio_empresa_id) {
    const response = await api.post('/empresas/importar-nfeio', { nfeio_empresa_id });
    return response.data;
  },

  async listarEmpresasNFeio() {
    const response = await api.get('/empresas/nfeio');
    return response.data;
  },

  async sincronizarEmpresaNFeio(id) {
    const response = await api.post(`/empresas/${id}/sincronizar-nfeio`);
    return response.data;
  },

  async buscarCodigosFrequentes(empresaId) {
    const response = await api.get(`/empresas/${empresaId}/codigos-frequentes`);
    return response.data;
  },

  async uploadCertificadoDigital(empresaId, file, senha, validade) {
    const formData = new FormData();
    formData.append('certificado', file);
    if (senha) {
      formData.append('senha', senha);
    }
    if (validade) {
      formData.append('validade', validade);
    }
    const response = await api.post(`/empresas/${empresaId}/certificado-digital`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Serviços de pessoas
export const pessoasService = {
  async listar(params = {}) {
    const response = await api.get('/pessoas', { params });
    return response.data;
  },

  async getAll(params = {}) {
    const response = await api.get('/pessoas', { params });
    return response.data;
  },

  async obter(id) {
    const response = await api.get(`/pessoas/${id}`);
    return response.data;
  },

  async criar(dados) {
    const response = await api.post('/pessoas', dados);
    return response.data;
  },

  async atualizar(id, dados) {
    const response = await api.patch(`/pessoas/${id}`, dados);
    return response.data;
  },

  async deletar(id) {
    const response = await api.delete(`/pessoas/${id}`);
    return response.data;
  },

  async vincularEmpresa(pessoaId, dados) {
    const response = await api.post(`/pessoas/${pessoaId}/vincular-empresa`, dados);
    return response.data;
  }
};

// Serviços de tomadores
export const tomadoresService = {
  async listar(params = {}) {
    const response = await api.get('/tomadores', { params });
    return response.data;
  },

  async getAll(params = {}) {
    const response = await api.get('/tomadores', { params });
    return response.data;
  },

  async obter(id) {
    const response = await api.get(`/tomadores/${id}`);
    return response.data;
  },

  async criar(dados) {
    const response = await api.post('/tomadores', dados);
    return response.data;
  },

  async atualizar(id, dados) {
    const response = await api.patch(`/tomadores/${id}`, dados);
    return response.data;
  },

  async deletar(id) {
    const response = await api.delete(`/tomadores/${id}`);
    return response.data;
  },

  async obterSocios(tomadorId) {
    const response = await api.get(`/tomadores/${tomadorId}/socios`);
    return response.data;
  },

  async vincularSocio(tomadorId, socioId) {
    const response = await api.post(`/tomadores/${tomadorId}/socios`, { socio_id: socioId });
    return response.data;
  },

  async removerSocio(tomadorId, socioId) {
    const response = await api.delete(`/tomadores/${tomadorId}/socios/${socioId}`);
    return response.data;
  },

  async obterPorSocios(socioIds) {
    const response = await api.get('/tomadores/por-socios', { 
      params: { socio_ids: socioIds.join(',') } 
    });
    return response.data;
  },

  async obterModelos(tomadorId) {
    const response = await api.get(`/tomadores/${tomadorId}/modelos`);
    return response.data;
  },

  async gerenciarModelos(tomadorId, modelos, acao) {
    const response = await api.post(`/tomadores/${tomadorId}/modelos`, {
      modelos,
      acao
    });
    return response.data;
  }
};

// Serviços de modelos de discriminação
export const modelosService = {
  async listar(params = {}) {
    const response = await api.get('/modelos-discriminacao', { params });
    return response.data;
  },

  async getAll(params = {}) {
    const response = await api.get('/modelos-discriminacao', { params });
    return response.data;
  },

  async obter(id) {
    const response = await api.get(`/modelos-discriminacao/${id}`);
    return response.data;
  },

  async criar(dados) {
    const response = await api.post('/modelos-discriminacao', dados);
    return response.data;
  },

  async atualizar(id, dados) {
    const response = await api.patch(`/modelos-discriminacao/${id}`, dados);
    return response.data;
  },

  async deletar(id) {
    const response = await api.delete(`/modelos-discriminacao/${id}`);
    return response.data;
  },

  async obterPorTomador(tomadorId) {
    const response = await api.get(`/modelos-discriminacao/por-tomador/${tomadorId}`);
    return response.data;
  }
};

// Serviços de notas fiscais
export const notasService = {
  async listar(params = {}) {
    const response = await api.get('/notas-fiscais', { params });
    return response.data;
  },

  async obter(id) {
    const response = await api.get(`/notas-fiscais/${id}`);
    return response.data;
  },

  async criar(dados) {
    const response = await api.post('/notas-fiscais', dados);
    return response.data;
  },

  async criarRascunho(dados) {
    // Alias para manter compatibilidade
    return this.criar(dados);
  },

  async atualizarRascunho(id, dados) {
    const response = await api.patch(`/notas-fiscais/${id}`, dados);
    return response.data;
  },

  async emitir(id) {
    const response = await api.post(`/notas-fiscais/${id}/emitir`);
    return response.data;
  },

  async cancelar(id, motivo) {
    const response = await api.post(`/notas-fiscais/${id}/cancelar`, { motivo });
    return response.data;
  },

  async deletarRascunho(id) {
    const response = await api.delete(`/notas-fiscais/${id}`);
    return response.data;
  },

  async baixarXML(id) {
    const response = await api.get(`/notas-fiscais/${id}/xml`, {
      responseType: 'blob'
    });
    // Criar link temporário para download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nota-${id}.xml`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  async baixarPDF(id) {
    const response = await api.get(`/notas-fiscais/${id}/pdf`, {
      responseType: 'blob'
    });
    // Criar link temporário para download
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nota-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  async baixarModeloXLSX() {
    const response = await api.get('/notas-fiscais/modelo-xlsx', {
      responseType: 'blob'
    });
    // Criar link temporário para download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo-emissao-lote.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  async validarLote(dados) {
    const response = await api.post('/notas-fiscais/validar-lote', { dados });
    return response.data;
  },

  async criarRascunhosLote(dados) {
    const response = await api.post('/notas-fiscais/criar-lote', { dados });
    return response.data;
  },

  async emitirLote(ids) {
    const response = await api.post('/notas-fiscais/emitir-lote', { ids });
    return response.data;
  },

  async sincronizar(id) {
    const response = await api.post(`/notas-fiscais/${id}/sincronizar`);
    return response.data;
  },

  async sincronizarLote(ids) {
    const response = await api.post('/notas-fiscais/sincronizar-lote', { ids });
    return response.data;
  },

  async baixarXMLsLote(ids, agrupamento = 'nenhum') {
    const response = await api.post('/notas-fiscais/baixar-xmls-lote', { ids, agrupamento }, {
      responseType: 'blob'
    });
    // Criar link temporário para download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `notas-xml-${Date.now()}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  async baixarPDFsLote(ids, agrupamento = 'nenhum') {
    const response = await api.post('/notas-fiscais/baixar-pdfs-lote', { ids, agrupamento }, {
      responseType: 'blob'
    });
    // Criar link temporário para download
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `notas-pdf-${Date.now()}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  async calcularImpostos(dados) {
    const response = await api.post('/notas-fiscais/calcular-impostos', dados);
    return response.data;
  }
};

// Serviços de funcionários
export const funcionariosService = {
  async listar(params = {}) {
    const response = await api.get('/funcionarios', { params });
    return response.data;
  },

  async getAll(params = {}) {
    const response = await api.get('/funcionarios', { params });
    return response.data;
  },

  async obter(id) {
    const response = await api.get(`/funcionarios/${id}`);
    return response.data;
  },

  async criar(dados) {
    const response = await api.post('/funcionarios', dados);
    return response.data;
  },

  async atualizar(id, dados) {
    const response = await api.patch(`/funcionarios/${id}`, dados);
    return response.data;
  },

  async deletar(id) {
    const response = await api.delete(`/funcionarios/${id}`);
    return response.data;
  },

  async listarFuncoes() {
    const response = await api.get('/funcionarios/funcoes');
    return response.data;
  }
};

// Utilitários
export const utils = {
  // Formatar CNPJ
  formatCNPJ(cnpj) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  },

  // Formatar CPF
  formatCPF(cpf) {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  },

  // Limpar CNPJ/CPF
  cleanDocument(doc) {
    return doc.replace(/[^\d]/g, '');
  },

  // Validar CNPJ básico
  isValidCNPJ(cnpj) {
    const cleaned = this.cleanDocument(cnpj);
    return cleaned.length === 14 && !/^(\d)\1+$/.test(cleaned);
  },

  // Validar CPF básico
  isValidCPF(cpf) {
    const cleaned = this.cleanDocument(cpf);
    return cleaned.length === 11 && !/^(\d)\1+$/.test(cleaned);
  },

  // Formatar moeda
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  // Formatar data
  formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
  },

  // Formatar data e hora
  formatDateTime(date) {
    return new Date(date).toLocaleString('pt-BR');
  }
};

export const relatoriosService = {
  async getFaturamento(params) {
    const response = await api.get('/relatorios/faturamento', { params });
    return response.data;
  },
  async getClientes(params) {
    const response = await api.get('/relatorios/clientes', { params });
    return response.data;
  },
  async getOperacional(params) {
    const response = await api.get('/relatorios/operacional', { params });
    return response.data;
  },
};

export const buscaService = {
  buscarUnificado: async (params) => api.get('/busca/unificada', { params }),
};

// Serviços de consultas NFe.io
export const consultasService = {
  /**
   * Consulta situação cadastral do CPF
   * @param {string} cpf - CPF (com ou sem formatação)
   * @param {string} dataNascimento - Data de nascimento no formato YYYY-MM-DD
   * @returns {Promise<Object>} Dados do CPF
   */
  async consultarCPF(cpf, dataNascimento) {
    const cpfLimpo = cpf.replace(/[^\d]/g, '');
    const response = await api.get(`/consultas/cpf/${cpfLimpo}/${dataNascimento}`);
    return response.data;
  },

  /**
   * Consulta dados básicos do CNPJ
   * @param {string} cnpj - CNPJ (com ou sem formatação)
   * @returns {Promise<Object>} Dados básicos do CNPJ
   */
  async consultarCNPJ(cnpj) {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    const response = await api.get(`/consultas/cnpj/${cnpjLimpo}`);
    return response.data;
  },

  /**
   * Consulta inscrição estadual por CNPJ e UF
   * @param {string} cnpj - CNPJ (com ou sem formatação)
   * @param {string} uf - UF (2 letras)
   * @returns {Promise<Object>} Inscrições estaduais
   */
  async consultarInscricaoEstadual(cnpj, uf) {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    const ufUpper = uf.toUpperCase().substring(0, 2);
    const response = await api.get(`/consultas/cnpj/${cnpjLimpo}/inscricao-estadual/${ufUpper}`);
    return response.data;
  },

  /**
   * Consulta melhor inscrição estadual para emissão
   * @param {string} cnpj - CNPJ (com ou sem formatação)
   * @param {string} uf - UF (2 letras)
   * @returns {Promise<Object>} Melhor inscrição estadual para emissão
   */
  async consultarInscricaoEstadualEmissao(cnpj, uf) {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    const ufUpper = uf.toUpperCase().substring(0, 2);
    const response = await api.get(`/consultas/cnpj/${cnpjLimpo}/inscricao-estadual-emissao/${ufUpper}`);
    return response.data;
  },

  /**
   * Consulta endereço por CEP
   * @param {string} cep - CEP (com ou sem formatação)
   * @returns {Promise<Object>} Dados do endereço
   */
  async consultarEnderecoPorCEP(cep) {
    const cepLimpo = cep.replace(/[^\d]/g, '');
    const response = await api.get(`/consultas/endereco/cep/${cepLimpo}`);
    return response.data;
  },

  /**
   * Busca endereços por termo
   * @param {string} termo - Termo de busca
   * @returns {Promise<Object>} Lista de endereços
   */
  async consultarEnderecoPorTermo(termo) {
    const response = await api.get(`/consultas/endereco/termo/${encodeURIComponent(termo)}`);
    return response.data;
  }
};

export default api;
