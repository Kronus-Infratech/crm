const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer to node_modules which is persisted
    cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer'),
};
