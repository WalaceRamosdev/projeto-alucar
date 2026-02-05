const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const { r2Client } = require("../config/r2");
require("dotenv").config();

const db = require("../config/db");

// Real DB check for max 5 images
const checkImageLimit = async (vehicleId) => {
    if (vehicleId === "temp-vehicle-123") return true; // Allow for new ads
    const result = await db.query('SELECT COUNT(*) FROM vehicle_images WHERE vehicle_id = $1', [vehicleId]);
    return parseInt(result.rows[0].count) < 5;
};

const generateUploadUrl = async (req, res) => {
    try {
        console.log("[Storage] Incoming request from User:", req.userId);
        const { vehicleId, contentType, fileSize } = req.body;
        console.log("[Storage] Payload:", { vehicleId, contentType, fileSize });

        // 1. Mandatory Validations
        if (!vehicleId) {
            return res.status(400).json({ error: "Vehicle ID is required" });
        }

        // STRICT MIME TYPE VALIDATION: JPEG and WebP only
        const allowedTypes = ["image/jpeg", "image/webp"];
        if (!allowedTypes.includes(contentType)) {
            return res.status(400).json({ error: "Invalid format. Only JPEG and WebP are allowed for higher performance." });
        }

        // STRICT SIZE VALIDATION: Max 2MB per image
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (fileSize > maxSize) {
            return res.status(400).json({ error: "File too large. Maximum size is 2MB per image." });
        }

        // MAX IMAGES PER VEHICLE VALIDATION (Mocked)
        const isUnderLimit = await checkImageLimit(vehicleId);
        if (!isUnderLimit) {
            return res.status(400).json({ error: "Maximum of 5 images per vehicle reached." });
        }

        // 2. Generate unique storage key
        const extension = contentType.split("/")[1];
        const fileKey = `vehicles/${vehicleId}/${uuidv4()}.${extension}`;

        // 3. Prepare Presigned URL (S3 compatible)
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: contentType,
            // Metadata to reinforce security in storage
            Metadata: {
                "uploaded-by": req.userId || "anonymous",
                "vehicle-id": vehicleId
            }
        });

        // Valid only for 60 seconds for maximum security
        const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 });

        res.json({
            uploadUrl,
            publicUrl: `${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`,
            fileKey
        });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        res.status(500).json({ error: "Failed to authorize storage access." });
    }
};

module.exports = { generateUploadUrl };
