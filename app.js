/**
 * Modules imports.
 */
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const favicon = require('serve-favicon');

/**
 * Controllers imports.
 */
const sockets = require('./controllers/socket.controller');

/**
 * Routers imports.
 */
const indexRouter = require('./routers/index.router');
const productsRouter = require('./routers/products.router');
const categoriesRouter = require('./routers/categories.router');
const searchRouter = require('./routers/search.router');

/**
 * Import from .env file.
 */
const port = process.env.PORT;

/**
 * Require database connection.
 */
require('./db/db');

/**
 * View engine seting (EJS).
 */
app.set('view engine', 'ejs');
app.set("views", __dirname + "/views");
app.set("view options", {
    layout: false
});

/**
 * Favicon use.
 */
app.use(favicon(__dirname + '/public/coin.png'));

/**
 * Public folder use.
 */
app.use(express.static(__dirname + '/public'));

/**
 * Routing.
 */
app.use('/', indexRouter);
app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);
app.use('/search', searchRouter);

/**
 * Socket controllers launching.
 */
sockets.serve(http);

app.get('/', async (req, res) => {
    res.render('pages/index', {});
});

/**
 * Server launching.
 */
http.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});