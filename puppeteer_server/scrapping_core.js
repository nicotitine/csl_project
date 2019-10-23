/**
 * Search images for a given product id.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_imgs({page, data}) {

    /**
     * The default data we send back to the server
     */
    let result = {
        gtin: data.gtin,
        images: []
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
     * Wait for the results to be displayed.
     * We need try - catch here. If the timeout is hit, it throws an error we have to handle.
     * In this case, if the timeout is hit, we return the default result.
     * This selector matches with the google built-in preview mod images.
     */
console.log('trying image puppeteer');
  await page.waitFor(5000);
await page.screenshot({path: 'screen-google.png'});
        await page.waitForSelector('div[class="pla-ikpd__modal"] div[class="IY0jUb"]');
  
console.log('passing image puppeteer');

    /**
     * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
     * We check if google give us any result.
     * They all stored in a div. Google doen't allow us to access those image attributes (such as src).
     * So we return the innerHTML of the parent and manualy compute the result.
     */
    const parent = await page.evaluate(() => {
        var imagesParent = document.querySelector('div[class="pla-ikpd__modal"] div[class="IY0jUb"]');

        if (imagesParent == null) {
            return null;
        } else {
            return imagesParent.innerHTML;
        }
        
        function toHideVSCODE() {
            // let divs = document.querySelectorAll('div[jscontroller="Q7Rsec"]');
            // console.log(divs.length);

            // let images = [];
            // for (var i = 0; i < divs.length; i++) {
            //     if (divs[i].querySelector('div[class="nJGrxf FnqxG"] span').innerHTML.includes("carrefour.fr")) {
            //         let src = divs[i].querySelector('a').href;

            //         let params = src.split('&')
            //         let finalSrc = params[0].split('=')[1];

            //         finalSrc = decodeURIComponent(finalSrc);

            //         if (finalSrc.includes(gtin)) {
            //             images.push(finalSrc);
            //         }
            //     }
            // }
            // return images;
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
                result.images.push(images[i]);
            }

        }
        /**
         * Some google imgs don't have any src attribute. In this case, the upper computation.
         * will set images[i] at false.
         * Here we filter the array to delete any null element and return the array.
         */
        // return images.filter(function (el) {
        //     return el != null;
        // });

        return result;

    }

    /**
     * Maybe that Google doesn't have any images. So we check if Carrefour does.
     * TODO
     */
    await page.goto('https://images.google.com/');
    await page.waitFor(data.delay);
}

/**
 * Search the price at Carrefour for a given product id.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_price_carrefour({page, data}) {

    /**
     * The default data we send back to the client.
     */    
    let result = {
        gtin: data.gtin,
        price: null,
        found: false,
        text: 'Product not found.',
        retailer: 'Carrefour'
    };

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
    })
    
    /**
     * Wait for the results to be displayed.
     * We need try - catch here. If the timeout is hit, it throws an error we have to handle.
     * In this case, if the timeout is hit, we return the default result.
     * This selector matches with the price div.
     */
    try {
        await page.waitForSelector('div[id="search"] div[class="g"] div[class="slp f"]', {timeout: data.delay * 5});
    } catch (error) {
        return result;
    }

    /**
     * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
     */
    const results = await page.evaluate((result) => {
        if (document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]') != null) {
            let stringPrice = document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]').innerHTML.split('€')[0].trim();
            let priceToNumber = stringPrice.split(',');
            result.price = parseFloat(priceToNumber[0] + '.' + priceToNumber[1]);
            result.text = 'Product found.';
            result.found = true;
        }

        return result;
    }, result);       
    return results;
}

