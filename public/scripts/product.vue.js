const app = new Vue({
    el: '#app',
    data: () => {
        return {
            product: null,
            carrefour: null,
            pricesPerZipode: {
                intermarche: null,
                auchan: null,
                magasinsU: null,
                leclerc: null
            },
            userInput: {
                zipcode: null,
                imageClicked: null
            },
            urls: {
                categories: '/categories/',
                brand: '/products/brand/'
            },
            loaders: {
                product: false,
                images: false,
                carrefourPrice: false
            },
            errors: {
                carrefourPrice: false,
                images: false
            },
            reportResponse: null,
            reportIngredientsResponse: null,
            socket: null
        }
    },
    mounted() {
        this.socket = io(socketToConnect.host + ':' + socketToConnect.port);
        const gtin = window.location.pathname.split('/')[2];
        
        if (found == 'true') {

            try {
                this.product = JSON.parse($('#productVariable').text());
                console.log(this.product);

                this.computeCarrefourPrice();
                if (!this.carrefour) {
                    this.socket.emit('getPriceCarrefour', gtin);
                    this.loaders.carrefourPrice = true;
                }

                if (this.product.images.length == 0) {
                    this.socket.emit('getImages', gtin);
                    this.loaders.images = true;
                }
            } catch (error) {
                console.log(error);

            } finally {
                $('#productVariable').remove();
            }
        } else {
            console.log('Product not found');
            this.socket.emit('getOFF', gtin);
            this.loaders.product = true;
            this.socket.emit('getPriceCarrefour', gtin);
            this.loaders.carrefourPrice = true;
            this.socket.emit('getImages', gtin);
            this.loaders.images = true;
        }

        this.socket.on('getOFFResponse', async (data) => {
            if (data) {
                console.log('Product retrieved');

                this.product = data;
                this.loaders.product = false;
            }
        });

        this.socket.on('getGoogleResponse', async (response) => {
            console.log(response);
            this.product = response;
        })

        this.socket.on('reportIngredientsResponse', async (response) => {
            console.log(response);
            this.reportIngredientsResponse = response;
            $('#reportIngredientsResponseModal').modal('show');

        })

        this.socket.on('getPriceCarrefourResponse', async (response) => {

            this.loaders.carrefourPrice = false;

            console.log(response);

            if (response.data.price) {
                this.carrefour = {
                    globalPrice: response.data.price
                }
                this.carrefour.globalPrice = this.carrefour.globalPrice.toLocaleString(
                    'en', {
                    minimumIntegerDigits: 1,
                    minimumFractionDigits: 2,
                    useGrouping: false
                });

            }

            if (response.errors.length > 0) {
                this.errorHandler(response.errors);
            }
        })


        this.socket.on('getImagesResponse', async (response) => {

            this.loaders.images = false;
            if (response.data.images.length > 0) {
                this.product.images = response.data.images;
            }

            if (response.errors.length > 0) {
                this.errorHandler(response.errors);
            }

        });

        this.socket.on('reportImagesResponse', async (response) => {
            console.log(response);

            this.loaders.images = false;

            if (response.data.images.length > 0) {
                this.reportResponse = response.data.images;
                console.log(this.reportResponse);

                $("#reportResponseModal").modal('show');
                console.log($("#reportResponsesModal"));

            }

            if (response.errors.length > 0) {
                this.errorHandler(response.errors);
            }
        });
    },
    methods: {
        computeCarrefourPrice() {
            const carrefour = this.product.retailers.find((retailer) => {
                if (retailer.name == 'Carrefour')
                    return retailer;
            })
            this.carrefour = carrefour;

            if (this.carrefour) {
                this.carrefour.globalPrice = this.carrefour.globalPrice.toLocaleString('en', {
                    minimumIntegerDigits: 1,
                    minimumFractionDigits: 2,
                    useGrouping: false
                });
            }
        },
        submitZipcode(e) {
            console.log(this.userInput.zipcode)
        },
        openImgModal(e) {
            this.userInput.imageClicked = e.srcElement.src;
            $('#productGalery').modal('show');
        },
        errorHandler(errors) {
            for (let i = 0; i < errors.length; i++) {
                const error = errors[i];
                console.log(errors[i]);
                switch (error.origin) {
                    case 'Carrefour':
                        if (error.no == 2) {
                            this.errors.carrefourPrice = true;
                        }
                        break;
                }

            }
        },
        retryCarrefourPrice() {
            this.socket.emit('getPriceCarrefour', this.product.gtin);
            this.loaders.carrefourPrice = true;
            this.errors.carrefourPrice = false;
        },
        reportImages() {
            this.socket.emit('reportImages', this.product.gtin, 1);
            this.loaders.images = true;
            this.errors.images = false;
        },
        saveNewImages() {
            this.product.images = this.reportResponse;
            $("#reportResponseModal").modal('hide');
            this.socket.emit('updateImages', this.product.gtin, this.product.images);
        },
        closeReportResponseModal() {
            this.reportResponse = null;
            $("#reportResponseModal").modal('hide');
        },
        reportIngredients() {
            console.log('reporting');

            this.socket.emit('reportIngredients', this.product.gtin);
        },
        saveNewIngredients() {
            this.product.ingredients = this.reportIngredientsResponse;
            $('#reportIngredientsResponseModal').modal('hide');
            this.socket.emit('updateIngredients', this.product.gtin, this.product.ingredients);
        },
        closeReportIngredientsResponseModal() {
            this.reportIngredientsResponse = null;
            $('#reportIngredientsResponseModal').modal('hide');
        }
    }
});

