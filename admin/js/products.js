let currentEditingProduct = null;

// Logout functionality
function logout() {
    // Clear the auth token
    localStorage.removeItem('admin_token');
    // Redirect to login page
    window.location.href = 'login.html';
}

// Auto-logout after 1 minute of inactivity
let inactivityTimer;
const INACTIVITY_TIMEOUT = 60 * 1000; // 1 minute in milliseconds

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert('Session expired due to inactivity. You will be logged out.');
        logout();
    }, INACTIVITY_TIMEOUT);
}

// Track user activity
function trackActivity() {
    resetInactivityTimer();
}

// Add logout event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Start inactivity timer
    resetInactivityTimer();
    
    // Track mouse movement, clicks, and keyboard activity
    document.addEventListener('mousemove', trackActivity);
    document.addEventListener('mousedown', trackActivity);
    document.addEventListener('keypress', trackActivity);
    document.addEventListener('scroll', trackActivity);
    document.addEventListener('touchstart', trackActivity);
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

async function loadProducts() {
    try {
        const response = await fetch('../api/products', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        renderProductCards(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

function renderProductCards(products) {
    const container = document.getElementById('productsContainer');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No products yet. Add your first product!</p>';
        return;
    }
    
    container.innerHTML = products.map(product => createProductCard(product)).join('');
    
    // Add event listeners
    setTimeout(() => {
        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const productId = btn.getAttribute('data-id');
                editProduct(productId, products);
            });
        });
        
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const productId = btn.getAttribute('data-id');
                deleteProduct(productId);
            });
        });
    }, 100);
}

function createProductCard(product) {
    const stockStatus = product.inStock ? 'In Stock' : 'Out of Stock';
    const stockColor = product.inStock ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
    
    return `
        <div class="product-card bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div class="text-center">
                ${product.imageUrl ? `
                    <div class="w-24 h-24 mx-auto mb-4 rounded-lg overflow-hidden shadow-lg">
                        <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-full object-cover">
                    </div>
                ` : `
                    <div class="w-24 h-24 mx-auto mb-4 rounded-lg bg-gray-200 flex items-center justify-center">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                `}
                <h3 class="text-lg font-bold text-gray-900 mb-1">${product.name}</h3>
                <p class="text-green-600 font-semibold text-sm mb-2">${product.category}</p>
                <p class="text-2xl font-bold text-blue-600 mb-2">${product.price}</p>
                <span class="inline-block px-2 py-1 rounded-full text-xs font-medium ${stockColor} mb-2">${stockStatus}</span>
                ${product.description ? `<p class="text-gray-600 text-xs">${product.description.substring(0, 60)}...</p>` : ''}
            </div>
            <div class="flex gap-2 mt-4">
                <button class="edit-product-btn flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${product.id}">
                    Edit
                </button>
                <button class="delete-product-btn bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${product.id}">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function openModal(title = 'Add New Product') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('productModal').classList.remove('hidden');
    
    // Clear form for new products
    if (title === 'Add New Product') {
        document.getElementById('productForm').reset();
        document.getElementById('productInStock').checked = true;
        currentEditingProduct = null;
    }
}

function closeModal() {
    document.getElementById('productModal').classList.add('hidden');
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    currentEditingProduct = null;
}

function editProduct(productId, products) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    currentEditingProduct = product;
    
    // Populate form
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productImageUrl').value = product.imageUrl || '';
    document.getElementById('productInStock').checked = product.inStock !== false;
    
    openModal('Edit Product');
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await fetch('../api/products', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ id: productId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Product deleted successfully', 'success');
            loadProducts();
        } else {
            showNotification(result.message || 'Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product: ' + error.message, 'error');
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
    loadProducts();
    
    // Add product button
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openModal('Add New Product');
    });
    
    // Modal controls
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Product form submission
    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            id: document.getElementById('productId').value || undefined,
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value,
            price: document.getElementById('productPrice').value.trim(),
            description: document.getElementById('productDescription').value.trim() || '',
            imageUrl: document.getElementById('productImageUrl').value.trim() || '',
            inStock: document.getElementById('productInStock').checked
        };
        
        // Validate required fields
        if (!formData.name) {
            showNotification('Product name is required', 'error');
            return;
        }
        
        if (!formData.category) {
            showNotification('Product category is required', 'error');
            return;
        }
        
        if (!formData.price) {
            showNotification('Product price is required', 'error');
            return;
        }
        
        try {
            const response = await fetch('../api/products', {
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
                showNotification(formData.id ? 'Product updated successfully' : 'Product added successfully', 'success');
                closeModal();
                loadProducts();
            } else {
                showNotification(result.message || 'Failed to save product', 'error');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Failed to save product: ' + error.message, 'error');
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    });
});
