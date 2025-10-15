export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
        const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!UPSTASH_URL || !UPSTASH_TOKEN) {
            return res.status(500).json({
                success: false,
                message: 'Environment variables not configured',
                env_check: {
                    UPSTASH_URL: !!UPSTASH_URL,
                    UPSTASH_TOKEN: !!UPSTASH_TOKEN
                }
            });
        }

        // Test connection
        const testResponse = await fetch(`${UPSTASH_URL}/set/test:connection/working`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const testData = await testResponse.json();

        // Get admin credentials
        const userRes = await fetch(`${UPSTASH_URL}/get/admin:username`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const userData = await userRes.json();

        const passRes = await fetch(`${UPSTASH_URL}/get/admin:password`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const passData = await passRes.json();

        return res.status(200).json({
            success: true,
            message: 'Connection successful',
            test_result: testData,
            admin_username: userData.result || 'NOT SET',
            admin_password: passData.result || 'NOT SET',
            upstash_url: UPSTASH_URL.substring(0, 30) + '...'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Connection failed: ' + error.message
        });
    }
}

