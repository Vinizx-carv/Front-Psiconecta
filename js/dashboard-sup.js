const API_BASE = "https://willing-brett-psiconecta-48c1f0c2.koyeb.app";


const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

if (!usuarioLogado || usuarioLogado.tipoUsuario !== "supervisor") {
  alert("Acesso não autorizado. Faça login como supervisor.");
  window.location.href = "login.html";
}

const SUPERVISOR_ID = usuarioLogado.id;

let psicologos = [];
let solicitacoes = [];
let conversas = [];
let conversaAtualId = null; // psicologoId da conversa aberta

// Elementos DOM
document.addEventListener("DOMContentLoaded", () => {

});
const navButtons = document.querySelectorAll(".nav-button[data-tab]");
const tabContents = document.querySelectorAll(".tab-content");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebar = document.getElementById("sidebar");
const logoutBtn = document.getElementById("logout-btn");

// Navegação entre abas
function switchTab(tabId) {
  navButtons.forEach((btn) => btn.classList.remove("active"));
  tabContents.forEach((content) => content.classList.remove("active"));

  const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(`${tabId}-tab`);

  if (activeButton && activeContent) {
    activeButton.classList.add("active");
    activeContent.classList.add("active");

    if (tabId === "agenda") {
      renderAgenda();
    } else if (tabId === "solicitacoes") {
      carregarSolicitacoes();
    } else if (tabId === "conversas") {
      carregarConversas();
    }
  }
}

// Renderizar agenda (continua igual)
function renderAgenda() {
  //renderProximosCompromissos();
  //renderCalendar();
  //updateSummary();
}

// Você pode manter a função renderProximosCompromissos e renderCalendar iguais,
// mas se quiser, também pode carregar compromissos via API e substituir o array local.

// Atualiza resumo das contagens
function updateSummary() {
  document.getElementById("supervisoes-count").textContent = solicitacoes.filter((s) => s.status === "PENDENTE").length;
  document.getElementById("solicitacoes-count").textContent = solicitacoes.filter((s) => s.status === "PENDENTE").length;
  document.getElementById("conversas-count").textContent = conversas.some(c => c.naoLida) ? "1" : "0"; // ajuste simples
}

// ------ CARREGAMENTO DE SOLICITAÇÕES ------

async function carregarSolicitacoes() {
  try {

    
    // Busca solicitações do supervisor logado
    const resSolic = await fetch(`${API_BASE}/solicitacoes/supervisor/${SUPERVISOR_ID}`);
    solicitacoes = await resSolic.json();

    // Busca psicólogos para exibir nome e área (caso queira, senão adapte)
    const resPsicos = await fetch(`${API_BASE}/usuarios/tipo/psicologo`);
    psicologos = await resPsicos.json();

    renderSolicitacoes();
    updateSummary();
  } catch (erro) {
    console.error("Erro ao carregar solicitações:", erro);
    const container = document.getElementById("solicitacoes-list");
    container.innerHTML = "<p>Erro ao carregar solicitações.</p>";
  }
}

function renderSolicitacoes() {
  const container = document.getElementById("solicitacoes-list");
  const emptyState = document.getElementById("solicitacoes-empty-state");

  container.innerHTML = "";

  if (solicitacoes.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  solicitacoes.forEach((solicitacao) => {
    // Pega psicologo pelo id
    const psicologo = psicologos.find(p => p.id === solicitacao.psicologoId) || {};
    const nome = psicologo.nome || "Psicólogo desconhecido";
    const area = psicologo.area || "Área não informada";

    const card = document.createElement("div");
    card.className = "solicitacao-card";
    card.innerHTML = `
      <div class="solicitacao-header">
          <div class="solicitacao-info">
              <div class="solicitacao-avatar">
                  ${nome.split(" ").map(n => n[0]).join("")}
              </div>
              <div class="solicitacao-details">
                  <h3>${nome}</h3>
                  <p>${area}</p>
                  <p>Solicitado em ${formatDate(solicitacao.dataSolicitacao)}</p>
              </div>
          </div>
          <div class="solicitacao-actions">
              <span class="status-badge status-${solicitacao.status.toLowerCase()}">
                  ${solicitacao.status}
              </span>
              ${solicitacao.status === "PENDENTE" ? `
                <button class="btn-primary" onclick="responderSolicitacao(${solicitacao.id}, 'ACEITA')">Aceitar</button>
                <button class="btn-outline" onclick="responderSolicitacao(${solicitacao.id}, 'RECUSADA')">Recusar</button>
              ` : ""}
          </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Responde a solicitação via API
async function responderSolicitacao(id, novoStatus) {
  try {
    // Mapeia os status para os endpoints do backend
    const endpointStatus = novoStatus === "ACEITA" ? "aceitar" : "recusar";
    const res = await fetch(`${API_BASE}/solicitacoes/${id}/${endpointStatus}`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Erro ao atualizar solicitação");

    // Recarrega solicitações após responder
    await carregarSolicitacoes();

    // Se aceitou, recarrega conversas para refletir
    if (novoStatus === "ACEITA") {
      await carregarConversas();
    }
  } catch (err) {
    alert("Erro ao responder solicitação.");
    console.error(err);
  }
}

// ------ CARREGAMENTO DE CONVERSAS ------

async function carregarConversas() {
  try {
    // Pega solicitações aceitas
    const aceitas = solicitacoes.filter(s => s.status === "ACEITA");

    // Para cada psicólogo aceito, busca mensagens
    conversas = await Promise.all(
      aceitas.map(async (s) => {
        const psicologoId = s.psicologoId;
        const resMsgs = await fetch(`${API_BASE}/mensagens/${SUPERVISOR_ID}/${psicologoId}`);
        const mensagens = await resMsgs.json();

        // Busca nome do psicologo
        const psicologo = psicologos.find(p => p.id === psicologoId) || {};
        const ultimaMsg = mensagens.length > 0 ? mensagens[mensagens.length - 1].conteudo : "Conversa iniciada";
        const ultimaData = mensagens.length > 0 ? mensagens[mensagens.length - 1].dataEnvio : new Date().toISOString();

        return {
          psicologoId,
          psicologoNome: psicologo.nome || `Psicólogo #${psicologoId}`,
          mensagens,
          ultimaMensagem: ultimaMsg,
          timestamp: ultimaData,
          naoLida: mensagens.some(m => !m.lida && m.remetenteId === psicologoId),
        };
      })
    );

    renderConversas();
  } catch (err) {
    console.error("Erro ao carregar conversas:", err);
  }
}

