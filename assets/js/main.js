function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

let allCarsData = [];
let allBookingsData = [];
let pendingBookingData = null;

async function loadServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    
    servicesGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p>Please wait, fetching cars...</p></div>';
    
    try {
        const [carsResponse, bookingsResponse] = await Promise.all([
            fetch('api/products'),
            fetch('api/bookings')
        ]);

        const cars = await carsResponse.json();
        let bookings = [];
        try {
            bookings = await bookingsResponse.json();
        } catch (err) {
            console.warn('Failed to parse bookings response:', err);
            bookings = [];
        }
        allCarsData = Array.isArray(cars) ? cars : [];
        allBookingsData = Array.isArray(bookings) ? bookings : [];
        renderCars();
    } catch (error) {
        console.error('Error loading cars:', error);
        servicesGrid.innerHTML = '<div class="col-span-full text-center text-red-500 py-12"><p>Failed to load cars. Please try again later.</p></div>';
        showNotification('Failed to load cars', 'error');
    }
}

async function renderCars() {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;

    const filteredCars = allCarsData;

    if (!filteredCars || filteredCars.length === 0) {
        servicesGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12"><p>No cars found for this category.</p></div>';
        return;
    }

    const cardsHtml = await Promise.all(filteredCars.map(async car => await createCarCard(car, allBookingsData)));
    servicesGrid.innerHTML = cardsHtml.join('');
}

