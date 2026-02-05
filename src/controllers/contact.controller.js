const db = require('../config/db');
const jwt = require('jsonwebtoken');

const createContact = async (req, res) => {
    try {
        const { vehicle_id, type, message } = req.body;
        let sender_id = null;

        // Optionally extract userId if token is present
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                sender_id = decoded.id;
            } catch (err) {
                // Ignore invalid token for guest leads
            }
        }

        if (!vehicle_id || !type) {
            return res.status(400).json({ error: "Vehicle ID and type are required" });
        }

        const result = await db.query(
            `INSERT INTO contacts (sender_id, vehicle_id, type, message) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [sender_id, vehicle_id, type, message]
        );

        res.status(201).json({ id: result.rows[0].id, message: "Contact created successfully" });
    } catch (error) {
        console.error('[Contact Create] Error:', error);
        res.status(500).json({ error: "Server error creating contact" });
    }
};

const getMyMessages = async (req, res) => {
    try {
        const userId = req.userId;

        // Get messages where the user is either the sender OR the owner of the vehicle
        const query = `
            SELECT c.*, v.brand, v.model, u.name as sender_name, u.email as sender_email
            FROM contacts c
            JOIN vehicles v ON c.vehicle_id = v.id
            LEFT JOIN users u ON c.sender_id = u.id
            WHERE v.owner_id = $1 OR c.sender_id = $1
            ORDER BY c.created_at DESC
        `;

        const result = await db.query(query, [userId]);

        // Add fallback names for guests
        const rows = result.rows.map(row => ({
            ...row,
            sender_name: row.sender_name || "Interessado Anônimo",
            sender_email: row.sender_email || "N/A"
        }));

        res.json(rows);
    } catch (error) {
        console.error('[Messages Get] Error:', error);
        res.status(500).json({ error: "Server error getting messages" });
    }
};

module.exports = { createContact, getMyMessages };
