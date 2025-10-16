// Check authentication
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Test authentication
async function testAuth() {
    try {
        const response = await fetch('../api/admin/auth?action=check', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        console.log('Auth test result:', result);
        
        if (!result.success || !result.logged_in) {
            console.log('Authentication failed, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Auth test error:', error);
        window.location.href = 'login.html';
        return false;
    }
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
        console.log('Loading branding settings...');
        const response = await fetch('../api/branding', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        console.log('Load response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Load error response:', errorText);
            throw new Error(`Failed to load branding settings: ${response.status}`);
        }
        
        const branding = await response.json();
        console.log('Loaded branding:', branding);
        populateForm(branding);
        updatePreview(branding);
        
    } catch (error) {
        console.error('Error loading branding settings:', error);
        showNotification(`Error loading branding settings: ${error.message}`, 'error');
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
    
    // Update logo preview
    updateLogoPreview(branding.logo || 'logo/me.png');
}

// Update logo preview
function updateLogoPreview(logoPath) {
    const logoPreview = document.getElementById('logoPreview');
    const logoPathElement = document.getElementById('logoPath');
    
    if (logoPreview) {
        logoPreview.src = logoPath;
        logoPreview.alt = 'Logo Preview';
    }
    
    if (logoPathElement) {
        logoPathElement.textContent = logoPath;
    }
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
    
    // Update logo preview
    updateLogoPreview(branding.logo || 'logo/me.png');
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
        console.log('Sending branding data:', brandingData);
        console.log('Auth headers:', getAuthHeaders());
        
        const response = await fetch('../api/branding', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(brandingData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!response.ok) {
            let errorMessage = 'Failed to save branding settings';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${responseText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = JSON.parse(responseText);
        showNotification('Branding settings saved successfully!', 'success');
        return result;
        
    } catch (error) {
        console.error('Error saving branding settings:', error);
        showNotification(`Error saving branding settings: ${error.message}`, 'error');
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

// Handle logo file upload
function handleLogoUpload() {
    const fileInput = document.getElementById('logoUpload');
    const uploadBtn = document.getElementById('uploadLogoBtn');
    
    if (fileInput && uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Please select a file first', 'warning');
                return;
            }
            
            // Validate file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                showNotification('File size must be less than 2MB', 'error');
                return;
            }
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showNotification('Please select an image file', 'error');
                return;
            }
            
            // Create object URL for preview
            const objectURL = URL.createObjectURL(file);
            
            // Update logo input with a temporary path
            const logoInput = document.getElementById('logo');
            logoInput.value = objectURL;
            
            // Update preview
            updateLogoPreview(objectURL);
            updatePreviewFromForm();
            
            showNotification('Logo uploaded successfully! Remember to save your changes.', 'success');
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    // Test authentication before proceeding
    const isAuthenticated = await testAuth();
    if (!isAuthenticated) return;
    
    // Load current settings
    loadBrandingSettings();
    
    // Setup event listeners
    syncColorInputs();
    setupPresetButtons();
    handleLogoUpload();
    
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
    
    // Logo input change
    const logoInput = document.getElementById('logo');
    if (logoInput) {
        logoInput.addEventListener('input', (e) => {
            updateLogoPreview(e.target.value);
            updatePreviewFromForm();
        });
    }
});
