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
                    request('http://localhost:9091/' + gtin + '/imgs', (error, response, body) => {

                    })
                    res.render('pages/product', {
                        'product': null,
                        'error': 'Product not found on OFF (' + gtin + ')'
                    });
                    return;
                }


                let product = data.product;
                let regex = /_/gi

                let productPersist = new Product({
                    'gtin': gtin,
                    'name': product.product_name,
                    'generic_name': product.generic_name,
                    'ingredients': product.ingredients_text.replace(regex, '').split(', '),
                    'quantity': product.quantity
                });

                //console.log(productPersist);

                res.render('pages/product', {
                    'product': productPersist
                });

                //productPersist.save();
            });
        }
    })
});

/**
 * Send back the response to the client.
 * @param {Object} data is the response from the puppeteer server. Contains images urls as an Array and the client socker id.
 */
_puppeteerSocket.on('getImagesResponse', async (data) => {

    // We can now respond to the client
    io.to(data.id).emit('getImagesResponse', data.data);

    // Persistence will occur here 
});

_puppeteerSocket.on('getPriceCarrefourResponse', async (data) => {

    // We can now respond to the client
    io.to(data.id).emit('getPriceCarrefourResponse', data.data);

    // Persistance will occur here
});

_puppeteerSocket.on('getPriceResponse', async (data) => {

    console.log(data);
    

    io.to(data.id).emit('getPriceResponse', data.data)
})

_puppeteerSocket.on('getPriceAuchanResponse', async (data) => {
    console.log(data);
    data.data.retailer = 'Auchan';
    io.to(data.id).emit('getPriceAuchanResponse', data.data);
});

_puppeteerSocket.on('getPriceLeclercResponse', async (data) => {
    console.log(data);
    
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

    console.log('User connected');

    /**
     * Request from client to get images for a product.
     * @param {String} gtin is the worldwide product identifier.
     * @param {Function} callback is the response function executed by the client.
     */
    socket.on('getImages', async (gtin) => {

        console.log('Requesting from ' + socket.id);

        // Tell the puppeteer server to search
        _puppeteerSocket.emit('getImages', {
            data: gtin,
            id: socket.id
        });
    });

    socket.on('getPriceCarrefour', async (gtin) => {
        console.log('Requesting carrefour price ' + socket.id);

        _puppeteerSocket.emit('getPriceCarrefour', {
            data: gtin,
            id: socket.id
        });
    });

    socket.on('getPriceAuchan', async (gtin, zipcode) => {
        console.log('Requesting auchan price ' + socket.id);

        _puppeteerSocket.emit('getPriceAuchan', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        });
    });

    socket.on('getPriceLeclerc', async (gtin, zipcode) => {
        console.log('Requesting leclerc price ' + socket.id);

        _puppeteerSocket.emit('getPriceLeclerc', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        });
    });

    socket.on('getPriceMagasinsu', async (gtin, zipcode) => {
        console.log('Requesting magasins-u price ' + socket.id);

        _puppeteerSocket.emit('getPriceMagasinsu', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        }); 
    });

    socket.on('getPriceIntermarche', async (gtin, zipcode) => {
        console.log('Requesting intermarche price ' + socket.id);

        _puppeteerSocket.emit('getPriceIntermarche', {
            data: {
                gtin: gtin,
                zipcode: zipcode
            },
            id: socket.id
        });
    });

    // socket.on('getPriceCarrefour', async (gtin) => {
    //     request('http://localhost:9091/' + gtin + '/price/carrefour', (error, response, body) => {
    //         if (error) {
    //             socket.emit('getPriceCarrefourResponse', {
    //                 error: error
    //             });
    //             return;
    //         }
    //         socket.emit('getPriceCarrefourResponse', {
    //             data: JSON.parse(body)
    //         })
    //     });
    // });

    // socket.on('getPriceAuchan', async (gtin, zipcode) => {
    //     request('http://localhost:9091/' + gtin + '/price/auchan/' + zipcode, (error, response, body) => {
    //         if (error) {
    //             socket.emit('getPriceAuchanResponse', {
    //                 error: error
    //             });
    //             return;
    //         }
    //         socket.emit('getPriceAuchanResponse', {
    //             data: JSON.parse(body)
    //         })
    //     });
    // });

    // socket.on('getPriceLeclerc', async (gtin, zipcode) => {
    //     request('http://localhost:9091/' + gtin + '/price/leclerc/' + zipcode, (error, response, body) => {
    //         if (error) {
    //             socket.emit('getPriceLeclercResponse', {
    //                 error: error
    //             });
    //             return;
    //         }
    //         socket.emit('getPriceLeclercResponse', {
    //             data: JSON.parse(body)
    //         });
    //     })
    // });

    // socket.on('getPriceMagasinsU', async (gtin, zipcode) => {
    //     request('http://localhost:9091/' + gtin + '/price/magasinsu/' + zipcode, (error, response, body) => {
    //         if(error) {
    //             socket.emit('getPriceMagasinsUResponse', {
    //                 error: error
    //             });
    //             return;
    //         }
    //         socket.emit('getPriceMagasinsUResponse', {
    //             data: JSON.parse(body)
    //         });
    //     });
    // });

    // socket.on('getPriceIntermarche', async (gtin, zipcode) => {
    //     request('http://localhost:9091/' + gtin + '/price/intermarche/' + zipcode, (error, response, body) => {
    //         if(error) {
    //             socket.emit('getPriceIntermarcheResponse', {
    //                 error: error
    //             });
    //             return;
    //         }
    //         socket.emit('getPriceIntermarcheResponse', {
    //             data: JSON.parse(body)
    //         });
    //     });
    // });

    socket.on('disconnect', () => {
        socket.disconnect();
    });
});

http.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});