const API_BASE = "https://apimensagemlogin-production.up.railway.app";
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

function mostrarSecao(id) {
  const secoes = document.querySelectorAll(".secao");
  secoes.forEach(secao => secao.classList.remove("ativa"));
  document.getElementById(id).classList.add("ativa");

  if (id === "solicitacoes") {
    carregarSolicitacoes();
  } else if (id === "conversas") {
    carregarConversas();
  }
}

function gerarCalendario() {
  const calendario = document.getElementById("calendario");
  calendario.innerHTML = "";
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diasDoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

  const diasAgendados = [3, 10, 15, 22];
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const vazio = document.createElement("div");
    calendario.appendChild(vazio);
  }

  for (let dia = 1; dia <= diasDoMes; dia++) {
    const div = document.createElement("div");
    div.classList.add("dia");
    if (diasAgendados.includes(dia)) div.classList.add("agendado");
    div.textContent = dia;
    calendario.appendChild(div);
  }
}


async function carregarSolicitacoes() {
  try {
    const resSolic = await fetch(`${API_BASE}/solicitacoes/supervisor/${SUPERVISOR_ID}`);
    solicitacoes = await resSolic.json();

    // Depois que solicitacoes carregarem, carrega psicólogos
    const resPsicos = await fetch(`${API_BASE}/usuarios/tipo/psicologo`);
    psicologos = await resPsicos.json();

    renderizarSolicitacoes();

    // Após carregar solicitações, atualiza conversas
    await carregarConversas();
  } catch (erro) {
    console.error("Erro ao carregar solicitações:", erro);
    document.getElementById("listaSolicitacoes").innerText = "Erro ao carregar solicitações.";
  }
}

function renderizarSolicitacoes() {
  const container = document.getElementById("listaSolicitacoes");
  container.innerHTML = "";

  if (solicitacoes.length === 0) {
    container.innerHTML = "<p>Nenhuma solicitação encontrada.</p>";
    return;
  }

  solicitacoes.forEach(s => {
    const psicologo = psicologos.find(p => p.id === s.psicologoId);
    const nome = psicologo ? psicologo.nome : `Psicólogo ID ${s.psicologoId}`;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${nome}</h3>
      <p>Status: ${s.status}</p>
      <p>Data: ${new Date(s.dataSolicitacao).toLocaleString("pt-BR")}</p>
      ${s.status === "PENDENTE" ? `
        <button onclick="responder(${s.id}, 'aceitar')">Aceitar</button>
        <button onclick="responder(${s.id}, 'recusar')">Recusar</button>
      ` : ""}
      ${s.status === "ACEITA" ? `
        <button onclick="iniciarConversa(${s.psicologoId})">Iniciar Conversa</button>
      ` : ""}
    `;
    container.appendChild(div);
  });
}

async function responder(id, acao) {
  try {
    await fetch(`${API_BASE}/solicitacoes/${id}/${acao}`, {
      method: "POST"
    });
    carregarSolicitacoes();
  } catch (erro) {
    alert("Erro ao responder solicitação.");
  }
}

// --- Chat ---

async function carregarConversas() {
  try {
    // Filtra solicitações aceitas
    const aceitas = solicitacoes.filter(s => s.status === "ACEITA");

    // Para cada psicólogo com solicitação aceita, busca mensagens
    conversas = await Promise.all(
      aceitas.map(async (s) => {
        const psicologoId = s.psicologoId;
        const resMsgs = await fetch(`${API_BASE}/mensagens/${SUPERVISOR_ID}/${psicologoId}`);
        const mensagens = await resMsgs.json();
        return { psicologoId, mensagens };
      })
    );

    renderListaContatos();

    if (conversas.length > 0) {
      selecionarConversa(conversas[0].psicologoId);
    } else {
      limparChat();
    }
  } catch (erro) {
    console.error("Erro ao carregar conversas:", erro);
  }
}

function renderListaContatos() {
  const listaContatos = document.getElementById("listaContatos");
  listaContatos.innerHTML = "";

  conversas.forEach(c => {
    const psicologo = psicologos.find(p => p.id === c.psicologoId);
    const nome = psicologo ? psicologo.nome : `Psicólogo #${c.psicologoId}`;

    const div = document.createElement("div");
    div.className = "contato";
    div.textContent = nome;
    div.onclick = () => selecionarConversa(c.psicologoId);

    if (c.psicologoId === conversaAtualId) {
      div.classList.add("selecionado");
    }

    listaContatos.appendChild(div);
  });
}

