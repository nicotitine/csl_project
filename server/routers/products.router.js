/**
 * Modules import.
 */
const express = require('express');

/**
 * Controllers import.
 */
const productController = require('../controllers/products.controller');

/**
 * Router creation.
 */
const router = express.Router();

/**
 * Routing for '/products'.
 */
router.get('/', productController.list);

/**
 * Routing for '/products/brand/:brand'.
 */
router.get('/brand/:brand', productController.getByBrand);

/**
 * Routing for '/products/:id'.
 */
router.get('/:id', productController.getById);

/**
 * Exporting router.
 */
module.exports = router;