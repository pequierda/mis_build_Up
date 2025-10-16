// Check authentication
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Load current branding settings
async function loadBrandingSettings() {
    try {
        const response = await fetch('../api/branding', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to load branding settings');
        }
        
        const branding = await response.json();
        populateForm(branding);
        updatePreview(branding);
        
    } catch (error) {
        console.error('Error loading branding settings:', error);
        showNotification('Error loading branding settings', 'error');
    }
}

// Populate form with branding data
function populateForm(branding) {
    document.getElementById('companyName').value = branding.companyName || '';
    document.getElementById('tagline').value = branding.tagline || '';
    document.getElementById('logo').value = branding.logo || '';
    document.getElementById('primaryColor').value = branding.primaryColor || '#dc2626';
    document.getElementById('secondaryColor').value = branding.secondaryColor || '#2563eb';
    document.getElementById('accentColor').value = branding.accentColor || '#000000';
    
    // Update text inputs
    document.getElementById('primaryColorText').value = branding.primaryColor || '#dc2626';
    document.getElementById('secondaryColorText').value = branding.secondaryColor || '#2563eb';
    document.getElementById('accentColorText').value = branding.accentColor || '#000000';
}

// Update live preview
function updatePreview(branding) {
    const preview = document.getElementById('brandingPreview');
    const logo = document.getElementById('previewLogo');
    const companyName = document.getElementById('previewCompanyName');
    const tagline = document.getElementById('previewTagline');
    const button1 = document.getElementById('previewButton1');
    const button2 = document.getElementById('previewButton2');
    
    // Update logo
    if (branding.logo) {
        logo.src = branding.logo;
        logo.alt = branding.companyName || 'Logo';
    }
    
    // Update company info
    companyName.textContent = branding.companyName || 'Build Up';
    tagline.textContent = branding.tagline || 'MIS Solutions and Services';
    
    // Update button colors
    button1.style.backgroundColor = branding.primaryColor || '#dc2626';
    button2.style.backgroundColor = branding.secondaryColor || '#2563eb';
    
    // Update preview container colors
    preview.style.borderColor = branding.accentColor || '#000000';
}

// Sync color picker with text input
function syncColorInputs() {
    const colorInputs = ['primaryColor', 'secondaryColor', 'accentColor'];
    
    colorInputs.forEach(colorName => {
        const colorPicker = document.getElementById(colorName);
        const textInput = document.getElementById(colorName + 'Text');
        
        colorPicker.addEventListener('input', () => {
            textInput.value = colorPicker.value;
            updatePreviewFromForm();
        });
        
        textInput.addEventListener('input', () => {
            if (textInput.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                colorPicker.value = textInput.value;
                updatePreviewFromForm();
            }
        });
    });
}

// Update preview from current form values
function updatePreviewFromForm() {
    const branding = {
        companyName: document.getElementById('companyName').value,
        tagline: document.getElementById('tagline').value,
        logo: document.getElementById('logo').value,
        primaryColor: document.getElementById('primaryColor').value,
        secondaryColor: document.getElementById('secondaryColor').value,
        accentColor: document.getElementById('accentColor').value
    };
    
    updatePreview(branding);
}

// Handle preset color schemes
function setupPresetButtons() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const primary = btn.dataset.primary;
            const secondary = btn.dataset.secondary;
            const accent = btn.dataset.accent;
            
            document.getElementById('primaryColor').value = primary;
            document.getElementById('secondaryColor').value = secondary;
            document.getElementById('accentColor').value = accent;
            
            document.getElementById('primaryColorText').value = primary;
            document.getElementById('secondaryColorText').value = secondary;
            document.getElementById('accentColorText').value = accent;
            
            updatePreviewFromForm();
        });
    });
}

// Save branding settings
async function saveBrandingSettings(brandingData) {
    try {
        const response = await fetch('../api/branding', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(brandingData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save branding settings');
        }
        
        const result = await response.json();
        showNotification('Branding settings saved successfully!', 'success');
        return result;
        
    } catch (error) {
        console.error('Error saving branding settings:', error);
        showNotification('Error saving branding settings', 'error');
        throw error;
    }
}

// Reset to default settings
function resetToDefault() {
    const defaultBranding = {
        logo: 'logo/me.png',
        primaryColor: '#dc2626',
        secondaryColor: '#2563eb',
        accentColor: '#000000',
        companyName: 'Build Up',
        tagline: 'MIS Solutions and Services'
    };
    
    populateForm(defaultBranding);
    updatePreview(defaultBranding);
    showNotification('Reset to default settings', 'info');
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    // Load current settings
    loadBrandingSettings();
    
    // Setup event listeners
    syncColorInputs();
    setupPresetButtons();
    
    // Form submission
    document.getElementById('brandingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const brandingData = {
            companyName: formData.get('companyName'),
            tagline: formData.get('tagline'),
            logo: formData.get('logo'),
            primaryColor: formData.get('primaryColor'),
            secondaryColor: formData.get('secondaryColor'),
            accentColor: formData.get('accentColor')
        };
        
        try {
            await saveBrandingSettings(brandingData);
        } catch (error) {
            console.error('Save failed:', error);
        }
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetToDefault);
    
    // Real-time preview updates
    const formInputs = document.querySelectorAll('#brandingForm input');
    formInputs.forEach(input => {
        input.addEventListener('input', updatePreviewFromForm);
    });
});
