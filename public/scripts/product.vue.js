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
            socket: null,
            prices: []
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
                // if (!this.carrefour) {
                //     this.socket.emit('getPriceCarrefour', gtin);
                //     this.loaders.carrefourPrice = true;
                // }

                
            } catch (error) {
                console.log(error);

            } finally {
                $('#productVariable').remove();
            }
        } else {
            console.log('Product not found');
            this.socket.emit('getOFF', gtin);
            this.loaders.product = true;
            
            this.loaders.carrefourPrice = true;
            
            this.loaders.images = true;
        }

        this.socket.on('getOFFResponse', async (data, found) => {
            console.log(data);
            
            if (found == 1) {
                console.log('Product retrieved');

                this.product = data;
                this.loaders.product = false;

                this.socket.emit('getImages', this.product.gtin);
                this.socket.emit('getPriceCarrefour', this.product.gtin);
            } else {
                this.socket.emit('getGoogle', data.data.code)            
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
        });


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
            this.loaders.images = false;

            if (response.data.images.length > 0) {
                this.reportResponse = response.data.images;

                $("#reportResponseModal").modal('show');
            } else {
                $('#reportResponseModal').modal('show');
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
        retryImages() {
            this.socket.emit('getImages', this.product.gtin);
            this.loaders.images = true;
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