
import { get, post, put} from "./client.js";

export const UsersService = {
  listSupervisors: (token) => get("/supervisores", token),
  listPsychologists: (token) => get("/psicologos", token),
};

export const RequestsService = {
  bySupervisor: (supervisorId, token) => get(`/solicitacoes/supervisor/${supervisorId}`, token),
  byPsychologist: (psychologistId, token) => get(`/solicitacoes/psicologo/${psychologistId}`, token),
  create: (payload, token) => post("/solicitacoes", payload, token), 
  accept: (id, token) => post(`/solicitacoes/${id}/aceitar`, null, token),
  reject: (id, token) => post(`/solicitacoes/${id}/recusar`, null, token),
};


export const ConversationsService = {
  between: (psicologoId, supervisorId, token) =>
    post(`/conversas/between?psicologoId=${encodeURIComponent(psicologoId)}&supervisorId=${encodeURIComponent(supervisorId)}`, null, token),
};


export const MessagesService = {
  listByConversation: (conversaId, token) => get(`/mensagens/conversa/${conversaId}`, token),
  send: (texto, conversaId, user, token) => {
    const payload = {
      conteudo: texto, 
      conversa: { id: conversaId },
      remetenteTipo: user.tipoUsuario,
      remetenteId: user.id             
    };
    return post("/mensagens", payload, token);
  },
};



export const ProfileService = {

  getSupervisor: (id, token) => get(`/supervisores/${id}`, token),
  updateSupervisor: (id, payload, token) => put(`/supervisores/${id}`, payload, token),
  getPsicologo: (id, token) => get(`/psicologos/${id}`, token),
  updatePsicologo: (id, payload, token) => put(`/psicologos/${id}`, payload, token),

};







