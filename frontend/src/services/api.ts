const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('authToken');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers as Record<string, string>,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const activeRole = localStorage.getItem('activeRole');
    if (activeRole) {
      headers['X-Active-Role'] = activeRole;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  async register(data: { nome: string; email: string; telemovel: string; password: string }) {
    return this.request<{ success: boolean; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    const result = await this.request<{ success: boolean; token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async logout() {
    this.setToken(null);
  }

  async getModalidades() {
    return this.request<{ success: boolean; data: { idmodalidade: number; nome: string }[] }>('/api/users/modalidades');
  }

  async getModalidadesPublicas() {
    return this.request<{ success: boolean; data: { idmodalidade: number; nome: string }[] }>('/api/public/modalidades');
  }

  async marcarAula(pedidoId: number, alunoId: number) {
    return this.request<{ success: boolean; data: any }>(`/api/encarregado/coaching/${pedidoId}/participar`, {
      method: 'POST',
      body: JSON.stringify({ alunoId }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ success: boolean; token: string; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Coaching
  async consultarAula() {
    return this.request<{ success: boolean; data: any[] }>('/api/coaching/all');
  }

  async getMyAulas() {
    return this.request<{ success: boolean; data: any[] }>('/api/coaching/my');
  }

  async getOpenAulas() {
    return this.request<{ success: boolean; data: any[] }>('/api/coaching/open');
  }

  async getAlunoAulas() {
    return this.request<{ success: boolean; data: any[] }>('/api/aluno/coaching');
  }

  async getAlunoDisponibilidades() {
    return this.request<{ success: boolean; data: any[] }>('/api/aluno/disponibilidades');
  }

  async getEncarregadoAulas() {
    return this.request<{ success: boolean; data: any[] }>('/api/encarregado/coaching');
  }

  async getEncarregadoDisponibilidades() {
    return this.request<{ success: boolean; data: any[] }>('/api/encarregado/disponibilidades');
  }

  async getEncarregadoAulasOpen() {
    return this.request<{ success: boolean; data: any[] }>('/api/encarregado/coaching/open');
  }

  async getJoinableCoachings() {
    return this.request<{ success: boolean; data: any[] }>('/api/encarregado/coaching/joinable');
  }

  async submeterPedidoAula(data: {
    data: string;
    horainicio: string;
    duracaoaula?: string;
    disponibilidade_mensal_id?: number;
    professor_utilizador_id?: number;
    alunoutilizadoriduser?: number;
    salaidsala?: number;
    privacidade?: boolean;
    maxparticipantes?: number;
  }) {
    return this.request<{ success: boolean; data: any }>('/api/encarregado/coaching', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfessorAulasFromProfessorAulas() {
    return this.request<{ success: boolean; data: any[] }>('/api/professor-coaching/coaching');
  }

  async updateProfessorAulaStatus(id: number, status: string) {
    return this.request<{ success: boolean; data: any }>(`/api/professor-coaching/coaching/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getDirecaoAulas() {
    return this.request<{ success: boolean; data: any[] }>('/api/direcao/coaching');
  }

  async getDirecaoAulasPending() {
    return this.request<{ success: boolean; data: any[] }>('/api/direcao/coaching/pending');
  }

  async approveDirecaoAula(id: number, salaId?: number) {
    return this.request<{ success: boolean; data: any }>(`/api/direcao/coaching/${id}/approve`, {
      method: 'POST',
      ...(salaId !== undefined && { body: JSON.stringify({ salaId }) }),
    });
  }

  async rejectDirecaoAula(id: number, motivo?: string) {
    return this.request<{ success: boolean; data: any }>(`/api/direcao/coaching/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }

  async confirmarRealizacaoAula(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/direcao/coaching/${id}/realizado`, {
      method: 'POST',
    });
  }

  async cancelarAulaDirecao(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/direcao/coaching/${id}/cancel`, {
      method: 'POST',
    });
  }

  async editarSalaDirecao(id: number, salaId: number) {
    return this.request<{ success: boolean; data: any }>(`/api/direcao/coaching/${id}/sala`, {
      method: 'PUT',
      body: JSON.stringify({ salaId }),
    });
  }

  async criarAula(data: { pedidodeaulaId: number; salaId: number; estadoaulaId?: number }) {
    return this.request<{ success: boolean; data: any }>('/api/coaching', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmAula(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/confirm`, {
      method: 'POST',
    });
  }

  async cancelarAula(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/cancel`, {
      method: 'POST',
    });
  }

  // RF17 — Cancelar Participação (Encarregado)
  async cancelarParticipacaoAula(pedidoId: number) {
    return this.request<{ success: boolean; data: any }>(`/api/encarregado/coaching/${pedidoId}/cancelar-participacao`, {
      method: 'POST',
    });
  }

  // RF15 — Extrato de Aulas (summary agnóstico — usa o mesmo endpoint do role)
  async getExtratoAulas() {
    // Usa o mesmo endpoint que já carrega as aulas do role atual
    // A agregação por mês/ano é feita no frontend
    return this.request<{ success: boolean; data: any[] }>('/api/coaching/extrato');
  }

  // Eventos
  async getEventos() {
    return this.request<{ success: boolean; data: any[] }>('/api/public/eventos');
  }

  async getFeriados(ano: number) {
    return this.request<{ success: boolean; data: { data: string; nome: string; tipo: string }[] }>(`/api/public/feriados?ano=${ano}`);
  }

  async getEventosAdmin() {
    return this.request<{ success: boolean; data: any[] }>('/api/eventos');
  }

  async createEvento(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/api/eventos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvento(id: number, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/api/eventos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvento(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/eventos/${id}`, {
      method: 'DELETE',
    });
  }

  async publishEvento(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/eventos/${id}/publish`, {
      method: 'PUT',
    });
  }

  // Figurinos
  async getFigurinos(params?: { tipo?: number; tamanho?: number; genero?: number }) {
    const query = params ? new URLSearchParams({
      tipo: params.tipo?.toString() || '',
      tamanho: params.tamanho?.toString() || '',
      genero: params.genero?.toString() || ''
    }).toString() : '';
    return this.request<{ success: boolean; data: any[] }>(`/api/figurinos${query ? `?${query}` : ''}`);
  }

  async createFigurino(data: any) {
    return this.request<{ success: boolean; data: any }>('/api/figurinos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createFigurinoStock(data: {
    nome: string; descricao?: string; fotografia?: string;
    tipofigurinoid: number; tamanhoid: number; generoid: number; corid: number;
    localizacao?: string; quantidadetotal?: number; quantidadedisponivel?: number;
    estadousoid?: number;
    encarregadoeducacaoutilizadoriduser?: number;
    professorutilizadoriduser?: number;
  }) {
    return this.request<{ success: boolean; data: any }>('/api/figurinos/stock', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFigurino(id: number, data: {
    nome?: string; descricao?: string; fotografia?: string;
    tipofigurinoid?: number; localizacao?: string;
    quantidadetotal?: number; quantidadedisponivel?: number;
    generoidgenero?: number; tamanhoidtamanho?: number; coridcor?: number;
    estadousoidestado?: number;
  }) {
    return this.request<{ success: boolean; data: any }>(`/api/figurinos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFigurino(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/figurinos/${id}`, {
      method: 'DELETE',
    });
  }

  async getFigurinoHistory(id: number) {
    return this.request<{ success: boolean; data: any[] }>(`/api/figurinos/${id}/history`);
  }

  async updateFigurinoStatus(id: number, status: 'DISPONIVEL' | 'ALUGADO' | 'VENDIDO') {
    return this.request<{ success: boolean; data: any }>(`/api/figurinos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getFigurinoLookup() {
    return this.request<{ success: boolean; data: { tamanhos: any[]; generos: any[]; cores: any[]; modelos: any[]; tipos: any[]; estadosUso: any[] } }>('/api/figurinos/lookup');
  }

  // Turmas
  async getTurmas(params?: { professorId?: number; modalidadeId?: number; estado?: string }) {
    const query = params ? new URLSearchParams({
      professorId: params.professorId?.toString() || '',
      modalidadeId: params.modalidadeId?.toString() || '',
      estado: params.estado || ''
    }).toString() : '';
    return this.request<{ success: boolean; data: any[] }>(`/api/turmas${query ? `?${query}` : ''}`);
  }

  async createTurma(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/api/turmas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTurma(id: number, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/api/turmas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async enrollAluno(turmaId: number, alunoId: number) {
    return this.request<{ success: boolean; data: any }>(`/api/turmas/${turmaId}/enroll`, {
      method: 'PUT',
      body: JSON.stringify({ alunoId }),
    });
  }

  async closeTurma(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/turmas/${id}/close`, {
      method: 'PUT',
    });
  }

  async archiveTurma(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/turmas/${id}/archive`, {
      method: 'PUT',
    });
  }

  async removeAluno(turmaId: number, alunoId: number) {
    return this.request<{ success: boolean; data: any }>(`/api/turmas/${turmaId}/alunos/${alunoId}`, {
      method: 'DELETE',
    });
  }

  // === EE + Direção Validation Workflow ===

  async submeterParaValidacaoEE(turmaId: number) {
    return this.request<{ success: boolean; data: { message: string } }>(`/api/turmas/${turmaId}/submeter-ee`, {
      method: 'PUT',
    });
  }

  async validarAlunoEE(turmaId: number, alunoId: string, aceite: boolean, motivo?: string) {
    return this.request<{ success: boolean; data: { message: string; status: string } }>(`/api/turmas/${turmaId}/validar-aluno/${alunoId}`, {
      method: 'PUT',
      body: JSON.stringify({ aceite, motivo }),
    });
  }

  async getGruposPendentesEE() {
    return this.request<{ success: boolean; data: any[] }>('/api/turmas/pendentes-ee');
  }

  async aprovarDirecao(turmaId: number, estudioAprovadoId?: number) {
    return this.request<{ success: boolean; data: { message: string; status: string } }>(`/api/turmas/${turmaId}/aprovar`, {
      method: 'PUT',
      body: JSON.stringify({ estudioAprovadoId }),
    });
  }

  async rejeitarDirecao(turmaId: number, motivo: string) {
    return this.request<{ success: boolean; data: { message: string; status: string } }>(`/api/turmas/${turmaId}/rejeitar`, {
      method: 'PUT',
      body: JSON.stringify({ motivo }),
    });
  }

  async getGruposPendentesDirecao() {
    return this.request<{ success: boolean; data: any[] }>('/api/turmas/pendentes-direcao');
  }

  async verificarDisponibilidadeEstudio(params: { estudioId: number; dataInicio?: string; dataFim?: string; diasSemana?: string; horaInicio?: string; horaFim?: string }) {
    const query = new URLSearchParams(
      Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined) acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    return this.request<{ success: boolean; data: { disponivel: boolean; conflitos: any[] } }>(`/api/turmas/disponibilidade-estudio?${query}`);
  }

  // Users
  async getUsers() {
    return this.request<{ success: boolean; data: any[] }>('/api/users');
  }

  async createUser(data: { nome: string; email: string; telemovel: string; password: string; role?: string; modalidades?: string[]; encarregadoId?: string; dataNascimento?: string; nivel?: string; alunoModalidades?: number[] }) {
    return this.request<{ success: boolean; data: any }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: number, data: { nome?: string; email?: string; telemovel?: string; role?: string; estado?: boolean; encarregadoId?: string | null; modalidades?: string[]; dataNascimento?: string; nivel?: string; alunoModalidades?: number[] }) {
    return this.request<{ success: boolean; data: any }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  async inactivateUser(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ estado: false }),
    });
  }

  async activateUser(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ estado: true }),
    });
  }

  async submitContact(data: {
    nome: string;
    email: string;
    telemovel: string;
    mensagem?: string;
    modalidade?: string;
    faixaEtaria?: string;
    tipo?: string;
  }) {
    return this.request<{ success: boolean; message: string }>('/api/public/contactos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Salas
  async getSalas() {
    return this.request<{ success: boolean; data: any[] }>('/api/salas');
  }

  async getContactos() {
    return this.request<{ success: boolean; data: any[] }>('/api/contactos');
  }

  async criarOcupacaoSala(dados: {
    salaId: number;
    data: string;
    horainicio: string;
    horafim: string;
    tipo?: string;
    responsavel?: string;
    observacoes?: string;
  }) {
    return this.request<{ success: boolean; data: any; error?: string }>('/api/direcao/ocupacao', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async updateOcupacaoSala(id: string, dados: {
    salaId: number;
    data: string;
    horainicio: string;
    horafim: string;
    tipo?: string;
    responsavel?: string;
    observacoes?: string;
  }) {
    return this.request<{ success: boolean; data: any; error?: string }>(`/api/direcao/ocupacao/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    });
  }

  async deleteOcupacaoSala(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/direcao/ocupacao/${id}`, {
      method: 'DELETE',
    });
  }

  async createSala(data: { nomesala: string; capacidade: number; tiposalaidtiposala?: number }) {
    return this.request<{ success: boolean; data: any }>('/api/salas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSalaAvailability(id: number, data?: string) {
    const query = data ? `?data=${data}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/api/salas/${id}/availability${query}`);
  }

  async consultarSalaDisponivel(salaId: number, data: string, hora: string, duracao: number) {
    return this.request<{ success: boolean; data: any }>('/api/salas/consultar', {
      method: 'POST',
      body: JSON.stringify({ salaId, data, hora, duracao }),
    });
  }

  async getSalasDisponiveis(data: string, hora: string, duracao?: number | string, excluirPedidoId?: number) {
    let query = `?data=${encodeURIComponent(data)}&hora=${encodeURIComponent(hora)}`;
    if (duracao !== undefined) query += `&duracao=${encodeURIComponent(String(duracao))}`;
    if (excluirPedidoId !== undefined) query += `&excluirPedidoId=${excluirPedidoId}`;
    return this.request<{ success: boolean; data: { id: number; nome: string; disponivel: boolean }[] }>(`/api/salas/disponiveis${query}`);
  }

  async obterAulaDoPedido(pedidoId: number) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/pedido/${pedidoId}`);
  }

  // Anuncios
  async getAnuncios(params?: { estado?: string }) {
    const query = params?.estado ? `?estado=${params.estado}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/api/anuncios${query ? `?${query}` : ''}`);
  }

  async registarAnuncio(data: {
    valor?: number;
    dataanuncio?: string;
    datainicio?: string;
    datafim?: string;
    quantidade: number;
    figurinoidfigurino: number;
    tipotransacao?: string;
    direcaoutilizadoriduser?: number;
    encarregadoeducacaoutilizadoriduser?: number;
    professorutilizadoriduser?: number;
  }) {
    return this.request<{ success: boolean; data: any }>('/api/anuncios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnuncio(id: number, data: {
    valor?: number; datainicio?: string; datafim?: string; quantidade?: number; estadoidestado?: number;
  }) {
    return this.request<{ success: boolean; data: any }>(`/api/anuncios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnuncio(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/anuncios/${id}`, {
      method: 'DELETE',
    });
  }

  async avaliarAnuncio(id: number, decisao: 'aprovar' | 'rejeitar', motivo?: string) {
    return this.request<{ success: boolean; data: any }>(`/api/anuncios/${id}/avaliar`, {
      method: 'PUT',
      body: JSON.stringify({ decisao, motivo }),
    });
  }

  async getPedidosAula() {
    return this.request<{ success: boolean; data: any[] }>('/api/pedidosaula');
  }

  async getMyPedidosAula() {
    return this.request<{ success: boolean; data: any[] }>('/api/pedidosaula/my');
  }

  async getPedidosPendentes() {
    return this.request<{ success: boolean; data: any[] }>('/api/pedidosaula/pendentes');
  }

  async createPedidoAula(data: {
    data: string;
    horainicio: string;
    duracaoaula?: string;
    maxparticipantes?: number;
    privacidade?: boolean;
    disponibilidade_mensal_id?: number;
    grupoidgrupo?: number;
    salaidsala: number;
  }) {
    return this.request<{ success: boolean; data: any; message?: string }>('/api/pedidosaula', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approvePedidoAula(id: number) {
    return this.request<{ success: boolean; data: any; message?: string }>(`/api/pedidosaula/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectPedidoAula(id: number, motivo?: string) {
    return this.request<{ success: boolean; data: any; message?: string }>(`/api/pedidosaula/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }

  async deletePedidoAula(id: number) {
    return this.request<{ success: boolean; message?: string }>(`/api/pedidosaula/${id}`, {
      method: 'DELETE',
    });
  }

  async getAluguerTransacoes() {
    return this.request<{ success: boolean; data: any[] }>('/api/aluguer');
  }

  async getAluguerEstados() {
    return this.request<{ success: boolean; data: any[] }>('/api/aluguer/estados');
  }

  async getAluguerDisponibilidade(anuncioId: number) {
    return this.request<{ success: boolean; data: any }>(`/api/aluguer/anuncio/${anuncioId}/disponibilidade`);
  }

  async getMyReservas() {
    return this.request<{ success: boolean; data: any[] }>('/api/aluguer/user/reservas');
  }

  async registarTransacao(data: {
    quantidade: number;
    datatransacao: string;
    anuncioidanuncio: number;
    itemfigurinoiditem?: number;
    encarregadoeducacaoutilizadoriduser?: number;
    professorutilizadoriduser?: number;
  }) {
    return this.request<{ success: boolean; data: any }>('/api/aluguer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

async avaliarPedidoReserva(id: number, decisao: string, estadoidestado?: number, motivorejeicao?: string) {
    return this.request<{ success: boolean, data: any }>(`/api/aluguer/${id}/avaliar`, {
      method: 'PUT',
      body: JSON.stringify({ decisao, estadoidestado, ...(motivorejeicao !== undefined && { motivorejeicao }) }),
    });
  }

  async confirmarReserva(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/aluguer/${id}/confirmar`, {
      method: 'POST',
    });
  }

  async cancelarReserva(id: number, motivo?: string) {
    return this.request<{ success: boolean; data: any }>(`/api/aluguer/${id}/cancelar-reserva`, {
      method: 'POST',
      ...(motivo !== undefined && { body: JSON.stringify({ motivo }) }),
    });
  }

  async devolverAluguer(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/aluguer/${id}/devolver`, {
      method: 'PATCH',
    });
  }

  async deleteReserva(id: number) {
    return this.request<{ success: boolean }>(`/api/aluguer/${id}`, {
      method: 'DELETE',
    });
  }

  async rejectAnuncio(id: number, motivo?: string) {
    return this.request<{ success: boolean; data: any }>(`/api/anuncios/${id}/reject`, {
      method: 'PUT',
      ...(motivo !== undefined && { body: JSON.stringify({ motivo }) }),
    });
  }

  async ressubmeterAnuncio(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/anuncios/${id}/ressubmeter`, {
      method: 'PUT',
    });
  }

  async sugerirNovaDataAula(id: number, novadata: string, novaHora?: string) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/sugerir-nova-data`, {
      method: 'PUT',
      body: JSON.stringify({ novadata, novaHora: novaHora || '' }),
    });
  }

  async sugerirNovaDataDirecao(id: number, novadata: string, novaHora?: string) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/sugerir-nova-data-direcao`, {
      method: 'POST',
      body: JSON.stringify({ novadata, novaHora }),
    });
  }

  async remarcarAula(id: number, data: string, hora: string) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/remarcar`, {
      method: 'PUT',
      body: JSON.stringify({ novadata: data, novaHora: hora }),
    });
  }

  async pedirRemarcacao(id: number) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/pedir-remarcacao`, {
      method: 'POST',
    });
  }

  async responderSugestaoDirecao(id: number, aceitar: boolean, novaData?: string) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/responder-direcao`, {
      method: 'POST',
      body: JSON.stringify({ aceitar, ...(novaData && { novaData }) }),
    });
  }

  async responderSugestaoProfessor(id: number, aceitar: boolean) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/responder-professor`, {
      method: 'POST',
      body: JSON.stringify({ aceitar }),
    });
  }

  async responderSugestaoEE(id: number, aceitar: boolean) {
    return this.request<{ success: boolean; data: any }>(`/api/coaching/${id}/responder-encarregado`, {
      method: 'POST',
      body: JSON.stringify({ aceitar }),
    });
  }

  async getNotificacoes() {
    return this.request<{ success: boolean; data: any[] }>('/api/notificacoes');
  }

  async getNotificacoesNaoLidas() {
    return this.request<{ success: boolean; data: any[] }>('/api/notificacoes/nao-lidas');
  }

  async marcarNotificacaoLida(id: number) {
    return this.request<{ success: boolean }>(`/api/notificacoes/${id}/read`, {
      method: 'POST',
    });
  }

  async marcarTodasNotificacoesLidas() {
    return this.request<{ success: boolean }>('/api/notificacoes/read-all', {
      method: 'POST',
    });
  }

  async deleteNotificacao(id: number) {
    return this.request<{ success: boolean }>(`/api/notificacoes/${id}`, {
      method: 'DELETE',
    });
  }

  // Professor Disponibilidades
  async getDisponibilidades() {
    return this.request<{ success: boolean; data: any[] }>('/api/public/disponibilidades');
  }

  async getProfessorDisponibilidades() {
    return this.request<{ success: boolean; data: any[] }>('/api/public/disponibilidades');
  }

  async getMyDisponibilidades() {
    return this.request<{ success: boolean; data: any[] }>('/api/professor/disponibilidades');
  }

  async getProfessorModalidades() {
    return this.request<{ success: boolean; data: any[] }>('/api/professor/modalidades');
  }

  async getProfessorAulas() {
    return this.request<{ success: boolean; data: any[] }>('/api/professor/coaching');
  }

  async createProfessorDisponibilidade(data: {
    modalidadesprofessoridmodalidadeprofessor: number;
    data: string;
    horainicio: string;
    horafim: string;
    salaid?: number;
  }) {
    return this.request<{ success: boolean; data: any }>('/api/professor/disponibilidades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRecorrenteDisponibilidade(data: {
    modalidadesprofessoridmodalidadeprofessor: number;
    horainicio: string;
    horafim: string;
    dataInicio: string;
    dataFim: string;
    diadasemana: number | number[];
    salaid?: number;
  }) {
    return this.request<{ success: boolean; data: any[]; total: number; totalPretendido: number; message: string }>('/api/professor/disponibilidades/recorrente', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProfessorDisponibilidade(id: number, data: {
    modalidadesprofessoridmodalidadeprofessor?: number;
    diadasemana?: number;
    horainicio?: string;
    horafim?: string;
    ativo?: boolean;
  }) {
    return this.request<{ success: boolean; data: any }>(`/api/professor/disponibilidades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProfessorDisponibilidade(id: number) {
    return this.request<{ success: boolean }>(`/api/professor/disponibilidades/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteRecorrenteDisponibilidade(data: {
    modalidadesprofessoridmodalidadeprofessor?: number;
    horainicio: string;
    horafim: string;
    diadasemana: number[];
    dataFim?: string;
  }) {
    return this.request<{ success: boolean; deleted: number; message: string }>('/api/professor/disponibilidades/desmarcar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserModalidades(userId: number | string) {
    return this.request<{ success: boolean; data: any[] }>(`/api/users/${Number(userId)}/modalidades`);
  }

  async getAuditLogs(filters?: { utilizadorId?: number; acao?: string; entidade?: string; dataInicio?: string; dataFim?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (filters?.utilizadorId) params.set('utilizadorId', String(filters.utilizadorId));
    if (filters?.acao) params.set('acao', filters.acao);
    if (filters?.entidade) params.set('entidade', filters.entidade);
    if (filters?.dataInicio) params.set('dataInicio', filters.dataInicio);
    if (filters?.dataFim) params.set('dataFim', filters.dataFim);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<{ success: boolean; data: any[]; total: number; limit: number; offset: number }>(`/api/audit${qs ? `?${qs}` : ''}`);
  }
}

export const api = new ApiService();
export default api;
