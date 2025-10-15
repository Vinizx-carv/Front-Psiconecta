// ui/chat.js



import { formatDateTimeISO } from "../utils/dates.js";



export function renderContacts(listEl, items, onOpen) {
  listEl.innerHTML = "";
  if (!items?.length) return;
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "contato";
    div.innerHTML = `
      <div class="contato-info">
        <h5>${item.name}</h5>
        <p>${item.lastMessage || "Conversa iniciada"}</p>
        <span class="timestamp">${formatDateTimeISO(item.timestamp)}</span>
      </div>
      ${item.unread ? '<div class="unread-indicator"></div>' : ""}
    `;
    div.onclick = () => onOpen(item);
    listEl.appendChild(div);
  });
}

export function renderThread(boxEl, messages, selfId) {
  boxEl.innerHTML = "";
  if (!messages?.length) return;
  messages.forEach(m => {
    const div = document.createElement("div");
    div.className = m.remetenteId === selfId ? "msg supervisor" : "msg psicologo";
    const span = document.createElement("span");
    span.textContent = m.conteudo;
    const date = document.createElement("span");
    date.className = "data-msg";
    date.textContent = formatDateTimeISO(m.dataEnvio || m.data || m.createdAt);
    div.appendChild(span);
    div.appendChild(date);
    boxEl.appendChild(div);
  });
}