function formatPrice(value) {
    if (value === undefined || value === null || value === '') return 'Price on request';
    const str = String(value).trim();
    if (/[\p{Sc}]/u.test(str)) return str; // already has currency symbol
    const num = Number(str.replace(/,/g, ''));
    if (Number.isNaN(num)) return str;
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function createCarCard(car, bookings = []) {
    const iconSvg = `<img src="logo/me.png" alt="Car" class="w-12 h-12 object-contain">`;
    const carName = car.name || `${car.make || ''} ${car.model || ''}`.trim() || 'Car';
    const displayPrice = formatPrice(car.pricePerDay || car.price);
    const today = new Date();
    const carBookings = (bookings || []).filter(b => b.carId === car.id && b.status !== 'cancelled' && b.status !== 'completed');
    const currentBookings = carBookings
        .filter(b => {
            if (!b.startDate || !b.endDate) return false;
            const end = new Date(b.endDate);
            return end >= today;
        })
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const isCurrentlyBooked = currentBookings.length > 0;
    
    return `
        <div class="service-card bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            ${car.imageUrl ? `<img src="${car.imageUrl}" alt="${carName}" class="w-full h-48 object-cover rounded-lg mb-4">` : ''}
            <div class="text-yellow-600 mb-4">${iconSvg}</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">${carName}</h3>
            ${car.make && car.model ? `<p class="text-gray-600 text-sm mb-2">${car.make} ${car.model}${car.year ? ` (${car.year})` : ''}</p>` : ''}
            <p class="text-green-600 font-semibold mb-3">${displayPrice} / day</p>
            ${car.description ? `<p class="text-gray-600 mb-6">${car.description}</p>` : ''}
            
            ${currentBookings.length > 0 ? `
                <div class="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-4">
                    <p class="text-sm font-semibold text-gray-700 mb-2">Booked dates</p>
                    <div class="space-y-1">
                        ${currentBookings.slice(0, 3).map(b => {
                            const start = formatDate(b.startDate);
                            const end = formatDate(b.endDate);
                            return `<p class="text-sm text-gray-600">• ${start} - ${end}</p>`;
                        }).join('')}
                        ${currentBookings.length > 3 ? `<p class="text-xs text-gray-500">+${currentBookings.length - 3} more</p>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="border-t pt-4">
                <button onclick="bookCar('${car.id}', '${carName}', '${displayPrice}')" class="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-black hover:from-yellow-600 hover:via-amber-600 hover:to-gray-800 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl group" ${car.available === false || car.onBooking === true ? 'disabled' : ''}>
                    <span class="flex items-center justify-center gap-2">
                        ${car.available === false ? 'Not Available' : (car.onBooking === true ? 'On Booking' : (isCurrentlyBooked ? 'Booked' : 'Rent Now'))}
                        <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>
                    </span>
                </button>
            </div>
        </div>
    `;
}

// Default services are now initialized via API endpoint


async function bookCar(carId, carName, pricePerDay) {
    const modal = document.getElementById('bookCarModal');
    const form = document.getElementById('bookCarForm');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const unavailableInfo = document.getElementById('unavailableDatesInfo');
    
    // Fetch latest bookings for this car to avoid cross-car date leakage
    let freshBookings = [];
    try {
        const res = await fetch(`api/bookings?carId=${encodeURIComponent(carId)}`);
        if (res.ok) {
            const data = await res.json();
            freshBookings = Array.isArray(data) ? data : [];
        }
    } catch (err) {
        console.warn('Failed to refresh bookings for car:', carId, err);
    }
    
    document.getElementById('bookCarId').value = carId;
    document.getElementById('bookCarName').textContent = carName;
    document.getElementById('bookCarPrice').textContent = pricePerDay || 'Price on request';
    
    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;
    startDateInput.value = '';
    endDateInput.value = '';
    endDateInput.min = today;
    document.getElementById('bookCarTotalPrice').textContent = '₱0.00';
    document.getElementById('bookCarDays').textContent = '';
    if (unavailableInfo) {
        unavailableInfo.classList.add('hidden');
        unavailableInfo.textContent = 'Some dates are unavailable for this car.';
    }
    
    modal.classList.remove('hidden');
    
    const sourceBookings = freshBookings.length > 0 ? freshBookings : (allBookingsData || []);
    const blockedBookings = sourceBookings.filter(b =>
        b.carId === carId &&
        (b.status === 'confirmed' || b.status === 'completed') &&
        b.startDate && b.endDate
    );

    function showBlockedInfo() {
        if (!unavailableInfo) return;
        if (blockedBookings.length === 0) {
            unavailableInfo.classList.add('hidden');
            return;
        }
        const items = blockedBookings
            .slice(0, 4)
            .map(b => `${formatDate(b.startDate)} - ${formatDate(b.endDate)}`)
            .join(', ');
        unavailableInfo.textContent = `Unavailable: ${items}${blockedBookings.length > 4 ? ' +' + (blockedBookings.length - 4) + ' more' : ''}`;
        unavailableInfo.classList.remove('hidden');
    }
    showBlockedInfo();

    function isConflicting(startDate, endDate) {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return blockedBookings.some(b => {
            const bStart = new Date(b.startDate);
            const bEnd = new Date(b.endDate);
            return start <= bEnd && end >= bStart;
        });
    }

    function calculateTotal() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const priceStr = pricePerDay ? pricePerDay.toString().replace(/[^0-9.,]/g, '') : '0';
        const price = parseFloat(priceStr.replace(/,/g, '')) || 0;
        
        if (startDate) {
            const nextDay = new Date(startDate);
            nextDay.setDate(nextDay.getDate() + 1);
            endDateInput.min = nextDay.toISOString().split('T')[0];
        }
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (end > start) {
                if (isConflicting(startDate, endDate)) {
                    showNotification('Selected dates overlap with an existing booking.', 'error');
                    endDateInput.value = '';
                    document.getElementById('bookCarDays').textContent = 'Dates unavailable';
                    document.getElementById('bookCarTotalPrice').textContent = '₱0.00';
                    return;
                }
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                const total = price * days;
                document.getElementById('bookCarDays').textContent = `${days} day${days !== 1 ? 's' : ''}`;
                const currencyMatch = pricePerDay ? pricePerDay.match(/[$₱€£¥]/) : null;
                const currencySymbol = currencyMatch ? currencyMatch[0] : '₱';
                document.getElementById('bookCarTotalPrice').textContent = `${currencySymbol}${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else {
                document.getElementById('bookCarDays').textContent = 'Invalid date range';
                document.getElementById('bookCarTotalPrice').textContent = '₱0.00';
            }
        }
    }
    
    startDateInput.removeEventListener('change', calculateTotal);
    endDateInput.removeEventListener('change', calculateTotal);
    startDateInput.addEventListener('change', calculateTotal);
    endDateInput.addEventListener('change', calculateTotal);
}

async function loadContactInfoForBooking(serviceTitle = '') {
    try {
        const response = await fetch('api/contact');
        const contacts = await response.json();
        
        // Find phone, email, and messenger contacts
        const phoneContact = contacts.find(c => c.type === 'phone' && c.isActive !== false);
        const emailContact = contacts.find(c => c.type === 'email' && c.isActive !== false);
        const messengerContact = contacts.find(c => c.type === 'social' && c.value.includes('m.me') && c.isActive !== false);
        
        // Update call button
        const callNowBtn = document.getElementById('callNowBtn');
        const callNowText = document.getElementById('callNowText');
        if (phoneContact) {
            callNowText.textContent = `Call Now: ${phoneContact.value}`;
            callNowBtn.onclick = () => window.open(`tel:${phoneContact.value}`, '_self');
        } else {
            callNowText.textContent = 'Call Now: Not Available';
            callNowBtn.disabled = true;
            callNowBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        // Update email button
        const emailUsBtn = document.getElementById('emailUsBtn');
        const emailUsText = document.getElementById('emailUsText');
        if (emailContact) {
            emailUsText.textContent = `Email Us: ${emailContact.value}`;
            emailUsBtn.onclick = () => window.open(`mailto:${emailContact.value}`, '_self');
        } else {
            emailUsText.textContent = 'Email Us: Not Available';
            emailUsBtn.disabled = true;
            emailUsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        // Update messenger button with service-specific message
        const messengerUsBtn = document.getElementById('messengerUsBtn');
        const messengerUsText = document.getElementById('messengerUsText');
        if (messengerContact) {
            messengerUsText.textContent = `Message Us: ${messengerContact.value.replace('https://', '')}`;
            
            // Create service-specific message
            const message = serviceTitle ? 
                `Hi! I'm interested in the services you offer for the ${serviceTitle} service. Please provide more details and availability. Thank you!` :
                `Hi! I'm interested in the services you offer. Please provide more details and availability. Thank you!`;
            
            const encodedMessage = encodeURIComponent(message);
            const messengerUrl = `${messengerContact.value}?text=${encodedMessage}`;
            
            messengerUsBtn.onclick = () => window.open(messengerUrl, '_blank');
        } else {
            messengerUsText.textContent = 'Message Us: Not Available';
            messengerUsBtn.disabled = true;
            messengerUsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
    } catch (error) {
        console.error('Error loading contact info for booking:', error);
        // Set default values if loading fails
        document.getElementById('callNowText').textContent = 'Call Now: Contact Not Available';
        document.getElementById('emailUsText').textContent = 'Email Us: Contact Not Available';
        document.getElementById('messengerUsText').textContent = 'Message Us: Contact Not Available';
    }
}

function closeBookCarModal() {
    document.getElementById('bookCarModal').classList.add('hidden');
    closeBookingConfirmModal();
}

async function submitCarBooking(e) {
    e.preventDefault();
    
    const carId = document.getElementById('bookCarId').value;
    const carName = document.getElementById('bookCarName').textContent;
    const customerName = document.getElementById('customerName').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const totalPrice = document.getElementById('bookCarTotalPrice').textContent;
    const totalDays = document.getElementById('bookCarDays').textContent;
    
    if (!carId || !customerName || !customerEmail || !customerPhone || !startDate || !endDate) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) {
        showNotification('Return date must be after pick-up date', 'error');
        return;
    }
    
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const formattedStartDate = start.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedEndDate = end.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    pendingBookingData = {
        carId,
        carName,
        customerName,
        customerEmail,
        customerPhone,
        startDate,
        endDate,
        formattedStartDate,
        formattedEndDate,
        totalPrice,
        totalDaysText: totalDays || `${days} day${days !== 1 ? 's' : ''}`,
        daysNumber: days
    };

    openBookingConfirmModal(pendingBookingData);
}

function openBookingConfirmModal(data) {
    const modal = document.getElementById('bookingConfirmModal');
    if (!modal || !data) return;
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '';
    };
    setText('confirmCar', data.carName || 'Car');
    setText('confirmPickup', data.formattedStartDate || '');
    setText('confirmReturn', data.formattedEndDate || '');
    setText('confirmTotal', data.totalPrice || 'N/A');
    setText('confirmDays', data.totalDaysText || '');
    setText('confirmName', data.customerName || '');
    setText('confirmEmail', data.customerEmail || '');
    setText('confirmPhone', data.customerPhone || '');
    modal.classList.remove('hidden');
}

