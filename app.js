const app = require('express')();
const port = process.env.PORT;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Product = require('./models/product.model');
const request = require('request');
const jsdom = require('jsdom');
const randomUseragent = require('random-useragent')
const parse = require('node-html-parser');
const {
    JSDOM
} = jsdom;
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

                let productPersist = new Product({
                    'gtin': gtin,
                    'name': product.product_name,
                    'generic_name': product.generic_name,
                    'ingredients': product.ingredients_text.replace(regex, '').split(', '),
                    'quantity': product.quantity
                });

                console.log(productPersist);

                res.render('pages/product', {
                    'product': productPersist
                });

                //productPersist.save();
            });
        }
    })
});

io.on('connection', (socket) => {
    console.log(`New user connected`);
    var headers = {
        'Host': 'www.carrefour.fr',
        'User-Agent': randomUseragent.getRandom(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        'Referer': ' https://www.carrefour.fr/',
        'DNT': 1,
        'Connection': 'keep-alive',
        'Cookie': 'datadome=8QdOZ1j8x78_NFiYcSgUqx-baDxyNGIXsY18_.8row2umtIlEViugIWGWmxsOeJ2bvELKR1AVRS3j-MwVgRgAa3ZS0it3h6HvIl1jrw3aX; Path=/; Domain=.carrefour.fr; Expires=Tue, 22-Sep-2020 01:30:29 GMT; Max-Age=31536000',
        'Upgrade-Insecure-Requests': 1,
        'Cache-Control': 'max-age=0',
        'TE': 'Trailers'
    }
    socket.on('requestAdditionalInfos', (requestParams) => {
        // request({
        //     headers: headers,
        //     uri: 'https://www.carrefour.fr/s?q=' + requestParams.gtin
        // }, (error, response, body) => {
        //     const firstDom = new JSDOM(body);

        //     console.log(firstDom.window.document.querySelector("body"));
        //     request({
        //         headers: headers,
        //         uri: 'https://www.carrefour.fr' + firstDom.window.document.querySelector("body main #products section .product-list > ul article .ds-product-card--vertical-infos a").href
        //     }, (error, response, body) => {
        //         const dom = new JSDOM(body, { runScripts: "dangerously" });


        //         let price = dom.window.document.querySelector('body main .pdp__wrapper .pdp__main .main-details .main-details__wrap .main-details__right .main-details__pricing .product-card-price__price--final').innerHTML.replace('\n', '').trim();
        //         let price_kg = dom.window.document.querySelector('body main .pdp__wrapper .pdp__main .main-details .main-details__wrap .main-details__right .main-details__pricing-left > .ds-body-text').innerHTML.replace('\n', '').trim();
        //         let images = dom.window.ONECF_INITIAL_STATE.search.data.attributes.images;
        //         let finalImages = [];

        //         images.forEach((image) => {
        //             finalImages.push('https://carrefour.fr' + image.largest)
        //         });



        //         socket.emit('responseAdditionalInfos', [{
        //             retailer: 'Carrefour',
        //             data: {price: price,
        //                 price_kg: price_kg,
        //                 images: finalImages
        //             }
        //         }]);

        //     });
        // });
        request('http://localhost:9091/' + requestParams.gtin + '/carrefour', (error, response, body) => {
            console.log(JSON.parse(body));
            socket.emit('responseAdditionalInfos', JSON.parse(body));
        });
    });

    socket.on('getImages', async (gtin) => {
        request('http://localhost:9091/' + gtin + '/imgs', (error, response, body) => {
            if (error) {
                socket.emit('getImagesReponse', {
                    error: error
                });
                return;
            }
            socket.emit('getImagesResponse', {
                data: JSON.parse(body)
            });
        });
    });

    socket.on('getPriceCarrefour', async (gtin) => {
        request('http://localhost:9091/' + gtin + '/price/carrefour', (error, response, body) => {
            if (error) {
                socket.emit('getPriceCarrefourResponse', {
                    error: error
                });
                return;
            }
            socket.emit('getPriceCarrefourResponse', {
                data: JSON.parse(body)
            })
        });
    });

    socket.on('getPriceAuchan', async (gtin, zipcode) => {
        request('http://localhost:9091/' + gtin + '/price/auchan/' + zipcode, (error, response, body) => {
            if (error) {
                socket.emit('getPriceAuchanResponse', {
                    error: error
                });
                return;
            }
            socket.emit('getPriceAuchanResponse', {
                data: JSON.parse(body)
            })
        });
    });

    socket.on('getPriceLeclerc', async (gtin, zipcode) => {
        request('http://localhost:9091/' + gtin + '/price/leclerc/' + zipcode, (error, response, body) => {
            if (error) {
                socket.emit('getPriceLeclercResponse', {
                    error: error
                });
                return;
            }
            socket.emit('getPriceLeclercResponse', {
                data: JSON.parse(body)
            });
        })
    })

    socket.on('disconnect', () => {
        console.log(`User disconnected`);
    });
});

http.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});