// ===== GLOBALS =====
let allBookings = [];
let allCars = [];
let currentPage = 1;
const itemsPerPage = 10;

// ===== UTILS =====
function getAuthToken() {
    return localStorage.getItem('admin_token');
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function showNotification(message, type) {
    const el = document.createElement('div');
    el.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-opacity ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

function formatCurrency(value = 0) {
    const numeric = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    return `₱${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ===== AUTH =====
async function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const res = await fetch('../api/admin/auth?action=check', { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.logged_in) {
            localStorage.removeItem('admin_token');
            window.location.href = 'login.html';
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}
window.logout = logout;

// ===== DATA LOAD =====
async function loadRevenueData() {
    setLoadingState();
    try {
        const [bookingsRes, carsRes] = await Promise.all([
            fetch('../api/bookings', { headers: getAuthHeaders() }),
            fetch('../api/products', { headers: getAuthHeaders() })
        ]);

        if (bookingsRes.ok) {
            const data = await bookingsRes.json();
            allBookings = Array.isArray(data) ? data : [];
            allBookings.sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate));
        } else {
            allBookings = [];
        }

        if (carsRes.ok) {
            const data = await carsRes.json();
            allCars = Array.isArray(data) ? data : [];
        } else {
            allCars = [];
        }

        renderSummary();
        renderTable();
    } catch (err) {
        console.error('Error loading revenue data:', err);
        setErrorState('Failed to load bookings. Please refresh.');
        showNotification('Failed to load revenue data', 'error');
    }
}

// ===== SUMMARY =====
function renderSummary() {
    const completed = allBookings.filter(b => b.status === 'completed');
    const confirmed = allBookings.filter(b => b.status === 'confirmed');
    const pending = allBookings.filter(b => b.status === 'pending');

    const totalRevenue = completed.reduce((sum, b) => {
        const numeric = parseFloat(String(b.totalPrice || 0).replace(/[^0-9.]/g, '')) || 0;
        return sum + numeric;
    }, 0);

    document.getElementById('summaryTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('summaryCompleted').textContent = completed.length;
    document.getElementById('summaryConfirmed').textContent = confirmed.length;
    document.getElementById('summaryPending').textContent = pending.length;
}

// ===== TABLE =====
function applyFilters() {
    const status = document.getElementById('statusFilter')?.value || 'all';
    const search = (document.getElementById('searchBookings')?.value || '').toLowerCase();
    const from = document.getElementById('dateFrom')?.value || '';
    const to = document.getElementById('dateTo')?.value || '';
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return allBookings.filter(b => {
        if (status !== 'all' && b.status !== status) return false;

        if (fromDate || toDate) {
            const created = b.createdAt ? new Date(b.createdAt) : null;
            if (!created) return false;
            if (fromDate && created < fromDate) return false;
            if (toDate && created > toDate) return false;
        }

        if (!search) return true;
        const car = allCars.find(c => c.id === b.carId);
        const carName = car ? (car.name || `${car.make || ''} ${car.model || ''}`.trim() || '') : '';
        const customer = (b.customerName || '').toLowerCase();
        const email = (b.customerEmail || '').toLowerCase();
        return customer.includes(search) || email.includes(search) || carName.toLowerCase().includes(search);
    });
}

function renderTable() {
    const body = document.getElementById('bookingsTableBody');
    if (!body) return;

    const filtered = applyFilters();
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const rows = filtered.slice(start, end);

    if (rows.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>';
        renderPagination(0, 0);
        return;
    }

    body.innerHTML = rows.map(b => {
        const car = allCars.find(c => c.id === b.carId);
        const carName = car ? (car.name || `${car.make || ''} ${car.model || ''}`.trim() || 'Car') : 'Car';
        const startDate = b.startDate ? new Date(b.startDate) : null;
        const endDate = b.endDate ? new Date(b.endDate) : null;
        const status = b.status || 'pending';
        const statusColors = {
            completed: 'bg-green-100 text-green-800',
            confirmed: 'bg-blue-100 text-blue-800',
            pending: 'bg-yellow-100 text-yellow-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        const statusColor = statusColors[status] || 'bg-gray-100 text-gray-800';
        const amount = b.totalPrice ? formatCurrency(b.totalPrice) : '₱0.00';
        const created = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 text-xs sm:text-sm text-gray-900">
                    <span class="font-mono text-xs">${b.id ? b.id.substring(0, 12) : 'ID'}...</span>
                </td>
                <td class="px-4 py-3 text-xs sm:text-sm text-gray-900">${carName}</td>
                <td class="px-4 py-3 text-xs sm:text-sm">
                    <div class="font-medium text-gray-900">${b.customerName || 'N/A'}</div>
                    <div class="text-gray-500 text-xs">${b.customerEmail || 'N/A'}</div>
                    <div class="text-gray-500 text-xs">${b.customerPhone || 'N/A'}</div>
                </td>
                <td class="px-4 py-3 text-xs sm:text-sm text-gray-700">
                    <div>${startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
                    <div class="text-gray-500">to ${endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
                </td>
                <td class="px-4 py-3 text-xs sm:text-sm font-semibold ${status === 'completed' ? 'text-green-600' : 'text-gray-700'}">${amount}</td>
                <td class="px-4 py-3 text-xs sm:text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor}">${status}</span>
                </td>
                <td class="px-4 py-3 text-xs sm:text-sm text-gray-500">${created}</td>
            </tr>
        `;
    }).join('');

    renderPagination(totalPages, filtered.length);
}

function renderPagination(totalPages, totalItems) {
    const container = document.getElementById('bookingsPagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = totalItems ? `<span>Showing ${totalItems} booking${totalItems !== 1 ? 's' : ''}</span>` : '';
        return;
    }

    let html = `<span>Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems}</span>`;
    html += '<div class="flex gap-1 flex-wrap">';

    if (currentPage > 1) {
        html += `<button class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50" onclick="goToPage(${currentPage - 1})">Previous</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="px-3 py-1 border ${i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'} rounded" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span class="px-2 py-1 text-gray-400">...</span>';
        }
    }

    if (currentPage < totalPages) {
        html += `<button class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50" onclick="goToPage(${currentPage + 1})">Next</button>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.goToPage = goToPage;

function setLoadingState() {
    const body = document.getElementById('bookingsTableBody');
    if (body) {
        body.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading bookings...
                </td>
            </tr>`;
    }
}

function setErrorState(message) {
    const body = document.getElementById('bookingsTableBody');
    if (body) {
        body.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-red-500">${message}</td></tr>`;
    }
}

// ===== EVENTS =====
function bindEvents() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    const refreshBtn = document.getElementById('refreshRevenueBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadRevenueData();
            showNotification('Revenue refreshed', 'success');
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchBookings');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');

    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
    if (dateFrom) dateFrom.addEventListener('change', () => { currentPage = 1; renderTable(); });
    if (dateTo) dateTo.addEventListener('change', () => { currentPage = 1; renderTable(); });

    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                currentPage = 1;
                renderTable();
            }, 250);
        });
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    bindEvents();
    loadRevenueData();
});

