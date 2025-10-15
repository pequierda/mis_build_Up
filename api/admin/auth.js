export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
        const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!UPSTASH_URL || !UPSTASH_TOKEN) {
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        if (action === 'login') {
            const { username, password } = req.body;

            // Get admin credentials from Upstash
            const userRes = await fetch(`${UPSTASH_URL}/get/admin:username`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const userData = await userRes.json();
            const adminUsername = userData.result || 'admin';

            const passRes = await fetch(`${UPSTASH_URL}/get/admin:password`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const passData = await passRes.json();
            const adminPassword = passData.result || 'admin123';

            if (username === adminUsername && password === adminPassword) {
                return res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    token: Buffer.from(`${username}:${password}`).toString('base64')
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        } else if (action === 'check') {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(200).json({
                    success: true,
                    logged_in: false
                });
            }

            return res.status(200).json({
                success: true,
                logged_in: true
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication service error'
        });
    }
}

