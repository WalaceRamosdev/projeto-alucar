const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const authMiddleware = require('../middleware/auth');

router.get('/', vehicleController.listVehicles);
router.get('/me', authMiddleware, vehicleController.getMyVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.post('/', authMiddleware, vehicleController.createVehicle);
router.put('/:id', authMiddleware, vehicleController.updateVehicle);
router.delete('/:id', authMiddleware, vehicleController.deleteVehicle);

module.exports = router;
