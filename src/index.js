const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const uploadRoutes = require("./routes/upload.routes");
const authRoutes = require("./routes/auth.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const contactRoutes = require("./routes/contact.routes");

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. Rate Limiting (15 minutes window, 100 requests per IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
});
app.use(limiter);

const allowedOrigins = [
    "http://localhost:4321",
    "http://127.0.0.1:4321",
    "http://localhost:3000"
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// 3. CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

// API Routes
app.use("/api/storage", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/contacts", contactRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", security: "reinforced" });
});

app.get("/api/test", (req, res) => {
    console.log("[Debug] Test route hit");
    res.json({ message: "Backend is alive!" });
});

const PORT = process.env.PORT || 3001;

// Start server
app.listen(PORT, () => {
    console.log(`🚀 FletMobi Secure API running on port ${PORT}`);
});

module.exports = app;


