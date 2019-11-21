const Product = require('../models/product.model');

const get = async (req, res) => {
  res.render('pages/search', {});
};

const autocompletion = async (req, res) => {
  try {
    console.log(req.query);
    
    const regex = new RegExp(req.query['term'], 'i');
    
    await Product.find({
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
    }, (err, products) => {      
      res.send(products);
    });
  } catch(e) {    
    res.send();
  };
};

module.exports = {
  get, 
  autocompletion
};