async function loadServices() {
    try {
        const [servicesRes, ratingsRes] = await Promise.all([
            fetch('api/admin/services'),
            fetch('api/get-ratings')
        ]);

        const services = await servicesRes.json();
        const ratings = await ratingsRes.json();

        if (!services || services.length === 0) {
            try {
                await fetch('api/init-services', { method: 'POST' });
                return loadServices();
            } catch (error) {
                console.error('Failed to initialize services:', error);
            }
        }
        
        const servicesGrid = document.getElementById('servicesGrid');
        servicesGrid.innerHTML = services.map(service => {
            const rating = ratings[service.id] || { average: 0, count: 0 };
            return createServiceCard(service, rating);
        }).join('');

        attachRatingListeners();
    } catch (error) {
        console.error('Error loading services:', error);
        showNotification('Failed to load services', 'error');
    }
}

// Default services are now initialized via API endpoint

function createServiceCard(service, rating) {
    const avgRating = parseFloat(rating.average) || 0;
    const count = parseInt(rating.count) || 0;
    
        const iconSvg = `<img src="logo/me.png" alt="${service.title}" class="w-12 h-12 object-contain">`;
    
    return `
        <div class="service-card bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            ${service.image ? `<img src="${service.image}" alt="${service.title}" class="w-full h-48 object-cover rounded-lg mb-4">` : ''}
            <div class="${service.color} mb-4">${iconSvg}</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">${service.title}</h3>
            <p class="text-gray-600 mb-6">${service.description}</p>
            
            <div class="border-t pt-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-600">Your Rating:</span>
                    <div class="star-rating flex gap-1" data-service="${service.id}">
                        ${[1,2,3,4,5].map(i => `<svg class="star w-6 h-6 text-gray-300" data-rating="${i}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`).join('')}
                    </div>
                </div>
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">Average: <span class="font-semibold text-yellow-600">${avgRating.toFixed(1)}</span>/5</span>
                    <span class="text-gray-500">${count} ${count === 1 ? 'rating' : 'ratings'}</span>
                </div>
            </div>
        </div>
    `;
}

function attachRatingListeners() {
    document.querySelectorAll('.star-rating').forEach(ratingContainer => {
        const stars = ratingContainer.querySelectorAll('.star');
        const serviceId = ratingContainer.dataset.service;

        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    s.classList.toggle('active', i <= index);
                });
            });

            star.addEventListener('click', async () => {
                const rating = parseInt(star.dataset.rating);
                await submitRating(serviceId, rating);
            });
        });

        ratingContainer.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('active'));
        });
    });
}

async function submitRating(serviceId, rating) {
    try {
        const response = await fetch('api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service_id: serviceId, rating })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Thank you for your rating!', 'success');
            await loadServices();
        } else {
            showNotification(result.message || 'Error submitting rating', 'error');
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showNotification('Failed to submit rating', 'error');
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
    try {
        const response = await fetch('api/clients');
        clients = await response.json();
        
        if (!clients || clients.length === 0) {
            document.getElementById('clientsGrid').innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No client images yet. Check back soon!</p>';
            return;
        }
        
        renderClientsGrid();
    } catch (error) {
        console.error('Error loading clients:', error);
        document.getElementById('clientsGrid').innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">Unable to load client images.</p>';
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
                            <img src="${image}" alt="${client.name}" class="gallery-image w-full h-48 object-cover rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" onclick="resizeGalleryImage(this, ${index})">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
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
    const container = img.closest('.gallery-image-container');
    const allImages = document.querySelectorAll('.gallery-image');
    const allContainers = document.querySelectorAll('.gallery-image-container');
    
    // If clicking the same image that's already expanded, collapse it
    if (expandedImageIndex === index) {
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
    
    // Scroll the expanded image into view
    container.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
    });
}

// Carousel functions removed - now using grid layout

// Navigation event listeners removed - now using grid layout

document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadClients();
});

