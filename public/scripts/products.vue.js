const app = new Vue({
    el: '#app',
    data: () => {
        return {
            products: null,
            links: {
                products: '/products/'
            },
            category: null
        }
    },
    mounted() {
        this.products = JSON.parse($('#productsVariable').text());
        $('#productsVariable').remove();

        this.category = $("#categoryVariable").text().trim();
        $('#categoryVariable').remove();

        this.brand = $('#brandVariable').text().trim();
        $('#brandVariable').remove();        
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