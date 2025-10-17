let currentEditingClient = null;

// Logout functionality
function logout() {
    // Clear the auth token
    localStorage.removeItem('admin_token');
    // Redirect to login page
    window.location.href = 'login.html';
}

// Add logout event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

function getAuthToken() {
    return localStorage.getItem('admin_token');
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch('../api/admin/auth?action=check', {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (!result.logged_in) {
            localStorage.removeItem('admin_token');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    }
}

async function loadClients() {
    try {
        const response = await fetch('../api/clients', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const clients = await response.json();
        renderClientCards(clients);
    } catch (error) {
        console.error('Error loading clients:', error);
        showNotification('Failed to load clients', 'error');
    }
}

function renderClientCards(clients) {
    const container = document.getElementById('clientsContainer');
    
    if (!clients || clients.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No clients yet. Add your first client!</p>';
        return;
    }
    
    container.innerHTML = clients.map(client => createClientCard(client)).join('');
    
    // Add event listeners
    setTimeout(() => {
        document.querySelectorAll('.edit-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const clientId = btn.getAttribute('data-id');
                editClient(clientId, clients);
            });
        });
        
        document.querySelectorAll('.delete-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const clientId = btn.getAttribute('data-id');
                deleteClient(clientId);
            });
        });
    }, 100);
}

function createClientCard(client) {
    const firstImage = client.images ? client.images[0] : client.image;
    const imageCount = client.images ? client.images.length : (client.image ? 1 : 0);
    
    return `
        <div class="client-card bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div class="text-center">
                <div class="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
                    <img src="${firstImage}" alt="${client.name}" class="w-full h-full object-cover">
                    ${imageCount > 1 ? `<div class="absolute top-0 right-0 bg-blue-600 text-white text-xs px-1 py-0.5 rounded-bl-full">+${imageCount - 1}</div>` : ''}
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-1">${client.name}</h3>
                ${client.company ? `<p class="text-blue-600 text-sm mb-2">${client.company}</p>` : ''}
                ${client.testimonial ? `<p class="text-gray-600 text-xs italic">"${client.testimonial.substring(0, 50)}..."</p>` : ''}
            </div>
            <div class="flex gap-2 mt-4">
                <button class="edit-client-btn flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${client.id}">
                    Edit
                </button>
                <button class="delete-client-btn bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${client.id}">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function openModal(title = 'Add New Client') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('clientModal').classList.remove('hidden');
    
    // Clear form for new clients
    if (title === 'Add New Client') {
        document.getElementById('clientForm').reset();
        currentEditingClient = null;
    }
}

function closeModal() {
    document.getElementById('clientModal').classList.add('hidden');
    document.getElementById('clientForm').reset();
    document.getElementById('clientId').value = '';
    currentEditingClient = null;
}

function editClient(clientId, clients) {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        showNotification('Client not found', 'error');
        return;
    }
    
    currentEditingClient = client;
    
    // Populate form
    document.getElementById('clientId').value = client.id;
    document.getElementById('clientName').value = client.name || '';
    document.getElementById('clientCompany').value = client.company || '';
    document.getElementById('clientTestimonial').value = client.testimonial || '';
    
    // Handle images
    const imagesContainer = document.getElementById('imagesContainer');
    imagesContainer.innerHTML = '';
    
    const images = client.images || (client.image ? [client.image] : []);
    images.forEach(image => {
        addImageInput(image);
    });
    
    if (images.length === 0) {
        addImageInput();
    }
    
    openModal('Edit Client');
}

async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
        const response = await fetch('../api/clients', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ id: clientId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Client deleted successfully', 'success');
            loadClients();
        } else {
            showNotification(result.message || 'Failed to delete client', 'error');
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        showNotification('Failed to delete client: ' + error.message, 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-opacity ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadClients();
    
    // Add client button
    document.getElementById('addClientBtn').addEventListener('click', () => {
        openModal('Add New Client');
    });
    
    // Modal controls
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Client form submission
    document.getElementById('clientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Collect images
        const imageInputs = document.querySelectorAll('input[name="image"]');
        const images = Array.from(imageInputs)
            .map(input => input.value.trim())
            .filter(url => url.length > 0);
        
        const formData = {
            id: document.getElementById('clientId').value || undefined,
            name: document.getElementById('clientName').value.trim(),
            company: document.getElementById('clientCompany').value.trim() || '',
            testimonial: document.getElementById('clientTestimonial').value.trim() || '',
            images: images
        };
        
        // Validate required fields
        if (!formData.name) {
            showNotification('Client name is required', 'error');
            return;
        }
        
        if (!formData.images || formData.images.length === 0) {
            showNotification('At least one client image is required', 'error');
            return;
        }
        
        try {
            const response = await fetch('../api/clients', {
                method: formData.id ? 'PUT' : 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(formData.id ? 'Client updated successfully' : 'Client added successfully', 'success');
                closeModal();
                loadClients();
            } else {
                showNotification(result.message || 'Failed to save client', 'error');
            }
        } catch (error) {
            console.error('Error saving client:', error);
            showNotification('Failed to save client: ' + error.message, 'error');
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    });
});

// Image input management functions
function addImageInput(value = '') {
    const container = document.getElementById('imagesContainer');
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2';
    div.innerHTML = `
        <input type="url" name="image" ${value ? '' : 'required'}
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/client-image.jpg"
            value="${value}">
        <button type="button" onclick="removeImageInput(this)" class="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
        </button>
    `;
    container.appendChild(div);
}

function removeImageInput(button) {
    const container = document.getElementById('imagesContainer');
    const inputs = container.querySelectorAll('input[name="image"]');
    
    // Don't allow removing the last input if it's the only one
    if (inputs.length <= 1) {
        showNotification('At least one image is required', 'error');
        return;
    }
    
    button.parentElement.remove();
}
