const app = require('express')();
const port = process.env.PUPPETEER_PORT;
const http = require('http').createServer(app);
const puppeteer = require('puppeteer')

app.get('/:gtin/:retailers', async (req, res) => {
    var retailers = req.params.retailers.split(',');
    const browser = await puppeteer.launch({
        headless: false
    });

    for (var i = 0; i < retailers.length; i++) {
        let retailer = retailers[i];
        results = [];
        switch (retailer) {
            case 'Carrefour':
                results.push({
                    'retailer': retailer,
                    'data': await puppeteer_carrefour(req.params.gtin, browser)
                });
                break;
        }
    }

    console.log('Done with loop ?', results);


    browser.close();
    res.set('Content-Type', 'application/json');
    res.send(results);
});

http.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

async function puppeteer_carrefour(gtin, browser) {
    try {
        const page = await browser.newPage();
        await page.goto('https://www.carrefour.fr/s?q=' + gtin, {
            waitUntil: 'networkidle0'
        });
        //await page.waitForResponse(response => response.ok())

        await page.click('body main #products section .product-list > ul article .ds-product-card--vertical-infos a');
        await page.waitFor('body')
        const result = await page.evaluate(() => {
            let price = document.querySelector('body main .pdp__wrapper .pdp__main .main-details .main-details__wrap .main-details__right .main-details__pricing .product-card-price__price--final').innerHTML.replace('\n', '').trim();
            let price_kg = document.querySelector('body main .pdp__wrapper .pdp__main .main-details .main-details__wrap .main-details__right .main-details__pricing-left > .ds-body-text').innerHTML.replace('\n', '').trim();
            let images = window.ONECF_INITIAL_STATE.search.data.attributes.images;

            let finalImages = [];

            images.forEach((image) => {
                finalImages.push('https://carrefour.fr' + image.largest)
            });

            return {
                price,
                price_kg,
                'images': finalImages
            };
        })

        console.log(result);
        return result;

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