/**
 * Search the price at Auchan for a given product id and the final user zipcode.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin, zipcode).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_price_auchan({page, data}) {

    /**
     * The default data we send back to the client.
     */ 
    let result = {
        gtin: data.gtin,
        price: null,
        drive: '',
        found: false,
        zipcode: data.zipcode,
        text: 'Product not found.',
        retailer: 'Auchan'
    };

    /**
     * Defines page user agent.
     */
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');

    /**
     * Auchan is using a bot detection. So we have to set a cookie to the page to bypass bot detection.
     * Values of this extra cookie was copyed from classic desktop naviguation.
     */
    await page.setExtraHTTPHeaders({
        'Cookie': '_cs_c=1; _cs_id=4889ec48-b2b4-a340-f84f-793bd6e2d5e4.1568727496.9.1569211224.1569211207.1.1602891496790; AuchanAPI=1; AuchanFR.searchHistory=W3sibGFiZWwiOiJudXRlbGxhIiwidXJsIjoiL3JlY2hlcmNoZT90ZXh0PW51dGVsbGEiLCJwaWN0dXJlIjpudWxsfSx7ImxhYmVsIjoiMzAxNzYyMDQyNTAzNSIsInVybCI6Ii9yZWNoZXJjaGU/dGV4dD0zMDE3NjIwNDI1MDM1IiwicGljdHVyZSI6bnVsbH1d; auchan.hamon=1; auchan.consentCookie=3; t2s-p=6ca94952-4aea-417f-95a8-b21337bb2ba2; _gcl_au=1.1.1907335488.1568727500; lark-b2cd=1; lark-consent=3; lark-cart=24cbb06c-d525-4af8-a5c5-891c849c24ac; JSESSIONID=CE1C7AFCB5F4EFF8CD28EF0F97BDEDBE-n2; LB=wasfo04; mediaRulesAB=none; htk_auchan_fr_visit=887z8927m2pg; htk_auchan_fr_first_visits=0001000000; AuchanFR.crossSell=6ca94952-4aea-417f-95a8-b21337bb2ba2; gtmEnvironnement=Web; connect.sid=s%3AFC_koDuYlY2IJT9H13BaoRxa786DGzyb.Z5yV5RGNuJLos9OMjfh4wGYJsbVHN%2F%2B%2B9jXzuW1JFtU; gtmUserAgent=true; _cs_s=3.0; disabledAuthCheck=true'
    })

    /**
     * Goes to auchan.fr/recherche/gtin.
     */
    await page.goto('https://www.auchan.fr/recherche?text=' + data.gtin);

    /**
     * Wait for the results to be displayed.
     * We need try - catch here. If the timeout is hit, it throws an error we have to handle.
     * In this case, if the timeout is hit, we return the default result.
     * This selector matches with the product div.
     */
    try {
        await page.waitForSelector('div[class="product-thumbnail__wrapper"] a', {timeout: data.delay * 5});
    } catch (error) {
        return result;
    }

    /**
     * Auchan is using two different product ID types. 
     * In order to search for this product on the drive website, we need the Auchan attributed product ID.
     */
    const auchanID = await page.evaluate(() => {
        if (document.querySelector('div[class="product-thumbnail__wrapper"] a') != null) {
            var link = document.querySelector('div[class="product-thumbnail__wrapper"] a').href;
            return link.split('/p-')[1];
        } else {
            return null;
        }
    })

    /**
     * If auchanID is null, the product doen't exist.
     */
    if (!auchanID) {
        return result;
    }    

    /**
     * Auchan divides its drive searchs in two ways :
     *  - on auchandrive.fr (for regular Auchan)
     *  - on auchan.fr      (for My Auchan)
     */
    let isNewVersion = false;

    /**
     * Goes to auchandrive.fr.
     */
    await page.goto('https://www.auchandrive.fr/');

    /**
     * Wait the zipcode input to be displayed.
     */
    await page.waitForSelector('input[id="queryinput"]')
    
    /**
     * Types the zipcode.
     */
    await page.type('input[id="queryinput"]', data.zipcode, {
        delay: 20
    })

    /**
     * Clicks the search button.
     */
    await page.click('button[id="update"]');

    /**
     * Wait the first drive to be displayed.
     */
    await page.waitForSelector('a[class="storelocator__storelink-container"]');

    /**
     * Clicks on it.
     */
    await page.click('a[class="storelocator__storelink-container"]');

    /**
     * Wait the search input to be ready.
     * It works for both auchandrive.fr and auchan.fr.
     */
    await page.waitForSelector('input[id="search-input"], form[id="search"] input')

    /**
     * If this fails, we will try it on auchan.fr and isNewVersion will be set to true.
     */
    try {
        /**
         * Types the auchan id in the input and simulates an "Enter key press" using "\n"
         */
        await page.type('input[id="search-input"]', auchanID + '\n', {
            delay: 20
        });
    } catch (error) {
        /**
         * If this fails, we return the product as "not found".
         * 
         */
        try {
            /**
             * Types the auchan id in the input and simulates an "Enter key press" using "\n"
             */
            await page.type('form[id="search"] input', auchanID + '\n', {
                delay: 20
            });
            isNewVersion = true;
        } catch (err) {
            return result;
        }
    }

    /**
     * If we are on the My Auchan website.
     */
    if (isNewVersion) {

        /**
         * Wait for results to be displayed
         */
        await page.waitForSelector('article div[class="product-thumbnail__wrapper"] a');

        /**
         * Clicks on the product thumbnail
         */
        await page.click('article div[class="product-thumbnail__wrapper"] a');

        /**
         * Wait for the product to load
         */
        await page.waitForSelector('span[class="product-price__unit"]');

        /**
         * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
         * Computes the price from HTML Elements and configures result
         */
        const results = await page.evaluate((result) => {
            if (document.querySelector('span[class="product-price__unit"]') != null && document.querySelector('span[class="product-price__cents"]') != null) {
                let stringPrice = document.querySelector('span[class="product-price__unit"]').innerHTML + '.' + document.querySelector('span[class="product-price__cents"]').innerHTML;
                result.price = parseFloat(stringPrice);
                result.found = true;
                result.text = `Product found.`;
            } else {
                result.text = `Product locally not found.`;
            }
            result.drive = document.querySelector('div[class="journey__context-address"]').innerHTML.replace(/\\n/gi, '').trim();

            return result;
        }, result);

        return results;
    } else {
        /**
         * If we are on auchandrive.fr
         */

        /**
         * Wait for results to be displayed
         */
        try {
            await page.waitForSelector('p[class="price-standard"] span[class="price-standard__decimal"]', {timeout: data.delay * 5});
        } catch {
            result.text = 'Product locally not found.';
            return result;
        }

        /**
         * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
         * Computes the price from HTML Elements and configures result
         */
        const results = await page.evaluate((result) => {
            if (document.querySelector('p[class="price-standard"] span[class="price-standard__decimal"]') != null &&
                document.querySelector('p[class="price-standard"] span[class="price-standard__cents"]') != null) {
                let stringPrice = document.querySelector('p[class="price-standard"] span[class="price-standard__decimal"]').innerHTML + document.querySelector('p[class="price-standard"] span[class="price-standard__cents"]').innerHTML;
                let priceToNumber = stringPrice.split(',');
                result.price = parseFloat(priceToNumber[0] + '.' + priceToNumber[1]);
                result.found = true;
                result.text = `Product found.`;
            } else {
                result.text = `Product locally not found.`;
            }
            result.drive = document.querySelector('div[class="header__identity-pointOfService"] em').innerHTML.replace(/\\n/gi, '').trim();

            return result;
        }, result)
        return results;
    }
};

