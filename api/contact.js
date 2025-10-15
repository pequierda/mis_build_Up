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
            // Get all contact information
            const response = await fetch(`${UPSTASH_URL}/get/contact_info`, {
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
            const contact = {
                id: req.body.id || `contact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                type: req.body.type || '',
                label: req.body.label || '',
                value: req.body.value || '',
                icon: req.body.icon || '',
                order: req.body.order || 0,
                isActive: req.body.isActive !== undefined ? req.body.isActive : true
            };

            if (!contact.type || !contact.label || !contact.value) {
                return res.status(400).json({
                    success: false,
                    message: 'Type, label, and value are required'
                });
            }

            // Get existing contacts
            const getRes = await fetch(`${UPSTASH_URL}/get/contact_info`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let contacts = getData.result ? JSON.parse(getData.result) : [];

            // Update or add contact
            const index = contacts.findIndex(c => c.id === contact.id);
            if (index !== -1) {
                contacts[index] = contact;
            } else {
                contacts.push(contact);
            }

            // Sort by order
            contacts.sort((a, b) => (a.order || 0) - (b.order || 0));

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/contact_info/${encodeURIComponent(JSON.stringify(contacts))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Contact information saved successfully',
                contact
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact ID is required'
                });
            }

            // Get existing contacts
            const getRes = await fetch(`${UPSTASH_URL}/get/contact_info`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let contacts = getData.result ? JSON.parse(getData.result) : [];

            // Filter out the contact
            contacts = contacts.filter(c => c.id !== id);

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/contact_info/${encodeURIComponent(JSON.stringify(contacts))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Contact information deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        console.error('Contact error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
