/**
 * Modules import.
 */
const express = require('express');

/**
 * Controllers import.
 */
const searchController = require('../controllers/search.controller');

/**
 * Router creation.
 */
const router = express.Router();

/**
 * Routing '/search'.
 */
router.get('/', searchController.get)

/**
 * Routing '/search/auto'.
 */
router.get('/auto', searchController.autocompletion);

/**
 * Exporting router.
 */
module.exports = router;