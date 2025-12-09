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
    const allBookings = bookings.filter(b => b.status !== 'cancelled');
    const activeBookings = allBookings.filter(b => {
        const endDate = new Date(b.endDate);
        return endDate >= new Date();
    });
    
    const isBooked = activeBookings.length > 0;
    
    const calendarView = generateCarCalendar(car, allBookings);
    
    return `
        <div class="product-card bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div class="text-center">
                ${car.imageUrl ? `<img src="${car.imageUrl}" alt="${car.name}" class="w-full h-32 object-cover rounded-lg mb-4">` : ''}
                <h3 class="text-lg font-bold text-gray-900 mb-2">${car.name}</h3>
                ${car.make && car.model ? `<p class="text-gray-600 text-sm mb-1">${car.make} ${car.model}${car.year ? ` (${car.year})` : ''}</p>` : ''}
                <p class="text-green-600 font-semibold mb-2">${car.pricePerDay || car.price || 'N/A'}</p>
                ${car.description ? `<p class="text-gray-500 text-xs mb-2">${car.description.substring(0, 80)}...</p>` : ''}
                <div class="flex items-center justify-center mt-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${car.available === false ? 'bg-red-100 text-red-800' : (car.onBooking === true ? 'bg-orange-100 text-orange-800' : (isBooked ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'))}">
                        ${car.available === false ? 'Not Available' : (car.onBooking === true ? 'On Booking' : (isBooked ? 'Booked' : 'Available'))}
                    </span>
                </div>
            </div>
            
            ${calendarView}
            
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

function generateCarCalendar(car, bookings) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    
    let calendarHTML = `
        <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    ${monthNames[currentMonth]} ${currentYear}
                </h4>
            </div>
            <div class="grid grid-cols-7 gap-0.5 text-xs">
                <div class="text-center font-semibold text-gray-600 py-1 text-[10px]">S</div>
                <div class="text-center font-semibold text-gray-600 py-1 text-[10px]">M</div>
                <div class="text-center font-semibold text-gray-600 py-1 text-[10px]">T</div>
                <div class="text-center font-semibold text-gray-600 py-1 text-[10px]">W</div>
                <div class="text-center font-semibold text-gray-600 py-1 text-[10px]">T</div>
                <div class="text-center font-semibold text-gray-600 py-1 text-[10px]">F</div>
                <div class="text-center font-semibold text-gray-600 py-1 text-[10px]">S</div>
    `;
    
    for (let i = 0; i < firstDay; i++) {
        const date = daysInPrevMonth - firstDay + i + 1;
        calendarHTML += `<div class="p-1 min-h-[32px] bg-gray-100 text-gray-400 text-center text-[10px] flex items-center justify-center">${date}</div>`;
    }
    
    const dayCells = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        
        const dayBookings = bookings.filter(b => {
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            return date >= start && date <= end;
        });
        
        const isBooked = dayBookings.length > 0;
        const bgClass = isToday ? 'bg-blue-50' : (isBooked ? 'bg-yellow-50' : 'bg-white');
        const textClass = isToday ? 'text-blue-700 font-bold' : (isBooked ? 'text-yellow-800' : 'text-gray-700');
        
        dayCells.push({
            day,
            date,
            isToday,
            isBooked,
            bgClass,
            textClass,
            dayBookings
        });
    }
    
    dayCells.forEach(cell => {
        calendarHTML += `
            <div class="p-1 min-h-[32px] ${cell.bgClass} border border-gray-200 relative ${cell.textClass} text-center text-[10px] flex flex-col">
                <div class="mb-0.5">${cell.day}</div>
                <div class="flex-1 flex flex-col gap-0.5">
                    ${cell.dayBookings.slice(0, 2).map((booking, idx) => {
                        const start = new Date(booking.startDate);
                        const end = new Date(booking.endDate);
                        const isStart = cell.date.getTime() === start.getTime();
                        const isEnd = cell.date.getTime() === end.getTime();
                        const isInRange = cell.date >= start && cell.date <= end;
                        
                        if (!isInRange) return '';
                        
                        let barClass = 'bg-red-500';
                        if (idx === 0) barClass = 'bg-red-500';
                        else if (idx === 1) barClass = 'bg-green-500';
                        
                        const customerName = booking.customerName || 'Customer';
                        const displayName = customerName.length > 10 ? customerName.substring(0, 10) + '...' : customerName;
                        const dateRange = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                        
                        return `<div class="${barClass} text-white text-[9px] px-1 py-0.5 rounded truncate" title="${customerName} (${dateRange})">${isStart ? displayName : ''}</div>`;
                    }).join('')}
                    ${cell.dayBookings.length > 2 ? `<div class="text-[9px] text-gray-600 bg-gray-200 px-1 py-0.5 rounded">+${cell.dayBookings.length - 2}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    const remainingDays = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingDays && day <= 7; day++) {
        calendarHTML += `<div class="p-1 min-h-[32px] bg-gray-100 text-gray-400 text-center text-[10px] flex items-center justify-center">${day}</div>`;
    }
    
    calendarHTML += '</div></div>';
    
    if (bookings.length > 0) {
        const upcomingBookings = bookings.filter(b => {
            const end = new Date(b.endDate);
            return end >= today;
        }).slice(0, 3);
        
        if (upcomingBookings.length > 0) {
            calendarHTML += `
                <div class="mt-2 space-y-1">
                    ${upcomingBookings.map(booking => {
                        const start = new Date(booking.startDate);
                        const end = new Date(booking.endDate);
                        const customerName = booking.customerName || 'Customer';
                        return `
                            <div class="text-[10px] text-gray-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                                <span class="font-semibold">${customerName}:</span> ${start.toLocaleDateString()} - ${end.toLocaleDateString()}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
    
    return calendarHTML;
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
        document.getElementById('productOnBooking').checked = car.onBooking === true;
        
        if (car.imageUrl) {
            document.getElementById('productPreviewImg').src = car.imageUrl;
            document.getElementById('productImagePreview').classList.remove('hidden');
        } else {
            document.getElementById('productImagePreview').classList.add('hidden');
        }
        
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
        document.getElementById('productImagePreview').classList.add('hidden');
        document.getElementById('productImageUpload').value = '';
        currentEditingProduct = null;
    }
}

function closeModal() {
    document.getElementById('productModal').classList.add('hidden');
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productImagePreview').classList.add('hidden');
    currentEditingProduct = null;
}

// ===== IMAGE UPLOAD HANDLING =====
function handleProductImageUpload(e) {
    const file = e.target.files[0];
    if (!file) {
        const urlValue = document.getElementById('productImageUrl').value.trim();
        if (urlValue && !urlValue.startsWith('data:')) {
            document.getElementById('productPreviewImg').src = urlValue;
            document.getElementById('productImagePreview').classList.remove('hidden');
        }
        return;
    }
    
    if (file.size > 500000) {
        showNotification('Image size must be less than 500KB', 'error');
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        document.getElementById('productImageUrl').value = base64;
        document.getElementById('productPreviewImg').src = base64;
        document.getElementById('productImagePreview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function handleProductImageUrlChange() {
    const urlInput = document.getElementById('productImageUrl');
    const urlValue = urlInput.value.trim();
    const preview = document.getElementById('productImagePreview');
    const previewImg = document.getElementById('productPreviewImg');
    
    if (urlValue && !urlValue.startsWith('data:')) {
        previewImg.src = urlValue;
        preview.classList.remove('hidden');
        document.getElementById('productImageUpload').value = '';
    } else if (urlValue && urlValue.startsWith('data:')) {
        previewImg.src = urlValue;
        preview.classList.remove('hidden');
    } else if (!urlValue) {
        preview.classList.add('hidden');
    }
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
        available: document.getElementById('productInStock').checked,
        onBooking: document.getElementById('productOnBooking').checked
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
    
    // Image upload handling
    const imageUpload = document.getElementById('productImageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleProductImageUpload);
    }
    
    // Image URL change handling
    const imageUrlInput = document.getElementById('productImageUrl');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', handleProductImageUrlChange);
        imageUrlInput.addEventListener('blur', handleProductImageUrlChange);
    }
    
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