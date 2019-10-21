const puppeteer = require('puppeteer');
module.exports.puppeteer_imgs = async ({
    page,
    data
}) => {  
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
    await page.goto('https://google.com');
    //await page.waitFor(data.delay);
    await page.waitForSelector('input[name="q"]');
    await page.type('input[name="q"]', data.gtin + '\n', {
        delay: 20
    });

    //await page.waitFor(data.delay);

    //await page.waitFor(data.delay);
    try {
        await page.waitForSelector('div[class="pla-ikpd__modal"] div[class="IY0jUb"]', {timeout: data.delay * 5});
    } catch (error) {
        return null;
    }
    let images = await page.evaluate((gtin) => {
        var imagesElement = document.querySelector('div[class="pla-ikpd__modal"] div[class="IY0jUb"]');

        if (imagesElement == null)
            return null;
        else
            return imagesElement.innerHTML;
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
    }, data.gtin);


    // If we have found images, we return them
    if (images != null) {
        images = images.split('>');

        for (let i = 0; i < images.length; i++) {
            images[i] = images[i].split('src="')[1];
            if (images[i] != null)
                images[i] = images[i].split('"')[0]

        }
        return images.filter(function (el) {
            return el != null;
        });

    }

    // Else, we continue scrapping by checking if carrefour got the images
    await page.goto('https://images.google.com/');
    await page.waitFor(data.delay);
}

module.exports.puppeteer_price_carrefour = async ({
    page,
    data
}) => {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
    await page.goto('https://www.google.fr/');
    //await page.waitFor(data.delay)
    await page.waitForSelector('input[name="q"]');
    // \n to simulate an enter key press
    await page.type('input[name="q"]', data.gtin + '\n', {
        delay: 20
    })
    //await page.waitFor(data.delay)
    try {
        await page.waitForSelector('div[id="search"] div[class="g"] div[class="slp f"]', {timeout: data.delay * 5});
    } catch (error) {
        return null;
    }
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

    return price;
}

module.exports.puppeteer_price_auchan = async ({ page, data }) => {

    await page.setViewport({
        width: 1920,
        height: 1080
    })
    let result = {
        price: null,
        drive: '',
        local_id: null,
        found: false,
        zipcode: data.zipcode,
        text: 'Poduct not available',
        retailer: 'Auchan'
    };

    await page.setExtraHTTPHeaders({
        'Cookie': '_cs_c=1; _cs_id=4889ec48-b2b4-a340-f84f-793bd6e2d5e4.1568727496.9.1569211224.1569211207.1.1602891496790; AuchanAPI=1; AuchanFR.searchHistory=W3sibGFiZWwiOiJudXRlbGxhIiwidXJsIjoiL3JlY2hlcmNoZT90ZXh0PW51dGVsbGEiLCJwaWN0dXJlIjpudWxsfSx7ImxhYmVsIjoiMzAxNzYyMDQyNTAzNSIsInVybCI6Ii9yZWNoZXJjaGU/dGV4dD0zMDE3NjIwNDI1MDM1IiwicGljdHVyZSI6bnVsbH1d; auchan.hamon=1; auchan.consentCookie=3; t2s-p=6ca94952-4aea-417f-95a8-b21337bb2ba2; _gcl_au=1.1.1907335488.1568727500; lark-b2cd=1; lark-consent=3; lark-cart=24cbb06c-d525-4af8-a5c5-891c849c24ac; JSESSIONID=CE1C7AFCB5F4EFF8CD28EF0F97BDEDBE-n2; LB=wasfo04; mediaRulesAB=none; htk_auchan_fr_visit=887z8927m2pg; htk_auchan_fr_first_visits=0001000000; AuchanFR.crossSell=6ca94952-4aea-417f-95a8-b21337bb2ba2; gtmEnvironnement=Web; connect.sid=s%3AFC_koDuYlY2IJT9H13BaoRxa786DGzyb.Z5yV5RGNuJLos9OMjfh4wGYJsbVHN%2F%2B%2B9jXzuW1JFtU; gtmUserAgent=true; _cs_s=3.0; disabledAuthCheck=true'
    })
    await page.goto('https://www.auchan.fr/recherche?text=' + data.gtin);
    //await page.waitFor(data.delay);
    try {
        await page.waitForSelector('div[class="product-thumbnail__wrapper"] a', {timeout: data.delay * 5});
    } catch (error) {
        return result;
    }
    const auchanID = await page.evaluate(() => {
        if (document.querySelector('div[class="product-thumbnail__wrapper"] a') != null) {
            var link = document.querySelector('div[class="product-thumbnail__wrapper"] a').href;
            return link.split('/p-')[1];
        } else {
            return null;
        }
    })

    if (auchanID == null) {

        return result;
    }

    result.local_id = auchanID

    // Auchan divides its drive searchs in two ways :
    //  - on auchandrive.fr (for regular Auchan)
    //  - on auchan.fr      (for My Auchan)
    let isNewVersion = false;


    await page.goto('https://www.auchandrive.fr/');
    //await page.waitFor(data.delay);
    await page.waitForSelector('input[id="queryinput"]')
    await page.type('input[id="queryinput"]', data.zipcode, {
        delay: 20
    })
    await page.click('button[id="update"]');
    await page.waitForSelector('a[class="storelocator__storelink-container"]');
    await page.click('a[class="storelocator__storelink-container"]');

    await page.waitForSelector('input[id="search-input"], form[id="search"] input')

    
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
            result.text = 'Something went wrong. Please try again.'
            return result;
        }
    }
    //await page.click('button[class="icon-search search-submit"]');
    await page.waitFor(data.delay * 2);

    if (isNewVersion) {
        await page.click('article div[class="product-thumbnail__wrapper"] a');
        await page.waitFor(data.delay);
    }

    const results = await page.evaluate((auchanID, isNewVersion, zipcode) => {
        let data = {
            price: 'Product localy not found',
            drive: null,
            local_id: auchanID,
            found: false,
            zipcode: zipcode
        };

        if (isNewVersion) {
            if (document.querySelector('span[class="product-price__unit"]') != null && document.querySelector('span[class="product-price__cents"]') != null) {
                let stringPrice = document.querySelector('span[class="product-price__unit"]').innerHTML + '.' + document.querySelector('span[class="product-price__cents"]').innerHTML;
                data.price = parseFloat(stringPrice);
                data.found = true;
            }
            data.drive = document.querySelector('div[class="journey__context-address"]').innerHTML.replace(/\\n/gi, '').trim();
        } else {

            if (document.querySelector('p[class="price-standard"] span[class="price-standard__decimal"]') != null &&
                document.querySelector('p[class="price-standard"] span[class="price-standard__cents"]') != null) {
                let stringPrice = document.querySelector('p[class="price-standard"] span[class="price-standard__decimal"]').innerHTML + document.querySelector('p[class="price-standard"] span[class="price-standard__cents"]').innerHTML;
                let priceToNumber = stringPrice.split(',');
                data.price = parseFloat(priceToNumber[0] + '.' + priceToNumber[1]);
                data.found = true;
            }
            data.drive = document.querySelector('div[class="header__identity-pointOfService"] em').innerHTML.replace(/\\n/gi, '').trim();
        }

        return data;
    }, auchanID, isNewVersion, data.zipcode);

    return results;
};

