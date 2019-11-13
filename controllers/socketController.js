const ioClient = require('socket.io')
const serverSocket = require('socket.io-client').connect('http://127.0.0.1:9091');
const Product = require('../models/product.model')
const Category = require('../models/category.model')

const serve = async (app) => {
    /**
     * CLIENT SOCKET REQUEST HANDLING
     */
    const clientSocket = ioClient.listen(app);

    clientSocket.sockets.on('connection', async (socket) => {

        /**
         * Request from client to get informations on OFF for a product.
         * @param {String} gtin is the worldwide product identifier.
         * @param {Function} callback is the response function to execute on.
         */
        socket.on('getOFF', async (gtin) => {
            console.log(`Requesting OFF informations for ${gtin} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            serverSocket.emit('getOFF', params);
        });


        /**
         * Request from client to get images for a product.
         * @param {String} gtin is the worldwide product identifier.
         * @param {Function} callback is the response function executed by the client.
         */
        socket.on('getImages', async (gtin) => {
            console.log(`Requesting images for ${gtin} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            // Tell the puppeteer server to search
            serverSocket.emit('getImages', params);
        });

        socket.on('reportImages', async (gtin, report) => {
            console.log(`Reporting images for ${gtin} (${socket.id})`);
            
            const params = {
                data: {
                    gtin: gtin,
                    report: report
                },
                id: socket.id
            };

            serverSocket.emit('reportImages', params);
        });

        socket.on('reportIngredients', async (gtin) => {
            const product = await Product.findOne({gtin: gtin});
            
            if(product) {
                let result;

                result = product.ingredients[0].split('-').map(function(item) {
                    return item.trim();
                });;
                console.log(result);

                clientSocket.to(socket.id).emit('reportIngredientsResponse', result);
            }
        });

        socket.on('updateIngredients', async (gtin, ingredients) => {
            const product = await Product.findOne({gtin: gtin});

            product.ingredients = ingredients;

            await product.save();
        });

        socket.on('updateImages', async (gtin, images) => {
            const product = await Product.findOne({gtin: gtin});
            console.log(product.images);
            product.images = images;

            await product.save();

        });


        socket.on('getPriceCarrefour', async (gtin) => {
            console.log(`Requesting carrefour price for ${gtin} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            serverSocket.emit('getPriceCarrefour', params);
        });


        socket.on('getPriceAuchan', async (gtin, zipcode) => {
            console.log(`Requesting auchan price for ${gtin} at ${zipcode} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            serverSocket.emit('getPriceAuchan', params);
        });


        socket.on('getPriceLeclerc', async (gtin, zipcode) => {
            console.log(`Requesting leclerc price for ${gtin} at ${zipcode} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            serverSocket.emit('getPriceLeclerc', params);
        });


        socket.on('getPriceMagasinsu', async (gtin, zipcode) => {
            console.log(`Requesting magasins-u price for ${gtin} at ${zipcode} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            serverSocket.emit('getPriceMagasinsu', params);
        });


        socket.on('getPriceIntermarche', async (gtin, zipcode) => {
            console.log(`Requesting intermarche price for ${gtin} at ${zipcode} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            serverSocket.emit('getPriceIntermarche', params);
        });


        socket.on('disconnect', () => {
            socket.disconnect();
        });
    });






    /**
     * PUPPETEER SERVER RESPONSE HANDLING
     */


    serverSocket.on('getOFFResponse', async (data) => {
        console.log(data);
        if (data.data.status == 1) {
            const product = await createProductPersist(data.data.product);

            clientSocket.to(data.id).emit('getOFFResponse', product);

            saveCategories(product);
        }
    })


    /**
     * Send back the response to the client.
     * @param {Object} data is the response from the puppeteer server. Contains images urls as an Array and the client socker id.
     */
    serverSocket.on('getImagesResponse', async (response) => {
        console.log(response.data.data)
        const product = await Product.findOne({gtin: response.data.data.gtin});
        console.log(product);
        await Product.findOneAndUpdate({
            gtin: response.data.data.gtin
        }, {
            images: response.data.data.images
        }, (err, product) => {});


        // We can now respond to the clients
        clientSocket.to(response.id).emit('getImagesResponse', response.data);

        // Persistence will occur here 
    });

    serverSocket.on('reportImagesResponse', async (response) => {

        clientSocket.to(response.id).emit('reportImagesResponse', response.data);
    })

    serverSocket.on('getPriceCarrefourResponse', async (data) => {

        console.log(data)

        // We can now respond to the client
        clientSocket.to(data.id).emit('getPriceCarrefourResponse', data);

        // Persistance will occur here
        if (data.data.found) {
            Product.findOne({
                gtin: data.data.gtin
            }, (err, product) => {
                if (product) {
                    const carrefour = product.retailers.find((retailer) => {
                        return retailer.name == 'Carrefour'
                    });

                    if (!carrefour) {
                        product.retailers.push({
                            name: 'Carrefour',
                            globalPrice: data.data.price
                        });
                    }
                    product.save();
                }
            });
        }
    });



    serverSocket.on('getPriceResponse', async (data) => {

        clientSocket.to(data.id).emit('getPriceResponse', data.data);
    });


}

const replaceAllBadChars = (string) => {

    /**
     * Remove all '\n'.
     */
    string = string.replace(/\n/g, ' ');

    /**
     * Remove all '\r'.
     */
    string = string.replace(/\r/g, ' ');

    /**
     * Remove all '\t'.
     */
    string = string.replace(/\t/g, ' ');

    /**
     * Return the result.
     */
    return string;
};

const createProductPersist = async (product) => {

    if (product.product_name) {
        product.product_name = replaceAllBadChars(product.product_name);
    }

    if (product.generic_name) {
        product.generic_name = replaceAllBadChars(product.generic_name);
    }

    if (product.ingredients_text) {
        product.ingredients_text = replaceAllBadChars(product.ingredients_text).replace(/_/gi, '').split(', ');
    }

    if (product.quantity) {
        product.quantity = replaceAllBadChars(product.quantity);
    }

    if (product.categories_hierarchy) {
        for (let i = 0; i < product.categories_hierarchy.length; i++) {
            product.categories_hierarchy[i] = product.categories_hierarchy[i].split(':')[1];
            product.categories_hierarchy[i] = replaceAllBadChars(product.categories_hierarchy[i]).replace(/-/gi, ' ');
        }
    }

    if (product.brands) {
        product.brands = replaceAllBadChars(product.brands).split(',');
    }

    const productPersist = new Product({
        'gtin': product._id,
        'name': product.product_name,
        'generic_name': product.generic_name,
        'ingredients': product.ingredients_text,
        'quantity': product.quantity,
        'categories': product.categories_hierarchy,
        'brand': product.brands
    });

    console.log(productPersist);
    

    productPersist.save();

    return productPersist;
}

const saveCategories = async (product) => {

    for (let i = 0; i < product.categories.length; i++) {
        const query = {
            name: product.categories[i]
        };
        const category = await Category.findOne(query)

        if (!category) {
            const categoryPersist = new Category(query);

            await categoryPersist.save();
        }
    }
}

module.exports = {
    serve
};