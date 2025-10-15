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
            // Get all client images
            const response = await fetch(`${UPSTASH_URL}/get/client_images`, {
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
            const client = {
                id: req.body.id || `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: req.body.name || '',
                images: req.body.images || (req.body.image ? [req.body.image] : []),
                company: req.body.company || '',
                testimonial: req.body.testimonial || ''
            };

            if (!client.name || !client.images || client.images.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and at least one image are required'
                });
            }

            // Get existing clients
            const getRes = await fetch(`${UPSTASH_URL}/get/client_images`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let clients = getData.result ? JSON.parse(getData.result) : [];

            // Update or add client
            const index = clients.findIndex(c => c.id === client.id);
            if (index !== -1) {
                clients[index] = client;
            } else {
                clients.push(client);
            }

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/client_images/${encodeURIComponent(JSON.stringify(clients))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Client saved successfully',
                client
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Client ID is required'
                });
            }

            // Get existing clients
            const getRes = await fetch(`${UPSTASH_URL}/get/client_images`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let clients = getData.result ? JSON.parse(getData.result) : [];

            // Filter out the client
            clients = clients.filter(c => c.id !== id);

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/client_images/${encodeURIComponent(JSON.stringify(clients))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Client deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        console.error('Clients error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
