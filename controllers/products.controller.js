/**
 * Models import.
 */
const Product = require('../models/product.model');

/**
 * Get all products and send them to the client.
 * @param {Object} req the request.
 * @param {Object} res the response. 
 */
const list = async (req, res) => {

  /**
   * Get all products.
   */
  const products = await Product.find({});

  /**
   * Send the response to the client.
   */
  if(products) {
    res.render('pages/products', {
      'products': JSON.stringify(products)
    });
  }
};

/**
 * Get a product by its gtin, and send the response to the client.
 * @param {Object} req the request.
 * @param {Object} res the response. 
 */
const getById = async (req, res) => {
  const gtin = req.params.id;

  /**
   * Socket connection information.
   */
  const socket = {
      host: process.env.CLIENT_SOCKET_HOST,
      port: process.env.PORT
  };

  /**
   * Build the database query.
   */
  const query = {
      gtin: gtin
  };

  /**
   * Execute the query.
   */
  const product = await Product.findOne(query);

  /**
   * Builds the response according to if the product exists or not.
   */
  let string, found;

  if (product) {
      string = JSON.stringify(product);
      found = true;
  } else {
      string = null;
      found = false;
  }

  /**
   * Send the response to the client.
   */
  res.render('pages/product', {
      product: string,
      page: req.url,
      socket: socket,
      found: found
  });
};

/**
 * Get all products for a given brand and send the response to the client.
 * @param {Object} req the request. 
 * @param {Object} res the response.
 */
const getByBrand = async (req, res) => {

  /**
   * Build the database query.
   */
  const query = {
    "brand": req.params.brand
  }

  /**
   * Execute the query.
   */
  const products = await Product.find(query);

  /**
   * Send the response to the client.
   */
  if(products) {
    res.render('pages/products', {
      'products': JSON.stringify(products),
      'category': req.params.brand
    });
  }
};

/**
 * Exporting controllers.
 */
module.exports = {
  list,
  getById,
  getByBrand
};