module.exports.puppeteer_price_leclerc = async ({ page, data }) => {
    // Leclerc is special.
    // There is absolutly no connection between gtin and product.
    // So we have to search with the product name and the quantity ........

    // With the gtin, we check on https://leclerc.fr/rechercher?q=gtin in order to get the right name
    
    await page.setViewport({
        width: 1920,
        height: 1080
    });

    let result = {
        price: null,
        drive: '',
        found: false,
        zipcode: data.zipcode,
        retailer: 'Leclerc',
        text: 'Product not found'
    };

    await page.goto('https://www.recherche.leclerc/recherche?q=' + data.gtin);
    
    try {
        await page.waitForSelector('div[id="conteneur_produits"]', {timeout: data.delay * 5});
    } catch (error) {
        return result;
    }
    
    const fullName = await page.evaluate(() => {
        if (document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] h1') != null &&
            document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] p') != null) {
            let firstLabel = document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] h1').innerHTML.trim();
            let secondLabel = document.querySelector('div[id="conteneur_produits"] div[class="div_descriptif_produit"] p').innerHTML.trim();
            return (firstLabel + ' ' + secondLabel).trim();
        }

        return null;
    });

    if (fullName == null) {
        return result;
    }


    await page.goto('https://www.leclercdrive.fr/', {waitUntil: "networkidle0"});
    //await page.waitFor(data.delay);
    await page.waitForSelector('input[id="txtWPAD344_RechercheDrive"]')

    await page.type('input[id="txtWPAD344_RechercheDrive"]', data.zipcode + '\n', {
        delay: 20
    });

    await page.waitForSelector('div[id="divWPAD025_ResultatVilles"] a');
    await page.click('div[id="divWPAD025_ResultatVilles"] a');

    await page.waitFor('#divWPAD337_GoogleMaps > div > div > div:nth-child(1) > div:nth-child(3) > div > div:nth-child(3) > div');

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


    await page.waitForSelector('div[class="popinPRPL-choix"] a');
    await page.click('div[class="popinPRPL-choix"] a');
    // await page.waitFor(data.delay);
    await page.waitForSelector('input[id="inputWRSL301_rechercheTexte"]');
    await page.type('input[id="inputWRSL301_rechercheTexte"]', fullName + '\n', {
        delay: 20
    });

    await page.waitForSelector('ul[id="ulListeProduits"] li');
    await page.waitForSelector('a[id="aWCSD333_PL"]');    

    const results = await page.evaluate((result, fullName) => {

        result.drive = document.querySelector('a[id="aWCSD333_PL"]').innerHTML.trim();

        let products = document.querySelectorAll('ul[id="ulListeProduits"] li');


        for (let i = 0; i < products.length; i++) {
            let productName = products[i].querySelector('p[class="pWCRS310_Desc"] a[class="aWCRS310_Product"]').innerHTML.split('<br>');
            let finalName = productName[0].trim() + ' ' + productName[1].trim();

            if (finalName == fullName) {
                // remplir data avec : 
                //  - le prix
                //  - le drive
                result.price = parseFloat(products[i].querySelector('p[class="pWCRS310_PrixUnitaire"]').innerHTML.replace('€', '').trim());
                result.found = true;
                result.text = 'Product found';
                return result;
            }
        }

        return result;
    }, result, fullName);

    console.log(results);
    return results;
};

