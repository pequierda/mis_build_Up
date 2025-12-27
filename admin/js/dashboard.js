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
        // showNotification('Failed to load services', 'error');
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
    // Modal controls (only if elements exist - for services page)
    const addServiceBtn = document.getElementById('addServiceBtn');
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', () => openModal('Add New Service'));
    }
    
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Form handling (only if elements exist - for services page)
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
    
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Logout button - ensure it works properly
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = null;
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logout();
        });
        
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            logout();
        };
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
    const container = document.getElementById('calendarContainer');
    if (!container) {
        console.error('Calendar container not found');
        return;
    }
    
    container.innerHTML = '<div class="col-span-7 text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div><p class="text-gray-500">Loading calendar...</p></div>';
    
    try {
        const [bookingsResponse, carsResponse] = await Promise.all([
            fetch('../api/bookings'),
            fetch('../api/products', {
                headers: getAuthHeaders()
            })
        ]);
        
        if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            allBookings = Array.isArray(bookingsData) ? bookingsData : [];
            console.log('Loaded bookings:', allBookings.length, allBookings);
        } else {
            const errorText = await bookingsResponse.text();
            console.error('Failed to load bookings:', bookingsResponse.status, errorText);
            allBookings = [];
        }
        
        if (carsResponse.ok) {
            const carsData = await carsResponse.json();
            allCars = Array.isArray(carsData) ? carsData : [];
            console.log('Loaded cars:', allCars.length, allCars);
        } else {
            const errorText = await carsResponse.text();
            console.error('Failed to load cars:', carsResponse.status, errorText);
            allCars = [];
        }
        
        renderCalendar();
    } catch (error) {
        console.error('Error loading calendar data:', error);
        container.innerHTML = '<div class="col-span-7 text-center py-8 text-red-500"><p>Failed to load calendar data. Please refresh the page.</p><p class="text-xs mt-2">' + error.message + '</p></div>';
        showNotification('Failed to load calendar data', 'error');
    }
}

