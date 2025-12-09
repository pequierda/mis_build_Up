// ===== GLOBAL VARIABLES =====
let currentEditingService = null;
let inactivityTimer;
const INACTIVITY_TIMEOUT = 60 * 1000; // 1 minute

// ===== UTILITY FUNCTIONS =====
function generateServiceId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `service_${timestamp}_${random}`;
}

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
   // console.log('Logout function called'); // Debug log
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}

// Make logout function globally accessible
window.logout = logout;

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

// ===== SERVICE MANAGEMENT =====
async function loadServices() {
    try {
        const response = await fetch('../api/admin/services');
        const services = await response.json();
        const container = document.getElementById('servicesContainer');
        
        if (!services || services.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No services yet. Add your first service!</p>';
            return;
        }
        
        container.innerHTML = services.map(service => createServiceCard(service)).join('');
        
        // Add event listeners after DOM update
        setTimeout(() => {
            attachServiceEventListeners();
        }, 100);
    } catch (error) {
        console.error('Error loading services:', error);
        showNotification('Failed to load services', 'error');
    }
}

function createServiceCard(service) {
    const title = service.title || 'Untitled Service';
    const description = service.description || 'No description provided';
    const color = service.color || 'text-blue-600';
    const icon = service.icon || 'logo/me.png';
    const image = service.image || null;
    const id = service.id || 'unknown';

    return `
        <div class="service-card-admin bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            ${image ? `<img src="${image}" alt="${title}" class="w-full h-32 object-cover rounded-lg mb-4">` : ''}
            <div class="${color} mb-3">
                <img src="${icon}" alt="${title}" class="w-10 h-10 object-contain">
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
            <p class="text-gray-600 text-sm mb-4">${description}</p>
            <div class="flex gap-2">
                <button class="edit-service-btn flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition" data-id="${id}">
                    Edit
                </button>
                <button class="delete-service-btn delete-btn bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition" data-id="${id}">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function attachServiceEventListeners() {
    document.querySelectorAll('.edit-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const serviceId = btn.getAttribute('data-id');
            editService(serviceId);
        });
    });
    
    document.querySelectorAll('.delete-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const serviceId = btn.getAttribute('data-id');
            deleteService(serviceId);
        });
    });
}

async function editService(serviceId) {
    try {
        const response = await fetch('../api/admin/services', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const services = await response.json();
        const service = services.find(s => s.id === serviceId);
        
        if (!service) {
            showNotification('Service not found', 'error');
            return;
        }
        
        currentEditingService = service;
        
        // Populate form fields
        document.getElementById('serviceId').value = service.id || '';
        document.getElementById('serviceTitle').value = service.title || '';
        document.getElementById('serviceDescription').value = service.description || '';
        document.getElementById('serviceColor').value = service.color || 'text-blue-600';
        document.getElementById('serviceImage').value = service.image || '';
        
        if (service.image) {
            document.getElementById('previewImg').src = service.image;
            document.getElementById('imagePreview').classList.remove('hidden');
        } else {
            document.getElementById('imagePreview').classList.add('hidden');
        }
        
        openModal('Edit Service');
    } catch (error) {
        console.error('Error loading service:', error);
        showNotification('Failed to load service: ' + error.message, 'error');
    }
}

async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
        const response = await fetch('../api/admin/services', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ id: serviceId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Service deleted successfully', 'success');
            await loadServices();
        } else {
            showNotification(result.message || 'Failed to delete service', 'error');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        showNotification('Failed to delete service: ' + error.message, 'error');
    }
}

// ===== MODAL MANAGEMENT =====
function openModal(title = 'Add New Service') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('serviceModal').classList.remove('hidden');
    
    if (title === 'Add New Service') {
        document.getElementById('serviceForm').reset();
        document.getElementById('serviceId').value = generateServiceId();
        document.getElementById('imagePreview').classList.add('hidden');
        currentEditingService = null;
    }
}

function closeModal() {
    document.getElementById('serviceModal').classList.add('hidden');
    document.getElementById('serviceForm').reset();
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('serviceId').value = '';
    currentEditingService = null;
}

// ===== FORM HANDLING =====
function handleImageUpload(e) {
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
        document.getElementById('serviceImage').value = base64;
        document.getElementById('previewImg').src = base64;
        document.getElementById('imagePreview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        id: document.getElementById('serviceId').value || generateServiceId(),
        title: document.getElementById('serviceTitle').value.trim(),
        description: document.getElementById('serviceDescription').value.trim(),
        color: document.getElementById('serviceColor').value,
        icon: 'logo/me.png',
        image: document.getElementById('serviceImage').value.trim() || null
    };
    
    // Validate required fields
    if (!formData.title) {
        showNotification('Service title is required', 'error');
        return;
    }
    
    if (!formData.description) {
        showNotification('Service description is required', 'error');
        return;
    }
    
    try {
        const response = await fetch('../api/admin/services', {
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
            showNotification(formData.id ? 'Service updated successfully' : 'Service created successfully', 'success');
            closeModal();
            await loadServices();
        } else {
            showNotification(result.message || 'Failed to save service', 'error');
        }
    } catch (error) {
        console.error('Error saving service:', error);
        showNotification('Failed to save service: ' + error.message, 'error');
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Modal controls
    document.getElementById('addServiceBtn').addEventListener('click', () => openModal('Add New Service'));
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Form handling
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    document.getElementById('serviceForm').addEventListener('submit', handleFormSubmit);
    
    // Logout button - ensure it works properly
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log('Logout button found:', logoutBtn); // Debug log
        // Remove any existing event listeners first
        logoutBtn.onclick = null;
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked via event listener'); // Debug log
            logout();
        });
        
        // Also add onclick as backup
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked via onclick'); // Debug log
            logout();
        };
    } else {
        console.log('Logout button not found!'); // Debug log
    }
    
    // Activity tracking for auto-logout
    resetInactivityTimer();
    document.addEventListener('mousemove', trackActivity);
    document.addEventListener('mousedown', trackActivity);
    document.addEventListener('keypress', trackActivity);
    document.addEventListener('scroll', trackActivity);
    document.addEventListener('touchstart', trackActivity);
}

// ===== CALENDAR MANAGEMENT =====
let currentCalendarDate = new Date();
let allBookings = [];
let allCars = [];

async function loadCalendarData() {
    try {
        const [bookingsResponse, carsResponse] = await Promise.all([
            fetch('../api/bookings', {
                headers: getAuthHeaders()
            }),
            fetch('../api/products', {
                headers: getAuthHeaders()
            })
        ]);
        
        if (bookingsResponse.ok) {
            allBookings = await bookingsResponse.json();
        }
        
        if (carsResponse.ok) {
            allCars = await carsResponse.json();
        }
        
        renderCalendar();
    } catch (error) {
        console.error('Error loading calendar data:', error);
        showNotification('Failed to load calendar data', 'error');
    }
}

function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    const monthYear = document.getElementById('currentMonthYear');
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const activeBookings = allBookings.filter(b => b.status !== 'cancelled');
    
    let calendarHTML = `
        <div class="grid grid-cols-7 gap-1">
            <div class="p-2 text-center font-semibold text-gray-700 text-sm">Sun</div>
            <div class="p-2 text-center font-semibold text-gray-700 text-sm">Mon</div>
            <div class="p-2 text-center font-semibold text-gray-700 text-sm">Tue</div>
            <div class="p-2 text-center font-semibold text-gray-700 text-sm">Wed</div>
            <div class="p-2 text-center font-semibold text-gray-700 text-sm">Thu</div>
            <div class="p-2 text-center font-semibold text-gray-700 text-sm">Fri</div>
            <div class="p-2 text-center font-semibold text-gray-700 text-sm">Sat</div>
    `;
    
    for (let i = 0; i < firstDay; i++) {
        const date = daysInPrevMonth - firstDay + i + 1;
        calendarHTML += `
            <div class="p-2 min-h-[80px] bg-gray-50 border border-gray-200 rounded text-gray-400 text-sm">
                ${date}
            </div>
        `;
    }
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const date = new Date(year, month, day);
        const isToday = isCurrentMonth && day === today.getDate();
        
        const dayBookings = activeBookings.filter(b => {
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            return date >= start && date <= end;
        });
        
        const isBooked = dayBookings.length > 0;
        const bgColor = isBooked ? 'bg-yellow-100 border-yellow-400' : 'bg-green-50 border-green-200';
        const textColor = isToday ? 'font-bold text-blue-600' : 'text-gray-700';
        
        calendarHTML += `
            <div class="p-2 min-h-[80px] ${bgColor} border rounded cursor-pointer hover:shadow-md transition ${textColor}" 
                 onclick="showDayBookings('${dateStr}', ${dayBookings.length})">
                <div class="text-sm font-medium mb-1">${day}</div>
                <div class="space-y-1">
                    ${dayBookings.slice(0, 2).map(booking => {
                        const car = allCars.find(c => c.id === booking.carId);
                        const carName = car ? (car.name || `${car.make || ''} ${car.model || ''}`.trim() || 'Car') : 'Unknown Car';
                        return `<div class="text-xs bg-yellow-200 px-1 py-0.5 rounded truncate" title="${carName} - ${booking.customerName}">${carName}</div>`;
                    }).join('')}
                    ${dayBookings.length > 2 ? `<div class="text-xs text-gray-600">+${dayBookings.length - 2} more</div>` : ''}
                </div>
            </div>
        `;
    }
    
    const remainingDays = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        calendarHTML += `
            <div class="p-2 min-h-[80px] bg-gray-50 border border-gray-200 rounded text-gray-400 text-sm">
                ${day}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    container.innerHTML = calendarHTML;
}

