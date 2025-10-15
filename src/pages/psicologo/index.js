

// pages/psicologo.js
import { mountTabs } from "../../ui/tabs.js";
import { renderContacts, renderThread } from "../../ui/chat.js";
import { getLoggedUser, clearSession } from "../../utils/storage.js";
import { UsersService, RequestsService, MessagesService } from "../../api/services.js";


let state = {
  token: null,
  psychologistId: null,
  supervisors: [],
  myRequests: [],
  conversations: [],
  currentPeerId: null,
  polling: null,
};

function qs(id) { return document.getElementById(id); }

async function loadSupervisors() {
  state.supervisors = await UsersService.listSupervisors(state.token);
  renderSupervisors(state.supervisors);
}

function renderSupervisors(items) {
  const grid = qs("supervisors-grid");
  const empty = qs("no-results");
  grid.innerHTML = "";
  if (!items?.length) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  items.forEach(s => {
    const card = document.createElement("div");
    card.className = "supervisor-card";
    card.innerHTML = `
      <div class="supervisor-header">
        <img src="${s.image || "../../assets/img/perfil-foto.svg"}" alt="Foto de ${s.nome || "Supervisor"}" class="supervisor-photo">
        <div class="supervisor-info">
          <h3 class="supervisor-name">${s.nome || "Sem nome"}</h3>
          <span class="supervisor-exp">${s.experience || ""}</span>
        </div>
      </div>
      <div class="supervisor-tags">
        ${(s.tags || ["Ansiedade","Autoconhecimento","Autoestima"]).slice(0,3).map(t=>`<span class="tag">${t}</span>`).join("")}
      </div>
      <p class="supervisor-description">${s.descricao || "Descrição não disponível"}</p>
      <div class="supervisor-footer">
        <button class="btn-primary" data-request="${s.id}" data-name="${s.nome || "Supervisor"}">Solicitar Supervisão</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.onclick = async (e) => {
  const btn = e.target.closest("button[data-request]");
  if (!btn) return;

  const supervisorId = Number(btn.dataset.request);
  const supervisorName = btn.dataset.name;
  const psicologoId = state.psychologistId; // vindo do usuário logado/bypass

  const payload = {
    psicologo: { id: psicologoId },
    supervisor: { id: supervisorId },
    mensagem: "Gostaria de iniciar supervisão"
  };

  try {
    await RequestsService.create(payload, state.token); // em DEV pode passar undefined
    alert(`Solicitação enviada para ${supervisorName}`);
    await loadMyRequests();
  } catch (err) {
    console.error("Erro ao criar solicitação:", err);
    // Fallback DEV: adiciona localmente para não travar a UI
    state.myRequests = [
      ...state.myRequests,
      { id: Date.now(), supervisorId, status: "PENDENTE", mensagem: payload.mensagem }
    ];
    renderMyRequests(state.myRequests);
    alert("Solicitação simulada (DEV).");
  }
};

}

async function loadMyRequests() {
  state.myRequests = await RequestsService.byPsychologist(state.psychologistId, state.token);
  renderMyRequests(state.myRequests);
}

function renderMyRequests(list) {
  const container = qs("requests-list");
  const empty = qs("requests-empty-state");
  container.innerHTML = "";
  if (!list?.length) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  list.forEach(s => {
    const card = document.createElement("div");
    card.className = "supervisor-cardi";
    card.innerHTML = `
      <h3>Supervisor ID: ${s.supervisorId}</h3>
      <p>Status: ${s.status}</p>
    `;
    container.appendChild(card);
  });
}

async function loadConversations() {
  const accepted = state.myRequests.filter(s => s.status === "ACEITA");
  const convs = await Promise.all(accepted.map(async s => {
    const msgs = await MessagesService.thread(state.psychologistId, s.supervisorId, state.token);
    const last = msgs.at(-1);
    return {
      peerId: s.supervisorId,
      name: s.supervisor?.nome || `Supervisor ${s.supervisorId}`,
      lastMessage: last?.conteudo || "Conversa iniciada",
      timestamp: last?.dataEnvio || new Date().toISOString(),
      unread: msgs.some(m => !m.lida && m.remetenteId === s.supervisorId),
      messages: msgs,
    };
  }));
  state.conversations = convs;
  renderConversationsList();
}

function renderConversationsList() {
  const empty = qs("conversations-empty-state");
  const container = qs("chat-container");
  const list = qs("contact-list");
  if (!state.conversations.length) { container.style.display = "none"; empty.style.display = "block"; return; }
  empty.style.display = "none";
  container.style.display = "flex";
  renderContacts(list, state.conversations, openConversation);
}

async function openConversation(item) {
  state.currentPeerId = item.peerId;
  qs("chat-header").innerText = item.name;
  qs("chat-input-area").style.display = "flex";
  const msgs = await MessagesService.thread(state.psychologistId, item.peerId, state.token);
  renderThread(qs("chat-messages"), msgs, state.psychologistId);
  startPolling();
}

async function sendMessage() {
  const input = qs("inputMensagem");
  const text = input.value.trim();
  if (!text || !state.currentPeerId) return;
  await MessagesService.send({
    remetenteId: state.psychologistId,
    destinatarioId: state.currentPeerId,
    conteudo: text
  }, state.token);
  input.value = "";
  const msgs = await MessagesService.thread(state.psychologistId, state.currentPeerId, state.token);
  renderThread(qs("chat-messages"), msgs, state.psychologistId);
}

function startPolling() {
  stopPolling();
  state.polling = setInterval(async () => {
    if (!state.currentPeerId) return;
    const msgs = await MessagesService.thread(state.psychologistId, state.currentPeerId, state.token);
    renderThread(qs("chat-messages"), msgs, state.psychologistId);
  }, 5000);
}
function stopPolling() { if (state.polling) clearInterval(state.polling); }

function wireEvents() {
  qs("search-input")?.addEventListener("input", (e) => {
    const term = (e.target.value || "").toLowerCase();
    const filtered = state.supervisors.filter(s =>
      (s.nome || "").toLowerCase().includes(term) || (s.area || "").toLowerCase().includes(term)
    );
    renderSupervisors(filtered);
  });
  qs("inputMensagem").addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });
  qs("send-btn")?.addEventListener("click", sendMessage);
  qs("logout-btn").addEventListener("click", () => { clearSession(); alert("Logout realizado com sucesso!"); location.href = "index.html"; });
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = getLoggedUser();
  if (!user || user.tipoUsuario !== "psicologo") { alert("Acesso não autorizado. Faça login como psicólogo."); location.href = "login.html"; return; }
  state.token = user.token || null;
  state.psychologistId = user.id;

  wireEvents();

  const { switchTab } = mountTabs({
    onTab: async (tab) => {
      if (tab === "search") await loadSupervisors();
      if (tab === "requests") await loadMyRequests();
      if (tab === "conversations") { await loadMyRequests(); await loadConversations(); }
    }
  });

  switchTab("search");
});
