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
            const carId = req.query.carId;
            const response = await fetch(`${UPSTASH_URL}/get/bookings_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const data = await response.json();
            
            let bookings = data.result ? JSON.parse(data.result) : [];
            
            if (carId) {
                bookings = bookings.filter(b => b.carId === carId);
            }
            
            return res.status(200).json(bookings);
        }

        if (req.method === 'POST') {
            const booking = {
                id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                carId: req.body.carId || '',
                customerName: req.body.customerName || '',
                customerEmail: req.body.customerEmail || '',
                customerPhone: req.body.customerPhone || '',
                startDate: req.body.startDate || '',
                endDate: req.body.endDate || '',
                totalPrice: req.body.totalPrice || 0,
                status: req.body.status || 'pending',
                createdAt: new Date().toISOString()
            };

            if (!booking.carId || !booking.startDate || !booking.endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Car ID, start date, and end date are required'
                });
            }

            const start = new Date(booking.startDate);
            const end = new Date(booking.endDate);
            
            if (end <= start) {
                return res.status(400).json({
                    success: false,
                    message: 'End date must be after start date'
                });
            }

            const getRes = await fetch(`${UPSTASH_URL}/get/bookings_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let bookings = getData.result ? JSON.parse(getData.result) : [];

            const conflictingBookings = bookings.filter(b => 
                b.carId === booking.carId && 
                b.status !== 'cancelled' &&
                ((new Date(b.startDate) <= end && new Date(b.endDate) >= start))
            );

            if (conflictingBookings.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Car is already booked for the selected dates'
                });
            }

            bookings.push(booking);

            await fetch(`${UPSTASH_URL}/set/bookings_list/${encodeURIComponent(JSON.stringify(bookings))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Booking created successfully',
                booking
            });
        }

        if (req.method === 'PUT') {
            const { id, status, startDate, endDate, customerName, customerEmail, customerPhone, totalPrice } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Booking ID is required'
                });
            }

            const getRes = await fetch(`${UPSTASH_URL}/get/bookings_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let bookings = getData.result ? JSON.parse(getData.result) : [];

            const index = bookings.findIndex(b => b.id === id);
            if (index === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            const originalBooking = bookings[index];
            const updatedBooking = { ...originalBooking };

            if (status) {
                updatedBooking.status = status;
            }

            if (startDate || endDate) {
                const newStartDate = startDate || originalBooking.startDate;
                const newEndDate = endDate || originalBooking.endDate;
                
                const start = new Date(newStartDate);
                const end = new Date(newEndDate);
                
                if (end <= start) {
                    return res.status(400).json({
                        success: false,
                        message: 'End date must be after start date'
                    });
                }

                updatedBooking.startDate = newStartDate;
                updatedBooking.endDate = newEndDate;

                const conflictingBookings = bookings.filter(b => 
                    b.id !== id &&
                    b.carId === originalBooking.carId && 
                    b.status !== 'cancelled' &&
                    ((new Date(b.startDate) <= end && new Date(b.endDate) >= start))
                );

                if (conflictingBookings.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Car is already booked for the selected dates'
                    });
                }
            }

            if (customerName !== undefined) {
                updatedBooking.customerName = customerName;
            }
            if (customerEmail !== undefined) {
                updatedBooking.customerEmail = customerEmail;
            }
            if (customerPhone !== undefined) {
                updatedBooking.customerPhone = customerPhone;
            }
            if (totalPrice !== undefined) {
                updatedBooking.totalPrice = totalPrice;
            }

            bookings[index] = updatedBooking;

            await fetch(`${UPSTASH_URL}/set/bookings_list/${encodeURIComponent(JSON.stringify(bookings))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Booking updated successfully',
                booking: updatedBooking
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Booking ID is required'
                });
            }

            const getRes = await fetch(`${UPSTASH_URL}/get/bookings_list`, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const getData = await getRes.json();
            let bookings = getData.result ? JSON.parse(getData.result) : [];

            bookings = bookings.filter(b => b.id !== id);

            await fetch(`${UPSTASH_URL}/set/bookings_list/${encodeURIComponent(JSON.stringify(bookings))}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Booking deleted successfully'
            });
        }

        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        console.error('Bookings error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

