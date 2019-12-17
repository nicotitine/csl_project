/**
 * Modules import.
 */
const ioClient = require('socket.io')
const serverSocket = require('socket.io-client').connect('http://127.0.0.1:9091');

/**
 * Models import.
 */
const Product = require('../models/product.model')
const Category = require('../models/category.model')

/**
 * Handles every socket events (from client and from puppeteer cluster).
 * @param {Object} app the main express app. 
 */
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

            console.log();


            serverSocket.emit('getOFF', params);
        });

        /**
         * Request from the client to get informations on Google for a product.
         * @param {String} gtin the worldwide product identifier.
         */
        socket.on('getGoogle', async (gtin) => {
            console.log(`Requesting Google informations for ${gtin} (${socket.id})`);

            const params = {
                data: {
                    gtin: gtin
                },
                id: socket.id
            };

            serverSocket.emit('getGoogle', params);
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
            const product = await Product.findOne({
                gtin: gtin
            });

            if (product) {
                let result;

                result = product.ingredients[0].split('-').map(function (item) {
                    return item.trim();
                });;
                console.log(result);

                clientSocket.to(socket.id).emit('reportIngredientsResponse', result);
            }
        });

        socket.on('updateIngredients', async (gtin, ingredients) => {
            const product = await Product.findOne({
                gtin: gtin
            });

            product.ingredients = ingredients;

            await product.save();
        });

        socket.on('updateImages', async (gtin, images) => {
            const product = await Product.findOne({
                gtin: gtin
            });
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

            clientSocket.to(data.id).emit('getOFFResponse', product, true);

            saveCategories(product);
        } else {
            clientSocket.to(data.id).emit('getOFFResponse', data, false)
        }
    })

    /**
     * Send back the response to the client.
     * @param {Object} response is the response from the puppeteer server. Contains product informations and the client socket id.
     */
    serverSocket.on('getGoogleResponse', async (response) => {
        // TODO
        console.log(response.data.data.product);
        const product = response.data.data.product;

        const productPersist = new Product({
            gtin: product.gtin,
            name: product.name,
            description: product.description,
            brand: [product.marque],
            categories: [product.typeDeProduit]
        });

        console.log(productPersist);


        clientSocket.to(response.id).emit('getGoogleResponse', productPersist);

        //saveCategories(productPersist);

        productPersist.save();

    });

    /**
     * Send back the response to the client.
     * @param {Object} data is the response from the puppeteer server. Contains images urls as an Array and the client socker id.
     */
    serverSocket.on('getImagesResponse', async (response) => {
        console.log(response.data.data)
        const product = await Product.findOne({
            gtin: response.data.data.gtin
        });
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
}

/**
 * Get ride of all '\n \r \t' special chars.
 * @param {String} string the string to clean.
 * @returns {String} the cleaned string. 
 */
const replaceAllBadChars = (string) => {
    if (string) {

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
    }

    /**
     * Return the result.
     */
    return string;
};

/**
 * Create a object according to the product model and save it.
 * @param {Product} product the OFF product.
 * @returns {Object} the saved product.
 */
const createProductPersist = async (product) => {

    /**
     * Get the product name.
     */
    if (product.product_name) {
        product.product_name = replaceAllBadChars(product.product_name);
    }

    /**
     * Get the product generic name.
     */
    if (product.generic_name) {
        product.generic_name = replaceAllBadChars(product.generic_name);
    }

    /**
     * Get the product ingredients. The initial OFF String is replaced by an Array.
     */
    if (product.ingredients_text) {
        product.ingredients_text = replaceAllBadChars(product.ingredients_text).replace(/_/gi, '').split(', ');
    }

    /**
     * Get the product quantity.
     */
    if (product.quantity) {
        product.quantity = replaceAllBadChars(product.quantity);
    }

    /**
     * Get the product categories. The initial OFF String is replaced by an Array.
     */
    if (product.categories_hierarchy) {
        for (let i = 0; i < product.categories_hierarchy.length; i++) {
            if(product.categories_hierarchy[i]) {
                product.categories_hierarchy[i] = product.categories_hierarchy[i].split(':')[1];
                product.categories_hierarchy[i] = replaceAllBadChars(product.categories_hierarchy[i]).replace(/-/gi, ' ');
            }
        }
    }

    /**
     * Get the product brands. The initial OFF String is replaced by an Array.
     */
    if (product.brands) {
        product.brands = replaceAllBadChars(product.brands).split(',');
    }

    const nutriscore = {
        grade: product.nutriscore_grade,
        nutriments: {
            fat: product.nutriments.fat_100g + product.nutriments.fat_unit,
            saturatedFat: product.nutriments['saturated-fat_100g'] + product.nutriments['saturated-fat_unit'],
            sugar: product.nutriments.sugars_100g + product.nutriments.sugars_unit,
            salt: product.nutriments.salt_100g + product.nutriments.salt_unit
        },
        table: {
            per100g: {
                energy: {
                    kj: product.nutriments.energy_100g + "kj",
                    kcal: Number(product.nutriments.energy_100g / 4.184).toFixed(0) + "kcal"
                },
                fat: product.nutriments.fat_100g + product.nutriments.fat_unit,
                fatSaturated: product.nutriments['saturated-fat_100g'] + product.nutriments['saturated-fat_unit'],
                carbohydrates: product.nutriments.carbohydrates_100g + product.nutriments.carbohydrates_unit,
                sugar: product.nutriments.sugars_100g + product.nutriments.sugars_unit,
                fiber: product.nutriments.fiber_100g + product.nutriments.fiber_unit,
                proteins: product.nutriments.proteins_100g + product.nutriments.proteins_unit,
                salt: product.nutriments.salt_100g + product.nutriments.salt_unit,
                sodium: product.nutriments.sodium_100g + product.nutriments.sodium_unit,
                scoreFr: product.nutriments['nutrition-score-fr_100g']
            },
            perPortion: {
                energy: {
                    kj: product.nutriments.energy_serving + "kj",
                    kcal: Number(product.nutriments.energy_serving / 4.184).toFixed(0) + "kcal"
                },
                fat: product.nutriments.fat_serving + product.nutriments.fat_unit,
                fatSaturated: product.nutriments['saturated-fat_serving'] + product.nutriments['saturated-fat_unit'],
                carbohydrates: product.nutriments.carbohydrates_serving + product.nutriments.carbohydrates_unit,
                sugar: product.nutriments.sugars_serving + product.nutriments.sugars_unit,
                fiber: product.nutriments.fiber_serving + product.nutriments.fiber_unit,
                proteins: product.nutriments.proteins_serving + product.nutriments.proteins_unit,
                salt: product.nutriments.salt_serving + product.nutriments.salt_unit,
                sodium: product.nutriments.sodium_serving + product.nutriments.sodium_unit,
                scoreFr: product.nutriments['nutrition-score-fr_serving']
            }
        }
    };

    const linkToOFF = 'https://fr.openfoodfacts.org/produit/' + product._id;

    /**
     * Instanciate the product to save.
     */
    const productPersist = new Product({
        'gtin': product._id,
        'name': product.product_name,
        'generic_name': product.generic_name,
        'ingredients': product.ingredients_text,
        'quantity': product.quantity,
        'categories': product.categories_hierarchy,
        'brand': product.brands,
        nutriscore: nutriscore,
        linkToOFF:linkToOFF
    });

    console.log(productPersist);

    /**
     * Save the product.
     */
    productPersist.save();

    return productPersist;
}

/**
 * Save all new categories for a given product.
 * @param {Product} product the new product.
 */
const saveCategories = async (product) => {
    for (let i = 0; i < product.categories.length; i++) {

        /**
         * Build the database query.
         */
        const query = {
            name: product.categories[i]
        };

        /**
         * Execute the query.
         */
        const category = await Category.findOne(query)

        /**
         * If the category doesn't exist yet, create a new one and save it.
         */
        if (!category) {
            const categoryPersist = new Category(query);
            await categoryPersist.save();
        }
    }
}

/**
 * Exporting controllers.
 */
module.exports = {
    serve
};