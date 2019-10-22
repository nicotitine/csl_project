const app = require('express')();
const port = process.env.PORT;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Product = require('./models/product.model');
const request = require('request');
const jsdom = require('jsdom');

require('./db/db');

var _puppeteerSocket = require('socket.io-client').connect('http://localhost:9092');

app.set('view engine', 'ejs');
app.set("views", __dirname + "/views");
app.set("view options", {
    layout: false
});

app.get('/', (req, res) => {
    res.render('pages/index', {})
});

app.get('/products/', (req, res) => {
    Product.find({}, (err, products) => {
        res.render('pages/products', {
            'products': products
        });
    })
})

app.get('/products/categories/:category', (req, res) => {
    console.log(req.params);
    
    Product.find({"categories": {
        '$regex': req.params.category,
        '$options': 'i'
    }}, (err, products) => {
        console.log(products);
        res.render('pages/products', {
            'products': products,
            'category': req.params.category
        })
        
    })
})

app.get('/search/', (req, res) => {
    res.render('pages/search', {});
})

app.get('/search/auto', async (req, res) => {
    let finalProducts = []
    const regex = new RegExp(req.query['term'], 'i');

    await Product.find({name: regex}, (err, products) => {
        for(let i = 0; i < products.length; i++) {
            finalProducts.push(products[i])
        }
    })

    await Product.find({gtin: regex}, (err, products) => {
        for(let i = 0; i < products.length; i++) {
            finalProducts.push(products[i])
        }
    })
    console.log('searching');
    
    res.send(finalProducts)
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

                let data = JSON.parse(body);

                // data.status.1 = found
                // data.status.0 = not found
                if (error || (data.status != 1 && data.status != 0)) {
                    res.render('pages/product', {
                        'product': null,
                        'error': error
                    });
                    return;
                }

                if (data.status == 0) {
                    res.render('pages/product', {
                        'product': null,
                        'error': 'Product not found on OFF (' + gtin + ')'
                    });
                    return;
                }

               
                

                let product = data.product;
                let regex = /_/gi

                
                for(let i = 0; i < product.categories_hierarchy.length; i++) {
                    product.categories_hierarchy[i] = product.categories_hierarchy[i].split(':')[1];
                    product.categories_hierarchy[i] = product.categories_hierarchy[i].replace(/-/gi, ' ');
                }

                console.log(product.categories_hierarchy);

                let productPersist = new Product({
                    'gtin': gtin,
                    'name': product.product_name,
                    'generic_name': product.generic_name,
                    'ingredients': product.ingredients_text.replace(regex, '').split(', '),
                    'quantity': product.quantity,
                    'categories': product.categories_hierarchy
                });

                console.log(productPersist);

                res.render('pages/product', {
                    'product': productPersist
                });

                productPersist.save();
            });
        }
    })
});

/**
 * Send back the response to the client.
 * @param {Object} data is the response from the puppeteer server. Contains images urls as an Array and the client socker id.
 */
_puppeteerSocket.on('getImagesResponse', async (data) => {

    Product.findOneAndUpdate({gtin: data.data.gtin}, {images: data.data.images}, (err, product) => {
    })
    

    // We can now respond to the client
    io.to(data.id).emit('getImagesResponse', data.data);

    // Persistence will occur here 
});

_puppeteerSocket.on('getPriceCarrefourResponse', async (data) => {  
    console.log(data.data);
    
    // We can now respond to the client
    io.to(data.id).emit('getPriceCarrefourResponse', data.data);

    // Persistance will occur here
    if(data.data.found) {
        Product.findOne({gtin: data.data.gtin}, (err, product) => {

            const carrefour = product.retailers.find((retailer) => {
                return retailer.name == 'Carrefour'
            })

            if(!carrefour) {
                product.retailers.push({
                    name: 'Carrefour',
                    globalPrice: data.data.price
                })
            }

            product.save();
        })
    }
});

_puppeteerSocket.on('getPriceResponse', async (data) => {

    io.to(data.id).emit('getPriceResponse', data.data)
})

_puppeteerSocket.on('getPriceAuchanResponse', async (data) => {
    data.data.retailer = 'Auchan';
    io.to(data.id).emit('getPriceAuchanResponse', data.data);
});

_puppeteerSocket.on('getPriceLeclercResponse', async (data) => {
    
    io.to(data.id).emit('getPriceLeclercResponse', data.data)
})

_puppeteerSocket.on('getPriceMagasinsuResponse', async (data) => {

    io.to(data.id).emit('getPriceMagasinsuResponse', data.data);
})

_puppeteerSocket.on('getPriceIntermarcheResponse', async (data) => {

    io.to(data.id).emit('getPriceIntermarcheResponse', data.data)
})



/**
 * Occurs when a new user (new tab, new window, page reloading, ...) connects.
 * Every event from the user is listened with socket.on('event', ...).
 * @param {Object} socket is the new client socket.
 */
io.on('connection', async (socket) => {

    /**
     * Request from client to get images for a product.
     * @param {String} gtin is the worldwide product identifier.
     * @param {Function} callback is the response function executed by the client.
     */
    socket.on('getImages', async (gtin) => {
        console.log(`Requesting images for ${gtin} (${socket.id})`);

        // Tell the puppeteer server to search
        _puppeteerSocket.emit('getImages', {
            data: {
                gtin: gtin
            },
            id: socket.id
        });
    });

    socket.on('getPriceCarrefour', async (gtin) => {
        console.log(`Requesting carrefour price for ${gtin} (${socket.id})`)

        _puppeteerSocket.emit('getPriceCarrefour', {
            data: {
                gtin: gtin
            },
            id: socket.id
        });
    });

    socket.on('getPriceAuchan', async (gtin, zipcode) => {
        console.log(`Requesting auchan price for ${gtin} at ${zipcode} (${socket.id})`)

        _puppeteerSocket.emit('getPriceAuchan', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        });
    });

    socket.on('getPriceLeclerc', async (gtin, zipcode) => {
        console.log(`Requesting leclerc price for ${gtin} at ${zipcode} (${socket.id})`)

        _puppeteerSocket.emit('getPriceLeclerc', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        });
    });

    socket.on('getPriceMagasinsu', async (gtin, zipcode) => {
        console.log(`Requesting magasins-u price for ${gtin} at ${zipcode} (${socket.id})`)

        _puppeteerSocket.emit('getPriceMagasinsu', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        }); 
    });

    socket.on('getPriceIntermarche', async (gtin, zipcode) => {
        console.log(`Requesting intermarche price for ${gtin} at ${zipcode} (${socket.id})`)

        _puppeteerSocket.emit('getPriceIntermarche', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        });
    });

    socket.on('disconnect', () => {
        socket.disconnect();
    });
});

http.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});