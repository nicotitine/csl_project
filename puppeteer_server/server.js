const app = require('express')();
const port = process.env.PUPPETEER_PORT;
const http = require('http').createServer(app);
const puppeteer = require('puppeteer');
const randomUseragent = require('random-useragent');
const IS_HEADLESS = true;
const PUPPETEER_BROWSER_OPTS = {
    headless: false,
    args: ['--disable-dev-shm-usage']
}

// add recaptcha plugin and provide it your 2captcha token
// 2captcha is the builtin solution provider but others work as well.s

app.use(require('express-status-monitor')());

process.on('warning', e => console.warn(e.stack))

app.get('/:gtin/imgs', async (req, res) => {
    const imgs = await puppeteer_imgs(req.params.gtin);
    console.log(imgs, req.params.gtin);

    res.set('Content-Type', 'application/json');
    res.send(imgs);
})

app.get('/:gtin/price/carrefour', async (req, res) => {
    const price = await puppeteer_carrefour_price(req.params.gtin);

    console.log(price);

    res.set('Content-Type', 'application/json');
    res.status(200).send({
        price: price,
        retailer: 'Carrefour'
    });
});

app.get('/:gtin/price/auchan/:zipcode', async (req, res) => {
    const data = await puppeteer_auchan_price(req.params.gtin, req.params.zipcode);

    console.log(data);

    res.set('Content-Type', 'application/json');
    res.status(200).send({
        price: data.price,
        drive: data.drive,
        retailer: 'Auchan',
        zipcode: req.params.zipcode
    });
})

app.get('/:gtin/price/leclerc/:zipcode', async (req, res) => {
    const data = await puppeteer_leclerc_price(req.params.gtin, req.params.zipcode);

    console.log(data);
    res.set('Content-Type', 'application/json');
    res.status(200).send({
        price: data.price,
        drive: data.drive,
        retailer: 'Leclerc',
        zipcode: req.params.zipcode
    });
    
})

app.get('/:gtin/carrefour', async (req, res) => {
    const browser = await puppeteer.launch(PUPPETEER_BROWSER_OPTS);
    results = [];

    results.push({
        'retailer': 'Carrefour',
        'data': await puppeteer_carrefour(req.params.gtin, browser)
    }, {
        retailer: 'Auchan',
        'data': await puppeteer_auchan(req.params.gtin, browser, '64000')
    });

    console.log('Done with loop !\n', results);


    //browser.close();


    res.set('Content-Type', 'application/json');
    res.send(results);
});

http.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});


