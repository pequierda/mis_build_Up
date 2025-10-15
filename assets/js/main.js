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
    
    grid.innerHTML = clients.map(client => `
        <div class="client-card bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div class="text-center">
                <div class="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
                    <img src="${client.image}" alt="${client.name}" class="w-full h-full object-cover">
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-1">${client.name}</h3>
                ${client.company ? `<p class="text-blue-600 font-semibold text-sm mb-2">${client.company}</p>` : ''}
                ${client.testimonial ? `<p class="text-gray-600 text-sm italic">"${client.testimonial}"</p>` : ''}
            </div>
        </div>
    `).join('');
}

// Carousel functions removed - now using grid layout

// Navigation event listeners removed - now using grid layout

document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadClients();
});

