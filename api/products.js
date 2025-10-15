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
            // Get all products
            const response = await fetch(`${UPSTASH_URL}/get/products_list`, {
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
            const product = {
                id: req.body.id || `product_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: req.body.name || '',
                category: req.body.category || '',
                price: req.body.price || '',
                description: req.body.description || '',
                imageUrl: req.body.imageUrl || '',
                specifications: req.body.specifications || [],
                inStock: req.body.inStock !== undefined ? req.body.inStock : true
            };

            if (!product.name || !product.price) {
                return res.status(400).json({
                    success: false,
                    message: 'Product name and price are required'
                });
            }

            // Get existing products
            const getRes = await fetch(`${UPSTASH_URL}/get/products_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let products = getData.result ? JSON.parse(getData.result) : [];

            // Update or add product
            const index = products.findIndex(p => p.id === product.id);
            if (index !== -1) {
                products[index] = product;
            } else {
                products.push(product);
            }

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/products_list/${encodeURIComponent(JSON.stringify(products))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Product saved successfully',
                product
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required'
                });
            }

            // Get existing products
            const getRes = await fetch(`${UPSTASH_URL}/get/products_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let products = getData.result ? JSON.parse(getData.result) : [];

            // Filter out the product
            products = products.filter(p => p.id !== id);

            // Save back to Upstash
            await fetch(`${UPSTASH_URL}/set/products_list/${encodeURIComponent(JSON.stringify(products))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Product deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        console.error('Products error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
