// api/index.js
// Proxy to webhook (makes webhook the single logic file)
const handler = require("./webhook.js");
module.exports = async (req, res) => handler(req, res);
module.exports.default = module.exports;