/**
 * Search the price at Leclerc for a given product id and the final user zipcode.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin, zipcode).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_price_leclerc({page, data}) {
    
    /**
     * The default data we send back to the client.
     */
    let result = {
        price: null,
        drive: '',
        found: false,
        zipcode: data.zipcode,
        retailer: 'Leclerc',
        text: 'Product not found.'
    };

     /**
     * Defines page user agent.
     */
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');

    /**
     * Goes to recherche.leclerc/recherche?q=gtin
     */
    await page.goto('https://www.recherche.leclerc/recherche?q=' + data.gtin);
    
    /**
     * Wait the results to be displayed.
     * We need try - catch here. If the timeout is hit, it throws an error we have to handle.
     * In this case, if the timeout is hit, we return the default result.
     * This selector matches with the product div.
     */
    try {
        await page.waitForSelector('div[id="conteneur_produits"]', {timeout: data.delay * 5});
    } catch (error) {
        return result;
    }
    
    /**
     * If the product is found, we have to extract the product full name.
     * We need this name to search for this product on leclercdrive.fr.
     * leclercdrive.fr is hidding every ID we can attach to their products so we search them by name.
     */
    const fullName = await page.evaluate(() => {
        if (document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] h1') != null &&
            document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] p') != null) {
            let firstLabel = document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] h1').innerHTML.trim();
            let secondLabel = document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] p').innerHTML.trim();
            return (firstLabel + ' ' + secondLabel).trim();
        }

        return null;
    });

    /**
     * If the full name is null, the product has not be found and we return the default result.
     */
    if (fullName == null) {
        return result;
    }

    /**
     * Goes to leclercdrive.fr.
     */
    await page.goto('https://www.leclercdrive.fr/');
    
    /**
     * Wait the zipcode input to be loaded.
     */
    await page.waitForSelector('input[id="txtWPAD344_RechercheDrive"]')

    /**
     * Types the zipcode in the zipcode input and simulates an "Enter key press" using "\n".
     */
    await page.type('input[id="txtWPAD344_RechercheDrive"]', data.zipcode + '\n', {
        delay: 20
    });

    /**
     * Wait the map to be loaded.
     */
    await page.waitForSelector('div[id="divWPAD025_ResultatVilles"] a');

    /**
     * Clicks the firtst result.
     */
    await page.click('div[id="divWPAD025_ResultatVilles"] a');

    /**
     * Wait the map to update.
     */
    await page.waitFor('#divWPAD337_GoogleMaps > div > div > div:nth-child(1) > div:nth-child(3) > div > div:nth-child(3) > div');

    /**
     * Leclerc is using an iFrame so we need to simulates a click while evaluating.
     */
    await page.evaluate(() => {
        let divs = document.querySelector('#divWPAD337_GoogleMaps > div > div > div:nth-child(1) > div:nth-child(3) > div > div:nth-child(3)').childNodes;
        let divToClick;

        for(var i = 0; i < divs.length; i++) {
            if(divs[i].hasAttribute('title')) {
                divToClick = divs[i];
                
                break;
            }
            
        }
        divToClick.click();        
    });

    /**
     * Wait for the welcome popup to be displayed.
     */
    await page.waitForSelector('div[class="popinPRPL-choix"] a');

    /**
     * Close it.
     */
    await page.click('div[class="popinPRPL-choix"] a');
    
    /**
     * Wait the main search input to be loaded.
     */
    await page.waitForSelector('input[id="inputWRSL301_rechercheTexte"]');

    /**
     * Types the product full name in the main search input.
     */
    await page.type('input[id="inputWRSL301_rechercheTexte"]', fullName + '\n', {
        delay: 20
    });

    /**
     * Wait the results to be loaded.
     */
    await page.waitForSelector('ul[id="ulListeProduits"] li');
    await page.waitForSelector('a[id="aWCSD333_PL"]');    

    /**
     * Evaluate the page to compare results name and full name we have.
     */
    const results = await page.evaluate((result, fullName) => {

        /**
         * The drive result.
         */
        result.drive = document.querySelector('a[id="aWCSD333_PL"]').innerHTML.trim();

        /**
         * Get all results.
         */
        let products = document.querySelectorAll('ul[id="ulListeProduits"] li');

        /**
         * Better use for instead of forEach because of async issues.
         */
        for (let i = 0; i < products.length; i++) {
            /**
             * Result name.
             */
            let productName = products[i].querySelector('p[class="pWCRS310_Desc"] a[class="aWCRS310_Product"]').innerHTML.split('<br>');
            let finalName = productName[0].trim() + ' ' + productName[1].trim();

            /**
             * If finalName == fullName, we have found the product we are looking for.
             * Computes the price from HTML Elements, configures result and stop the loop
             */
            if (finalName == fullName) {
                result.price = parseFloat(products[i].querySelector('p[class="pWCRS310_PrixUnitaire"]').innerHTML.replace('€', '').trim());
                result.found = true;
                result.text = 'Product found.';
                break;
            }
        }

        return result;
    }, result, fullName);

    return results;
};

