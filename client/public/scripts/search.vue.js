const app = new Vue({
    el: '#app',
    data: () => {
        return {
            term: null,
            searchResult: [],
            links: {
                products: '/products/'
            },
            validGtin: false
        }
    },
    mounted() {

    },
    methods: {
        getCarrefourPrice(product) {
            
            const carrefour = product.retailers.find((retailer) => {
                return retailer.name == 'Carrefour';
            });

            if(carrefour) {
                return carrefour.globalPrice;
            }

            return false;
        }
    },
    watch: {
        term: {
            handler(val, oldVal) {
                const data = {
                    term: val
                };

                if (val.length > 0) {
                    let self = this;
                    axios.get('/search/auto/?term=' + val).then((response) => {
                        console.log(response);
                        if(response.data.length > 0) {
                            self.searchResult = response.data
                        } else {
                            self.searchResult = [];
                        }
                        
                    })

                    if(val.length == 8 || val.length == 12 || val.length == 13) {
                        console.log(true);
                        
                        this.validGtin = true;
                    } else {
                        this.validGtin = false;
                    }
                }

            },
            deep: true
        }
    }
});