function showDayBookings(dateStr, count) {
    if (count === 0) return;
    
    const date = new Date(dateStr);
    const activeBookings = allBookings.filter(b => b.status !== 'cancelled');
    const dayBookings = activeBookings.filter(b => {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        return date >= start && date <= end;
    });
    
    const modal = document.getElementById('bookingDetailsModal');
    const content = document.getElementById('bookingDetailsContent');
    
    if (dayBookings.length === 0) {
        content.innerHTML = '<p class="text-gray-600">No bookings for this date.</p>';
    } else {
        content.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
                Bookings for ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <div class="space-y-4">
                ${dayBookings.map(booking => {
                    const car = allCars.find(c => c.id === booking.carId);
                    const carName = car ? (car.name || `${car.make || ''} ${car.model || ''}`.trim() || 'Car') : 'Unknown Car';
                    const carMake = car ? (car.make || '') : '';
                    const carModel = car ? (car.model || '') : '';
                    const carYear = car ? (car.year || '') : '';
                    const carImage = car ? (car.imageUrl || '') : '';
                    const startDate = new Date(booking.startDate);
                    const endDate = new Date(booking.endDate);
                    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                    
                    return `
                        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start mb-3">
                                <div class="flex-1">
                                    <h4 class="font-semibold text-gray-900 text-lg mb-1">${carName}</h4>
                                    ${carMake && carModel ? `<p class="text-sm text-gray-600">${carMake} ${carModel}${carYear ? ` (${carYear})` : ''}</p>` : ''}
                                </div>
                                <span class="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">${booking.status || 'pending'}</span>
                            </div>
                            
                            ${carImage ? `<img src="${carImage}" alt="${carName}" class="w-full h-32 object-cover rounded-lg mb-3">` : ''}
                            
                            <div class="space-y-2 mb-3">
                                <div class="flex items-center gap-2 text-sm">
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span class="font-medium text-gray-700">Rental Period:</span>
                                    <span class="text-gray-600">${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div class="flex items-center gap-2 text-sm">
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span class="font-medium text-gray-700">Duration:</span>
                                    <span class="text-gray-600">${days} day${days !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                            
                            <div class="border-t pt-3 mt-3">
                                <h5 class="font-semibold text-gray-900 mb-2 text-sm">Customer Information</h5>
                                <div class="space-y-1.5">
                                    <div class="flex items-center gap-2 text-sm">
                                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                        </svg>
                                        <span class="font-medium text-gray-700">Name:</span>
                                        <span class="text-gray-600">${booking.customerName || 'N/A'}</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-sm">
                                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                        </svg>
                                        <span class="font-medium text-gray-700">Email:</span>
                                        <a href="mailto:${booking.customerEmail || ''}" class="text-blue-600 hover:text-blue-800">${booking.customerEmail || 'N/A'}</a>
                                    </div>
                                    <div class="flex items-center gap-2 text-sm">
                                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                        </svg>
                                        <span class="font-medium text-gray-700">Phone:</span>
                                        <a href="tel:${booking.customerPhone || ''}" class="text-blue-600 hover:text-blue-800">${booking.customerPhone || 'N/A'}</a>
                                    </div>
                                </div>
                            </div>
                            
                            ${booking.totalPrice ? `
                                <div class="mt-3 pt-3 border-t">
                                    <div class="flex items-center justify-between">
                                        <span class="font-semibold text-gray-700">Total Price:</span>
                                        <span class="text-lg font-bold text-green-600">${booking.totalPrice}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${booking.createdAt ? `
                                <div class="mt-2 pt-2 border-t">
                                    <p class="text-xs text-gray-500">
                                        <span class="font-medium">Booked on:</span> ${new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    modal.classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('bookingDetailsModal').classList.add('hidden');
}

function goToPrevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function goToNextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

function goToToday() {
    currentCalendarDate = new Date();
    renderCalendar();
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard DOM loaded'); // Debug log
    initializeEventListeners();
    checkAuth();
    loadServices();
    loadCalendarData();
    
    // Calendar navigation
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const todayBtn = document.getElementById('todayBtn');
    const closeBookingModalBtn = document.getElementById('closeBookingModal');
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', goToPrevMonth);
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', goToNextMonth);
    if (todayBtn) todayBtn.addEventListener('click', goToToday);
    if (closeBookingModalBtn) closeBookingModalBtn.addEventListener('click', closeBookingModal);
    
    window.showDayBookings = showDayBookings;
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Dashboard DOM loaded (fallback)'); // Debug log
        initializeEventListeners();
        checkAuth();
        loadServices();
        loadCalendarData();
    });
} else {
    console.log('Dashboard DOM already loaded'); // Debug log
    initializeEventListeners();
    checkAuth();
    loadServices();
    loadCalendarData();
}