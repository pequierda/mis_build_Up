// ===== GLOBAL VARIABLES =====
let currentEditingClient = null;
let inactivityTimer;
const INACTIVITY_TIMEOUT = 60 * 1000; // 1 minute

// ===== UTILITY FUNCTIONS =====
function getAuthToken() {
    return localStorage.getItem('admin_token');
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
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

// ===== AUTHENTICATION =====
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

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}

// ===== AUTO-LOGOUT FUNCTIONALITY =====
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert('Session expired due to inactivity. You will be logged out.');
        logout();
    }, INACTIVITY_TIMEOUT);
}

function trackActivity() {
    resetInactivityTimer();
}

// ===== CLIENT MANAGEMENT =====
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
    
    // Add event listeners after DOM update
    setTimeout(() => {
        attachClientEventListeners();
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

function attachClientEventListeners() {
    document.querySelectorAll('.edit-client-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const clientId = btn.getAttribute('data-id');
            editClient(clientId);
        });
    });
    
    document.querySelectorAll('.delete-client-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const clientId = btn.getAttribute('data-id');
            deleteClient(clientId);
        });
    });
}

async function editClient(clientId) {
    try {
        const response = await fetch('../api/clients', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const clients = await response.json();
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
        
        // Show previews for existing images
        setTimeout(() => {
            images.forEach((image, index) => {
                const groups = imagesContainer.querySelectorAll('.image-input-group');
                if (groups[index]) {
                    const previewContainer = groups[index].querySelector('.image-preview-container');
                    const previewImg = groups[index].querySelector('.image-preview');
                    if (previewContainer && previewImg && image) {
                        previewImg.src = image;
                        previewContainer.classList.remove('hidden');
                    }
                }
            });
        }, 100);
        
        openModal('Edit Client');
    } catch (error) {
        console.error('Error loading client:', error);
        showNotification('Failed to load client: ' + error.message, 'error');
    }
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

// ===== MODAL MANAGEMENT =====
function openModal(title = 'Add New Client') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('clientModal').classList.remove('hidden');
    
    if (title === 'Add New Client') {
        document.getElementById('clientForm').reset();
        const imagesContainer = document.getElementById('imagesContainer');
        imagesContainer.innerHTML = '';
        addImageInput();
        document.querySelectorAll('.image-preview-container').forEach(container => {
            container.classList.add('hidden');
        });
        currentEditingClient = null;
    }
}

function closeModal() {
    document.getElementById('clientModal').classList.add('hidden');
    document.getElementById('clientForm').reset();
    document.getElementById('clientId').value = '';
    
    // Clear image previews
    document.querySelectorAll('.image-preview-container').forEach(container => {
        container.classList.add('hidden');
    });
    document.querySelectorAll('.image-upload-input').forEach(input => {
        input.value = '';
    });
    
    currentEditingClient = null;
}

// ===== IMAGE MANAGEMENT =====
function addImageInput(value = '') {
    const container = document.getElementById('imagesContainer');
    const div = document.createElement('div');
    div.className = 'image-input-group mb-3 p-3 border border-gray-200 rounded-lg';
    const uniqueId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    div.innerHTML = `
        <div class="flex gap-2 mb-2">
            <input type="url" name="image" ${value ? '' : 'required'}
                class="image-url-input flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="https://example.com/client-image.jpg (optional)"
                value="${value}">
            <input type="file" accept="image/*" class="image-upload-input hidden" data-input-id="${uniqueId}">
            <button type="button" onclick="handleImageUploadClick(this)" class="px-3 sm:px-4 py-2 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm sm:text-base">
                Upload
            </button>
            <button type="button" onclick="removeImageInput(this)" class="px-2 sm:px-3 py-2 sm:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
        </div>
        <div class="image-preview-container hidden">
            <img class="image-preview w-full h-32 object-cover rounded-lg border border-gray-300">
        </div>
    `;
    container.appendChild(div);
    
    // Add event listeners
    const urlInput = div.querySelector('.image-url-input');
    const uploadInput = div.querySelector('.image-upload-input');
    const previewContainer = div.querySelector('.image-preview-container');
    const previewImg = div.querySelector('.image-preview');
    
    if (value) {
        previewImg.src = value;
        previewContainer.classList.remove('hidden');
    }
    
    urlInput.addEventListener('input', function() {
        const url = this.value.trim();
        if (url && !url.startsWith('data:')) {
            previewImg.src = url;
            previewContainer.classList.remove('hidden');
            uploadInput.value = '';
        } else if (url && url.startsWith('data:')) {
            previewImg.src = url;
            previewContainer.classList.remove('hidden');
        } else if (!url) {
            previewContainer.classList.add('hidden');
        }
    });
    
    uploadInput.addEventListener('change', function(e) {
        handleClientImageUpload(e, urlInput, previewImg, previewContainer);
    });
}

function handleImageUploadClick(button) {
    const group = button.closest('.image-input-group');
    const uploadInput = group.querySelector('.image-upload-input');
    uploadInput.click();
}

function handleClientImageUpload(e, urlInput, previewImg, previewContainer) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 500000) {
        showNotification('Image size must be less than 500KB', 'error');
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        urlInput.value = base64;
        previewImg.src = base64;
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImageInput(button) {
    const container = document.getElementById('imagesContainer');
    const inputs = container.querySelectorAll('input[name="image"]');
    
    if (inputs.length <= 1) {
        showNotification('At least one image is required', 'error');
        return;
    }
    
    const imageGroup = button.closest('.image-input-group');
    if (imageGroup) {
        imageGroup.remove();
    }
}

// ===== FORM HANDLING =====
async function handleFormSubmit(e) {
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
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Modal controls
    document.getElementById('addClientBtn').addEventListener('click', () => openModal('Add New Client'));
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Form handling
    document.getElementById('clientForm').addEventListener('submit', handleFormSubmit);
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Activity tracking for auto-logout
    resetInactivityTimer();
    document.addEventListener('mousemove', trackActivity);
    document.addEventListener('mousedown', trackActivity);
    document.addEventListener('keypress', trackActivity);
    document.addEventListener('scroll', trackActivity);
    document.addEventListener('touchstart', trackActivity);
}

// Make functions globally accessible for onclick handlers
window.addImageInput = addImageInput;
window.removeImageInput = removeImageInput;
window.handleImageUploadClick = handleImageUploadClick;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with one image input
    const imagesContainer = document.getElementById('imagesContainer');
    if (imagesContainer && imagesContainer.children.length === 0) {
        addImageInput();
    }
    
    initializeEventListeners();
    checkAuth();
    loadClients();
});