function renderConversas() {
  const emptyState = document.getElementById("conversas-empty-state");
  const chatContainer = document.getElementById("chat-container");
  const contactList = document.getElementById("contact-list");

  if (conversas.length === 0) {
    emptyState.style.display = "block";
    chatContainer.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  chatContainer.style.display = "block";

  contactList.innerHTML = "";

  conversas.forEach((conversa) => {
    const div = document.createElement("div");
    div.className = "contato";
    div.innerHTML = `
      <div class="contato-info">
          <h5>${conversa.psicologoNome}</h5>
          <p>${conversa.ultimaMensagem}</p>
          <span class="timestamp">${formatDate(conversa.timestamp)}</span>
      </div>
      ${conversa.naoLida ? '<div class="unread-indicator"></div>' : ""}
    `;
    div.onclick = () => abrirConversa(conversa);
    contactList.appendChild(div);
  });
}

// Abrir conversa e mostrar mensagens
async function abrirConversa(conversa) {
  conversaAtualId = conversa.psicologoId;
  document.getElementById("chat-header").textContent = conversa.psicologoNome;
  document.getElementById("chat-input-area").style.display = "flex";

  try {
    const res = await fetch(`${API_BASE}/mensagens/${SUPERVISOR_ID}/${conversa.psicologoId}`);
    const mensagens = await res.json();

    const messagesContainer = document.getElementById("chat-messages");
    messagesContainer.innerHTML = "";

    if (mensagens.length === 0) {
      messagesContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">
        Conversa com ${conversa.psicologoNome}
      </div>`;
    } else {
      mensagens.forEach((msg) => {
        const div = document.createElement("div");
        div.className = msg.remetenteId === SUPERVISOR_ID ? "msg supervisor" : "msg psicologo";

        const texto = document.createElement("span");
        texto.textContent = msg.conteudo;
        div.appendChild(texto);

        const dataSpan = document.createElement("span");
        dataSpan.className = "data-msg";
        const data = new Date(msg.dataEnvio || msg.data || msg.createdAt || Date.now());
        dataSpan.textContent = data.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        div.appendChild(dataSpan);

        messagesContainer.appendChild(div);
      });
    }
  } catch (err) {
    console.error("Erro ao abrir conversa:", err);
  }
}

// Enviar mensagem via API
async function enviarMensagem() {
  const input = document.getElementById("inputMensagem");
  const texto = input.value.trim();

  if (!texto || conversaAtualId === null) return;

  const novaMensagem = {
    remetenteId: SUPERVISOR_ID,
    destinatarioId: conversaAtualId,
    conteudo: texto,
    lida: false,
  };

  try {
    const res = await fetch(`${API_BASE}/mensagens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novaMensagem),
    });
    if (!res.ok) throw new Error("Falha ao enviar mensagem");

    // Atualiza localmente para atualizar o chat
    const msgEnviada = await res.json();

    const conversa = conversas.find(c => c.psicologoId === conversaAtualId);
    if (conversa) {
      conversa.mensagens.push(msgEnviada);
      conversa.ultimaMensagem = msgEnviada.conteudo;
      conversa.timestamp = msgEnviada.dataEnvio || new Date().toISOString();
    }

    abrirConversa(conversa);

    input.value = "";
    input.focus();
  } catch (err) {
    alert("Erro ao enviar mensagem.");
    console.error(err);
  }
}

// Atualiza mensagens a cada 5 segundos se conversa aberta
setInterval(async () => {
  if (document.getElementById("conversas-tab").classList.contains("active") && conversaAtualId !== null) {
    try {
      const res = await fetch(`${API_BASE}/mensagens/${SUPERVISOR_ID}/${conversaAtualId}`);
      if (!res.ok) throw new Error("Erro ao buscar mensagens");
      const mensagens = await res.json();

      const conversa = conversas.find(c => c.psicologoId === conversaAtualId);
      if (conversa) {
        conversa.mensagens = mensagens;
        abrirConversa(conversa);
      }
    } catch (err) {
      console.error("Erro ao atualizar mensagens:", err);
    }
  }
}, 5000);

// Utilitário de formatação de data (pode manter o seu)
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Event Listeners originais (com pequenas adaptações para usar as funções novas)
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabId = button.getAttribute("data-tab");
    switchTab(tabId);

    if (window.innerWidth <= 768) {
      sidebar.classList.remove("open");
    }
  });
});

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (window.innerWidth <= 768) {
    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  }
});

logoutBtn.addEventListener("click", () => {
  alert("Logout realizado com sucesso!");
  window.location.href = "index.html";
});

// Navegação do calendário
document.getElementById("prev-month").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("next-month").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// Enter para enviar mensagem
document.getElementById("inputMensagem").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    enviarMensagem();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    sidebar.classList.remove("open");
  }
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  switchTab("agenda");
  carregarSolicitacoes();
  carregarConversas();
});
