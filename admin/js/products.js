// ===== GLOBAL VARIABLES =====
let currentEditingProduct = null;
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

// ===== CAR MANAGEMENT =====
async function loadProducts() {
    try {
        const [carsResponse, bookingsResponse] = await Promise.all([
            fetch('../api/products', {
                headers: getAuthHeaders()
            }),
            fetch('../api/bookings', {
                headers: getAuthHeaders()
            })
        ]);
        
        if (!carsResponse.ok) {
            throw new Error(`HTTP error! status: ${carsResponse.status}`);
        }
        
        const cars = await carsResponse.json();
        const bookings = bookingsResponse.ok ? await bookingsResponse.json() : [];
        
        renderProductCards(cars, bookings);
    } catch (error) {
        console.error('Error loading cars:', error);
        showNotification('Failed to load cars', 'error');
    }
}

function renderProductCards(cars, bookings) {
    const container = document.getElementById('productsContainer');
    
    if (!cars || cars.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No cars yet. Add your first car!</p>';
        return;
    }
    
    container.innerHTML = cars.map(car => {
        const carBookings = bookings.filter(b => b.carId === car.id && b.status !== 'cancelled');
        return createProductCard(car, carBookings);
    }).join('');
    
    setTimeout(() => {
        attachProductEventListeners();
    }, 100);
}

function createProductCard(car, bookings) {
    const activeBookings = bookings.filter(b => {
        const endDate = new Date(b.endDate);
        return endDate >= new Date();
    });
    
    const isBooked = activeBookings.length > 0;
    
    let bookingInfo = '';
    if (isBooked) {
        const bookingDates = activeBookings.map(b => {
            const start = new Date(b.startDate).toLocaleDateString();
            const end = new Date(b.endDate).toLocaleDateString();
            return `${start} - ${end}`;
        }).join(', ');
        bookingInfo = `
            <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p class="text-xs font-semibold text-yellow-800 mb-1">📅 Booked Dates:</p>
                <p class="text-xs text-yellow-700">${bookingDates}</p>
            </div>
        `;
    }
    
    return `
        <div class="product-card bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div class="text-center">
                ${car.imageUrl ? `<img src="${car.imageUrl}" alt="${car.name}" class="w-full h-32 object-cover rounded-lg mb-4">` : ''}
                <h3 class="text-lg font-bold text-gray-900 mb-2">${car.name}</h3>
                ${car.make && car.model ? `<p class="text-gray-600 text-sm mb-1">${car.make} ${car.model}${car.year ? ` (${car.year})` : ''}</p>` : ''}
                <p class="text-green-600 font-semibold mb-2">${car.pricePerDay || car.price || 'N/A'}</p>
                ${car.description ? `<p class="text-gray-500 text-xs mb-2">${car.description.substring(0, 80)}...</p>` : ''}
                <div class="flex items-center justify-center mt-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${car.available !== false ? (isBooked ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800') : 'bg-red-100 text-red-800'}">
                        ${car.available === false ? 'Not Available' : (isBooked ? 'Booked' : 'Available')}
                    </span>
                </div>
                ${bookingInfo}
            </div>
            <div class="flex gap-2 mt-4">
                <button class="edit-product-btn flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${car.id}">
                    Edit
                </button>
                <button class="delete-product-btn bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition" data-id="${car.id}">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function attachProductEventListeners() {
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = btn.getAttribute('data-id');
            editProduct(productId);
        });
    });
    
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = btn.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

async function editProduct(productId) {
    try {
        const response = await fetch('../api/products', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const cars = await response.json();
        const car = cars.find(c => c.id === productId);
        
        if (!car) {
            showNotification('Car not found', 'error');
            return;
        }
        
        currentEditingProduct = car;
        
        document.getElementById('productId').value = car.id;
        document.getElementById('productName').value = car.name || '';
        document.getElementById('productMake').value = car.make || '';
        document.getElementById('productModel').value = car.model || '';
        document.getElementById('productYear').value = car.year || '';
        document.getElementById('productPricePerDay').value = car.pricePerDay || car.price || '';
        document.getElementById('productDescription').value = car.description || '';
        document.getElementById('productImageUrl').value = car.imageUrl || '';
        document.getElementById('productInStock').checked = car.available !== false;
        
        openModal('Edit Car');
    } catch (error) {
        console.error('Error loading car:', error);
        showNotification('Failed to load car: ' + error.message, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this car?')) return;
    
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
            showNotification('Car deleted successfully', 'success');
            loadProducts();
        } else {
            showNotification(result.message || 'Failed to delete car', 'error');
        }
    } catch (error) {
        console.error('Error deleting car:', error);
        showNotification('Failed to delete car: ' + error.message, 'error');
    }
}

// ===== MODAL MANAGEMENT =====
function openModal(title = 'Add New Car') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('productModal').classList.remove('hidden');
    
    if (title === 'Add New Car') {
        document.getElementById('productForm').reset();
        currentEditingProduct = null;
    }
}

function closeModal() {
    document.getElementById('productModal').classList.add('hidden');
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    currentEditingProduct = null;
}

// ===== FORM HANDLING =====
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        id: document.getElementById('productId').value || undefined,
        name: document.getElementById('productName').value.trim(),
        make: document.getElementById('productMake').value.trim(),
        model: document.getElementById('productModel').value.trim(),
        year: document.getElementById('productYear').value.trim(),
        pricePerDay: document.getElementById('productPricePerDay').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        imageUrl: document.getElementById('productImageUrl').value.trim() || '',
        available: document.getElementById('productInStock').checked
    };
    
    if (!formData.name) {
        showNotification('Car name is required', 'error');
        return;
    }
    
    if (!formData.pricePerDay) {
        showNotification('Price per day is required', 'error');
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
            showNotification(formData.id ? 'Car updated successfully' : 'Car added successfully', 'success');
            closeModal();
            loadProducts();
        } else {
            showNotification(result.message || 'Failed to save car', 'error');
        }
    } catch (error) {
        console.error('Error saving car:', error);
        showNotification('Failed to save car: ' + error.message, 'error');
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Modal controls
    document.getElementById('addProductBtn').addEventListener('click', () => openModal('Add New Car'));
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Form handling
    document.getElementById('productForm').addEventListener('submit', handleFormSubmit);
    
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

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkAuth();
    loadProducts();
});