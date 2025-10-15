// src/api/services.js
import { get, post } from "./client.js";

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
  send: (texto, conversaId, token) => post("/mensagens", { texto, conversa: { id: conversaId } }, token),
};
