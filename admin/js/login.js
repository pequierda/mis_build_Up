document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.classList.add('hidden');
    
    try {
        const response = await fetch('../api/admin/auth?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.log('Response text:', responseText); // Debug log
        
        if (!responseText.trim()) {
            throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(responseText);
        
        if (result.success) {
            // Store auth token
            localStorage.setItem('admin_token', result.token);
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = result.message || 'Invalid credentials';
            errorMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = `Please check your credentials and try again.`;
        errorMessage.classList.remove('hidden');
    }
});

