const auv = require('ak-url-validate');
const Error = require('../server/models/Error');
const fs = require('fs');

async function puppeteer_OFF({
    page,
    data
}) {


    const gtin = data.gtin;

    /**
     * Defines page user agent.
     */
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');

    /**
     * Request OFF API
     * 
     */
    await page.goto('https://world.openfoodfacts.org/api/v0/product/' + gtin + '.json')

    /**
     * Parses the product's innerText to a JSON object.
     */
    const productJson = await page.evaluate(() => {
        return JSON.parse(document.querySelector('body').innerText);
    })

    return productJson;
}

async function puppeteer_google({
    data,
    page
}) {

    /**
     * The default result we send back to the server.
     */
    let result = {
        data: {
            product: {
                gtin: data.gtin
            }
        },
        errors: []
    }

    /**
     * Defines page user agent.
     */
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');

    /**
     * Goes to google.com.
     */
    await page.goto('https://google.com');

    /**
     * Wait for the main input to be loaded.
     */
    await page.waitForSelector('input[name="q"]');
    

    /**
     * Type the gtin in the main input and simulates an "Enter key press" using "\n".
     */
    await page.type('input[name="q"]', data.gtin + '\n', {
        delay: 20
    });

    /**
     * Wait for the product div to be loaded.
     */
    await page.waitForSelector('div[data-name="details"]');

    const results =  await page.evaluate((result) => {

        const camelize = (str) => {
            return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
                return index == 0 ? word.toLowerCase() : word.toUpperCase();
            }).replace(/\s+/g, '');
        }

        const divs = document.documentElement.querySelectorAll('div[data-name="details"] div[class="pla-ikpd__modal-content"] div[class="mCKFRe"]')

        for(let i = 0; i < divs.length; i++) {
            const field = camelize(divs[i].querySelector('div:nth-child(1)').innerText
                            .replace(/é/gm, 'e')
                            .replace(/è/gm, 'e')
                            .replace(/â/gm, 'a')
                            .replace(/î/gm, 'i')
                            .replace(/\//gm, '')
                        )
                        .replace(/\'/gm, '')
                        .replace(/-/gm, '')
                            
            const value = divs[i].querySelector('div:nth-child(2)').innerText;

            result.data.product[field] = value;
        }

        result.data.product.name = document.documentElement.querySelector('div[data-name="details"] div[class="pla-ikpd__modal-content-container"] div[class="NYWkjc"] div:nth-child(2) div').innerText;
        result.data.product.description = document.documentElement.querySelector(' div[data-name="details"] div[class="pla-ikpd__modal-content"] div[class="sUELFd"]').innerText.replace(/  /gm, ' ');

        return result;
    }, result);

    return results;
}

