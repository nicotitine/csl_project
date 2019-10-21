const {
    Cluster
} = require('puppeteer-cluster');
const io = require("socket.io").listen(9092);
const os = require('os')
const cpuCount = 4;
const Scrapping = require('./scrapping_core');
const speedTest = require('speedtest-net');
var cluster, delay;

// We need to speed test the server connection in order to predict how many time we have to wait 
// until the page is loaded. It will be used as follow : page.waitFor(fatest.bestPing * 10)
const test = speedTest({ maxTime: 1000 }).on('bestservers', servers => {
    let fatest = servers[0];
    for (var i = 1; i < servers.length; i++) {
        if (servers[i].bestPing < fatest.bestPing) {
            fatest = servers[i]
        }
    };

    delay = Math.round(fatest.bestPing * 10);

    main()
});


const main = async () => {
    // Create a cluster with cpuCount workers
    /**
     * Create a cluster for puppeteer tasks
     * @param {Object} params concurrency: the type of concurrency, maxConcurrency: the number max of CPU we can use
     */
    cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_BROWSER,
        maxConcurrency: cpuCount
    });

    console.log(`Puppeteer cluster launching with ${cpuCount} worker(s) and ${delay} ms of delay`);
};


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
            retailer: 'Carrefour',
            delay: delay
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
            retailer: 'Carrefour',
            delay: delay
        }, Scrapping.puppeteer_price_carrefour);

        socket.emit('getPriceCarrefourResponse', {
            data: {
                price: price,
                retailer: 'Carrefour'
            },
            id: params.id
        });
    });

    socket.on('getPriceAuchan', async (params) => {

        let price = await cluster.execute({
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            retailer: 'Auchan',
            delay: delay
        }, Scrapping.puppeteer_price_auchan);

        console.log(price);

        console.log('send back auchan');

        socket.emit('getPriceResponse', {
            data: price,
            retailer: 'Auchan',
            id: params.id
        });
    });

    socket.on('getPriceLeclerc', async (params) => {

        let data = await cluster.execute({
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            retailer: 'Leclerc',
            delay: delay
        }, Scrapping.puppeteer_price_leclerc);

        socket.emit('getPriceResponse', {
            data: data,
            retailer: 'Leclerc',
            id: params.id
        });
    });

    socket.on('getPriceMagasinsu', async (params) => {
        let data = await cluster.execute({
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            retailer: 'Magasins-U',
            delay: delay
        }, Scrapping.puppeteer_price_magasinsu);

        socket.emit('getPriceResponse', {
            data: data,
            retailer: 'Magasins-U',
            id: params.id
        });
    });

    socket.on('getPriceIntermarche', async (params) => {
        let data = await cluster.execute({
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            retailer: 'Intermarche',
            delay: delay
        }, Scrapping.puppeteer_price_intermarche);

        socket.emit('getPriceResponse', {
            data: data,
            retailer: 'Intermarche',
            id: params.id
        });
    });
});