// utils/dates.js
export function formatDateTimeISO(iso) {
  const d = new Date(iso || Date.now());
  return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export function formatDateISO(iso) {
  const d = new Date(iso || Date.now());
  return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" });
}
