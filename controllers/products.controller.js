const Product = require('../models/product.model');

const list = async (req, res) => {
  const products = await Product.find({});

  if(products) {
    res.render('pages/products', {
      'products': JSON.stringify(products)
    });
  }
};

const getById = async (req, res) => {
  const gtin = req.params.id;

  const socket = {
      host: process.env.CLIENT_SOCKET_HOST,
      port: process.env.PORT
  };

  const query = {
      gtin: gtin
  };

  const product = await Product.findOne(query);

  let string, found;

  if (product) {
      string = JSON.stringify(product);
      found = true;
  } else {
      string = null;
      found = false;
  }

  res.render('pages/product', {
      product: string,
      page: req.url,
      socket: socket,
      found: found
  });
};

const getByBrand = async (req, res) => {
  const query = {
    "brand": req.params.brand
  }
  const products = await Product.find(query);

  console.log(products);
  

  if(products) {
    res.render('pages/products', {
      'products': JSON.stringify(products),
      'category': req.params.brand
    });
  }
};

module.exports = {
  list,
  getById,
  getByBrand
};