// Client Management Functions
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
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No clients yet. Add your first client!</p>';
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
        <div class="client-card bg-white rounded-xl shadow-lg p-6 border border-gray-100">
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

function openClientModal() {
    document.getElementById('clientModal').classList.remove('hidden');
    loadClients();
}

function closeClientModal() {
    document.getElementById('clientModal').classList.add('hidden');
    document.getElementById('clientForm').reset();
    document.getElementById('clientId').value = '';
}

function editClient(clientId, clients) {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        showNotification('Client not found', 'error');
        return;
    }
    
    // Populate form
    document.getElementById('clientId').value = client.id;
    document.getElementById('clientName').value = client.name || '';
    document.getElementById('clientCompany').value = client.company || '';
    document.getElementById('clientTestimonial').value = client.testimonial || '';
    document.getElementById('clientImage').value = client.image || '';
    
    // Scroll to form
    document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
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

// Client form submission
document.addEventListener('DOMContentLoaded', function() {
    const clientForm = document.getElementById('clientForm');
    if (clientForm) {
        clientForm.addEventListener('submit', async (e) => {
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
                    loadClients();
                    document.getElementById('clientForm').reset();
                    document.getElementById('clientId').value = '';
                } else {
                    showNotification(result.message || 'Failed to save client', 'error');
                }
            } catch (error) {
                console.error('Error saving client:', error);
                showNotification('Failed to save client: ' + error.message, 'error');
            }
        });
    }
    
    // Client modal event listeners
    const manageClientsBtn = document.getElementById('manageClientsBtn');
    const closeClientModalBtn = document.getElementById('closeClientModal');
    const cancelClientBtn = document.getElementById('cancelClientBtn');
    
    if (manageClientsBtn) {
        manageClientsBtn.addEventListener('click', openClientModal);
    }
    
    if (closeClientModalBtn) {
        closeClientModalBtn.addEventListener('click', closeClientModal);
    }
    
    if (cancelClientBtn) {
        cancelClientBtn.addEventListener('click', closeClientModal);
    }
});

