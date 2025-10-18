// Arquivo: src/ui/ProfileComponent.js

// Garanta que este seja o conteúdo exato do seu arquivo.

export function renderProfileView(container, data, config, onEdit) {
    const detailFields = Object.keys(config.fields).map(key => `
        <div class="detail-item">
            <i class="fas ${config.fields[key].icon}"></i>
            <div>
                <p class="detail-label">${config.fields[key].label}</p>
                <p class="detail-value">${data[key] || 'Não informado'}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar"><i class="fas fa-user-circle"></i></div>
            <div class="profile-info">
                <h2>${data.nome}</h2>
                <p>${config.roleName}</p>
            </div>
        </div>
        <div class="profile-details">
            <div class="detail-item">
                <i class="fas fa-envelope"></i>
                <div>
                    <p class="detail-label">E-mail</p>
                    <p class="detail-value">${data.email || 'Não informado'}</p>
                </div>
            </div>
            ${detailFields}
        </div>
        <div class="profile-actions">
            <button class="btn-edit-profile btn-secondary">Editar Perfil</button>
        </div>
    `;

    const editButton = container.querySelector('.btn-edit-profile');
    if (editButton) {
        editButton.addEventListener('click', onEdit);
    }
}

export function renderEditForm(container, data, config, onSave, onCancel) {
    const formFields = Object.keys(config.fields).map(key => `
        <div class="form-group">
            <label for="${key}">${config.fields[key].label}</label>
            <input type="text" id="${key}" value="${data[key] || ''}" required>
        </div>
    `).join('');

    container.innerHTML = `
        <form class="edit-profile-form" id="edit-form">
            <div class="form-group">
                <label for="nome">Nome Completo</label>
                <input type="text" id="nome" value="${data.nome || ''}" required>
            </div>
             <div class="form-group">
                <label for="email">E-mail</label>
                <input type="email" id="email" value="${data.email || ''}" required>
            </div>
            ${formFields}
            <div class="form-actions">
                <button type="submit" class="btn-primary">Salvar</button>
                <button type="button" class="btn-cancel btn-secondary">Cancelar</button>
            </div>
        </form>
    `;

    const cancelButton = container.querySelector('.btn-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', onCancel);
    }

    const form = container.querySelector('#edit-form');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const updatedData = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value
            };
            for (const key in config.fields) {
                updatedData[key] = document.getElementById(key).value;
            }
            
            onSave(updatedData);
        });
    }
}
