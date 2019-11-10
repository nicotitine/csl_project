/**
 * Modules import.
 */
const express = require('express');

/**
 * Router creation.
 */
const router = express.Router();

/**
 * Routing for '/'.
 */
router.get('/', async (req, res) => {
  res.render('pages/index', {})
});

/**
 * Exporting router.
 */
module.exports = router;