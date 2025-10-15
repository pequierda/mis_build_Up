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

        const defaultServices = [
            {
                id: 'cloud-solutions',
                title: 'Cloud Solutions',
                description: 'Scalable cloud infrastructure and migration services to modernize your business operations.',
                icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
                color: 'text-blue-600',
                image: null
            },
            {
                id: 'cybersecurity',
                title: 'Cybersecurity',
                description: 'Advanced security solutions to protect your data and infrastructure from evolving threats.',
                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                color: 'text-red-600',
                image: null
            },
            {
                id: 'web-development',
                title: 'Web Development',
                description: 'Custom web applications built with modern frameworks and best practices for optimal performance.',
                icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
                color: 'text-green-600',
                image: null
            },
            {
                id: 'data-analytics',
                title: 'Data Analytics',
                description: 'Turn your data into actionable insights with powerful analytics and visualization tools.',
                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                color: 'text-purple-600',
                image: null
            },
            {
                id: 'ai-ml',
                title: 'AI & Machine Learning',
                description: 'Leverage artificial intelligence and machine learning to automate and optimize your processes.',
                icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                color: 'text-yellow-600',
                image: null
            },
            {
                id: 'it-consulting',
                title: 'IT Consulting',
                description: 'Strategic technology consulting to align your IT infrastructure with business goals.',
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
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
