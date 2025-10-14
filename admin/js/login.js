document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.classList.add('hidden');
    
    try {
        const response = await fetch('../api/admin/auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = result.message || 'Invalid credentials';
            errorMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = 'Login failed. Please try again.';
        errorMessage.classList.remove('hidden');
    }
});

