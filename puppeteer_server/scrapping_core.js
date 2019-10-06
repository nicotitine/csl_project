module.exports.puppeteer_imgs = async ({
    page,
    data
}) => {

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
    await page.goto('https://google.com');
    await page.waitFor(500);
    await page.type('input[name="q"]', data.gtin + '\n', {
        delay: 20
    });

    await page.waitFor(1000);

    await page.waitFor(1000);

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

    if (images != null) {
        images = images.split('>');

        for (let i = 0; i < images.length; i++) {
            images[i] = images[i].split('src="')[1];
            if (images[i] != null)
                images[i] = images[i].split('"')[0]

        }
        return images.filter(function (el) {
            return el != null;
        });;
    }
}

module.exports.puppeteer_price_carrefour = async ({
    page,
    data
}) => {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0');
    await page.goto('https://www.google.fr/');
    await page.waitFor(250)
    console.log('price ?');

    // \n to simulate an enter key press
    await page.type('input[name="q"]', data.gtin + '\n', {
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

    return price;
}