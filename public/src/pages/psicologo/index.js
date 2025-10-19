
import { mountTabs } from "../../ui/tabs.js";
import { getLoggedUser, clearSession } from "../../utils/storage.js";
import { 
  UsersService, 
  RequestsService, 
  MessagesService, 
  ConversationsService, 
  ProfileService 
} from "../../api/services.js";

import { renderContacts, renderThread } from "../../ui/chat.js";
import { renderProfileView, renderEditForm } from "../../ui/ProfileComponent.js";


const state = {
  token: null,
  psychologistId: null,
  supervisors: [], 
  myRequests: [],  
  conversations: [], 
  activeConversationId: null,
  pollingInterval: null,
};

function qs(id) {
  return document.getElementById(id);
}


async function loadSupervisors() {
  state.supervisors = await UsersService.listSupervisors(state.token);
  renderSupervisors(state.supervisors);
}

function renderSupervisors(items) {
  const grid = qs("supervisors-grid");
  const empty = qs("no-results");
  grid.innerHTML = "";
  if (!items?.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  items.forEach(s => {
    const card = document.createElement("div");
    card.className = "supervisor-card";
    card.innerHTML = `
      <div class="supervisor-header">
        <img src="${s.image || 'https://raw.githubusercontent.com/Vinizx-carv/Front-Psiconecta/9657e221a63752cc020d0d1b6e6c8609eb5ffdba/public/assets/img/perfil-foto.svg'}" alt="" class="supervisor-photo">
        <div class="supervisor-info">
          <h3 class="supervisor-name">${s.nome || "Sem nome"}</h3>
          <span class="supervisor-exp">${s.experience || ""}</span>
        </div>
      </div>
      <div class="supervisor-tags">${(s.tags || ["Ansiedade", "Autoconhecimento"]).map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <p class="supervisor-description">${s.descricao || "Descrição não disponível"}</p>
      <div class="supervisor-footer">
        <button class="btn-primary" data-request-id="${s.id}" data-name="${s.nome || 'Supervisor'}">Solicitar Supervisão</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function handleRequestSupervisor(e) {
    const btn = e.target.closest("button[data-request-id]");
    if (!btn) return;

    btn.disabled = true;
    btn.innerText = 'Enviando...';

    const supervisorId = Number(btn.dataset.requestId);
    const supervisorName = btn.dataset.name;

    const payload = {
      psicologo: { id: state.psychologistId },
      supervisor: { id: supervisorId },
      mensagem: "Gostaria de iniciar supervisão",
    };

    try {
      await RequestsService.create(payload, state.token);
      alert(`Solicitação enviada para ${supervisorName}`);
      btn.innerText = 'Enviado';
    } catch (err) {
      console.error("Erro ao criar solicitação:", err);
      alert("Erro ao enviar solicitação.");
      btn.disabled = false;
      btn.innerText = 'Solicitar Supervisão';
    }
}



async function loadMyRequests() {
  try {
    state.myRequests = await RequestsService.byPsychologist(state.psychologistId, state.token);
    renderMyRequests(state.myRequests);
  } catch (e) {
    console.warn("Falha ao carregar solicitações:", e);
    state.myRequests = [];
    renderMyRequests(state.myRequests);
  }
}

function renderMyRequests(list) {
  const container = qs("requests-list");
  const empty = qs("requests-empty-state");
  container.innerHTML = "";
  if (!list?.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  list.forEach(s => {
    const card = document.createElement("div");
    // Use a nova classe 'request-card'
    card.className = "request-card"; 
    card.innerHTML = `
      <h3>Supervisor: ${s.supervisor?.nome || `ID ${s.supervisorId}`}</h3>
      <span class="status-${s.status.toLowerCase()}">${s.status}</span>
    `;
    container.appendChild(card);
  });
}


// ------------------- FUNÇÕES DA ABA "CONVERSAS" (CHAT) -------------------

// NOVO CÓDIGO PARA /src/pages/psicologo/index.js -> loadAndRenderContacts

async function loadAndRenderContacts() {
  // Log para garantir que a função está sendo chamada
  console.log("1. Iniciando loadAndRenderContacts...");

  try {
    const acceptedRequests = state.myRequests.filter(req => req.status === "ACEITA");
    console.log("2. Solicitações ACEITAS encontradas:", acceptedRequests);

    if (acceptedRequests.length === 0) {
      qs("conversations-empty-state").style.display = "block";
      qs("chat-container").style.display = "none";
      return;
    }

    qs("conversations-empty-state").style.display = "none";
    qs("chat-container").style.display = "flex";

    const conversationPromises = acceptedRequests.map(async (request, index) => {
      console.log(`3.${index}. Processando requisição para supervisor:`, request.supervisor);
      const supervisor = request.supervisor;
      if (!supervisor?.id) return null;

      const convData = await ConversationsService.between(state.psychologistId, supervisor.id, state.token);
      console.log(`4.${index}. Dados da conversa (convData):`, convData);
      if (!convData?.id) return null;

      const messagesResponse = await MessagesService.listByConversation(convData.id, state.token);
      console.log(`5.${index}. Resposta CRUA da API de mensagens (messagesResponse):`, messagesResponse);

      const messages = messagesResponse.content || messagesResponse;
      console.log(`6.${index}. Array de mensagens processado (messages):`, messages);

      const lastMessageObj = messages.at(-1);
      console.log(`7.${index}. Objeto da última mensagem (lastMessageObj):`, lastMessageObj);

      const lastMessageText = lastMessageObj?.conteudo || lastMessageObj?.texto || "Nenhuma mensagem.";
      console.log(`8.${index}. Texto final da última mensagem (lastMessageText):`, lastMessageText);
      
      const conversationObject = {
        id: convData.id,
        name: supervisor.nome,
        lastMessage: lastMessageText, 
        timestamp: lastMessageObj?.dataEnvio,
        messages: messages
      };

      return conversationObject;
    });

    const conversations = (await Promise.all(conversationPromises)).filter(Boolean);
    console.log("9. Array FINAL de todas as conversas:", conversations);

    state.conversations = conversations;
    renderContacts(qs("contact-list"), conversations, (item) => openConversation(item.id));
    console.log("10. Renderização dos contatos concluída.");

  } catch (error) {
    console.error("ERRO GERAL em loadAndRenderContacts:", error);
  }
}


function openConversation(conversationId) {
  stopPolling();
  state.activeConversationId = conversationId;
  const conversation = state.conversations.find(c => c.id === conversationId);
  if (!conversation) return;
  qs("chat-header").innerText = conversation.name;
  qs("chat-input-area").style.display = "flex";
  renderThread(qs("chat-messages"), conversation.messages, state.psychologistId);
  startPolling();
}


async function sendMessage() {
  const input = qs("inputMensagem");
  const text = input.value.trim();
  if (!text || !state.activeConversationId) return;

  const conversation = state.conversations.find(c => c.id === state.activeConversationId);
  if (!conversation) return;

  const optimisticMessage = { texto: text, remetente: { id: state.psychologistId }, dataEnvio: new Date().toISOString() };
  conversation.messages.push(optimisticMessage);
  renderThread(qs("chat-messages"), conversation.messages, state.psychologistId);
  input.value = "";

  try {
 
    const loggedUser = getLoggedUser(); 
    if (!loggedUser) {
      console.error("Usuário não encontrado. Impossível enviar mensagem.");
      return;
    }

    await MessagesService.send(text, state.activeConversationId, loggedUser, state.token);
    
    const response = await MessagesService.listByConversation(state.activeConversationId, state.token);
    conversation.messages = response.content || response;
    renderThread(qs("chat-messages"), conversation.messages, state.psychologistId);

  } catch (error) { 
    console.error("Falha ao enviar mensagem:", error); 
  }
}


function startPolling() {
  stopPolling();
  state.pollingInterval = setInterval(async () => {
    if (!state.activeConversationId) return;
    try {
      const response = await MessagesService.listByConversation(state.activeConversationId, state.token);
      const messages = response.content || response;
      const conversation = state.conversations.find(c => c.id === state.activeConversationId);
      if (conversation && messages.length > conversation.messages.length) {
        conversation.messages = messages;
        renderThread(qs("chat-messages"), messages, state.psychologistId);
      }
    } catch (error) { console.error("Erro durante o polling:", error); }
  }, 5000);
}

function stopPolling() {
  if (state.pollingInterval) clearInterval(state.pollingInterval);
}


const psicologoConfig = {
  roleName: 'Psicólogo Registrado',
  fields: {



    dataNascimento: { label: 'Data de Nascimento', icon: 'fa-calendar-alt' },
    telefone: { label: 'Telefone', icon: 'fa-phone' },
    cidade: { label: 'Cidade', icon: 'fa-map-marker-alt' },
    uf: { label: 'UF', icon: 'fa-map-pin' },
    areaDesejada: { label: 'Área Desejada', icon: 'fa-tasks' }
  }
};

let psicologoProfileData = {};

async function loadPsicologoProfile() {
  const profileCard = document.querySelector('#profile-tab .profile-card');
  if (!profileCard) return;

  try {
      psicologoProfileData = await ProfileService.getPsicologo(state.psychologistId, state.token);
      const onEdit = () => renderEditForm(profileCard, psicologoProfileData, psicologoConfig, handleProfileSave, handleProfileCancel);
      renderProfileView(profileCard, psicologoProfileData, psicologoConfig, onEdit);
  } catch (error) {
      profileCard.innerHTML = `<p>Erro ao carregar perfil.</p>`;
  }
}


async function handleProfileSave(updatedDataFromForm) {
    const profileCard = document.querySelector('#profile-tab .profile-card');
    const currentData = psicologoProfileData;


    const processedData = { ...updatedDataFromForm };

    if (processedData.dataNascimento) {
        const parts = processedData.dataNascimento.split('');
        if (parts.length === 3 && parts[0].length === 2) { // Detecta formato DD-MM-YYYY
            processedData.dataNascimento = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    
    const completePayload = { ...currentData, ...processedData };

    delete completePayload.id;
    delete completePayload.senha;

    console.log("Payload final que será enviado via PUT:", JSON.stringify(completePayload, null, 2));

    try {
        const result = await ProfileService.updatePsicologo(state.psychologistId, completePayload, state.token);

        psicologoProfileData = result;

        const onEdit = () => renderEditForm(profileCard, psicologoProfileData, psicologoConfig, handleProfileSave, handleProfileCancel);
        renderProfileView(profileCard, psicologoProfileData, psicologoConfig, onEdit);
        
        alert('Perfil atualizado com sucesso!');
    } catch (error) {
        console.error('Falha ao salvar o perfil do psicólogo:', error);
        const errorMessage = error.message || "Verifique os dados e tente novamente.";
        alert(`Não foi possível salvar as alterações: ${errorMessage}`);
    }
}





function handleProfileCancel() {
  const profileCard = document.querySelector('#profile-tab .profile-card');
  const onEdit = () => renderEditForm(profileCard, psicologoProfileData, psicologoConfig, handleProfileSave, handleProfileCancel);
  renderProfileView(profileCard, psicologoProfileData, psicologoConfig, onEdit);
}


document.addEventListener("DOMContentLoaded", async () => {
  const user = getLoggedUser();
  if (!user || user.tipoUsuario !== "psicologo") {
    alert("Acesso não autorizado.");
    location.href = "login.html";
    return;
  }

  state.token = user.token;
  state.psychologistId = user.id;

  qs("send-btn").addEventListener("click", sendMessage);
  qs("inputMensagem").addEventListener("keypress", e => { if (e.key === 'Enter') sendMessage(); });
  qs("logout-btn").addEventListener("click", () => { clearSession(); location.href = "index.html"; });
  qs("supervisors-grid").addEventListener("click", handleRequestSupervisor);

  const { switchTab } = mountTabs({
    onTab: async (tabId) => {
      stopPolling();
      if (tabId === "search") {
        await loadSupervisors();
      }
      if (tabId === "requests") {
        await loadMyRequests();
      }
      if (tabId === "conversations") {
        await loadMyRequests(); 
        await loadAndRenderContacts();
      }
      if (tabId === "profile") {
        await loadPsicologoProfile();
      }
    }
  });

  switchTab("search"); 
});
