const app = require('express')();
const port = process.env.PORT;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Product = require('./models/product.model');
const request = require('request');
require('./db/db');

app.set('view engine', 'ejs');
app.set("views", __dirname + "/views");
app.set("view options", {
    layout: false
});

app.get('/', (req, res) => {
    res.render('pages/index', {})
});

app.get('/products/', (req, res) => {
    var products = [];
    Product.find({}, (err, products) => {
        res.render('pages/products', {
            'products': products
        });
    })
})

app.get('/product/:id', (req, res) => {
    var gtin = req.params.id;
    Product.findOne({
        'gtin': gtin
    }, (err, product) => {
        if (product) {
            res.render('pages/product', {
                'product': product
            });
        } else {
            request('https://fr.openfoodfacts.org/api/v0/produit/' + gtin + '.json', (error, response, body) => {

                var product = JSON.parse(body).product;

                var regex = /_/gi

                var productPersist = new Product({
                    'gtin': gtin,
                    'name': product.product_name,
                    'generic_name': product.generic_name,
                    'retailers': product.stores,
                    'ingredients': product.ingredients_text.replace(regex, '').split(', '),
                    'quantity': product.quantity
                });

                console.log(productPersist);
                
                res.render('pages/product', {
                    'product': productPersist
                    //'OFFProduct': product
                });
                //productPersist.save();
            });
        }
    })
});

io.on('connection', (socket) => {
    console.log(`New user connected`);

    socket.on('requestAdditionalInfos', (requestParams) => {
        console.log(requestParams);
        request('http://localhost:9091/' + requestParams.gtin + '/' + requestParams.retailers, (error, response, body) => {
            console.log(JSON.parse(body));
            socket.emit('responseAdditionalInfos', JSON.parse(body));
        });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected`);
    });
});

http.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});