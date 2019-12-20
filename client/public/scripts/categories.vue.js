const app = new Vue({
    el: '#app',
    data: () => {
        return {
            categories: null,
            links: {
                category : '/categories/'
            }
        }
    },
    mounted() {
        this.categories = JSON.parse($('#categoriesVariable').text());
        $('#categoriesVariable').remove();          
    }
});