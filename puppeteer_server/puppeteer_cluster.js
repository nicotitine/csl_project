const {
    Cluster
} = require('puppeteer-cluster');
const io = require("socket.io").listen(process.env.PUPPETEER_PORT);
const os = require('os')
const cpuCount = os.cpus().length;
const Scrapping = require('./scrapping_core');
const speedTest = require('speedtest-net');
let cluster, delay;

// We need to speed test the server connection in order to predict how many time we have to wait
// until the page is loaded. It will be used as follow : page.waitFor(fatest.bestPing * 10).
speedTest({
    maxTime: 1000
}).on('bestservers', servers => {
    const fatest = servers[0];
    for (let i = 1; i < servers.length; i++) {
        if (servers[i].bestPing < fatest.bestPing) {
            fatest = servers[i]
        }
    };

    delay = Math.round(fatest.bestPing * 10);

    main()
});


const main = async () => {

    /**
     * Create a cluster for puppeteer tasks.
     * @param {Object} params concurrency: the type of concurrency, maxConcurrency: the number max of CPU we can use.
     */
    cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_BROWSER,
        maxConcurrency: cpuCount,
        puppeteerOptions: {
            /* args: ['--no-sandbox']*/ }
    });


    console.log(`Puppeteer cluster launched with ${cpuCount} worker(s) and ${delay} ms of delay on port ${process.env.PUPPETEER_PORT}`);
};


/**
 * Occurs when the basic server connects.
 * Every event from the server is listened with socket.on('event', ...).
 * @param {Object} socket is the new server socket.
 */
io.on("connection", function (socket) {

    /**
     * Request from the server to get global information for a product
     * @param {Object} params contains the product gtin and the user socket id.
     */
    socket.on('getOFF', async (params) => {

        /**
         * Execute puppeteer_OFF function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, delay).
         * @param {Function} Scrapping.puppeteer_OFF is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            delay: delay
        };

        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_OFF);

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} finalData contains scrapped data and the final user socket id.
         */
        const finalData = {
            data: result,
            id: params.id
        }
        socket.emit('getOFFResponse', finalData);
    });

    /**
     * Request from the server to get images for a product.
     * @param {Object} params contains the product gtin and the user socket id.
     */
    socket.on('getImages', async (params) => {

        /**
         * Execute puppeteer_imgs function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, delay).
         * @param {Function} Scrapping.puppeteer_imgs is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            delay: delay
        }
        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_imgs);

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} finalData contains scrapped data and the final user socket id.
         */
        const finalData = {
            data: result,
            id: params.id
        }
        socket.emit('getImagesResponse', finalData);
    });

    /**
     * Request from the server to try to get other images for a product.
     * @param {Object} params contains the product gtin and the user socket id.
     */
    socket.on('reportImages', async (params) => {

         /**
         * Execute puppeteer_imgs function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, delay).
         * @param {Function} Scrapping.puppeteer_imgs is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            report: params.data.report,
            delay: delay
        }
        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_imgs);

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} finalData contains scrapped data and the final user socket id.
         */
        const finalData = {
            data: result,
            id: params.id
        }
        socket.emit('reportImagesResponse', finalData);
    });

    /**
     * Request from the server to get the carrefour price for a product.
     * @param {Object} params contains the product gtin and the user socket id.
     */
    socket.on('getPriceCarrefour', async (params) => {

        /**
         * Execute puppeteer_price_carrefour function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, zipcode, delay).
         * @param {Function} Scrapping.puppeteer_price_carrefour is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            delay: delay
        }
        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_price_carrefour);
        result.id = params.id      

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} result contains scrapped data and the final user socket id.
         */
        
        socket.emit('getPriceCarrefourResponse', result);
    });

    /**
     * Request from the server to get the auchan price for a product.
     * @param {Object} params contains the product gtin, the zipcode given by the user and the user socket id.
     */
    socket.on('getPriceAuchan', async (params) => {

        /**
         * Execute puppeteer_price_auchan function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, zipcode, delay).
         * @param {Function} Scrapping.puppeteer_price_auchan is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            delay: delay
        }
        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_price_auchan);

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} finalData contains scrapped data and the final user socket id.
         */
        const finalData = {
            data: result,
            id: params.id
        }
        socket.emit('getPriceResponse', finalData);
    });

    /**
     * Request from the server to get the leclerc price for a product.
     * @param {Object} params contains the product gtin, the zipcode given by the user and the user socket id.
     */
    socket.on('getPriceLeclerc', async (params) => {

        /**
         * Execute puppeteer_price_leclerc function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, zipcode, delay).
         * @param {Function} Scrapping.puppeteer_price_leclerc is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            delay: delay
        }
        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_price_leclerc);

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} finalData contains scrapped data and the final user socket id.
         */
        const finalData = {
            data: result,
            id: params.id
        }
        socket.emit('getPriceResponse', finalData);
    });

    /**
     * Request from the server to get the magasins-u price for a product.
     * @param {Object} params contains the product gtin, the zipcode given by the user and the user socket id.
     */
    socket.on('getPriceMagasinsu', async (params) => {

        /**
         * Execute puppeteer_price_magasinsu function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, zipcode, delay).
         * @param {Function} Scrapping.puppeteer_price_magasinsu is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            delay: delay
        }
        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_price_magasinsu);

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} finalData contains scrapped data and the final user socket id.
         */
        const finalData = {
            data: result,
            id: params.id
        }
        socket.emit('getPriceResponse', finalData);
    });

    /**
     * Request from the server to get the intermarche price for a product.
     * @param {Object} params contains the product gtin, the zipcode given by the user and the user socket id.
     */
    socket.on('getPriceIntermarche', async (params) => {

        /**
         * Execute puppeteer_price_intermarche function in background. We wait the execution to be complete.
         * @param {Object} dataPuppeteer contains the variable we need in the function (gtin, zipcode, delay).
         * @param {Function} Scrapping.puppeteer_price_intermarche is the function executed by the puppeteer cluster.
         * @returns {Object} contains valuable data scrapped using puppeteer.
         */
        const dataPuppeteer = {
            gtin: params.data.gtin,
            zipcode: params.data.zipcode,
            delay: delay
        }
        const result = await cluster.execute(dataPuppeteer, Scrapping.puppeteer_price_intermarche);

        /**
         * Send the scrapped data to the central server. Wich will persist data and send it back to the final user.
         * @param {String} message is the socket message.
         * @param {Object} finalData contains scrapped data and the final user socket id.
         */
        const finalData = {
            data: result,
            id: params.id
        }
        socket.emit('getPriceResponse', finalData);
    });
});