// const insertPrice = (product) => {
//     if (product.found) {
//         $("#prices").append(
//             `<li><i class="fas fa-store"></i>${product.retailer} <small>(${product.drive} - ${product.zipcode})</small> : ${product.price}€</li>`
//         );
//     } else {
//         $("#prices").append(
//             `<li><i class="fas fa-store"></i>${product.retailer} <small>(${product.drive} - ${product.zipcode})</small> : ${product.text}</li>`
//         );
//     }
// }
// const Product = JSON.parse($('#product').text());
// $('#product').remove();


// let gtin = Product.gtin;
// const socket = io('<%= locals.socket.host %>:<%= locals.socket.port %>', {
//     'forceNew': true
// });

// if (Product.images.length == 0) {
//     socket.emit('getImages', gtin);
// }

// const Carrefour = Product.retailers.find((retailer) => {
//     return retailer.name == 'Carrefour';
// });

// if (!Carrefour) {
//     socket.emit('getPriceCarrefour', gtin);
// } else {
//     $("#carrefourPrice").append(
//         `<li><i class="fas fa-store"></i>${Carrefour.name} : ${Carrefour.globalPrice}€</li>`
//     );
// }

// socket.on('getImagesResponse', async (data) => {
//     console.log(data.images);

//     if (data != null) {
//         for (let i = 0; i < data.images.length; i++) {
//             let img = new Image();
//             img.onload = async () => {
//                 $('#carouselIndicators').append(
//                     `<li data-target="#carousel" data-slide-to="${i}"></li>`);
//                 $('#carouselWrapper').append(`
//                     <div class="carousel-item text-center ${i == 0 ? 'active' : ''}">
//                         <img src="${data.images[i]}" alt="" class="product-img">
//                     </div>
//                 `)
//             }
//             img.src = data.images[i];
//         }
//         $('#imagesCount').html(`(${data.images.length})`)
//     }
// });

// socket.on('getPriceResponse', async (response) => {
//     insertPrice(response)
// })

// socket.on('getPriceLeclercResponse', (response) => {
//     console.log(response);
//     insertPrice(response)
//     // $("#prices").append(
//     //     `<li>${response.data.retailer} <small>(${response.data.drive} - ${response.data.zipcode})</small> : ${response.data.price}€</li>`
//     // );
// });

// socket.on('getPriceMagasinsuResponse', (response) => {
//     console.log(response);
//     insertPrice(response)
//     // $("#prices").append(
//     //     `<li>${response.data.retailer} <small>(${response.data.drive} - ${response.data.zipcode})</small> : ${response.data.price}€</li>`
//     // );
// })

// socket.on('getPriceIntermarcheResponse', (response) => {
//     console.log(response);
//     insertPrice(response);
// })

// socket.on('getPriceCarrefourResponse', (response) => {
//     if (response.found)
//         $("#carrefourPrice").append(
//             `<li><span style="color: #0056b3;"><i class="fas fa-store"></i></span>${response.retailer} : ${response.price}€</li>`
//         );
//     else
//         $("#carrefourPrice").append(
//             `<li><span style="color: #0056b3;"><i class="fas fa-store"></i></span>${response.retailer} : ${response.text}</li>`
//         )
// });

// socket.on('getPriceAuchanResponse', (response) => {
//     console.log(response);
//     insertPrice(response)
// });

// $('#zipcodeForm').on('submit', (e) => {
//     e.preventDefault();
//     e.stopPropagation();

//     if ($('#zipcodeForm')[0].checkValidity() === false) {

//     } else {
//         const cp = $('#zipcodeInput').val();
//         console.log(cp);

//         socket.emit('getPriceAuchan', gtin, cp);
//         socket.emit('getPriceLeclerc', gtin, cp);
//         socket.emit('getPriceMagasinsu', gtin, cp);
//         socket.emit('getPriceIntermarche', gtin, cp);
//     }
//     $('#zipcodeForm')[0].classList.add('was-validated');
// });

// $('.product-img').on('click', (event) => {
//     const image = event.currentTarget.src;
//     console.log(image);
//     $('#productGalery').modal('show')
//     $('#productGaleryImage')[0].src = image;
// });

// $('#closeModal').on('click', () => {
//     $('#productGalery').modal('hide');
// })

// $('.carousel').carousel()