const {
    Cluster
} = require('puppeteer-cluster');
const io = require("socket.io").listen(9092);
const os = require('os')
const cpuCount = os.cpus().length;
const Scrapping = require('./scrapping_core');


(async () => {
    // Create a cluster with cpuCount workers
    /**
     * Create a cluster for puppeteer tasks
     * @param {Object} params concurrency: the type of concurrency, maxConcurrency: the number max of CPU we can use
     */
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_BROWSER,
        maxConcurrency: cpuCount
    });

    console.log(`Puppeteer cluster launching with ${cpuCount} worker(s)`);

    /**
     * Occurs when the basic server connects.
     * Every event from the server is listened with socket.on('event', ...).
     * @param {Object} socket is the new server socket.
     */
    io.on("connection", function (socket) {
        /**
         * Request from the server to get images for a product.
         * @param {Object} params contains the product gtin and the client socket id
         */
        socket.on('getImages', async (params) => {
            
            /**
             * Executes a new task : search images for a product.
             * We have to wait the function cluster.execute() to be done to send back the data
             * @param {Object} Object is the data we send to the puppeteer function.
             * @param {Function} Scrapping.puppeteer_imgs is the puppeteer function
             */             
            let images = await cluster.execute({
                gtin: params.data,
                retailer: 'Carrefour'
            }, Scrapping.puppeteer_imgs);
            console.log(images);
            
            /**
             * Send back the data to the server
             * @param {Object} Object is the data srapped with puppeteer
             */
            socket.emit('getImagesResponse', {
                data: images,
                id: params.id
            });

        });

        socket.on('getPriceCarrefour', async (params) => {
            let price = await cluster.execute({
                gtin: params.data,
                retailer: 'Carrefour'
            }, Scrapping.puppeteer_price_carrefour);

            socket.emit('getPriceCarrefourResponse', {
                data: {
                    price: price,
                    retailer: 'Carrefour'
                },
                id: params.id
            });

            console.log(price);
            
        })
    });
})();