let currentEditingContact = null;

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

async function loadContacts() {
    try {
        const response = await fetch('../api/contact', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contacts = await response.json();
        renderContactCards(contacts);
    } catch (error) {
        console.error('Error loading contacts:', error);
        showNotification('Failed to load contact information', 'error');
    }
}

function renderContactCards(contacts) {
    const container = document.getElementById('contactsContainer');
    
    if (!contacts || contacts.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No contact information yet. Add your first contact!</p>';
        return;
    }
    
    container.innerHTML = contacts.map(contact => createContactCard(contact)).join('');
    
    // Add event listeners
    setTimeout(() => {
        document.querySelectorAll('.edit-contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const contactId = btn.getAttribute('data-id');
                editContact(contactId, contacts);
            });
        });
        
        document.querySelectorAll('.delete-contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const contactId = btn.getAttribute('data-id');
                deleteContact(contactId);
            });
        });
    }, 100);
}

function createContactCard(contact) {
    const statusColor = contact.isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
    const statusText = contact.isActive ? 'Active' : 'Inactive';
    
    const iconMap = {
        'phone': '📞',
        'email': '📧',
        'address': '📍',
        'website': '🌐',
        'facebook': '📘',
        'instagram': '📷',
        'linkedin': '💼',
        'twitter': '🐦'
    };
    
    const displayIcon = iconMap[contact.icon] || '📋';
    
    return `
        <div class="contact-card bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div class="text-center">
                <div class="text-4xl mb-3">${displayIcon}</div>
                <h3 class="text-lg font-bold text-gray-900 mb-1">${contact.label}</h3>
                <p class="text-gray-600 text-sm mb-2">${contact.value}</p>
                <p class="text-purple-600 font-semibold text-xs mb-2 uppercase">${contact.type}</p>
                <span class="inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor} mb-2">${statusText}</span>
                ${contact.order ? `<p class="text-gray-500 text-xs">Order: ${contact.order}</p>` : ''}
            </div>
            <div class="flex gap-2 mt-4">
                <button class="edit-contact-btn flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${contact.id}">
                    Edit
                </button>
                <button class="delete-contact-btn bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${contact.id}">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function openModal(title = 'Add New Contact') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('contactModal').classList.remove('hidden');
    
    // Clear form for new contacts
    if (title === 'Add New Contact') {
        document.getElementById('contactForm').reset();
        document.getElementById('contactIsActive').checked = true;
        document.getElementById('contactOrder').value = 0;
        currentEditingContact = null;
    }
}

function closeModal() {
    document.getElementById('contactModal').classList.add('hidden');
    document.getElementById('contactForm').reset();
    document.getElementById('contactId').value = '';
    currentEditingContact = null;
}

function editContact(contactId, contacts) {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
        showNotification('Contact not found', 'error');
        return;
    }
    
    currentEditingContact = contact;
    
    // Populate form
    document.getElementById('contactId').value = contact.id;
    document.getElementById('contactType').value = contact.type || '';
    document.getElementById('contactLabel').value = contact.label || '';
    document.getElementById('contactValue').value = contact.value || '';
    document.getElementById('contactIcon').value = contact.icon || '';
    document.getElementById('contactOrder').value = contact.order || 0;
    document.getElementById('contactIsActive').checked = contact.isActive !== false;
    
    openModal('Edit Contact');
}

async function deleteContact(contactId) {
    if (!confirm('Are you sure you want to delete this contact information?')) return;
    
    try {
        const response = await fetch('../api/contact', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ id: contactId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Contact information deleted successfully', 'success');
            loadContacts();
        } else {
            showNotification(result.message || 'Failed to delete contact', 'error');
        }
    } catch (error) {
        console.error('Error deleting contact:', error);
        showNotification('Failed to delete contact: ' + error.message, 'error');
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
    loadContacts();
    
    // Add contact button
    document.getElementById('addContactBtn').addEventListener('click', () => {
        openModal('Add New Contact');
    });
    
    // Modal controls
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Contact form submission
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            id: document.getElementById('contactId').value || undefined,
            type: document.getElementById('contactType').value,
            label: document.getElementById('contactLabel').value.trim(),
            value: document.getElementById('contactValue').value.trim(),
            icon: document.getElementById('contactIcon').value,
            order: parseInt(document.getElementById('contactOrder').value) || 0,
            isActive: document.getElementById('contactIsActive').checked
        };
        
        // Validate required fields
        if (!formData.type) {
            showNotification('Contact type is required', 'error');
            return;
        }
        
        if (!formData.label) {
            showNotification('Contact label is required', 'error');
            return;
        }
        
        if (!formData.value) {
            showNotification('Contact value is required', 'error');
            return;
        }
        
        try {
            const response = await fetch('../api/contact', {
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
                showNotification(formData.id ? 'Contact updated successfully' : 'Contact added successfully', 'success');
                closeModal();
                loadContacts();
            } else {
                showNotification(result.message || 'Failed to save contact', 'error');
            }
        } catch (error) {
            console.error('Error saving contact:', error);
            showNotification('Failed to save contact: ' + error.message, 'error');
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    });
});
