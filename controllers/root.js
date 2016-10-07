var config = require('./../config.js'),
    proxy = require('./../lib/HTTPClient.js');
var log = require('./../lib/logger').logger.getLogger("Organicity-subscription-proxy");

var Root = (function () {

  // Get the Access Token
  var getAccessToken = function(req, res, next) {
    var options = {
      host: 'accounts.organicity.eu', // 31.200.243.82
      port: '443',
      path: '/realms/organicity/protocol/openid-connect/token',
      method: 'POST',
      headers: {
        'Content-Type' : 'application/x-www-form-urlencoded'
      }
    };

    var payload = 'grant_type=client_credentials&client_id=' + config.client_id + '&client_secret=' + config.client_secret;

    proxy.sendData('https', options, payload, res, function (status, responseText) {
      var token = JSON.parse(responseText);
      req.access_token = token.access_token;
      next();
    });
  };

  var getAssetFromBody = function (req, res, next) {
    console.log('### Get Asset from body');
    if (req.body.length > 0) {
      try {
        req.asset = JSON.parse(req.body);
        console.log('Asset:');
        console.log(req.asset);
        next();
      } catch (e) {
        log.error(e);
        res.status(400).send(e);
      }
      return;
    }
    res.status(400).send('Body is not allowed to be emty!');
  };

  var update = function (req, res, next) {

    console.log('### Try to update asset');

    var asset_id = req.asset.id;
    var asset_type = req.asset.type;

    var options = {
      host: config.asset_directory_host,
      port: config.asset_directory_port,
      path: '/v2/entities/' + asset_id + '/attrs',
      method: 'POST',
      headers: proxy.getClientIp(req, req.headers)
    };

    // Add auth header
    options.headers['authorization'] = 'Bearer ' + req.access_token;

    // Remove the id and type temporarly
    delete req.asset.id;
    delete req.asset.type;

    log.info("Asset updating: " +  asset_id);

    var payload = JSON.stringify(req.asset);
    proxy.sendData(config.asset_directory_protocol, options, payload, res,
      function (status, e) {
        if (status == 201 || status == 204) {
          log.info("Asset updated: " + this.assetId);
          res.status(200).send("Asset updated: " + this.assetId);
          return;
        }
        log.error(status);
        log.error(e);
        res.status(400).send(e);
      }.bind({assetId: asset_id}),
      function (status, e) {

        // Reset the id and type
        req.asset.id = asset_id;
        req.asset.type = asset_type;

        next();
      }
    );
  };

  var create = function (req, res, next) {
    // options.path = req.url + 'v2/entities/' + assetId + '?type=' + type; //not implemented yet at Orion
    var options = {
      host: config.asset_directory_host,
      port: config.asset_directory_port,
      path: '/v2/entities',
      method: 'POST',
      headers: proxy.getClientIp(req, req.headers)
    };

    // Add auth header
    options.headers['authorization'] = 'Bearer ' + req.access_token;

    log.info("Asset creating: " + req.asset.id);
    var payload = JSON.stringify(req.asset);
    proxy.sendData(config.asset_directory_protocol, options, payload, res,
      function (status, e) {
        if (status == 201 || status == 204) {
          log.info("Asset created: " + this.assetId);
          res.status(200).send("Asset created:" + this.assetId);
          return;
        }
        log.error(status);
        log.error(e);
        res.status(400).send(e);
      }.bind({assetId: req.asset.id}),
      function (status, e) {
        log.error(status);
        log.error(e);
        log.error(this.asset);
        res.status(400).send(e);
      }.bind({assetId: req.asset.id, asset: req.asset})
    );
  };

  var remove = function(req, res, next) {
    var options = {
      host: config.asset_directory_host,
      port: config.asset_directory_port,
      path: '/v2/entities/' + req.params.assetId + '/attrs',
      method: 'DELETE',
      headers: proxy.getClientIp(req, req.headers)
    };

    // Add auth header
    options.headers['authorization'] = 'Bearer ' + req.access_token;

    log.info("Asset deletion: " + req.asset.id);
    var payload = JSON.stringify(req.asset);
    proxy.sendData(config.asset_directory_protocol, options, payload, res,
      function (status, e) {
        if (status == 201 || status == 204) {
          log.info("Asset deleted: " + this.assetId);
          res.status(200).send("Asset deleted:" + this.assetId);
          return;
        }
        log.error(status);
        log.error(e);
        res.status(400).send(e);
      }.bind({assetId: req.asset.id}),
      function (status, e) {
        log.error(status);
        log.error(e);
        log.error(this.asset);
        res.status(400).send(e);
      }.bind({assetId: req.asset.id, asset: req.asset})
    );

  }

  var chains = {
    createOrUpdate : [getAccessToken, getAssetFromBody, update, create],
    remove : [getAccessToken, remove]
  };

  //console.log(chains);
  return chains;
})();

exports.Root = Root;
