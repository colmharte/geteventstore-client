
exports.createClient = function createClient(config) {
  var Client = require('./lib/Client.js')

  return new Client(config);

};
