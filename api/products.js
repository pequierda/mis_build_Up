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
            const response = await fetch(`${UPSTASH_URL}/get/cars_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const data = await response.json();
            
            if (data.result) {
                return res.status(200).json(JSON.parse(data.result));
            } else {
                return res.status(200).json([]);
            }
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please login.'
            });
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            const car = {
                id: req.body.id || `car_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: req.body.name || '',
                make: req.body.make || '',
                model: req.body.model || '',
                year: req.body.year || '',
                price: req.body.price || '',
                pricePerDay: req.body.pricePerDay || '',
                description: req.body.description || '',
                imageUrl: req.body.imageUrl || '',
                specifications: req.body.specifications || [],
                available: req.body.available !== undefined ? req.body.available : true,
                onBooking: req.body.onBooking === true
            };

            if (!car.name || !car.pricePerDay) {
                return res.status(400).json({
                    success: false,
                    message: 'Car name and price per day are required'
                });
            }

            const getRes = await fetch(`${UPSTASH_URL}/get/cars_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let cars = getData.result ? JSON.parse(getData.result) : [];

            const index = cars.findIndex(c => c.id === car.id);
            if (index !== -1) {
                cars[index] = car;
            } else {
                cars.push(car);
            }

            await fetch(`${UPSTASH_URL}/set/cars_list/${encodeURIComponent(JSON.stringify(cars))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Car saved successfully',
                car
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Car ID is required'
                });
            }

            const getRes = await fetch(`${UPSTASH_URL}/get/cars_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let cars = getData.result ? JSON.parse(getData.result) : [];

            cars = cars.filter(c => c.id !== id);

            await fetch(`${UPSTASH_URL}/set/cars_list/${encodeURIComponent(JSON.stringify(cars))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Car deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        console.error('Cars error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
