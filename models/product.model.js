const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    gtin: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    prices: {
        type: Number
    },
    name: {
        type: String,
        required: true
    },
    generic_name: {
        type: String
    },
    retailers: {
        type: String
    },
    ingredients: [{
        type: String
    }],
    quantity: {
        type: String
    }
})

const Product = mongoose.model('Product', productSchema);

module.exports = Product;