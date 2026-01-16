document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('loginSubmit');
    const spinner = document.getElementById('loginSpinner');
    const submitText = document.getElementById('loginText');
    
    errorMessage.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
    spinner.classList.remove('hidden');
    submitText.textContent = 'Signing in...';
    
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
        
        if (!responseText.trim()) {
            throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(responseText);
        
        if (result.success) {
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
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        spinner.classList.add('hidden');
        submitText.textContent = 'Sign In';
    }
});

