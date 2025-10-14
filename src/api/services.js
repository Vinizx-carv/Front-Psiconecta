// api/services.js
import { get, post } from "./client.js";

// Usuários
export const UsersService = {
  listSupervisors: (token) => get("/supervisores", token),
  listPsychologists: (token) => get("psicologos", token),
};

// Solicitações (Requests)
export const RequestsService = {
  bySupervisor: (supervisorId, token) => get(`/solicitacoes/supervisor/${supervisorId}`, token),
  byPsychologist: (psychologistId, token) => get(`/solicitacoes/psicologo/${psychologistId}`, token),
  create: (payload, token) => post("/solicitacoes", payload, token),
  accept: (id, token) => post(`/solicitacoes/${id}/aceitar`, null, token),
  reject: (id, token) => post(`/solicitacoes/${id}/recusar`, null, token),
};

// Mensagens
export const MessagesService = {
  thread: (aId, bId, token) => get(`/mensagens/${aId}/${bId}`, token),
  send: (payload, token) => post("/mensagens", payload, token),
};