function closeBookingConfirmModal() {
    const modal = document.getElementById('bookingConfirmModal');
    if (modal) modal.classList.add('hidden');
    pendingBookingData = null;
}

async function finalizeBookingSubmission() {
    const data = pendingBookingData;
    if (!data) return;
    
    const messengerMessage = `I'm interested in your car rental services

Full Name: ${data.customerName}

Email: ${data.customerEmail}

Phone Number: ${data.customerPhone}

Pickup Date: ${data.formattedStartDate}

Return Date: ${data.formattedEndDate}

Total Days: ${data.daysNumber} day${data.daysNumber !== 1 ? 's' : ''}

Total Amount: ${data.totalPrice}

Car: ${data.carName}`;
    
    const encodedMessage = encodeURIComponent(messengerMessage);
    const messengerUrl = `https://m.me/testSiteArea?text=${encodedMessage}`;
    
    try {
        const response = await fetch('api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                carId: data.carId,
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone,
                startDate: data.startDate,
                endDate: data.endDate,
                totalPrice: data.totalPrice
            })
        });
        
        await response.json();
        
        showNotification('Opening Messenger to send your booking details...', 'success');
        window.open(messengerUrl, '_blank');
        setTimeout(() => {
            closeBookCarModal();
            closeBookingConfirmModal();
        }, 800);
    } catch (error) {
        console.error('Error submitting booking:', error);
        showNotification('Opening Messenger to send your booking details...', 'success');
        window.open(messengerUrl, '_blank');
        setTimeout(() => {
            closeBookCarModal();
            closeBookingConfirmModal();
        }, 800);
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Client Carousel Functionality
let currentSlide = 0;
let clients = [];
let slideInterval;

async function loadClients() {
    const clientsGrid = document.getElementById('clientsGrid');
    
    // Show loading message
    clientsGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p>Please wait, fetching clients...</p></div>';
    
    try {
        const response = await fetch('api/clients');
        clients = await response.json();
        
        if (!clients || clients.length === 0) {
            clientsGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No client images yet. Check back soon!</p>';
            return;
        }
        
        renderClientsGrid();
    } catch (error) {
        console.error('Error loading clients:', error);
        clientsGrid.innerHTML = '<div class="col-span-full text-center text-red-500 py-12"><p>Unable to load client images. Please try again later.</p></div>';
    }
}

function renderClientsGrid() {
    const grid = document.getElementById('clientsGrid');
    
    grid.innerHTML = clients.map(client => {
        const firstImage = client.images ? client.images[0] : client.image;
        const imageCount = client.images ? client.images.length : (client.image ? 1 : 0);
        
        return `
            <div class="client-card bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer" onclick="showClientGallery('${client.id}')">
                <div class="text-center">
                    <div class="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
                        <img src="${firstImage}" alt="${client.name}" class="w-full h-full object-cover">
                        ${imageCount > 1 ? `<div class="absolute top-1 right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">+${imageCount - 1}</div>` : ''}
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 mb-1">${client.name}</h3>
                    ${client.company ? `<p class="text-blue-600 font-semibold text-sm mb-2">${client.company}</p>` : ''}
                    ${client.testimonial ? `<p class="text-gray-600 text-sm italic client-testimonial">"${client.testimonial}"</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function showClientGallery(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const images = client.images || (client.image ? [client.image] : []);
    if (images.length === 0) return;
    
    // Create gallery modal
    const galleryModal = document.createElement('div');
    galleryModal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';
    galleryModal.id = 'clientGalleryModal';
    
    galleryModal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div class="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                <h2 class="text-2xl font-bold text-gray-900">${client.name}</h2>
                <button onclick="closeClientGallery()" class="text-gray-500 hover:text-gray-700">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 80px);">
                ${client.company ? `<p class="text-blue-600 font-semibold mb-4">${client.company}</p>` : ''}
                ${client.testimonial ? `<p class="text-gray-600 mb-6">"${client.testimonial}"</p>` : ''}
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="clientGalleryGrid">
                    ${images.map((image, index) => `
                        <div class="relative group gallery-image-container" data-index="${index}">
                            <img src="${image}" alt="${client.name}" class="gallery-image w-full h-48 object-cover rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" data-index="${index}">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                                <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                                </svg>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(galleryModal);
    
    // Add click event listeners after modal is created
    setTimeout(() => {
        const galleryImages = galleryModal.querySelectorAll('.gallery-image');
        galleryImages.forEach((img, index) => {
            img.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Image clicked:', index); // Debug log
                resizeGalleryImage(img, index);
            });
        });
    }, 100);
}

function closeClientGallery() {
    const modal = document.getElementById('clientGalleryModal');
    if (modal) {
        modal.remove();
    }
}

function openImageFullscreen(imageSrc) {
    const fullscreenModal = document.createElement('div');
    fullscreenModal.className = 'fixed inset-0 bg-black bg-opacity-90 z-60 flex items-center justify-center p-4';
    fullscreenModal.id = 'imageFullscreenModal';
    
    fullscreenModal.innerHTML = `
        <div class="relative max-w-6xl max-h-full">
            <button onclick="closeImageFullscreen()" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
            <img src="${imageSrc}" alt="Fullscreen" class="max-w-full max-h-full object-contain rounded-lg">
        </div>
    `;
    
    document.body.appendChild(fullscreenModal);
}

function closeImageFullscreen() {
    const modal = document.getElementById('imageFullscreenModal');
    if (modal) {
        modal.remove();
    }
}

let expandedImageIndex = null;

function resizeGalleryImage(img, index) {
    console.log('resizeGalleryImage called with index:', index); // Debug log
    
    const container = img.closest('.gallery-image-container');
    const modal = document.getElementById('clientGalleryModal');
    const allImages = modal ? modal.querySelectorAll('.gallery-image') : document.querySelectorAll('.gallery-image');
    const allContainers = modal ? modal.querySelectorAll('.gallery-image-container') : document.querySelectorAll('.gallery-image-container');
    
    console.log('Found images:', allImages.length); // Debug log
    
    // If clicking the same image that's already expanded, collapse it
    if (expandedImageIndex === index) {
        console.log('Collapsing image:', index); // Debug log
        // Collapse the expanded image
        allImages.forEach(image => {
            image.classList.remove('expanded');
        });
        allContainers.forEach(cont => {
            cont.classList.remove('expanded');
        });
        expandedImageIndex = null;
        return;
    }
    
    console.log('Expanding image:', index); // Debug log
    
    // Reset all images to normal size
    allImages.forEach(image => {
        image.classList.remove('expanded');
    });
    allContainers.forEach(cont => {
        cont.classList.remove('expanded');
    });
    
    // Expand the clicked image
    img.classList.add('expanded');
    container.classList.add('expanded');
    expandedImageIndex = index;
    
    console.log('Classes added:', img.classList.toString(), container.classList.toString()); // Debug log
    
    // Force a reflow to ensure the expansion takes effect
    container.offsetHeight;
    
    // Scroll the expanded image into view
    container.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
    });
}

// Carousel functions removed - now using grid layout

// Navigation event listeners removed - now using grid layout

// Contact Functionality
let contactInfo = [];

async function loadContactInfo() {
    try {
        const response = await fetch('api/contact');
        contactInfo = await response.json();
        renderContactInfo();
    } catch (error) {
        console.error('Error loading contact info:', error);
        document.getElementById('contactGrid').innerHTML = '<div class="col-span-full text-center text-red-500 py-12"><p>Unable to load contact information. Please try again later.</p></div>';
    }
}

function renderContactInfo() {
    const container = document.getElementById('contactGrid');
    
    // Show loading message
    container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p>Please wait, fetching contact information...</p></div>';
    
    if (!contactInfo || contactInfo.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">Contact information coming soon. Please check back later!</p>';
        return;
    }
    
    // Filter only active contacts and sort by order
    const activeContacts = contactInfo
        .filter(contact => contact.isActive !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    if (activeContacts.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">Contact information coming soon. Please check back later!</p>';
        return;
    }
    
    container.innerHTML = activeContacts.map(contact => createContactCard(contact)).join('');
}

function createContactCard(contact) {
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
    
    // Create appropriate link based on contact type
    let contactLink = '';
    if (contact.type === 'phone') {
        contactLink = `tel:${contact.value}`;
    } else if (contact.type === 'email') {
        contactLink = `mailto:${contact.value}`;
    } else if (contact.type === 'website') {
        contactLink = contact.value.startsWith('http') ? contact.value : `https://${contact.value}`;
    } else if (contact.type === 'social') {
        contactLink = contact.value.startsWith('http') ? contact.value : `https://${contact.value}`;
    }
    
    return `
        <div class="contact-card bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 text-center">
            <div class="text-4xl mb-4">${displayIcon}</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">${contact.label}</h3>
            ${contactLink ? `
                <a href="${contactLink}" 
                   class="text-blue-600 hover:text-blue-800 transition-colors"
                   ${contact.type === 'phone' || contact.type === 'email' ? '' : 'target="_blank" rel="noopener noreferrer"'}>
                    ${contact.value}
                </a>
            ` : `
                <p class="text-gray-600">${contact.value}</p>
            `}
        </div>
    `;
}

// Product Quote Functionality
let allProducts = [];
let selectedProducts = [];
let filteredProducts = [];
let currentSearchQuery = '';

async function loadProducts() {
    try {
        const response = await fetch('api/products');
        allProducts = await response.json();
        filteredProducts = [...allProducts]; // Initialize filtered products
    } catch (error) {
        console.error('Error loading products:', error);
        allProducts = [];
        filteredProducts = [];
    }
}

function openQuoteModal() {
    const modal = document.getElementById('quoteModal');
    modal.classList.remove('hidden');
    renderProductsList();
}

function closeQuoteModal() {
    const modal = document.getElementById('quoteModal');
    modal.classList.add('hidden');
    selectedProducts = [];
    
    // Reset total cost to ₱0.00
    const totalElement = document.getElementById('totalPrice');
    if (totalElement) {
        totalElement.textContent = '₱0.00';
    }
    
    // Uncheck all checkboxes
    const checkboxes = modal.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset all quantity inputs to 1
    const quantityInputs = modal.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        input.value = 1;
    });
    
    // Reset search
    clearSearch();
}

function renderProductsList() {
    const container = document.getElementById('productsQuoteList');
    
    // Show loading message if products are still loading
    if (!allProducts) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div><p>Please wait, fetching products...</p></div>';
        return;
    }
    
    if (filteredProducts.length === 0) {
        if (currentSearchQuery) {
            container.innerHTML = `<p class="text-center text-gray-500 py-8">No products found for "${currentSearchQuery}". Try a different search term.</p>`;
        } else {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">No products available at the moment.</p>';
        }
        return;
    }
    
    // Group filtered products by category
    const groupedProducts = filteredProducts.reduce((acc, product) => {
        const category = product.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {});
    
    container.innerHTML = Object.entries(groupedProducts).map(([category, products]) => `
        <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
                ${category}
            </h3>
            <div class="space-y-3 pl-2">
                ${products.map(product => createProductQuoteItem(product)).join('')}
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    setTimeout(() => {
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                updateSelectedProducts(e.target.dataset.productId, e.target.checked);
            });
        });
        
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const productId = e.target.dataset.productId;
                const checkbox = document.querySelector(`input[data-product-id="${productId}"]`);
                if (checkbox && checkbox.checked) {
                    updateSelectedProducts(productId, true);
                }
            });
        });
        
        document.querySelectorAll('.quantity-increase').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const input = document.querySelector(`input[data-product-id="${productId}"].quantity-input`);
                if (input && !input.disabled) {
                    const currentValue = parseInt(input.value) || 1;
                    input.value = currentValue + 1;
                    
                    const checkbox = document.querySelector(`input[data-product-id="${productId}"]`);
                    if (checkbox && checkbox.checked) {
                        updateSelectedProducts(productId, true);
                    }
                }
            });
        });
        
        document.querySelectorAll('.quantity-decrease').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const input = document.querySelector(`input[data-product-id="${productId}"].quantity-input`);
                if (input && !input.disabled) {
                    const currentValue = parseInt(input.value) || 1;
                    const newValue = Math.max(1, currentValue - 1);
                    input.value = newValue;
                    
                    const checkbox = document.querySelector(`input[data-product-id="${productId}"]`);
                    if (checkbox && checkbox.checked) {
                        updateSelectedProducts(productId, true);
                    }
                }
            });
        });
    }, 100);
    
    // Update search results count
    updateSearchResultsCount();
}

function createProductQuoteItem(product) {
    const isInStock = product.inStock !== false;
    const stockClass = isInStock ? '' : 'opacity-50';
    const stockBadge = !isInStock ? '<span class="text-xs text-red-600 font-semibold ml-2">(Out of Stock)</span>' : '';
    
    return `
        <div class="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-red-50 hover:shadow-md transition-all duration-300 cursor-pointer group ${stockClass}" onclick="openProductMessenger('${product.id}')">
            <input type="checkbox" 
                class="product-checkbox mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                data-product-id="${product.id}"
                ${!isInStock ? 'disabled' : ''}
                onclick="event.stopPropagation()">
            
            ${product.imageUrl ? `
                <div class="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow group-hover:shadow-lg transition-shadow">
                    <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                </div>
            ` : ''}
            
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                    <h4 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">${product.name}${stockBadge}</h4>
                    <span class="text-lg font-bold text-blue-600 whitespace-nowrap">${product.price}</span>
                </div>
                ${product.description ? `<p class="text-sm text-gray-600 mt-1 group-hover:text-gray-700 transition-colors">${product.description}</p>` : ''}
                
                <div class="flex items-center gap-2 mt-2" onclick="event.stopPropagation()">
                    <label class="text-sm text-gray-600">Qty:</label>
                    <div class="flex items-center border border-gray-300 rounded overflow-hidden">
                        <button type="button" 
                            class="quantity-decrease px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ${!isInStock ? 'opacity-50 cursor-not-allowed' : ''}"
                            data-product-id="${product.id}"
                            ${!isInStock ? 'disabled' : ''}>
                            −
                        </button>
                        <input type="number" 
                            class="quantity-input w-12 px-2 py-1 text-sm border-0 text-center focus:ring-0 focus:outline-none" 
                            data-product-id="${product.id}"
                            min="1" 
                            value="1"
                            ${!isInStock ? 'disabled' : ''}>
                        <button type="button" 
                            class="quantity-increase px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ${!isInStock ? 'opacity-50 cursor-not-allowed' : ''}"
                            data-product-id="${product.id}"
                            ${!isInStock ? 'disabled' : ''}>
                            +
                        </button>
                    </div>
                </div>
                
                <!-- Click hint -->
                <div class="mt-2 flex items-center gap-1 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <span>Click to message about this product</span>
                </div>
            </div>
        </div>
    `;
}

function filterProducts(searchQuery) {
    currentSearchQuery = searchQuery.toLowerCase().trim();
    
    if (!currentSearchQuery) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => {
            const name = (product.name || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            
            return name.includes(currentSearchQuery) || 
                   description.includes(currentSearchQuery) || 
                   category.includes(currentSearchQuery);
        });
    }
    
    renderProductsList();
}

function updateSearchResultsCount() {
    const resultsCountElement = document.getElementById('searchResultsCount');
    
    if (!resultsCountElement) return;
    
    if (currentSearchQuery) {
        const totalProducts = allProducts.length;
        const filteredCount = filteredProducts.length;
        
        resultsCountElement.textContent = `Showing ${filteredCount} of ${totalProducts} products`;
        resultsCountElement.classList.remove('hidden');
    } else {
        resultsCountElement.classList.add('hidden');
    }
}

function clearSearch() {
    const searchInput = document.getElementById('productSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    if (clearBtn) {
        clearBtn.classList.add('hidden');
    }
    
    filterProducts('');
}

function updateSelectedProducts(productId, isSelected) {
    const product = allProducts.find(p => p.id === productId);
    const quantityInput = document.querySelector(`input[data-product-id="${productId}"].quantity-input`);
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    if (isSelected && product) {
        // Remove existing product if it exists
        selectedProducts = selectedProducts.filter(p => p.id !== productId);
        // Add with quantity
        selectedProducts.push({...product, quantity});
    } else {
        selectedProducts = selectedProducts.filter(p => p.id !== productId);
    }
    
    updateTotalPrice();
}

function updateTotalPrice() {
    const totalElement = document.getElementById('totalPrice');
    
    if (selectedProducts.length === 0) {
        totalElement.textContent = '₱0.00';
        return;
    }
    
    // Try to calculate total if all prices are in the same format
    const totalAmount = selectedProducts.reduce((sum, product) => {
        const priceStr = product.price.toString().replace(/[^0-9.,]/g, '');
        const price = parseFloat(priceStr.replace(/,/g, ''));
        const quantity = product.quantity || 1;
        return sum + (isNaN(price) ? 0 : price * quantity);
    }, 0);
    
    // Check if all prices are valid numbers
    const allValidPrices = selectedProducts.every(p => {
        const priceStr = p.price.toString().replace(/[^0-9.,]/g, '');
        return !isNaN(parseFloat(priceStr.replace(/,/g, '')));
    });
    
    if (allValidPrices && totalAmount > 0) {
        // Detect currency symbol from first product, default to peso if none found
        const currencyMatch = selectedProducts[0].price.match(/[$₱€£¥]/);
        const currencySymbol = currencyMatch ? currencyMatch[0] : '₱';
        
        totalElement.textContent = `${currencySymbol}${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
        // If prices are in different formats, just show count
        const totalItems = selectedProducts.reduce((sum, p) => sum + (p.quantity || 1), 0);
        totalElement.textContent = `${totalItems} items selected`;
    }
}

async function submitQuote() {
    if (selectedProducts.length === 0) {
        showNotification('Please select at least one product', 'error');
        return;
    }
    
    const productList = selectedProducts.map(p => {
        const qty = p.quantity || 1;
        const total = (() => {
            const priceStr = p.price.toString().replace(/[^0-9.,]/g, '');
            const price = parseFloat(priceStr.replace(/,/g, ''));
            return isNaN(price) ? 0 : price * qty;
        })();
        const currencyMatch = p.price.match(/[$₱€£¥]/);
        const currencySymbol = currencyMatch ? currencyMatch[0] : '₱';
        
        return `- ${p.name} (${qty}x ${p.price} = ${currencySymbol}${total.toFixed(2)})`;
    }).join('\n');
    
    const totalPrice = document.getElementById('totalPrice').textContent;
    
    // Create a shorter, more compatible message
    const message = `Hi! I need a quote for:\n\n${productList}\n\nTotal: ${totalPrice}\n\nPlease provide details and availability. Thank you!`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Debug: Log the message and URL
    console.log('Original message:', message);
    console.log('Encoded message:', encodedMessage);
    console.log('Message length:', message.length);
    
    try {
        // Fetch contact information to get dynamic Messenger URL
        const response = await fetch('api/contact');
        const contacts = await response.json();
        
        console.log('All contacts:', contacts);
        
        // Find Messenger contact (social type with m.me in value)
        const messengerContact = contacts.find(c => 
            c.type === 'social' && 
            c.value && 
            c.value.includes('m.me') && 
            c.isActive !== false
        );
        
        console.log('Found messenger contact:', messengerContact);
        
        if (messengerContact) {
            // Use dynamic Messenger URL from contact info
            const messengerUrl = `${messengerContact.value}?text=${encodedMessage}`;
            console.log('Using dynamic URL:', messengerUrl);
            window.open(messengerUrl, '_blank');
            showNotification('Opening Messenger to send your quote request...', 'success');
        } else {
            // Fallback to default if no Messenger contact found
            const messengerUrl = `https://m.me/BuildUpSrvcs?text=${encodedMessage}`;
            console.log('Using fallback URL:', messengerUrl);
            window.open(messengerUrl, '_blank');
            showNotification('Opening Messenger to send your quote request...', 'success');
        }
    } catch (error) {
        console.error('Error loading contact info for quote:', error);
        // Fallback to default Messenger URL
        const messengerUrl = `https://m.me/BuildUpSrvcs?text=${encodedMessage}`;
        console.log('Using error fallback URL:', messengerUrl);
        window.open(messengerUrl, '_blank');
        showNotification('Opening Messenger to send your quote request...', 'success');
    }
    
    // Close modal after delay
    setTimeout(() => {
        closeQuoteModal();
    }, 1500);
}

async function openProductMessenger(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Create a shorter, more compatible message
    const message = `Hi! I'm interested in "${product.name}" (${product.price}).\n\nPlease provide details about availability and installation. Thank you!`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Debug: Log the message and URL
    console.log('Product message:', message);
    console.log('Encoded product message:', encodedMessage);
    console.log('Product message length:', message.length);
    
    try {
        // Fetch contact information to get dynamic Messenger URL
        const response = await fetch('api/contact');
        const contacts = await response.json();
        
        console.log('All contacts for product:', contacts);
        
        // Find Messenger contact (social type with m.me in value)
        const messengerContact = contacts.find(c => 
            c.type === 'social' && 
            c.value && 
            c.value.includes('m.me') && 
            c.isActive !== false
        );
        
        console.log('Found messenger contact for product:', messengerContact);
        
        if (messengerContact) {
            // Use dynamic Messenger URL from contact info
            const messengerUrl = `${messengerContact.value}?text=${encodedMessage}`;
            console.log('Using dynamic product URL:', messengerUrl);
            window.open(messengerUrl, '_blank');
            showNotification(`Opening Messenger to inquire about ${product.name}...`, 'success');
        } else {
            // Fallback to default if no Messenger contact found
            const messengerUrl = `https://m.me/BuildUpSrvcs?text=${encodedMessage}`;
            console.log('Using fallback product URL:', messengerUrl);
            window.open(messengerUrl, '_blank');
            showNotification(`Opening Messenger to inquire about ${product.name}...`, 'success');
        }
    } catch (error) {
        console.error('Error loading contact info for product inquiry:', error);
        // Fallback to default Messenger URL
        const messengerUrl = `https://m.me/BuildUpSrvcs?text=${encodedMessage}`;
        console.log('Using error fallback product URL:', messengerUrl);
        window.open(messengerUrl, '_blank');
        showNotification(`Opening Messenger to inquire about ${product.name}...`, 'success');
    }
}

function scrollToContact() {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        contactSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadClients();
    loadContactInfo();
    loadProducts();
    
    
    // Quote modal event listeners
    const getQuoteBtn = document.getElementById('getQuoteBtn');
    const getQuoteHeroBtn = document.getElementById('getQuoteHeroBtn');
    const closeQuoteModalBtn = document.getElementById('closeQuoteModal');
    const submitQuoteBtn = document.getElementById('submitQuoteBtn');
    
    if (getQuoteBtn) {
        getQuoteBtn.addEventListener('click', openQuoteModal);
    }
    
    if (getQuoteHeroBtn) {
        getQuoteHeroBtn.addEventListener('click', openQuoteModal);
    }
    
    if (closeQuoteModalBtn) {
        closeQuoteModalBtn.addEventListener('click', closeQuoteModal);
    }
    
    if (submitQuoteBtn) {
        submitQuoteBtn.addEventListener('click', submitQuote);
    }
    
    // Book car modal event listeners
    const closeBookCarModalBtn = document.getElementById('closeBookCarModal');
    const cancelBookCarBtn = document.getElementById('cancelBookCarBtn');
    const bookCarForm = document.getElementById('bookCarForm');
    
    if (closeBookCarModalBtn) {
        closeBookCarModalBtn.addEventListener('click', closeBookCarModal);
    }
    
    if (cancelBookCarBtn) {
        cancelBookCarBtn.addEventListener('click', closeBookCarModal);
    }
    
    if (bookCarForm) {
        bookCarForm.addEventListener('submit', submitCarBooking);
    }
    
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    const closeBookingConfirm = document.getElementById('closeBookingConfirm');
    if (confirmBookingBtn) confirmBookingBtn.addEventListener('click', finalizeBookingSubmission);
    if (cancelBookingBtn) cancelBookingBtn.addEventListener('click', closeBookingConfirmModal);
    if (closeBookingConfirm) closeBookingConfirm.addEventListener('click', closeBookingConfirmModal);
    
    // Search functionality event listeners
    const searchInput = document.getElementById('productSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value;
                filterProducts(query);
                
                // Show/hide clear button
                if (clearSearchBtn) {
                    if (query.trim()) {
                        clearSearchBtn.classList.remove('hidden');
                    } else {
                        clearSearchBtn.classList.add('hidden');
                    }
                }
            }, 300); // Debounce search by 300ms
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Close mobile menu when clicking on a link
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }
});

