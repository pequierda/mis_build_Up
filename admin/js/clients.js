let currentEditingClient = null;

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
    return `
        <div class="client-card bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div class="text-center">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
                    <img src="${client.image}" alt="${client.name}" class="w-full h-full object-cover">
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
    document.getElementById('clientImage').value = client.image || '';
    
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
        
        const formData = {
            id: document.getElementById('clientId').value || undefined,
            name: document.getElementById('clientName').value.trim(),
            company: document.getElementById('clientCompany').value.trim() || '',
            testimonial: document.getElementById('clientTestimonial').value.trim() || '',
            image: document.getElementById('clientImage').value.trim()
        };
        
        // Validate required fields
        if (!formData.name) {
            showNotification('Client name is required', 'error');
            return;
        }
        
        if (!formData.image) {
            showNotification('Client image is required', 'error');
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
