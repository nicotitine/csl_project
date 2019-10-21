// const speedTest = require('speedtest-net');
// const os = require('os')
// const cpuCount = 2;
// const puppeteer_cluster = require('./puppeteer_cluster');
// var delay = 1000;

// // We need to speed test the server connection in order to predict how many time we have to wait 
// // until the page is loaded. It will be used as follow : page.waitFor(fatest.bestPing * 10)
// speedTest({ maxTime: 1000 }).on('bestservers', servers => {
//     let fatest = servers[0];
//     for (var i = 1; i < servers.length; i++) {
//         if (servers[i].bestPing < fatest.bestPing) {
//             fatest = servers[i]
//         }
//     };

//     delay = Math.round(fatest.bestPing * 10);

//     module.exports.data = {
//         cpus:cpuCount,
//         delay: delay
//     }

//     puppeteer_cluster.main();

// });

