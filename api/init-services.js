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
        const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
        const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!UPSTASH_URL || !UPSTASH_TOKEN) {
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        // Check if services already exist
        const checkRes = await fetch(`${UPSTASH_URL}/get/services_list`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const checkData = await checkRes.json();
        
        if (checkData.result && checkData.result !== 'null') {
            return res.status(200).json({
                success: true,
                message: 'Services already initialized'
            });
        }

        const timestamp = Date.now();
        const defaultServices = [
            {
                id: `service_${timestamp}_cloud`,
                title: 'Cloud Solutions',
                description: 'Scalable cloud infrastructure and migration services to modernize your business operations.',
                icon: 'logo/me.png',
                color: 'text-blue-600',
                image: null
            },
            {
                id: `service_${timestamp}_security`,
                title: 'Cybersecurity',
                description: 'Advanced security solutions to protect your data and infrastructure from evolving threats.',
                icon: 'logo/me.png',
                color: 'text-red-600',
                image: null
            },
            {
                id: `service_${timestamp}_web`,
                title: 'Web Development',
                description: 'Custom web applications built with modern frameworks and best practices for optimal performance.',
                icon: 'logo/me.png',
                color: 'text-green-600',
                image: null
            },
            {
                id: `service_${timestamp}_analytics`,
                title: 'Data Analytics',
                description: 'Turn your data into actionable insights with powerful analytics and visualization tools.',
                icon: 'logo/me.png',
                color: 'text-purple-600',
                image: null
            },
            {
                id: `service_${timestamp}_ai`,
                title: 'AI & Machine Learning',
                description: 'Leverage artificial intelligence and machine learning to automate and optimize your processes.',
                icon: 'logo/me.png',
                color: 'text-yellow-600',
                image: null
            },
            {
                id: `service_${timestamp}_consulting`,
                title: 'IT Consulting',
                description: 'Strategic technology consulting to align your IT infrastructure with business goals.',
                icon: 'logo/me.png',
                color: 'text-indigo-600',
                image: null
            }
        ];

        // Save services to Upstash
        await fetch(`${UPSTASH_URL}/set/services_list/${encodeURIComponent(JSON.stringify(defaultServices))}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_TOKEN}`
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Default services initialized successfully',
            services: defaultServices
        });

    } catch (error) {
        console.error('Init services error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