function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    const monthYear = document.getElementById('currentMonthYear');
    
    if (!container) {
        console.error('Calendar container not found');
        return;
    }
    
    if (!monthYear) {
        console.error('Month year element not found');
        return;
    }
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const activeBookings = (allBookings || []).filter(b => b.status !== 'cancelled');
    console.log('Active bookings for calendar:', activeBookings.length);
    
    let calendarHTML = `
        <div class="grid grid-cols-7 gap-0.5 sm:gap-1">
            <div class="p-1 sm:p-2 text-center font-semibold text-gray-700 text-[10px] sm:text-sm">S</div>
            <div class="p-1 sm:p-2 text-center font-semibold text-gray-700 text-[10px] sm:text-sm">M</div>
            <div class="p-1 sm:p-2 text-center font-semibold text-gray-700 text-[10px] sm:text-sm">T</div>
            <div class="p-1 sm:p-2 text-center font-semibold text-gray-700 text-[10px] sm:text-sm">W</div>
            <div class="p-1 sm:p-2 text-center font-semibold text-gray-700 text-[10px] sm:text-sm">T</div>
            <div class="p-1 sm:p-2 text-center font-semibold text-gray-700 text-[10px] sm:text-sm">F</div>
            <div class="p-1 sm:p-2 text-center font-semibold text-gray-700 text-[10px] sm:text-sm">S</div>
    `;
    
    for (let i = 0; i < firstDay; i++) {
        const date = daysInPrevMonth - firstDay + i + 1;
        calendarHTML += `
            <div class="p-1 sm:p-2 min-h-[50px] sm:min-h-[80px] bg-gray-50 border border-gray-200 rounded text-gray-400 text-[10px] sm:text-sm flex items-center justify-center">
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
            if (!b.startDate || !b.endDate) return false;
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            date.setHours(0, 0, 0, 0);
            return date >= start && date <= end;
        });
        
        const isBooked = dayBookings.length > 0;
        const bgColor = isBooked ? 'bg-yellow-100 border-yellow-400' : 'bg-green-50 border-green-200';
        const textColor = isToday ? 'font-bold text-blue-600' : 'text-gray-700';
        
        let hoverTooltip = '';
        if (dayBookings.length > 0) {
            const tooltipContent = dayBookings.map(booking => {
                const car = allCars.find(c => c.id === booking.carId);
                const carName = car ? (car.name || `${car.make || ''} ${car.model || ''}`.trim() || 'Car') : 'Unknown Car';
                const startDate = new Date(booking.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const endDate = new Date(booking.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const status = booking.status || 'pending';
                return `${carName}\n${booking.customerName || 'Customer'}\n${startDate} - ${endDate}\nStatus: ${status}`;
            }).join('\n\n');
            hoverTooltip = `title="${tooltipContent}"`;
        }
        
        const uniqueId = `day-${year}-${month}-${day}`;
        calendarHTML += `
            <div class="p-1 sm:p-2 min-h-[50px] sm:min-h-[80px] ${bgColor} border rounded relative group ${textColor} touch-manipulation" ${hoverTooltip} data-day-id="${uniqueId}">
                <div class="text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1">${day}</div>
                <div class="space-y-0.5 sm:space-y-1">
                    ${dayBookings.slice(0, 2).map(booking => {
                        const car = allCars.find(c => c.id === booking.carId);
                        const carName = car ? (car.name || `${car.make || ''} ${car.model || ''}`.trim() || 'Car') : 'Unknown Car';
                        const shortName = carName.length > 8 ? carName.substring(0, 8) + '...' : carName;
                        const startDate = new Date(booking.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const endDate = new Date(booking.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const customerName = booking.customerName || 'Customer';
                        const status = booking.status || 'pending';
                        const tooltipText = `${carName}\nCustomer: ${customerName}\nPeriod: ${startDate} - ${endDate}\nStatus: ${status}\nPhone: ${booking.customerPhone || 'N/A'}\nEmail: ${booking.customerEmail || 'N/A'}`;
                        return `<div class="text-[9px] sm:text-xs bg-yellow-200 px-0.5 sm:px-1 py-0.5 rounded truncate hover:bg-yellow-300 active:bg-yellow-400 transition" title="${tooltipText}">${shortName}</div>`;
                    }).join('')}
                    ${dayBookings.length > 2 ? `<div class="text-[9px] sm:text-xs text-gray-600">+${dayBookings.length - 2}</div>` : ''}
                </div>
                
                ${dayBookings.length > 0 ? `
                    <div id="tooltip-${uniqueId}" class="hidden sm:block absolute left-full ml-2 top-0 w-64 sm:w-72 bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-3 sm:p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 max-h-[70vh] overflow-y-auto">
                        <div class="space-y-2 sm:space-y-3">
                            ${dayBookings.map(booking => {
                                const car = allCars.find(c => c.id === booking.carId);
                                const carName = car ? (car.name || `${car.make || ''} ${car.model || ''}`.trim() || 'Car') : 'Unknown Car';
                                const startDate = new Date(booking.startDate);
                                const endDate = new Date(booking.endDate);
                                const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                const status = booking.status || 'pending';
                                const statusColor =
                                    status === 'confirmed' ? 'bg-green-200 text-green-900' :
                                    status === 'completed' ? 'bg-blue-200 text-blue-900' :
                                    status === 'cancelled' ? 'bg-red-200 text-red-900' :
                                    'bg-yellow-200 text-yellow-900';
                                return `
                                    <div class="border-b border-gray-700 pb-2 sm:pb-3 last:border-0 last:pb-0">
                                        <div class="font-semibold text-yellow-300 mb-1 sm:mb-2 text-xs sm:text-sm">${carName}</div>
                                        <div class="text-gray-300 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
                                            <div class="flex items-center gap-1">
                                                <span>👤</span>
                                                <span>${booking.customerName || 'N/A'}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span>📅</span>
                                                <span>${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span>⏱️</span>
                                                <span>${days} day${days !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span>📌</span>
                                                <span class="px-1.5 py-0.5 rounded ${statusColor} capitalize">${status}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span>📞</span>
                                                <span>${booking.customerPhone || 'N/A'}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span>✉️</span>
                                                <span class="truncate">${booking.customerEmail || 'N/A'}</span>
                                            </div>
                                            ${booking.totalPrice ? `<div class="text-green-400 font-semibold mt-0.5 sm:mt-1">💰 ${booking.totalPrice}</div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="absolute left-0 top-3 sm:top-4 -ml-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    const remainingDays = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingDays && day <= 7; day++) {
        calendarHTML += `
            <div class="p-1 sm:p-2 min-h-[50px] sm:min-h-[80px] bg-gray-50 border border-gray-200 rounded text-gray-400 text-[10px] sm:text-sm flex items-center justify-center">
                ${day}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    container.innerHTML = calendarHTML;
    
    // Add mobile touch handlers for booking details
    setTimeout(() => {
        container.querySelectorAll('[data-day-id]').forEach(dayCell => {
            const dayId = dayCell.getAttribute('data-day-id');
            const tooltip = document.getElementById(`tooltip-${dayId}`);
            if (tooltip && dayCell.querySelector('.bg-yellow-200')) {
                dayCell.addEventListener('click', (e) => {
                    if (window.innerWidth < 640) { // Mobile
                        e.preventDefault();
                        e.stopPropagation();
                        const allTooltips = container.querySelectorAll('[id^="tooltip-"]');
                        allTooltips.forEach(t => {
                            t.classList.add('hidden');
                            t.classList.remove('opacity-100', 'visible');
                            t.classList.add('opacity-0', 'invisible');
                        });
                        if (tooltip) {
                            tooltip.classList.remove('hidden');
                            tooltip.classList.remove('opacity-0', 'invisible');
                            tooltip.classList.add('opacity-100', 'visible', 'pointer-events-auto');
                            tooltip.style.position = 'fixed';
                            const rect = dayCell.getBoundingClientRect();
                            tooltip.style.left = '10px';
                            tooltip.style.right = '10px';
                            tooltip.style.top = `${rect.bottom + 10}px`;
                            tooltip.style.width = 'auto';
                            tooltip.style.maxWidth = 'calc(100vw - 20px)';
                        }
                    }
                });
            }
        });
        
        // Close mobile tooltips when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 640) {
                if (!e.target.closest('[data-day-id]') && !e.target.closest('[id^="tooltip-"]')) {
                    container.querySelectorAll('[id^="tooltip-"]').forEach(tooltip => {
                        tooltip.classList.add('hidden');
                        tooltip.classList.remove('opacity-100', 'visible');
                        tooltip.classList.add('opacity-0', 'invisible');
                    });
                }
            }
        });
    }, 100);
    
    if (activeBookings.length === 0) {
        const noBookingsMsg = document.createElement('div');
        noBookingsMsg.className = 'mt-4 text-center text-gray-500 text-xs sm:text-sm';
        noBookingsMsg.textContent = 'No bookings found for this month.';
        container.appendChild(noBookingsMsg);
    }
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
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', goToPrevMonth);
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', goToNextMonth);
    if (todayBtn) todayBtn.addEventListener('click', goToToday);
    
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