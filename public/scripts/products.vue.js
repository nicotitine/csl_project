const app = new Vue({
    el: '#app',
    data: () => {
        return {
            products: null,
            links: {
                products: '/products/'
            }
        }
    },
    mounted() {
        this.products = JSON.parse($('#productsVariable').text());
        $('#productsVariable').remove();
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
    }
});