async function puppeteer_carrefour(gtin, browser) {
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
        await page.goto('https://www.google.fr/');
        await page.waitFor(250)

        // \n to simulate an enter key press
        await page.type('input[name="q"]', gtin + '\n', {
            delay: 20
        })

        const imagesPage = await browser.newPage();
        await imagesPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
        await imagesPage.goto('https://images.google.com');
        await imagesPage.waitFor(250);
        await imagesPage.type('input[name="q"]', gtin + ' carrefour\n', {
            delay: 20
        });
        await imagesPage.waitFor(500);

        const price = await page.evaluate(() => {

            // Get price value in the main search page
            let stringPrice = document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]').innerHTML.split('€')[0].trim();
            let priceToNumber = stringPrice.split(',');
            return parseFloat(priceToNumber[0] + '.' + priceToNumber[1]);
            // Go to Google images
            document.querySelectorAll('div[role="navigation"] div[role="tab"] a')[2].click();

            console.log(price);



            let divs = document.querySelectorAll('div[jscontroller="Q7Rsec"]');
            console.log(divs.length);

            let keepDivs = [];
            let data = {};
            data.price = price;
            data.images = [];
            for (var i = 0; i < divs.length; i++) {
                if (divs[i].querySelector('div[class="nJGrxf FnqxG"] span').innerHTML == "carrefour.fr") {
                    divs[i].querySelector('a').click();
                    if (divs[i].querySelector('span[class="cdCElc"]') != undefined) {
                        data.price = price;
                        let src = divs[i].querySelector('a').href;
                        let params = src.split('&')
                        let finalSrc = params[0].split('=')[1].replace(/%3A/gi, ':').replace(/%2F/gi, '/')
                        console.log(finalSrc);

                        data.images.push(finalSrc.substring(0, finalSrc.indexOf('%')));
                    }
                }
            }
            console.log(data);

            return data;
        });

        await imagesPage.waitFor(500);

        const images = await imagesPage.evaluate((gtin) => {
            let divs = document.querySelectorAll('div[jscontroller="Q7Rsec"]');
            console.log(divs.length);

            let keepDivs = [];
            let data = {};

            data.images = [];
            for (var i = 0; i < divs.length; i++) {
                if (divs[i].querySelector('div[class="nJGrxf FnqxG"] span').innerHTML.includes("carrefour.fr")) {
                    let src = divs[i].querySelector('a').href;
                    divs[i].querySelector('a').click();

                    let params = src.split('&')
                    let finalSrc = params[0].split('=')[1].replace(/%3A/gi, ':').replace(/%2F/gi, '/')
                    finalSrc = finalSrc.substring(0, finalSrc.indexOf('%'));

                    if (finalSrc.includes(gtin)) {
                        data.images.push(finalSrc);
                    }
                }
            }
            return data.images;
        }, gtin)



        // results.forEach((result) => {
        //     console.log(result);

        // })
        // await page.setExtraHTTPHeaders({
        //     'Cookie': 'datadome=T~lwNypOmi_dNmj1vrypRN4iuINAZ7TY3BEfBmdz59ot-y.HcEDQA-OyNqNyc1oMgyRSV8BZlxkG6u0WmySAOv5hCOWooUYrN~8cHR4DjX; Path=/; Domain=.carrefour.fr; Expires=Tue, 22-Sep-2020 02:05:10 GMT; Max-Age=31536000'
        // })
        //await page.on('load', () => console.log("Loaded: " + page.url()));
        // await page.goto('https://www.carrefour.fr/s?q=' + gtin, {waitUntil: 'networkidle0'});
        // console.log(page);
        // await page.waitFor(1000);


        //await page.waitForFunction('document.readyState == "complete"')
        //await page.waitForFunction('window.status === "ready"')

        //await page.waitFor('networkidle0')
        //await page.waitForResponse(response => response.ok())
        //await page.waitForSelector('article');
        // await page.click('body main #products section .product-list > ul article .ds-product-card--vertical-infos a');

        // await page.waitFor(1000);

        // const result = await page.evaluate(() => {
        //     let price = document.querySelector('body main .pdp__wrapper .pdp__main .main-details .main-details__wrap .main-details__right .main-details__pricing .product-card-price__price--final').innerHTML.replace('\n', '').trim();
        //     let price_kg = document.querySelector('body main .pdp__wrapper .pdp__main .main-details .main-details__wrap .main-details__right .main-details__pricing-left > .ds-body-text').innerHTML.replace('\n', '').trim();
        //     let images = window.ONECF_INITIAL_STATE.search.data.attributes.images;

        //     let finalImages = [];

        //     images.forEach((image) => {
        //         finalImages.push('https://carrefour.fr' + image.largest)
        //     });

        //     return {
        //         price,
        //         price_kg,
        //         'images': finalImages
        //     };
        // })

        var data = {
            price: price,
            images: images
        }

        return data;

        // const result = await page.evaluate((gtin) => {
        //     let title = document.querySelector('body main #products section .product-list > ul article .ds-product-card--vertical-infos a').innerHTML
        //     console.log(title);

        //     return { title }
        // });
        // console.log(result);

    } catch (err) {
        console.log(err);
    }

}

