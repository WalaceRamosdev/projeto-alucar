const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const register = async (req, res) => {
    try {
        const { name, email, password, whatsapp, role, city, latitude, longitude } = req.body;

        // Validation
        if (!name || !email || !password || !whatsapp || !role) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash, whatsapp, role, city, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, city',
            [name, email, hashedPassword, whatsapp, role, city, latitude, longitude]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error('[Auth Register] Error:', error);
        res.status(500).json({ error: "Server error during registration" });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            user: {
                id: user.rows[0].id,
                name: user.rows[0].name,
                email: user.rows[0].email,
                role: user.rows[0].role,
                city: user.rows[0].city,
                latitude: user.rows[0].latitude,
                longitude: user.rows[0].longitude,
                whatsapp: user.rows[0].whatsapp
            },
            token
        });
    } catch (error) {
        console.error('[Auth Login] Error:', error);
        res.status(500).json({ error: "Server error during login" });
    }
};

module.exports = { register, login };
