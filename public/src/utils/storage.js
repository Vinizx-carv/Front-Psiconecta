// utils/storage.js
export function getLoggedUser() {
  try { return JSON.parse(localStorage.getItem("usuarioLogado")) || null; }
  catch { return null; }
}

export function setLoggedUser(u) {
  localStorage.setItem("usuarioLogado", JSON.stringify(u));
}

export function clearSession() {
  localStorage.removeItem("usuarioLogado");
}