async function puppeteer_imgs(gtin) {
    const browser = await puppeteer.launch(PUPPETEER_BROWSER_OPTS);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
    await page.goto('https://images.google.com');
    await page.waitFor(500);
    await page.type('input[name="q"]', gtin + ' carrefour\n', {
        delay: 20
    });
    await page.waitFor(1000);

    const images = await page.evaluate((gtin) => {
        let divs = document.querySelectorAll('div[jscontroller="Q7Rsec"]');
        console.log(divs.length);
        let data = {};

        data.images = [];
        for (var i = 0; i < divs.length; i++) {
            if (divs[i].querySelector('div[class="nJGrxf FnqxG"] span').innerHTML.includes("carrefour.fr")) {
                let src = divs[i].querySelector('a').href;
                divs[i].querySelector('a').click();
                console.log(src);

                let params = src.split('&')
                let finalSrc = params[0].split('=')[1].replace(/%3A/gi, ':').replace(/%2F/gi, '/')
                finalSrc = finalSrc.substring(0, finalSrc.indexOf('%'));
                console.log(finalSrc);

                if (finalSrc.includes(gtin)) {
                    data.images.push(finalSrc);
                }
            }
        }
        return data.images;
    }, gtin)

    browser.close();
    return images;
}

async function puppeteer_carrefour_price(gtin) {
    const browser = await puppeteer.launch(PUPPETEER_BROWSER_OPTS);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
    await page.goto('https://www.google.fr/');
    await page.waitFor(250)

    // \n to simulate an enter key press
    await page.type('input[name="q"]', gtin + ' carrefour\n', {
        delay: 20
    })
    await page.waitFor(500)
    const price = await page.evaluate(() => {
        console.log(document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]'));

        if (document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]') != null) {
            // Get price value in the main search page
            let stringPrice = document.querySelector('div[id="search"] div[class="g"] div[class="slp f"]').innerHTML.split('€')[0].trim();
            let priceToNumber = stringPrice.split(',');
            return parseFloat(priceToNumber[0] + '.' + priceToNumber[1]);
        }
        return null;
    });

    browser.close();
    return price;
}

async function puppeteer_auchan_price(gtin, zipcode) {
    const browser = await puppeteer.launch(PUPPETEER_BROWSER_OPTS);
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080
    })
    let data = {
        price: 'Product not available',
        drive: '-',
        local_id: null
    };

    await page.setExtraHTTPHeaders({
        'Cookie': '_cs_c=1; _cs_id=4889ec48-b2b4-a340-f84f-793bd6e2d5e4.1568727496.9.1569211224.1569211207.1.1602891496790; AuchanAPI=1; AuchanFR.searchHistory=W3sibGFiZWwiOiJudXRlbGxhIiwidXJsIjoiL3JlY2hlcmNoZT90ZXh0PW51dGVsbGEiLCJwaWN0dXJlIjpudWxsfSx7ImxhYmVsIjoiMzAxNzYyMDQyNTAzNSIsInVybCI6Ii9yZWNoZXJjaGU/dGV4dD0zMDE3NjIwNDI1MDM1IiwicGljdHVyZSI6bnVsbH1d; auchan.hamon=1; auchan.consentCookie=3; t2s-p=6ca94952-4aea-417f-95a8-b21337bb2ba2; _gcl_au=1.1.1907335488.1568727500; lark-b2cd=1; lark-consent=3; lark-cart=24cbb06c-d525-4af8-a5c5-891c849c24ac; JSESSIONID=CE1C7AFCB5F4EFF8CD28EF0F97BDEDBE-n2; LB=wasfo04; mediaRulesAB=none; htk_auchan_fr_visit=887z8927m2pg; htk_auchan_fr_first_visits=0001000000; AuchanFR.crossSell=6ca94952-4aea-417f-95a8-b21337bb2ba2; gtmEnvironnement=Web; connect.sid=s%3AFC_koDuYlY2IJT9H13BaoRxa786DGzyb.Z5yV5RGNuJLos9OMjfh4wGYJsbVHN%2F%2B%2B9jXzuW1JFtU; gtmUserAgent=true; _cs_s=3.0; disabledAuthCheck=true'
    })
    await page.goto('https://www.auchan.fr/recherche?text=' + gtin);
    await page.waitFor(250);
    const auchanID = await page.evaluate(() => {
        if (document.querySelector('div[class="product-thumbnail__wrapper"] a') != null) {
            var link = document.querySelector('div[class="product-thumbnail__wrapper"] a').href;
            return link.split('/p-')[1];
        } else {
            return null;
        }
    })

    if (auchanID == null) {
        return data;
    }

    data.local_id = auchanID

    // Auchan divides its drive searchs in two ways :
    //  - on auchandrive.fr
    //  - on auchan.fr
    let isNewVersion = false;

    await page.goto('https://www.auchandrive.fr/');
    await page.waitFor(250);
    await page.type('input[id="queryinput"]', zipcode, {
        delay: 20
    })
    await page.click('button[id="update"]');
    await page.waitFor(750);
    await page.click('a[class="storelocator__storelink-container"]');
    await page.waitFor(750);
    try {
        // if this fails, we will try it the other way, on auchan.fr
        await page.type('input[id="search-input"]', auchanID + '\n', {
            delay: 20
        });
    } catch (error) {
        try {
            await page.type('form[id="search"] input', auchanID + '\n', {
                delay: 20
            });
            isNewVersion = true;
        } catch (err) {
            console.log(err, error);
        }
    }
    //await page.click('button[class="icon-search search-submit"]');
    await page.waitFor(1000);

    if (isNewVersion) {
        await page.click('article div[class="product-thumbnail__wrapper"] a');
        await page.waitFor(1000);
    }

    const results = await page.evaluate((auchanID, isNewVersion) => {
        let data = {
            price: 'Product localy not found',
            drive: null,
            local_id: auchanID
        };

        if (isNewVersion) {
            if (document.querySelector('span[class="product-price__unit"]') != null && document.querySelector('span[class="product-price__cents"]') != null) {
                let stringPrice = document.querySelector('span[class="product-price__unit"]').innerHTML + '.' + document.querySelector('span[class="product-price__cents"]').innerHTML;
                data.price = parseFloat(stringPrice);
                data.drive = document.querySelector('div[class="journey__context-address"]').innerHTML.replace(/\\n/gi, '').trim();
            }
        } else {

            if (document.querySelector('p[class="price-standard"] span[class="price-standard__decimal"]') != null &&
                document.querySelector('p[class="price-standard"] span[class="price-standard__cents"]') != null) {
                let stringPrice = document.querySelector('p[class="price-standard"] span[class="price-standard__decimal"]').innerHTML + document.querySelector('p[class="price-standard"] span[class="price-standard__cents"]').innerHTML;
                let priceToNumber = stringPrice.split(',');
                data.price = parseFloat(priceToNumber[0] + '.' + priceToNumber[1]);
                data.drive = document.querySelector('div[class="header__identity-pointOfService"] em').innerHTML.replace(/\\n/gi, '').trim();
            }
        }

        return data;
    }, auchanID, isNewVersion);

    browser.close();
    return results;
}

