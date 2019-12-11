/**
 * Modules import.
 */
const express = require('express');

/**
 * Controllers import.
 */
const productsController = require('../controllers/products.controller');

/**
 * Router creation.
 */
const router = express.Router();

/**
 * Routing for '/'.
 */
router.get('/', productsController.list);

/**
 * Exporting router.
 */
module.exports = router;