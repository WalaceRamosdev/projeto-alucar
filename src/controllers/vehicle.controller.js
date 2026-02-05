const db = require('../config/db');

const createVehicle = async (req, res) => {
    try {
        const {
            category, brand, model, year, mileage, gearbox,
            fuel_type, price_amount, price_period,
            city, state, description, images, security_deposit,
            latitude, longitude
        } = req.body;

        const ownerId = req.userId; // From authMiddleware

        if (!ownerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // 1. Insert vehicle
        const vehicleResult = await db.query(
            `INSERT INTO vehicles 
            (owner_id, category, brand, model, year, mileage, gearbox, fuel_type, price_amount, price_period, city, state, description, min_rental_days, security_deposit, latitude, longitude) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
            RETURNING id`,
            [
                ownerId,
                category || 'carro',
                brand,
                model,
                parseInt(year) || 0,
                parseInt(mileage) || 0,
                gearbox,
                fuel_type,
                parseFloat(price_amount) || 0,
                price_period,
                city,
                state,
                description || "Sem descrição",
                1, // Default min_rental_days
                parseFloat(security_deposit) || 0,
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null
            ]
        );

        const vehicleId = vehicleResult.rows[0].id;

        // 2. Insert images if provided
        if (images && Array.isArray(images) && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
                await db.query(
                    `INSERT INTO vehicle_images (vehicle_id, image_url, is_main, "order") 
                    VALUES ($1, $2, $3, $4)`,
                    [vehicleId, images[i], i === 0, i]
                );
            }
        }

        res.status(201).json({ id: vehicleId, message: "Vehicle created successfully" });
    } catch (error) {
        console.error('[Vehicle Create] Error:', error);
        res.status(500).json({ error: "Server error creating vehicle" });
    }
};

const listVehicles = async (req, res) => {
    try {
        const { category, city, state, brand, min_price, max_price, min_year, min_mileage, max_mileage, limit, lat, lng, radius, sort } = req.query;

        let selectClause = `v.*, 
            COALESCE(
                (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = true LIMIT 1),
                (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY "order" ASC LIMIT 1)
            ) as main_image`;

        const params = [];
        const whereConditions = [`is_active = true`];

        // Geospatial filter (Haversine formula)
        if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            const searchLat = parseFloat(lat);
            const searchLng = parseFloat(lng);
            const searchRadius = parseFloat(radius) || 25; // Default 25km

            params.push(searchLat, searchLng, searchRadius);

            const distanceSql = `(6371 * acos(LEAST(1, GREATEST(-1, cos(radians($1)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians($2)) + sin(radians($1)) * sin(radians(v.latitude))))))`;

            selectClause += `, ${distanceSql} AS distance`;
            whereConditions.push(`v.latitude IS NOT NULL`);
            whereConditions.push(`v.longitude IS NOT NULL`);
            whereConditions.push(`${distanceSql} <= $3`);
        } else if (city) {
            params.push(`%${city}%`);
            whereConditions.push(`v.city ILIKE $${params.length}`);
        }

        // Additional Filters
        if (category) {
            params.push(category);
            whereConditions.push(`v.category = $${params.length}`);
        }
        if (state) {
            params.push(`%${state}%`);
            whereConditions.push(`v.state ILIKE $${params.length}`);
        }
        if (brand) {
            params.push(`%${brand}%`);
            whereConditions.push(`v.brand ILIKE $${params.length}`);
        }
        if (min_price) {
            params.push(parseFloat(min_price));
            whereConditions.push(`v.price_amount >= $${params.length}`);
        }
        if (max_price) {
            params.push(parseFloat(max_price));
            whereConditions.push(`v.price_amount <= $${params.length}`);
        }
        if (min_mileage) {
            params.push(parseInt(min_mileage));
            whereConditions.push(`v.mileage >= $${params.length}`);
        }
        if (max_mileage) {
            params.push(parseInt(max_mileage));
            whereConditions.push(`v.mileage <= $${params.length}`);
        }
        if (min_year) {
            params.push(parseInt(min_year));
            whereConditions.push(`v.year >= $${params.length}`);
        }

        const whereClauseString = `WHERE ` + whereConditions.join(' AND ');

        let orderBy = `v.created_at DESC`;
        if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            orderBy = `distance ASC, v.created_at DESC`;
        }

        let query = `SELECT ${selectClause} FROM vehicles v ${whereClauseString} ORDER BY ${orderBy}`;

        if (limit) {
            params.push(parseInt(limit));
            query += ` LIMIT $${params.length}`;
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('[Vehicle List] Error:', error);
        res.status(500).json({ error: "Server error listing vehicles" });
    }
};

const getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = await db.query(`
            SELECT v.*, u.name as owner_name, u.whatsapp 
            FROM vehicles v 
            JOIN users u ON v.owner_id = u.id 
            WHERE v.id = $1
        `, [id]);

        if (vehicle.rows.length === 0) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        const images = await db.query('SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY "order" ASC', [id]);

        res.json({
            ...vehicle.rows[0],
            images: images.rows
        });
    } catch (error) {
        console.error('[Vehicle Detail] Error:', error);
        res.status(500).json({ error: "Server error getting vehicle details" });
    }
};

const getMyVehicles = async (req, res) => {
    try {
        const ownerId = req.userId;
        const query = `
            SELECT v.*, 
            COALESCE(
                (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = true LIMIT 1),
                (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY "order" ASC LIMIT 1)
            ) as main_image
            FROM vehicles v 
            WHERE owner_id = $1
            ORDER BY created_at DESC
        `;
        const result = await db.query(query, [ownerId]);
        res.json(result.rows);
    } catch (error) {
        console.error('[My Vehicles] Error:', error);
        res.status(500).json({ error: "Server error getting your vehicles" });
    }
};

const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.userId;
        const {
            category, brand, model, year, mileage, gearbox,
            fuel_type, price_amount, price_period,
            city, state, description, is_active, security_deposit,
            latitude, longitude
        } = req.body;

        // Verify ownership
        const vehicle = await db.query('SELECT owner_id FROM vehicles WHERE id = $1', [id]);
        if (vehicle.rows.length === 0) return res.status(404).json({ error: "Vehicle not found" });
        if (vehicle.rows[0].owner_id !== ownerId) return res.status(403).json({ error: "Unauthorized" });

        await db.query(
            `UPDATE vehicles SET 
            brand = $1, model = $2, year = $3, mileage = $4, gearbox = $5, 
            fuel_type = $6, price_amount = $7, price_period = $8, 
            city = $9, state = $10, description = $11, is_active = $12,
            security_deposit = $13, latitude = $14, longitude = $15, 
            category = $16, updated_at = CURRENT_TIMESTAMP
            WHERE id = $17`,
            [
                brand, model, parseInt(year), parseInt(mileage), gearbox,
                fuel_type, parseFloat(price_amount), price_period,
                city, state, description, is_active,
                parseFloat(security_deposit),
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null,
                category,
                id
            ]
        );

        res.json({ message: "Vehicle updated successfully" });
    } catch (error) {
        console.error('[Vehicle Update] Error:', error);
        res.status(500).json({ error: "Server error updating vehicle" });
    }
};

const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.userId;

        // Verify ownership
        const vehicle = await db.query('SELECT owner_id FROM vehicles WHERE id = $1', [id]);
        if (vehicle.rows.length === 0) return res.status(404).json({ error: "Vehicle not found" });
        if (vehicle.rows[0].owner_id !== ownerId) return res.status(403).json({ error: "Unauthorized" });

        await db.query('DELETE FROM vehicles WHERE id = $1', [id]);
        res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
        console.error('[Vehicle Delete] Error:', error);
        res.status(500).json({ error: "Server error deleting vehicle" });
    }
};

module.exports = {
    createVehicle,
    listVehicles,
    getVehicleById,
    getMyVehicles,
    updateVehicle,
    deleteVehicle
};
