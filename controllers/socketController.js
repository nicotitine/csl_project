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
  serverSocket.on('getImagesResponse', async (data) => {

    await Product.findOneAndUpdate({
      gtin: data.data.gtin
    }, {
      images: data.data.images
    }, (err, product) => {});


    // We can now respond to the client
    clientSocket.to(data.id).emit('getImagesResponse', data.data);

    // Persistence will occur here 
  });

  serverSocket.on('getPriceCarrefourResponse', async (data) => {

    // We can now respond to the client
    clientSocket.to(data.id).emit('getPriceCarrefourResponse', data.data);

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

const createProductPersist = async (product) => {
  const regex = /_/gi

  if (product.categories_hierarchy) {
    for (let i = 0; i < product.categories_hierarchy.length; i++) {
      product.categories_hierarchy[i] = product.categories_hierarchy[i].split(':')[1];
      product.categories_hierarchy[i] = product.categories_hierarchy[i].replace(/-/gi, ' ');
    }
  }

  let ingredients_array = [];
  if (product.ingredients_text) {
    ingredients_array = product.ingredients_text.replace(regex, '').replace('\n', '').replace('\r', '').split(', ');
  }

  const productPersist = new Product({
    'gtin': product._id,
    'name': product.product_name.replace('\n', ''),
    'generic_name': product.generic_name,
    'ingredients': ingredients_array,
    'quantity': product.quantity,
    'categories': product.categories_hierarchy,
    'brand': product.brands.split(',')
  });

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