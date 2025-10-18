// Arquivo: /src/pages/supervisor/index.js

import { mountTabs } from "../../ui/tabs.js";
import { renderContacts, renderThread } from "../../ui/chat.js";
import { getLoggedUser, clearSession } from "../../utils/storage.js";
import { formatDateTimeISO } from "../../utils/dates.js";
// Importe os serviços e componentes de perfil
import {
    UsersService,
    RequestsService,
    MessagesService,
    ConversationsService,
    ProfileService
} from "../../api/services.js";
import { renderProfileView, renderEditForm } from "../../ui/ProfileComponent.js";

// --- ESTADO GLOBAL ---
let state = {
    token: null,
    supervisorId: null,
    psychologists: [],
    requests: [],
    conversations: [],
    currentPeerId: null,
    currentConversationId: null,
    polling: null,
};

// Objeto para guardar os dados do perfil do supervisor
let supervisorProfileData = {};

// --- CONFIGURAÇÃO DE CAMPOS DO PERFIL ---
const supervisorConfig = {
    roleName: 'Supervisor Registrado',
    fields: {
        crp: { label: 'CRP', icon: 'fa-id-card' },
        dataNascimento: { label: 'Data de Nascimento', icon: 'fa-calendar-alt' },
        telefone: { label: 'Telefone', icon: 'fa-phone' },
        cidade: { label: 'Cidade', icon: 'fa-map-marker-alt' },
        uf: { label: 'UF', icon: 'fa-map-pin' },
        areaAtuacao: { label: 'Área de Atuação', icon: 'fa-briefcase' }
    }
};

function qs(id) { return document.getElementById(id); }

// ==========================================================
// =========== NOVAS FUNÇÕES PARA A ABA DE PERFIL ===========
// ==========================================================

async function loadSupervisorProfile() {
    const profileCard = document.querySelector('#perfil-tab .profile-card');
    if (!profileCard) return;

    try {
        supervisorProfileData = await ProfileService.getSupervisor(state.supervisorId, state.token);
        const onEdit = () => renderEditForm(profileCard, supervisorProfileData, supervisorConfig, handleSupervisorSave, handleSupervisorCancel);
        renderProfileView(profileCard, supervisorProfileData, supervisorConfig, onEdit);
    } catch (error) {
        console.error("Erro ao carregar perfil do supervisor:", error);
        profileCard.innerHTML = `<p>Erro ao carregar perfil. Verifique o console para mais detalhes.</p>`;
    }
}

async function handleSupervisorSave(updatedDataFromForm) {
    const profileCard = document.querySelector('#perfil-tab .profile-card');
    const currentData = supervisorProfileData;

    const payload = {};
    for (const key in updatedDataFromForm) {
        if (currentData.hasOwnProperty(key) && currentData[key] !== updatedDataFromForm[key]) {
            payload[key] = updatedDataFromForm[key];
        }
    }

    if (Object.keys(payload).length === 0) {
        alert("Nenhuma alteração foi feita.");
        handleSupervisorCancel();
        return;
    }

    console.log("Enviando apenas os campos alterados via PATCH:", payload);

    try {
        const result = await ProfileService.patchSupervisor(state.supervisorId, payload, state.token);
        supervisorProfileData = { ...currentData, ...result };

        const onEdit = () => renderEditForm(profileCard, supervisorProfileData, supervisorConfig, handleSupervisorSave, handleSupervisorCancel);
        renderProfileView(profileCard, supervisorProfileData, supervisorConfig, onEdit);

        alert('Perfil atualizado com sucesso!');
    } catch (error) {
        console.error('Falha ao salvar o perfil do supervisor:', error);
        alert(`Não foi possível salvar as alterações: ${error.message}`);
    }
}

function handleSupervisorCancel() {
    const profileCard = document.querySelector('#perfil-tab .profile-card');
    const onEdit = () => renderEditForm(profileCard, supervisorProfileData, supervisorConfig, handleSupervisorSave, handleSupervisorCancel);
    renderProfileView(profileCard, supervisorProfileData, supervisorConfig, onEdit);
}

// ==========================================================
// =========== SUAS FUNÇÕES EXISTENTES (SEM MUDANÇAS) ========
// ==========================================================

