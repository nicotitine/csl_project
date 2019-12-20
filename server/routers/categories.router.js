/**
 * Modules import.
 */
const express = require('express');

/**
 * Controllers import.
 */
const categoriesController = require('../controllers/categories.controller');

/**
 * Router creation.
 */
const router = express.Router();

/**
 * Routing for '/categories'.
 */
router.get('/', categoriesController.listAlphabetically);

/**
 * Routing for '/categories/:category'.
 */
router.get('/:category', categoriesController.listProducts);

/**
 * Exporting router.
 */
module.exports = router;