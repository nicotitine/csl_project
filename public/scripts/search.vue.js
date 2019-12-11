const app = new Vue({
    el: '#app',
    data: () => {
        return {
            term: null,
            searchResult: null,
            links: {
                products: '/products/'
            }
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
                        self.searchResult = response.data
                    })
                }

            },
            deep: true
        }
    }
});