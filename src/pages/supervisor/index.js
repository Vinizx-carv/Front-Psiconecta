
// pages/supervisor.js
import { mountTabs } from "../../ui/tabs.js";
import { renderContacts, renderThread } from "../../ui/chat.js";
import { getLoggedUser, clearSession } from "../../utils/storage.js";
import { formatDateTimeISO } from "../../utils/dates.js";
import { UsersService, RequestsService, MessagesService, ConversationsService } from "../../api/services.js";

let state = {
  token: null,
  supervisorId: null,
  psychologists: [],
  requests: [],
  conversations: [],
  currentPeerId: null,
  currentConversationId: null, // novo
  polling: null,
};


function qs(id) { return document.getElementById(id); }

async function loadRequests() {
  const reqs = await RequestsService.bySupervisor(state.supervisorId, state.token);
  state.requests = reqs;
  renderRequests();
  updateSummary();
}

async function loadPsychologists() {
  state.psychologists = await UsersService.listPsychologists(state.token);
}

function renderRequests() {
  const container = qs("solicitacoes-list");
  const empty = qs("solicitacoes-empty-state");
  container.innerHTML = "";
  if (!state.requests.length) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  state.requests.forEach(s => {
    const p = state.psychologists.find(x => x.id === s.psicologoId);
    const nome = p?.nome || "Psicólogo desconhecido";
    const area = p?.area || "Área não informada";
    const card = document.createElement("div");
    card.className = "solicitacao-card";
    card.innerHTML = `
      <div class="solicitacao-header">
        <div class="solicitacao-info">
          <div class="solicitacao-avatar">${nome.split(" ").map(n=>n[0]).join("")}</div>
          <div class="solicitacao-details">
            <h3>${nome}</h3>
            <p>${area}</p>
            <p>Solicitado em ${formatDateTimeISO(s.dataSolicitacao)}</p>
          </div>
        </div>
        <div class="solicitacao-actions">
          <span class="status-badge status-${s.status.toLowerCase()}">${s.status}</span>
          ${s.status === "PENDENTE" ? `
            <button class="btn-primary" data-act="accept" data-id="${s.id}">Aceitar</button>
            <button class="btn-outline" data-act="reject" data-id="${s.id}">Recusar</button>
          ` : ""}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.onclick = async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    if (act === "accept") await RequestsService.accept(id, state.token);
    if (act === "reject") await RequestsService.reject(id, state.token);
    await loadRequests();
    if (act === "accept") await loadConversations(); // refletir chat
  };
}

function updateSummary() {
  qs("supervisoes-count").textContent = state.requests.filter(x => x.status === "PENDENTE").length;
  qs("solicitacoes-count").textContent = state.requests.filter(x => x.status === "PENDENTE").length;
  qs("conversas-count").textContent = state.conversations.some(c => c.unread) ? "1" : "0";
}

async function loadConversations() {
  const accepted = (state.requests || []).filter(s => s.status === "ACEITA");
  const convs = [];

  for (const s of accepted) {
    try {
      const pId = Number(s.psicologo?.id ?? s.psicologoId);
      const supId = Number(state.supervisorId);
      if (!pId || !supId) {
        console.warn("IDs inválidos para conversa (supervisor):", { pId, supId, s });
        continue;
      }

      // cria/retorna conversa
      const conv = await ConversationsService.between(pId, supId, state.token);
      const conversaId = conv.id;

      // mensagens da conversa
      const msgs = await MessagesService.listByConversation(conversaId, state.token);
      const last = msgs.at(-1);
      const peer = state.psychologists.find(x => x.id === pId);

      convs.push({
        peerId: pId,
        conversaId,
        name: peer?.nome || s.psicologo?.nome || `Psicólogo #${pId}`,
        lastMessage: (last?.texto ?? last?.conteudo) || "Conversa iniciada",
        timestamp: last?.dataEnvio || new Date().toISOString(),
        unread: false,
        messages: msgs,
      });
    } catch (err) {
      console.warn("Falha ao carregar conversa (supervisor):", err);
      const pId = Number(s.psicologo?.id ?? s.psicologoId);
      const peer = state.psychologists.find(x => x.id === pId);
      convs.push({
        peerId: pId,
        conversaId: null,
        name: peer?.nome || s.psicologo?.nome || `Psicólogo #${pId}`,
        lastMessage: "Sem mensagens",
        timestamp: new Date().toISOString(),
        unread: false,
        messages: [],
      });
    }
  }

  state.conversations = convs;
  renderConversationsList();
}


function renderConversationsList() {
  const empty = qs("conversas-empty-state");
  const container = qs("chat-container");
  const list = qs("contact-list");

  if (!state.conversations.length) {
    empty.style.display = "block";
    container.style.display = "none";
    return;
  }
  empty.style.display = "none";
  container.style.display = "block";

  renderContacts(list, state.conversations, openConversation);
}

async function openConversation(item) {
  state.currentPeerId = item.peerId;
  state.currentConversationId = item.conversaId;
  qs("chat-header").textContent = item.name;
  qs("chat-input-area").style.display = "flex";

  if (!state.currentConversationId) {
    renderThread(qs("chat-messages"), [], state.supervisorId);
    return;
  }

  const msgs = await MessagesService.listByConversation(state.currentConversationId, state.token);
  const normalized = msgs.map(m => ({
    ...m,
    conteudo: m.texto ?? m.conteudo ?? "",
    remetenteId: m.remetente?.id ?? m.remetenteId ?? null
  }));
  renderThread(qs("chat-messages"), normalized, state.supervisorId);

  startPolling();
}


async function sendMessage() {
  const input = qs("inputMensagem");
  const text = input.value.trim();
  if (!text || !state.currentConversationId) return;

  await MessagesService.send(text, state.currentConversationId, state.token);
  input.value = "";

  const msgs = await MessagesService.listByConversation(state.currentConversationId, state.token);
  const normalized = msgs.map(m => ({
    ...m,
    conteudo: m.texto ?? m.conteudo ?? "",
    remetenteId: m.remetente?.id ?? m.remetenteId ?? null
  }));
  renderThread(qs("chat-messages"), normalized, state.supervisorId);
}


function startPolling() {
  stopPolling();
  state.polling = setInterval(async () => {
    if (!state.currentConversationId) return;
    const msgs = await MessagesService.listByConversation(state.currentConversationId, state.token);
    const normalized = msgs.map(m => ({
      ...m,
      conteudo: m.texto ?? m.conteudo ?? "",
      remetenteId: m.remetente?.id ?? m.remetenteId ?? null
    }));
    renderThread(qs("chat-messages"), normalized, state.supervisorId);
  }, 5000);
}

function stopPolling() { if (state.polling) clearInterval(state.polling); }

function wireEvents() {
  qs("inputMensagem").addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });
  qs("send-btn")?.addEventListener("click", sendMessage);
  qs("logout-btn").addEventListener("click", () => { clearSession(); alert("Logout realizado com sucesso!"); location.href = "index.html"; });
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = getLoggedUser();
  if (!user || user.tipoUsuario !== "supervisor") { alert("Acesso não autorizado. Faça login como supervisor."); location.href = "login.html"; return; }
  state.token = user.token || null;
  state.supervisorId = user.id;

  wireEvents();

  const { switchTab } = mountTabs({
    onTab: async (tab) => {
      if (tab === "agenda") { /* render agenda se houver */ }
      if (tab === "solicitacoes") { await loadPsychologists(); await loadRequests(); }
      if (tab === "conversas") { await loadPsychologists(); await loadRequests(); await loadConversations(); }
    }
  });

  switchTab("agenda");
});
