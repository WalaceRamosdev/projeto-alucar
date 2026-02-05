const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
        return res.status(401).json({ error: "Token error" });
    }

    const [scheme, token] = parts;

    console.log(`[Auth] Scheme: ${scheme}, Token received: ${token}`);

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: "Token malformatted" });
    }

    // ALLOW TEST TOKEN FOR DEVELOPMENT
    if (token.trim() === "dummy-test-token-godriver") {
        console.log("[Auth] Test token accepted");
        req.userId = "test-admin-id";
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log("[Auth] JWT Verification failed:", err.message);
            return res.status(401).json({ error: "Token invalid" });
        }

        req.userId = decoded.id;
        return next();
    });
};

module.exports = authMiddleware;