// ... (todas as suas funções como loadRequests, loadPsychologists, sendMessage, etc., permanecem aqui sem alterações)
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
    const area = p?.areaDesejada || p?.area || "Área não informada";
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
    try {
      if (act === "accept") {
        await RequestsService.accept(id, state.token);
        alert("Solicitação aceita com sucesso!");
        await loadConversations();
      } else if (act === "reject") {
        await RequestsService.reject(id, state.token);
        alert("Solicitação recusada.");
      }
      await loadRequests();
      updateSummary();
    } catch (err) {
      console.error("Erro ao processar solicitação:", err);
      alert("Falha ao processar solicitação.");
    }
  };
}
function updateSummary() {
  qs("supervisoes-count").textContent = state.requests.filter(x => x.status === "PENDENTE").length;
  qs("solicitacoes-count").textContent = state.requests.filter(x => x.status === "PENDENTE").length;
  qs("conversations-count").textContent = state.conversations.some(c => c.unread) ? "1" : "0";
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
      const conv = await ConversationsService.between(pId, supId, state.token);
      const conversaId = conv.id;
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
  const empty = qs("conversations-empty-state");
  const container = qs("chat-container");
  const list = qs("contact-list");
  if (!state.conversations.length) {
    empty.style.display = "block";
    container.style.display = "none";
    return;
  }
  empty.style.display = "none";
  container.style.display = "flex";
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
renderThread(qs("chat-messages"), msgs, state.supervisorId);
  startPolling();
}
// Arquivo: /src/pages/supervisor/index.js

// Arquivo: /src/pages/supervisor/index.js

async function sendMessage() {
    const input = qs("inputMensagem");
    if (!input) return;

    const text = input.value.trim();
    if (!text || !state.currentConversationId) return;

    // Encontra a conversa ativa no estado local
    const conversation = state.conversations.find(c => c.conversaId === state.currentConversationId);
    if (!conversation) return;

    const loggedUser = getLoggedUser();
    if (!loggedUser) {
        console.error("Supervisor não encontrado. Impossível enviar mensagem.");
        return;
    }

    // --- Início da Lógica Otimista ---
    
    // 1. Cria a mensagem otimista localmente
    const optimisticMessage = {
        // Use 'conteudo' para consistência com o backend
        conteudo: text, 
        remetente: { id: loggedUser.id }, 
        dataEnvio: new Date().toISOString(),
        // Adiciona um ID temporário para facilitar a identificação
        optimisticId: `optimistic-${Date.now()}` 
    };

    // 2. Adiciona à lista de mensagens da conversa ativa
    conversation.messages.push(optimisticMessage);

    // 3. Renderiza a thread imediatamente com a mensagem otimista
    renderThread(qs("chat-messages"), conversation.messages, state.supervisorId);
    input.value = ""; // Limpa o input

    // --- Fim da Lógica Otimista ---

    try {
        // 4. Envia a mensagem real para a API em segundo plano
        await MessagesService.send(text, state.currentConversationId, loggedUser, state.token);
        
        // 5. Após o sucesso, busca a lista real do servidor para sincronizar
        const realMessages = await MessagesService.listByConversation(state.currentConversationId, state.token);
        
        // 6. Atualiza a lista de mensagens da conversa com os dados reais
        conversation.messages = realMessages;
        
        // Re-renderiza para garantir consistência (substitui a mensagem otimista pela real)
        renderThread(qs("chat-messages"), conversation.messages, state.supervisorId);

    } catch (error) { 
        console.error("Falha ao enviar mensagem:", error);
        // Opcional: Implementar lógica para mostrar que a mensagem otimista falhou
        // Por exemplo, encontrar a mensagem pelo optimisticId e adicionar um estilo de erro.
        alert("Não foi possível enviar a mensagem.");
    }
}

function startPolling() {
  stopPolling();
  state.polling = setInterval(async () => {
    if (!state.currentConversationId) return;
    const msgs = await MessagesService.listByConversation(state.currentConversationId, state.token);
renderThread(qs("chat-messages"), msgs, state.supervisorId);
  }, 5000);
}
function stopPolling() { if (state.polling) clearInterval(state.polling); }

// --- PONTO DE ENTRADA PRINCIPAL ---
document.addEventListener("DOMContentLoaded", async () => {
    const user = getLoggedUser();
    if (!user || user.tipoUsuario !== "supervisor") {
        alert("Acesso não autorizado. Faça login como supervisor.");
        location.href = "login.html";
        return;
    }
    state.token = user.token || null;
    state.supervisorId = user.id;

    // Conecta eventos globais
    qs("inputMensagem").addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });
    qs("send-btn")?.addEventListener("click", sendMessage);
    qs("logout-btn").addEventListener("click", () => {
        clearSession();
        alert("Logout realizado com sucesso!");
        location.href = "index.html";
    });

    const { switchTab } = mountTabs({
        onTab: async (tab) => {
            stopPolling();
            if (tab === "agenda") { /* render agenda se houver */ }
            if (tab === "solicitacoes") { await loadPsychologists(); await loadRequests(); }
            if (tab === "conversations") {
                await loadPsychologists();
                await loadRequests();
                await loadConversations();
            }
            // ADICIONA A LÓGICA PARA A ABA DE PERFIL
            if (tab === "perfil") {
                await loadSupervisorProfile();
            }
        }
    });

    switchTab("agenda");
});
