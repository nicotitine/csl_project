/**
 * Models import.
 */
const Category = require('../models/category.model');
const Product = require('../models/product.model');

/**
 * Get all categories, sort them alphabetically and send the response to the client.
 * @param {Object} req the request.
 * @param {Object} res the response.
 */
const listAlphabetically = async (req, res) => {

  /**
   * Get all categoties and sort them by name
   */
  let categories = await Category.find().collation({
    locale: 'en',
    strength: 2
  }).sort({
    name: 1
  });

  /**
   * Transform categories array to get an array structured this way :
   * [
   *    {
   *      title: <letter>,
   *      data: [<category>]
   *    }
   * ]
   */
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
  })();

  /**
   * Send the response to the client.
   */
  res.render('pages/categories', {
    'page': req.url,
    'categories': JSON.stringify(categories)
  });
};

/**
 * Get all products for a given category, and send the response the client.
 * @param {Object} req the request. 
 * @param {Object} res the response.
 */
const listProducts = async (req, res) => {
  const {
    returnLink,
    productName
  } = req.query;

  /**
   * Build the database query.
   */
  const query = {
    categories: {
      $regex: req.params.category,
      $options: 'i'
    }
  };

  /**
   * Execute the query.
   */
  const products = await Product.find(query);

  /**
   * Send the response to the client.
   */
  res.render('pages/products', {
    'products': products,
    'category': req.params.category,
    'page': req.url,
    'returnLink': returnLink,
    'productName': productName
  });
};

/**
 * Exporting controllers.
 */
module.exports = {
  listAlphabetically,
  listProducts
};