export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const services = [
            'cloud-solutions', 'cybersecurity', 'web-development',
            'data-analytics', 'ai-ml', 'it-consulting'
        ];

        const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
        const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!UPSTASH_URL || !UPSTASH_TOKEN) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const ratings = {};

        for (const serviceId of services) {
            const totalKey = `service:${serviceId}:total`;
            const countKey = `service:${serviceId}:count`;

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

            ratings[serviceId] = {
                average: count > 0 ? parseFloat((total / count).toFixed(2)) : 0,
                count
            };
        }

        return res.status(200).json(ratings);

    } catch (error) {
        console.error('Get ratings error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

