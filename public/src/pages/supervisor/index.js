
import { mountTabs } from "../../ui/tabs.js";
import { renderContacts, renderThread } from "../../ui/chat.js";
import { getLoggedUser, clearSession } from "../../utils/storage.js";
import { formatDateTimeISO } from "../../utils/dates.js";
import {
    UsersService,
    RequestsService,
    MessagesService,
    ConversationsService,
    ProfileService
} from "../../api/services.js";
import { renderProfileView, renderEditForm } from "../../ui/ProfileComponent.js";

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

let supervisorProfileData = {};

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

    const completePayload = { ...currentData, ...updatedDataFromForm };

    delete completePayload.id;
    delete completePayload.senha;
    
    console.log("Enviando payload completo via PUT:", completePayload);

    try {

        const result = await ProfileService.updateSupervisor(state.supervisorId, completePayload, state.token);
        
        supervisorProfileData = result;

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

let agendaState = {
    currentDate: new Date(),
    compromissos: [ 
        { date: '2025-10-20T14:00:00', title: 'Supervisão com Dr. Carlos' },
        { date: '2025-10-22T10:00:00', title: 'Reunião de Alinhamento' },
        { date: '2025-11-05T11:30:00', title: 'Supervisão com Ana P.' },
    ]
};

function initializeAgenda() {
    const prevBtn = qs('prev-month');
    const nextBtn = qs('next-month');
    
    if (prevBtn && nextBtn) {
        prevBtn.onclick = () => {
            agendaState.currentDate.setMonth(agendaState.currentDate.getMonth() - 1);
            renderCalendar();
        };

        nextBtn.onclick = () => {
            agendaState.currentDate.setMonth(agendaState.currentDate.getMonth() + 1);
            renderCalendar();
        };
    }

    renderCalendar();
    renderCompromissos();
}

function renderCalendar() {
    const calendarGrid = qs('calendar-grid');
    const currentMonthSpan = qs('current-month');
    if (!calendarGrid || !currentMonthSpan) return;

    const date = agendaState.currentDate;
    const month = date.getMonth();
    const year = date.getFullYear();

    currentMonthSpan.textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
    calendarGrid.innerHTML = '';

    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(day => {
        calendarGrid.innerHTML += `<div class="calendar-day-header">${day}</div>`;
    });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarGrid.innerHTML += '<div class="calendar-cell empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        cell.textContent = day;

        const hasEvent = agendaState.compromissos.some(c => new Date(c.date).toDateString() === cellDate.toDateString());
        if (hasEvent) {
            cell.classList.add('has-event');
        }

        if (cellDate.toDateString() === new Date().toDateString()) {
            cell.classList.add('today');
        }

        calendarGrid.appendChild(cell);
    }
}

