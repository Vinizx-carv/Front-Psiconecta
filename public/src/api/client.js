// api/client.js
const API_BASE = "https://willing-brett-psiconecta-48c1f0c2.koyeb.app";

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text || `HTTP ${res.status}`;
    throw new Error(message);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export function makeHeaders(token, extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}


export async function get(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  return handleResponse(res);
}


export async function post(endpoint, body, token) {
  const url = `${API_BASE}${endpoint}`; 
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',

      ...(token && { 'Authorization': `Bearer ${token}` }), 
    },
    ...(body && { body: JSON.stringify(body) }),
  };

  try {
    const response = await fetch(url, options);


    const contentType = response.headers.get("content-type");
    
    if (!response.ok) {
        let error = { message: `Erro HTTP: ${response.status} ${response.statusText}` };
        if (contentType && contentType.includes("application/json")) {
            error = await response.json();
        }
        throw new Error(error.message || 'Ocorreu um erro na requisição.');
    }


    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    } else {
        return { success: true };
    }


  } catch (error) {
    console.error(`Falha na requisição POST para ${endpoint}:`, error);
    throw error; 
  }
}


export async function put(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: makeHeaders(token),
    body: body ? JSON.stringify(body) : undefined
  });
  return handleResponse(res);
}