module.exports.puppeteer_price_magasinsu = async ({ page, data }) => {
    await page.setViewport({
        width: 1920,
        height: 1080
    });

    let result = {
        price: null,
        drive: '',
        found: false,
        zipcode: data.zipcode,
        retailer: 'Magasins-U',
        text: 'Product not available'
    };

    await page.goto('https://www.coursesu.com/drive/home');
    // await page.waitFor(data.delay);
    await page.waitForSelector('input[id="store-search"]');
    await page.type('input[id="store-search"]', data.zipcode, {
        delay: 20
    });
    
    await page.waitForSelector('p[class="search-suggestion"]');
    await page.waitFor(data.delay);
    await page.click('p[class="search-suggestion"] span');
    // await page.waitFor(data.delay);
    await page.waitForSelector('ul[id="quick-content"] a[class="button accent-button choose"]');
    await page.click('ul[id="quick-content"] a[class="button accent-button choose"]');
    // await page.waitFor(data.delay);
    await page.waitForSelector('div[class="custom-dialog__dialog custom-dialog__dialog--login"] a[class="ui-button ui-button--background custom-dialog__close"]');
    await page.click('div[class="custom-dialog__dialog custom-dialog__dialog--login"] a[class="ui-button ui-button--background custom-dialog__close"]');
    // await page.waitFor(data.delay);
    await page.waitForSelector('input[id="q"]');
    await page.type('input[id="q"]', data.gtin + '\n', {
        delay: 20
    });

    
    // await page.waitFor(data.delay);

    await page.waitForSelector('ul[id="search-result-items"] li span[class="sale-price"] span');
    await page.waitForSelector('nav span[class="store-name"]');

    console.log('u - ok for select');


    const results = await page.evaluate((result) => {
        // let data = {
        //     price: 'Product not available',
        //     drive: '-',
        //     found: false,
        //     zipcode: zipcode,
        //     retailer: 'Magasins-U'
        // };

        if (document.querySelector('ul[id="search-result-items"] li') != null) {
            let stringPrice = document.querySelector('ul[id="search-result-items"] li span[class="sale-price"] span').innerHTML.split(',')[0] + '.' + document.querySelector('ul[id="search-result-items"] li span[class="sale-price"] sup').innerHTML
            result.price = parseFloat(stringPrice);
            result.found = true;
            result.text = 'Product found';
        }

        result.drive = document.querySelector('nav span[class="store-name"]').innerHTML;
        return result;
    }, result);
    
    return results;
};

module.exports.puppeteer_price_intermarche = async ({ page, data }) => {
    await page.setViewport({
        width: 1920,
        height: 1080
    });

    let result = {
        price: null,
        drive: '',
        found: false,
        zipcode: data.zipcode,
        retailer: 'Intermarche',
        text: 'Product not available'
    };
    
    await page.goto('https://www.intermarche.com/');
    // await page.waitFor(data.delay);
    await page.waitForSelector('div[id="didomi-popup"] button[class="didomi-components-button didomi-button didomi-components-button--color didomi-button-highlight"]')
    await page.click('div[id="didomi-popup"] button[class="didomi-components-button didomi-button didomi-components-button--color didomi-button-highlight"]');
    // await page.waitFor(data.delay);
    await page.waitForSelector('input[id="downshift-0-input"]');
    await page.type('input[id="downshift-0-input"]', data.zipcode + '\n', {
        delay: 50
    });
    // await page.waitFor(data.delay);
    
    try {
        await page.waitForSelector('li[id="downshift-0-item-0"]', {timeout: data.delay * 3})
    } catch (error) {
        result.text = 'No store found'
        return result;
    }
    await page.click('li[id="downshift-0-item-0"]');
    await page.waitFor(data.delay);

    const driveID = await page.evaluate(() => {
        return window.location.href.split('/')[4];
    });

    await page.goto(`https://intermarche.com/rechercheproduits/${driveID}/recherche/product/${data.gtin}`)

    await page.waitFor(data.delay * 1.5);
    
    // ~= for includes at least one occurence
    await page.waitForSelector('.ReactModal__Content span[class~="product-price--integer"]');
    await page.waitForSelector('button[class="sc-gPEVay gEcnxj"]');

    console.log('inter select ok');


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
    console.log(results);
    
    return results;
}