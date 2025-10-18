

// ========================================================================
//          CÓDIGO UNIVERSAL E FINAL PARA /src/ui/chat.js
// ========================================================================

// Supondo que você tenha essa função em /utils/dates.js
import { formatDateTimeISO } from "../utils/dates.js";

/**
 * Renderiza a lista de contatos de forma flexível.
 */
export function renderContacts(listEl, items, onOpen) {
  listEl.innerHTML = "";
  if (!items?.length) {
    listEl.innerHTML = "<p>Nenhuma conversa encontrada.</p>";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "contato";

    // --- LÓGICA UNIVERSAL ---
    // Tenta usar 'item.name', se não existir, usa 'item.peerName'.
    const name = item.name || item.peerName || "Contato Desconhecido";
    // Tenta usar 'item.lastMessage', se não existir, usa 'item.lastMessageText'.
    const lastMessage = item.lastMessage || item.lastMessageText || "Nenhuma mensagem.";

    div.innerHTML = `
      <div class="contato-info">
        <h5>${name}</h5>
        <p>${lastMessage}</p>
        <span class="timestamp">${formatDateTimeISO(item.timestamp)}</span>
      </div>
      ${item.unread ? '<div class="unread-indicator"></div>' : ""}
    `;
    div.onclick = () => onOpen(item);
    listEl.appendChild(div);
  });
}

/**
 * Renderiza o histórico de mensagens de forma flexível.
 */
export function renderThread(boxEl, messages, selfId) {
  boxEl.innerHTML = "";
  if (!messages || messages.length === 0) {
    boxEl.innerHTML = '<p class="chat-empty-state">Nenhuma mensagem nesta conversa.</p>';
    return;
  }

  messages.forEach(m => {
    // --- LÓGICA UNIVERSAL ---
    // Verifica 'm.remetente.id' primeiro, se não, verifica 'm.remetenteId'.
    const senderId = m.remetente?.id ?? m.remetenteId;
    const isSentByMe = senderId === selfId;

    const div = document.createElement("div");
    div.className = `message-wrapper ${isSentByMe ? 'sent' : 'received'}`;
    
    // Tenta usar 'm.texto' primeiro, se não, usa 'm.conteudo'.
    const messageText = m.texto || m.conteudo || "<i>Mensagem vazia</i>";

    div.innerHTML = `
      <div class="message-bubble">
        <p class="message-text">${messageText}</p>
        <span class="message-timestamp">${new Date(m.dataEnvio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
      </div>
    `;

    boxEl.appendChild(div);
  });
  
  boxEl.scrollTop = boxEl.scrollHeight;
}
