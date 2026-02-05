const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/upload.controller");
const authMiddleware = require("../middleware/auth");

router.post("/get-upload-url", authMiddleware, uploadController.generateUploadUrl);

module.exports = router;