function selecionarConversa(psicologoId) {
  conversaAtualId = psicologoId;
  const chatHeader = document.getElementById("chatHeader");
  const chatMensagens = document.getElementById("chatMensagens");
  const inputMensagem = document.getElementById("inputMensagem");
  const btnEnviar = document.getElementById("btnEnviar");

  const psicologo = psicologos.find(p => p.id === psicologoId);
  chatHeader.textContent = psicologo ? psicologo.nome : `Psicólogo #${psicologoId}`;

  const conversa = conversas.find(c => c.psicologoId === psicologoId);
  chatMensagens.innerHTML = "";

  if (!conversa || conversa.mensagens.length === 0) {
    chatMensagens.innerHTML = "<p>Nenhuma conversa iniciada.</p>";
  } else {
    conversa.mensagens.forEach(msg => {
      const div = document.createElement("div");
      if (msg.remetenteId === SUPERVISOR_ID) {
        div.className = "msg supervisor";
      } else {
        div.className = "msg psicologo";
      }

      // Conteúdo da mensagem
      const texto = document.createElement("span");
      texto.textContent = msg.conteudo;
      div.appendChild(texto);

      // Data da mensagem formatada
      const dataSpan = document.createElement("span");
      dataSpan.className = "data-msg";
      // Usar o campo correto da data da mensagem (adeque ao seu backend)
      const data = new Date(msg.dataEnvio || msg.data || msg.createdAt || Date.now());
      dataSpan.textContent = data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      div.appendChild(dataSpan);

      chatMensagens.appendChild(div);
    });
  }

  inputMensagem.disabled = false;
  btnEnviar.disabled = false;
  inputMensagem.focus();

  // Scroll para o final do chat
  chatMensagens.scrollTop = chatMensagens.scrollHeight;
}

async function enviarMensagem() {
  const inputMensagem = document.getElementById("inputMensagem");
  const texto = inputMensagem.value.trim();
  if (!texto || conversaAtualId === null) return;

  const novaMensagem = {
    remetenteId: SUPERVISOR_ID,
    destinatarioId: conversaAtualId,
    conteudo: texto,
    lida: false
  };

  try {
    const res = await fetch(`${API_BASE}/mensagens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novaMensagem),
    });

    if (!res.ok) throw new Error("Falha ao enviar mensagem");

    const msgEnviada = await res.json();

    // Atualiza a conversa localmente
    const conversa = conversas.find(c => c.psicologoId === conversaAtualId);
    if (conversa) {
      conversa.mensagens.push(msgEnviada);
    }

    selecionarConversa(conversaAtualId);
    inputMensagem.value = "";
    inputMensagem.focus();
  } catch (error) {
    alert("Erro ao enviar mensagem.");
    console.error(error);
  }
}

function iniciarConversa(psicologoId) {
  let conversa = conversas.find(c => c.psicologoId === psicologoId);
  if (!conversa) {
    conversa = { psicologoId, mensagens: [] };
    conversas.push(conversa);
  }

  mostrarSecao("conversas");
  selecionarConversa(psicologoId);
}

function limparChat() {
  conversaAtualId = null;
  const chatHeader = document.getElementById("chatHeader");
  const chatMensagens = document.getElementById("chatMensagens");
  const inputMensagem = document.getElementById("inputMensagem");
  const btnEnviar = document.getElementById("btnEnviar");

  chatHeader.textContent = "Selecione um contato";
  chatMensagens.innerHTML = "";
  inputMensagem.disabled = true;
  btnEnviar.disabled = true;
}

document.getElementById("btnEnviar")?.addEventListener("click", enviarMensagem);
document.getElementById("inputMensagem")?.addEventListener("keypress", e => {
  if (e.key === "Enter") enviarMensagem();
});

document.addEventListener("DOMContentLoaded", () => {
  gerarCalendario();
  carregarSolicitacoes();
});
document.addEventListener("DOMContentLoaded", gerarCalendario);

setInterval(() => {
  if (document.getElementById("conversas").classList.contains("ativa") && conversaAtualId !== null) {
    // Atualiza a conversa atual sem recarregar toda a lista
    atualizarMensagens(conversaAtualId);
  }
}, 5000); // a cada 5 segundos

async function atualizarMensagens(supervisorId) {
  try {
    const res = await fetch(`${API_BASE}/mensagens/${SUPERVISOR_ID}/${supervisorId}`);
    if (!res.ok) throw new Error("Erro ao buscar mensagens");
    const mensagens = await res.json();

    // Aqui depende do formato da variável `conversas`
    // Se for array:
    const conversa = conversas.find(c => c.psicologoId === supervisorId);
    if (conversa) {
      conversa.mensagens = mensagens;
      if (supervisorId === conversaAtualId) {
        selecionarConversa(supervisorId);
      }
    } else {
      // Se não encontrou a conversa, pode adicionar ela:
      conversas.push({ psicologoId: supervisorId, mensagens });
    }
  } catch (erro) {
    console.error("Erro ao atualizar mensagens:", erro);
  }
}