async function puppeteer_leclerc_price(gtin, zipcode) {
    // Leclerc is special.
    // There is absolutly no connection between gtin and product.
    // So we have to search with the product name and the quantity ........

    // With the gtin, we check on https://leclerc.fr/rechercher?q=gtin in order to get the right name
    const browser = await puppeteer.launch(PUPPETEER_BROWSER_OPTS);
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080
    });

    let data = {
        price: 'Product not available',
        drive: '-',
    };


    await page.goto('https://www.recherche.leclerc/recherche?q=' + gtin);
    await page.waitFor(1000);

    const fullName = await page.evaluate(() => {
        let firstLabel = document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] h1').innerHTML.trim();
        let secondLabel = document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] p').innerHTML.trim();

        return (firstLabel + ' ' + secondLabel).trim();
    });


    await page.goto('https://www.leclercdrive.fr/');
    await page.waitFor(1000);
    await page.type('input[id="txtWPAD344_RechercheDrive"]', zipcode + '\n', {delay: 20});
    await page.waitFor(1000);
    await page.click('a[data-type="prediction"]');
    await page.waitFor(1000);
    await page.click('div[class="popinPRPL-choix"] a');
    await page.waitFor(1000);
    await page.type('input[id="inputWRSL301_rechercheTexte"]', fullName + '\n', {delay: 20});
    await page.waitFor(1000);

    const result = await page.evaluate((fullName) => {
        let data = {
            price: 'Product not available',
            drive: '-',
        };

        data.drive = document.querySelector('a[id="aWCSD333_PL"]').innerHTML.trim();

        let products = document.querySelectorAll('ul[id="ulListeProduits"] li[class="liWCRS310_Product     "]');
        
        for(let i = 0; i < products.length; i++) {
            let productName = products[i].querySelector('p[class="pWCRS310_Desc"] a[class="aWCRS310_Product"]').innerHTML.split('<br>');
            let finalName = productName[0].trim() + ' ' + productName[1].trim();
            console.log(finalName);
            console.log(fullName);
            console.log(finalName == fullName);
            
            if(finalName == fullName) {
                // remplir data avec : 
                //  - le prix
                //  - le drive
                data.price = parseFloat(products[i].querySelector('p[class="pWCRS310_PrixUnitaire"]').innerHTML.replace('€', '').trim());

                return data;
            }

            return data;
            
        }
    }, fullName);

    console.log(result);
    return result;
}