/**
 * Search images for a given product id.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_imgs({
    page,
    data
}) {

    /**
     * The default data we send back to the server
     */
    let result = {
        data: {
            gtin: data.gtin,
            images: []
        },
        errors: []
    }

    /**
     * 
     */
    let imagesFound = false;

    /**
     * Defines page user agent.
     */
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
    await page.setViewport({
        width: 1920,
        height: 1080
    })

    /**
     * Goes to google.com.
     */
    await page.goto('https://google.com');

    /**
     * Wait for the main input to be loaded.
     */
    await page.waitForSelector('input[name="q"]');

    /**
     * Type the gtin in the main input and simulates an "Enter key press" using "\n".
     */
    await page.type('input[name="q"]', data.gtin + '\n', {
        delay: 20
    });
    

    /**
     * Wait for the results to be displayed.
     * We need try - catch here. If the timeout is hit, it throws an error we have to handle.
     * In this case, if the timeout is hit, we return the default result.
     * This selector matches with the google built-in preview mod images.
     */
    try {
        await page.waitForSelector('div[class="pla-ikpd__modal"] div[class="IY0jUb"]', {
            timeout: data.delay * 10
        });
    } catch (e) {
        imagesFound = false;
    }


    /**
     * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
     * We check if google give us any result.
     * They all stored in a div. Google doen't allow us to access those image attributes (such as src).
     * So we return the innerHTML of the parent and manualy compute the result.
     */
    const parent = await page.evaluate(() => {
        const imagesParent = document.querySelector('div[class="pla-ikpd__modal"] div[class="IY0jUb"]');

        if (imagesParent == null) {
            return null;
        } else {
            return imagesParent.innerHTML;
        }
    });


    /**
     * If parent is not null, we compute its innerHTML to get clean and usable image urls.
     */
    if (parent != null) {
        /**
         * get an array of img HTML nodes.
         */
        let images = parent.split('>');

        /**
         * Better use for instead of forEach because of async issues.
         * Example : '<img class="foo bar" src="http://foo.bar" alt="Foo Bar">'.
         */
        for (let i = 0; i < images.length; i++) {
            /**
             * Example : 'http://foo.bar" alt="Foo Bar>"'.
             */
            images[i] = images[i].split('src="')[1];
            if (images[i] != null) {
                /**
                 * Example : 'http://foo.bar'.
                 */
                images[i] = images[i].split('"')[0];
                result.data.images.push(images[i]);
            }
        }

        /**
         * If result.data.images is not empty, then you have found images
         */
        if (result.data.images.length > 0) {
            imagesFound = true;
        }
    }

    if(data.report == 1) {        
        imagesFound = false;
        result.data.images = [];
    }

    /**
     * Maybe that Google doesn't have any images. So we check if Carrefour does.
     */
    if (!imagesFound) {
        await page.goto('https://images.google.com/');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
        await page.waitForSelector('input[name="q"]');
        await page.type('input[name="q"]', data.gtin + '\n', {
            delay: 20
        });

        try {
            await page.waitForSelector('div[jscontroller="Q7Rsec"]', {
                timeout: data.delay * 10
            });
        } catch {
            const error = new Error('Unable to reach result.', 1, 'Chromium');
            result.errors.push(error);
        }

        const images = await page.evaluate((gtin) => {
            let divs = document.querySelectorAll('div[jscontroller="Q7Rsec"]');
            let images = [];

            for (let i = 0; i < divs.length; i++) {
                if (divs[i].querySelector('div[class="nJGrxf FnqxG"] span') && divs[i].querySelector('div[class="nJGrxf FnqxG"] span').innerHTML.includes("carrefour.fr")) {
                    const src = divs[i].querySelector('div[class="rg_meta notranslate"]');

                    if (src) {
                        try {
                            const jsonObject = JSON.parse(src.innerHTML);
                            const url = jsonObject.ou;

                            if (url.includes(gtin)) {
                                images.push(url);
                            }
                        } catch (e) {

                        }
                    }

                    // let params = src.split('&')

                    // let finalSrc = params[0].split('=')[1];

                    // finalSrc = decodeURIComponent(finalSrc);


                }
            }

            return images;
        }, data.gtin)

        /**
         * Here's an example of what result we got after searching on google :
         * https://www.carrefour.fr/media/{X}x{Y}/Photosite/{category}/{image_name}_{image_number}.jpg?placeholder=1
         * https://courses-en-ligne.carrefour.fr/media/cache/{X}x{Y}/Photosite/{category}/{image_name}_{image_number}.jpg
         * {X}x{Y} is the resolution.
         * {image_name} is the final image name, it doesn't really matter.
         * {image_number} is the number of the image. On some products, we can have up to 6 images, randomly sorted from 0 to 10 (or more ?).
         * ?placeholder=1 is usefull for carrefour to control from where we are getting the image. We need to get ride of that.
         * 
         * Carrefour categories its images by resolution and we are not always getting big size resolution images from searching on google. 
         * Different resolutions are available from 280x280 to 1500x1500.
         * 
         * We want a lot of different beautiful images for a product, so we will try every {image_numer} for 1500x1500 resolution
         */
        if (images.length > 0) {
            const baseUrl = images[0].replace('?placeholder=1', '');

            const categoryRegex = /\/Photosite\/(.*)\//gm;
            const category = categoryRegex.exec(baseUrl)[1];

            const imageNameRegex = /.+(\/.*)_.+$/gm;
            const imageName = imageNameRegex.exec(baseUrl)[1];

            const finalBaseUrl = 'https://www.carrefour.fr/media/1500x1500/Photosite/' + category + imageName + '_';

            for (let number = 0; number < 10; number++) {
                const finalUrl = finalBaseUrl + number + '.jpg';
                const response = await auv.isValidUrl(finalUrl);

                if (response.isValid) {
                    result.data.images.push(finalUrl)
                }
            }


            if (result.data.images.length > 0) {                
                imagesFound = true;
            }
        }
    }
    

    if (!imagesFound || data.report == 2) {

        const res = await page.evaluate(() => {
            if (document.querySelector('div[id="rg_s"] div[jscontroller="Q7Rsec"] a')) {
                const src = document.querySelector('div[id="rg_s"] div[jscontroller="Q7Rsec"] a').href;
                const params = src.split('&')
                const finalSrc = decodeURIComponent(params[0].split('=')[1])

                return finalSrc;
            }

            return null;
        });

        if (res) {
            result.data.images.push(res);
        }
    }

    if(result.data.images.length == 0) {
        const error = new Error('No image found.', 3, 'Images');
        result.errors.push(error);
    }

    return result;
}

/**
 * Search the price at Carrefour for a given product id.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_price_carrefour({
    page,
    data
}) {

    /**
     * The default data we send back to the client.
     */
    let result = {
        data: {
            gtin: data.gtin,
            price: null,
            found: false,
            text: 'Product not found.',
            retailer: 'Carrefour'
        },
        errors: []
    };

    await page.setExtraHTTPHeaders({
        'Accept-Charset': 'utf-8',
        'Content-Type': 'text/html; charset=utf-8',
      })

    /**
     * Defines page user agent.
     */
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');

    /**
     * Goes to google.fr.
     */
    await page.goto('https://www.google.fr/');

    /**
     * Wait for the main input to be loaded.
     */
    await page.waitForSelector('input[name="q"]');

    /**
     * Types the gtin in the main input and simulates an "Enter key press" using "\n".
     */
    await page.type('input[name="q"]', data.gtin + '\n', {
        delay: 20
    });

    /**
     * Wait for the results to be displayed.
     * We need try - catch here. If the timeout is hit, it throws an error we have to handle.
     * In this case, if the timeout is hit, we return the default result.
     * This selector matches with the price div.
     */
    try {
        await page.waitForSelector('div[id="search"] div[class="g"]', {
            timeout: data.delay * 5
        });
    } catch (e) {
        const error = new Error('Product not found.', 3, 'Chromium');
        result.errors.push(error);
        return result;
    }

    /**
     * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
     */

     console.log(await page.evaluate(() => {
         return document.querySelector('div[id="search"]').innerHTML;
     }))
    const results = await page.evaluate((result) => {
        if (document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]') != null) {
            let stringPrice = document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]').innerHTML.split('€')[0].trim();
            let priceToNumber = stringPrice.split(',');
            result.data.price = parseFloat(priceToNumber[0] + '.' + priceToNumber[1]);
            result.data.text = 'Product found.';
            result.data.found = true;
        }

        return result;
    }, result);

    if (!results.data.found) {
        const error = new Error('Product not found.', 2, 'Carrefour');
        results.errors.push(error);
    }

    return results;
}

module.exports = {
    puppeteer_OFF,
    puppeteer_google,
    puppeteer_imgs,
    puppeteer_price_carrefour
}