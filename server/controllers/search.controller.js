/**
 * Models import.
 */
const Product = require('../models/product.model');

/**
 * Send the search view to the client.
 * @param {Object} req the request. 
 * @param {Object} res the response.
 */
const get = async (req, res) => {
  res.render('pages/search', {});
};

/**
 * Get products for a given name, gtin, or brand and send the response to the client.
 * @param {Object} req the request. 
 * @param {Object} res the response.
 */
const autocompletion = async (req, res) => {
  try {
    
    /**
     * Build the database query.
     */
    const regex = new RegExp(req.query['term'], 'i');
    const query = {
      $or: [{
        name: regex
      },
      {
        gtin: regex
      },
      {
        brand: regex
      }
    ]
    }
    
    /**
     * Execute the query.
     */
    const products = await Product.find(query);

    /**
     * Send the response to the client.
     */
    res.send(products);
  } catch(e) {    
    res.send();
  };
};

/**
 * Exporting controllers.
 */
module.exports = {
  get, 
  autocompletion
};