/**
 * Search the price at Magasins-U for a given product id and the final user zipcode.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin, zipcode).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_price_magasinsu({page, data}) {

    /**
     * The default data we send back to the client.
     */ 
    let result = {
        price: null,
        drive: '',
        found: false,
        zipcode: data.zipcode,
        retailer: 'Magasins-U',
        text: 'Product not found.'
    };

    /**
     * Goes to courseu.com/drive/home.
     */
    await page.goto('https://www.coursesu.com/drive/home');
    
    /**
     * Wait for the zipcode search input to be loaded.
     */
    await page.waitForSelector('input[id="store-search"]');

    /**
     * Types the zipcode in in the zipcode input.
     */
    await page.type('input[id="store-search"]', data.zipcode, {
        delay: 20
    });
    
    /**
     * Wait the result to be displayed.
     */
    await page.waitForSelector('p[class="search-suggestion"] span');
    
    /**
     * Clicks on the first result.
     */
    await page.click('p[class="search-suggestion"] span');

    /**
     * Wait the result to be displayed.
     */
    await page.waitForSelector('ul[id="quick-content"] a[class="button accent-button choose"]');
    
    /**
     * Clicks on the first result to enter the drive.
     */
    await page.click('ul[id="quick-content"] a[class="button accent-button choose"]');

    /**
     * Wait for the welcome popup to be displayed.
     */
    await page.waitForSelector('div[class="custom-dialog__dialog custom-dialog__dialog--login"] a[class="ui-button ui-button--background custom-dialog__close"]');

    /**
     * Close it.
     */
    await page.click('div[class="custom-dialog__dialog custom-dialog__dialog--login"] a[class="ui-button ui-button--background custom-dialog__close"]');
    
    /**
     * Wait the main search input to be displayed.
     */
    await page.waitForSelector('input[id="q"]');

    /**
     * Types the gtin in the main input and simulates an "Enter key press" using "\n".
     */
    await page.type('input[id="q"]', data.gtin + '\n', {
        delay: 20
    });

    console.log('At least trying!');
    

    /**
     * Wait the result to be displayed. If there is no result, we return de default result.
     */
    try {
        await page.waitForSelector('ul[id="search-result-items"] li span[class="sale-price"] span', {timeout: data.delay * 10});
    } catch {
        return result;
    }

    /**
     * Wait the drive name to be displayed.
     */
    await page.waitForSelector('nav span[class="store-name"]');
    
    /**
     * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
     * Computes price from HTML Elements and configures result.
     */
    const results = await page.evaluate((result) => {

        if (document.querySelector('ul[id="search-result-items"] li') != null) {
            let stringPrice = document.querySelector('ul[id="search-result-items"] li span[class="sale-price"] span').innerHTML.split(',')[0] + '.' + document.querySelector('ul[id="search-result-items"] li span[class="sale-price"] sup').innerHTML
            result.price = parseFloat(stringPrice);
            result.found = true;
            result.text = 'Product found.';
        }

        result.drive = document.querySelector('nav span[class="store-name"]').innerHTML;
        return result;
    }, result);
    
    return results;
};