function renderCompromissos() {
    const container = qs('proximos-compromissos');
    if (!container) return;
    
    container.innerHTML = '';
    const hoje = new Date();
    
    const proximos = agendaState.compromissos
        .filter(c => new Date(c.date) >= hoje)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

    if (proximos.length === 0) {
        container.innerHTML = '<p>Nenhum compromisso futuro.</p>';
        return;
    }

    proximos.forEach(c => {
        const date = new Date(c.date);
        const dia = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date);
        const hora = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(date);

        container.innerHTML += `
            <div class="compromisso-item">
                <p class="compromisso-title">${c.title}</p>
                <p class="compromisso-time">${dia} às ${hora}</p>
            </div>
        `;
    });
}

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

  if (!state.requests.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  state.requests.forEach(s => {
    const p = state.psychologists.find(x => String(x.id) === String(s.psicologoId));
    
    const nome = p?.nome || "Psicólogo desconhecido";
    const area = p?.areaDesejada || p?.area || "Área não informada";
    
    const card = document.createElement("div");
    card.className = "solicitacao-card";
    card.id = `solicitacao-${s.id}`;

    const isPendente = s.status && s.status.toUpperCase() === "PENDENTE";

    card.innerHTML = `
      <div class="solicitacao-header">
        <div class="solicitacao-info">
          <div class="solicitacao-avatar">${nome.split(" ").map(n => n[0]).join("")}</div>
          <div class="solicitacao-details">
            <h3>${nome}</h3>
            <p>${area}</p>
            <p>Solicitado em ${formatDateTimeISO(s.dataSolicitacao)}</p>
          </div>
        </div>
        <div class="solicitacao-actions">
          <span class="status-badge status-${(s.status || '').toLowerCase()}">${s.status || 'N/A'}</span>
          ${isPendente ? `
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
    const card = document.getElementById(`solicitacao-${id}`);
    
    const originalRequest = state.requests.find(r => String(r.id) === String(id));
    
    if (!originalRequest || !originalRequest.status || originalRequest.status.toUpperCase() !== 'PENDENTE') {
      console.warn("Ação ignorada: solicitação não encontrada ou não está mais pendente.");
      return;
    }

    const originalButtonHTML = btn.innerHTML;
    btn.innerHTML = '<div class="loader"></div>';
    btn.disabled = true;
    const otherButton = act === 'accept' 
      ? card.querySelector('button[data-act="reject"]') 
      : card.querySelector('button[data-act="accept"]');
    if(otherButton) otherButton.disabled = true;


    const originalStatus = originalRequest.status;
    const newStatus = act === 'accept' ? 'ACEITA' : 'RECUSADA';
    
    try {
      originalRequest.status = newStatus;
      updateSummary();
      

      if (act === "accept") {
        await RequestsService.accept(id, state.token);
        console.log("Solicitação aceita com sucesso no servidor.");
        await loadConversations();
      } else if (act === "reject") {
        await RequestsService.reject(id, state.token);
        console.log("Solicitação recusada com sucesso no servidor.");
      }

      const statusBadge = card.querySelector('.status-badge');
      const actionsDiv = card.querySelector('.solicitacao-actions');
      statusBadge.textContent = newStatus;
      statusBadge.className = `status-badge status-${newStatus.toLowerCase()}`;
      actionsDiv.querySelectorAll('button').forEach(b => b.remove());

    } catch (err) {
      console.error("Erro ao processar solicitação:", err);
      alert("Falha ao processar solicitação. A interface será restaurada.");

      originalRequest.status = originalStatus; 
      updateSummary(); 
      btn.innerHTML = originalButtonHTML;
      btn.disabled = false;
      if(otherButton) otherButton.disabled = false;
    }
  };
}


function updateSummary() {
  qs("supervisoes-count").textContent = state.requests.filter(x => x.status === "PENDENTE").length;
  qs("solicitacoes-count").textContent = state.requests.filter(x => x.status === "PENDENTE").length;
  qs("conversations-count").textContent = state.conversations.some(c => c.unread) ? "1" : "0";
}



async function loadConversations() {
  try {

    const reqs = await RequestsService.bySupervisor(state.supervisorId, state.token);
    state.requests = reqs;

    const accepted = (state.requests || []).filter(s => s.status && s.status.toUpperCase() === 'ACEITA');
    
    if (!accepted.length) {
      state.conversations = [];
      renderConversationsList();
      return;
    }

    const convs = [];
    for (const s of accepted) {
        const pId = Number(s.psicologo?.id ?? s.psicologoId);
        const supId = Number(state.supervisorId);

        if (!pId || !supId) {
            console.warn("IDs inválidos para criar conversa:", { pId, supId, s });
            continue;
        }

        try {
            const conv = await ConversationsService.between(pId, supId, state.token);
            const msgs = await MessagesService.listByConversation(conv.id, state.token);
            const last = msgs.at(-1);
            const peer = state.psychologists.find(x => String(x.id) === String(pId));

            convs.push({
                peerId: pId,
                conversaId: conv.id,
                name: peer?.nome || `Psicólogo #${pId}`,
                lastMessage: (last?.texto ?? last?.conteudo) || "Conversa iniciada",
                timestamp: last?.dataEnvio || new Date().toISOString(),
                unread: false,
                messages: msgs,
            });
        } catch (err) {
            console.warn(`Falha ao carregar detalhes da conversa para o psicólogo #${pId}`, err);
        }
    }
    
    state.conversations = convs;
    renderConversationsList();

  } catch (err) {
    console.error("Falha fatal ao carregar conversas:", err);
  }
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


async function sendMessage() {
    const input = qs("inputMensagem");
    if (!input) return;

    const text = input.value.trim();
    if (!text || !state.currentConversationId) return;

    const conversation = state.conversations.find(c => c.conversaId === state.currentConversationId);
    if (!conversation) return;

    const loggedUser = getLoggedUser();
    if (!loggedUser) {
        console.error("Supervisor não encontrado. Impossível enviar mensagem.");
        return;
    }


    const optimisticMessage = {
        conteudo: text, 
        remetente: { id: loggedUser.id }, 
        dataEnvio: new Date().toISOString(),
        optimisticId: `optimistic-${Date.now()}` 
    };

    conversation.messages.push(optimisticMessage);

    renderThread(qs("chat-messages"), conversation.messages, state.supervisorId);
    input.value = ""; 


    try {
        await MessagesService.send(text, state.currentConversationId, loggedUser, state.token);
        
        const realMessages = await MessagesService.listByConversation(state.currentConversationId, state.token);
        
        conversation.messages = realMessages;
        
        renderThread(qs("chat-messages"), conversation.messages, state.supervisorId);

    } catch (error) { 
        console.error("Falha ao enviar mensagem:", error);

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

document.addEventListener("DOMContentLoaded", async () => {
    const user = getLoggedUser();
    if (!user || user.tipoUsuario !== "supervisor") {
        alert("Acesso não autorizado. Faça login como supervisor.");
        location.href = "login.html";
        return;
    }
    state.token = user.token || null;
    state.supervisorId = user.id;

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar'); 

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }


    document.addEventListener('click', function(event) {
      const isClickInsideSidebar = sidebar.contains(event.target);
      const isClickOnToggleButton = sidebarToggle.contains(event.target);

      if (sidebar.classList.contains('active') && !isClickInsideSidebar && !isClickOnToggleButton) {
          sidebar.classList.remove('active');
      }
  });

  const navButtons = sidebar.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });
        });

  sidebar.addEventListener('click', function(event) {
      event.stopPropagation();
  });

    

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
            await loadPsychologists(); 
            if (tab === "agenda") {
              initializeAgenda(); 
              updateSummary();    
           }if (tab === "solicitacoes") {  await loadRequests(); }
            if (tab === "conversations") {
                
                await loadConversations();
            }
            if (tab === "perfil") {
                await loadSupervisorProfile();
            }
        }
    });
    await loadRequests();   
    updateSummary();  

    switchTab("agenda");
});
