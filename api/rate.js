export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { service_id, rating } = req.body;

        if (!service_id || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: service_id and rating'
            });
        }

        const ratingValue = parseInt(rating);
        if (ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Allow any service ID that starts with 'service_'
        if (!service_id.startsWith('service_')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid service ID format'
            });
        }

        const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
        const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!UPSTASH_URL || !UPSTASH_TOKEN) {
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        const totalKey = `service:${service_id}:total`;
        const countKey = `service:${service_id}:count`;

        // Increment total
        await fetch(`${UPSTASH_URL}/incrby/${totalKey}/${ratingValue}`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });

        // Increment count
        await fetch(`${UPSTASH_URL}/incr/${countKey}`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });

        // Get current values
        const totalRes = await fetch(`${UPSTASH_URL}/get/${totalKey}`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const totalData = await totalRes.json();
        const total = parseInt(totalData.result || 0);

        const countRes = await fetch(`${UPSTASH_URL}/get/${countKey}`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const countData = await countRes.json();
        const count = parseInt(countData.result || 0);

        const average = count > 0 ? total / count : 0;

        return res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            data: {
                service_id,
                average: parseFloat(average.toFixed(2)),
                count
            }
        });

    } catch (error) {
        console.error('Rating error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

