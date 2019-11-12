const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    gtin: {
        type: String,
        required: true,
        unique: true
    },
    images: [{
        type: String
    }],
    report: {
        type: Number,
        default: 0
    },
    prices: {
        type: Number
    },
    name: {
        type: String,
        required: true
    },
    brand: [{
        type: String
    }],
    generic_name: {
        type: String
    },
    ingredients: [{
        type: String
    }],
    quantity: {
        type: String
    },
    categories: [{
        type: String
    }],
    retailers: [{
        name: {
            type: String
        },
        globalPrice: {
            type: Number
        },
        drives: [{
            location: {
                type: String
            },
            zipcodes: [{
                type: String,
                minlength: 5,
                maxlength: 5
            }],
            price: {
                type: Number
            }
        }]
    }]
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;