export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }

    try {
        if (req.method === 'GET') {
            // Get all services
            const response = await fetch(`${UPSTASH_URL}/get/services_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const data = await response.json();
            
            if (data.result) {
                return res.status(200).json(JSON.parse(data.result));
            } else {
                return res.status(200).json([]);
            }
        }

        // Check authentication for POST, PUT, DELETE
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please login.'
            });
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            const service = {
                id: req.body.id || `service_${Date.now()}`,
                title: req.body.title || '',
                description: req.body.description || '',
                color: req.body.color || 'text-blue-600',
                icon: req.body.icon || '',
                image: req.body.image || null
            };

            if (!service.title || !service.description) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and description are required'
                });
            }

            // Get existing services
            const getRes = await fetch(`${UPSTASH_URL}/get/services_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let services = getData.result ? JSON.parse(getData.result) : [];

            // Update or add service
            const index = services.findIndex(s => s.id === service.id);
            if (index !== -1) {
                services[index] = service;
            } else {
                services.push(service);
            }

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/services_list/${encodeURIComponent(JSON.stringify(services))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Service saved successfully',
                service
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Service ID is required'
                });
            }

            // Get existing services
            const getRes = await fetch(`${UPSTASH_URL}/get/services_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let services = getData.result ? JSON.parse(getData.result) : [];

            // Filter out the service
            services = services.filter(s => s.id !== id);

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/services_list/${encodeURIComponent(JSON.stringify(services))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Service deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        console.error('Services error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

