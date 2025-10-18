
import { get, post, put} from "./client.js";
// Usuários
export const UsersService = {
  listSupervisors: (token) => get("/supervisores", token),
  listPsychologists: (token) => get("/psicologos", token),
};

// Solicitações
export const RequestsService = {
  bySupervisor: (supervisorId, token) => get(`/solicitacoes/supervisor/${supervisorId}`, token),
  byPsychologist: (psychologistId, token) => get(`/solicitacoes/psicologo/${psychologistId}`, token),
  create: (payload, token) => post("/solicitacoes", payload, token), // payload aninhado (psicologo, supervisor, mensagem)
  accept: (id, token) => post(`/solicitacoes/${id}/aceitar`, null, token),
  reject: (id, token) => post(`/solicitacoes/${id}/recusar`, null, token),
};

// Conversas (NOVO)
export const ConversationsService = {
  between: (psicologoId, supervisorId, token) =>
    post(`/conversas/between?psicologoId=${encodeURIComponent(psicologoId)}&supervisorId=${encodeURIComponent(supervisorId)}`, null, token),
};

// Mensagens — aderente à doc (por conversaId)
export const MessagesService = {
  listByConversation: (conversaId, token) => get(`/mensagens/conversa/${conversaId}`, token),
  send: (texto, conversaId, user, token) => {
    const payload = {
      conteudo: texto, // Nome correto do campo: "conteudo"
      conversa: { id: conversaId },
      remetenteTipo: user.tipoUsuario, // Informação do remetente
      remetenteId: user.id             // Informação do remetente
    };
    return post("/mensagens", payload, token);
  },
};



export const ProfileService = {
  // --- Supervisor ---
  getSupervisor: (id, token) => get(`/supervisores/${id}`, token),
  updateSupervisor: (id, payload, token) => put(`/supervisores/${id}`, payload, token),

  // --- Psicólogo ---
  // ...
  // --- Psicólogo ---
  getPsicologo: (id, token) => get(`/psicologos/${id}`, token),
  updatePsicologo: (id, payload, token) => put(`/psicologos/${id}`, payload, token),

};







