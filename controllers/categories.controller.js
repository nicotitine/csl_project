const Category = require('../models/category.model');
const Product = require('../models/product.model');

const listAlphabetically = async (req, res) => {
  Category.find().collation({
    locale: 'en',
    strength: 2
  }).sort({
    name: 1
  }).then((categories) => {
    categories = (() => {
      if (categories.length == 0) {
        return [];
      }

      return Object.values(
        categories.reduce((acc, category) => {
          let firstLetter = category.name[0].toLocaleUpperCase();
          if (!acc[firstLetter]) {
            acc[firstLetter] = {
              title: firstLetter,
              data: [category]
            };
          } else {
            acc[firstLetter].data.push(category)
          }
          return acc
        }, {})
      )
    })()
    res.render('pages/categories', {
      'page': req.url,
      'categories': categories
    });
  });
};

const listProducts = async (req, res) => {
  const {
    returnLink,
    productName
  } = req.query;

  const query = {
    "categories": {
      '$regex': req.params.category,
      '$options': 'i'
    }
  };

  const products = await Product.find(query);

  if(products) {
    res.render('pages/products', {
      'products': products,
      'category': req.params.category,
      'page': req.url,
      'returnLink': returnLink,
      'productName': productName
    });
  }
};

module.exports = {
  listAlphabetically,
  listProducts
};