async function puppeteer_auchan(gtin, browser, zipcode) {
    // For AUCHAN checking
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        'Cookie': '_cs_c=1; _cs_id=4889ec48-b2b4-a340-f84f-793bd6e2d5e4.1568727496.9.1569211224.1569211207.1.1602891496790; AuchanAPI=1; AuchanFR.searchHistory=W3sibGFiZWwiOiJudXRlbGxhIiwidXJsIjoiL3JlY2hlcmNoZT90ZXh0PW51dGVsbGEiLCJwaWN0dXJlIjpudWxsfSx7ImxhYmVsIjoiMzAxNzYyMDQyNTAzNSIsInVybCI6Ii9yZWNoZXJjaGU/dGV4dD0zMDE3NjIwNDI1MDM1IiwicGljdHVyZSI6bnVsbH1d; auchan.hamon=1; auchan.consentCookie=3; t2s-p=6ca94952-4aea-417f-95a8-b21337bb2ba2; _gcl_au=1.1.1907335488.1568727500; lark-b2cd=1; lark-consent=3; lark-cart=24cbb06c-d525-4af8-a5c5-891c849c24ac; JSESSIONID=CE1C7AFCB5F4EFF8CD28EF0F97BDEDBE-n2; LB=wasfo04; mediaRulesAB=none; htk_auchan_fr_visit=887z8927m2pg; htk_auchan_fr_first_visits=0001000000; AuchanFR.crossSell=6ca94952-4aea-417f-95a8-b21337bb2ba2; gtmEnvironnement=Web; connect.sid=s%3AFC_koDuYlY2IJT9H13BaoRxa786DGzyb.Z5yV5RGNuJLos9OMjfh4wGYJsbVHN%2F%2B%2B9jXzuW1JFtU; gtmUserAgent=true; _cs_s=3.0; disabledAuthCheck=true'
    })
    await page.goto('https://www.auchan.fr/recherche?text=' + gtin);
    await page.waitFor(250);
    const auchanID = await page.evaluate(() => {
        if (document.querySelector('div[class="product-thumbnail__wrapper"] a') != null) {
            var link = document.querySelector('div[class="product-thumbnail__wrapper"] a').href;
            return link.split('/p-')[1];
        } else {
            return null;
        }
    })

    if (auchanID == null) {
        return "Product not found";
    }

    await page.goto('https://www.auchandrive.fr/');
    await page.waitFor(250);
    await page.type('input[id="queryinput"', zipcode, {
        delay: 20
    })
    await page.click('button[id="update"]');
    await page.waitFor(500);
    await page.click('a[class="storelocator__storelink-container"]');
    await page.waitFor(250);
    await page.type('input[id="search-input"]', auchanID + '\n', {
        delay: 20
    });
    //await page.click('button[class="icon-search search-submit"]');
    await page.waitFor(500);
    const results = await page.evaluate((zipcode) => {
        let data = {};
        try {
            data.price = document.querySelector('p[class="price-standard"] span[class="price-standard__decimal"]').innerHTML + document.querySelector('p[class="price-standard"] span[class="price-standard__cents"]').innerHTML + document.querySelector('p[class="price-standard"] span[class="price-standard__currency"]').innerHTML;
            data.available = true;
        } catch (err) {
            data.price = "product unavailable";
            data.available = false;
        } finally {
            data.drive = document.querySelector('div[class="header__identity-pointOfService"] em').innerHTML;
            data.zipcode = zipcode;
        }

        return data;
    }, zipcode);

    return results;

}