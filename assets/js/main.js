async function loadServices() {
    try {
        const [servicesRes, ratingsRes] = await Promise.all([
            fetch('api/admin/services'),
            fetch('api/get-ratings')
        ]);

        const services = await servicesRes.json();
        const ratings = await ratingsRes.json();

        if (!services || services.length === 0) {
            await initializeDefaultServices();
            return loadServices();
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

async function initializeDefaultServices() {
    const defaultServices = [
        {
            id: 'cloud-solutions',
            title: 'Cloud Solutions',
            description: 'Scalable cloud infrastructure and migration services to modernize your business operations.',
            icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
            color: 'text-blue-600',
            image: null
        },
        {
            id: 'cybersecurity',
            title: 'Cybersecurity',
            description: 'Advanced security solutions to protect your data and infrastructure from evolving threats.',
            icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
            color: 'text-red-600',
            image: null
        },
        {
            id: 'web-development',
            title: 'Web Development',
            description: 'Custom web applications built with modern frameworks and best practices for optimal performance.',
            icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
            color: 'text-green-600',
            image: null
        },
        {
            id: 'data-analytics',
            title: 'Data Analytics',
            description: 'Turn your data into actionable insights with powerful analytics and visualization tools.',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            color: 'text-purple-600',
            image: null
        },
        {
            id: 'ai-ml',
            title: 'AI & Machine Learning',
            description: 'Leverage artificial intelligence and machine learning to automate and optimize your processes.',
            icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
            color: 'text-yellow-600',
            image: null
        },
        {
            id: 'it-consulting',
            title: 'IT Consulting',
            description: 'Strategic technology consulting to align your IT infrastructure with business goals.',
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            color: 'text-indigo-600',
            image: null
        }
    ];

    for (const service of defaultServices) {
        await fetch('api/admin/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(service)
        });
    }
}

function createServiceCard(service, rating) {
    const avgRating = parseFloat(rating.average) || 0;
    const count = parseInt(rating.count) || 0;
    
    const iconSvg = `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${service.icon}"/></svg>`;
    
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

document.addEventListener('DOMContentLoaded', () => {
    loadServices();
});