/**
 * Search the price at Intermarcge for a given product id and the final user zipcode.
 * CARREFUL : parameters are confusing.
 * @param {Object} page is the new browser page created by the cluster.
 * @param {Object} data contains the usefull parameters (gtin, zipcode).
 * @returns {Object} contains valuable data scrapped using puppeteer.
 */
async function puppeteer_price_intermarche({page, data}) {
    
    /**
     * The default data we send back to the client.
     */  
    let result = {
        price: null,
        drive: '',
        found: false,
        zipcode: data.zipcode,
        retailer: 'Intermarche',
        text: 'Product not found.'
    };
    
    /**
     * Goes to intermarche.com.
     */
    await page.goto('https://www.intermarche.com/');
    
    /**
     * Wait for the welcome popup to be displayed.
     */
    await page.waitForSelector('div[id="didomi-popup"] button[class="didomi-components-button didomi-button didomi-components-button--color didomi-button-highlight"]')
    
    /**
     * Close it.
     */
    await page.click('div[id="didomi-popup"] button[class="didomi-components-button didomi-button didomi-components-button--color didomi-button-highlight"]');
    
    /**
     * Wait for the zipcode input to be loaded.
     */
    await page.waitForSelector('input[id="downshift-0-input"]');

    /**
     * Types the zipcode in the zipcode input and simulates an "Enter key press" using "\n".
     */
    await page.type('input[id="downshift-0-input"]', data.zipcode + '\n', {
        delay: 50
    });
    
    
    /**
     * Wait for the result to be displayed.
     * If there is no result, we return result.
     */
    try {
        await page.waitForSelector('li[id="downshift-0-item-0"]', {timeout: data.delay * 3})
    } catch (error) {
        result.text = 'No store found'
        return result;
    }

    /**
     * Clicks on the first result.
     */
    await page.click('li[id="downshift-0-item-0"]');

    /**
     * In order to request intermarche using gtin, we need the drive ID as well. It's part of the url.
     */
    const driveID = await page.evaluate(() => {
        return window.location.href.split('/')[4];
    });

    /**
     * Search for the product using the drive ID and the gtin.
     */
    await page.goto(`https://intermarche.com/rechercheproduits/${driveID}/recherche/product/${data.gtin}`)
    
    /**
     * Wait the result to be displayed. If there is no result, we return de default result.
     */
    try {
        // ~= for includes at least one occurence
        await page.waitForSelector('.ReactModal__Content span[class~="product-price--integer"]', {timeout: data.delay * 5});
    } catch {
        return result;
    }

   /**
     * Evaluate the page if there is any result. Evaluation allows us to read HTML node values.
     * Computes price from HTML Elements and configures result.
     */
    const results = await page.evaluate((result) => {
        
        if (document.querySelector('.ReactModal__Content .product-price--integer') != null &&
            document.querySelector('.ReactModal__Content .product-price--decimal') != null) {
            let priceUnit = document.querySelector('.ReactModal__Content .product-price--integer').innerHTML;
            let priceDecimal = document.querySelector('.ReactModal__Content .product-price--decimal').innerHTML;
            result.price = parseFloat(priceUnit + "." + priceDecimal);
            result.found = true;
            result.text = 'Product found';
        }
        result.drive = document.querySelector('button[class="sc-gPEVay gEcnxj"]').innerHTML.split("<svg")[0];

        return result;
    }, result)    
    return results;
}

module.exports = {
    puppeteer_imgs,
    puppeteer_price_carrefour,
    puppeteer_price_auchan,
    puppeteer_price_leclerc,
    puppeteer_price_magasinsu,
    puppeteer_price_intermarche
}
