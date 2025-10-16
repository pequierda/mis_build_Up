const { Redis } = require('@upstash/redis');

let redis;

try {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
} catch (error) {
    console.error('Redis initialization error:', error);
}

// Check if user is authenticated
async function isAuthenticated(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    
    const token = authHeader.substring(7);
    
    try {
        // For now, just check if token exists and is not empty
        // This is a simplified auth check
        return token && token.length > 10;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Check if Redis is initialized
    if (!redis) {
        console.error('Redis not initialized');
        return res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }

    try {
        const { method } = req;

        if (method === 'GET') {
            // Get branding settings (public access)
            const brandingJson = await redis.get('branding_settings');
            const branding = brandingJson ? JSON.parse(brandingJson) : getDefaultBranding();
            
            res.status(200).json(branding);
        } 
        else if (method === 'POST' || method === 'PUT') {
            // Update branding settings (temporarily without auth for testing)
            const { logo, primaryColor, secondaryColor, accentColor, companyName, tagline } = req.body;

            console.log('Received branding data:', { logo, primaryColor, secondaryColor, accentColor, companyName, tagline });

            // Validate required fields
            if (!primaryColor || !secondaryColor) {
                return res.status(400).json({
                    success: false,
                    message: 'Primary and secondary colors are required'
                });
            }

            const branding = {
                logo: logo || '',
                primaryColor: primaryColor,
                secondaryColor: secondaryColor,
                accentColor: accentColor || '#000000',
                companyName: companyName || 'Build Up',
                tagline: tagline || 'MIS Solutions and Services',
                updatedAt: new Date().toISOString()
            };

            console.log('Saving branding:', branding);
            await redis.set('branding_settings', JSON.stringify(branding));
            
            res.status(200).json({
                success: true,
                message: 'Branding settings updated successfully',
                branding: branding
            });
        }
        else {
            res.status(405).json({
                success: false,
                message: 'Method not allowed'
            });
        }
    } catch (error) {
        console.error('Branding API error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
}

function getDefaultBranding() {
    return {
        logo: 'logo/me.png',
        primaryColor: '#dc2626', // red-600
        secondaryColor: '#2563eb', // blue-600
        accentColor: '#000000', // black
        companyName: 'Build Up',
        tagline: 'MIS Solutions and Services',
        updatedAt: new Date().toISOString()
    };
}
