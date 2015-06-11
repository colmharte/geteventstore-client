"use strict";

var uuid = require("node-uuid")
var wreck = require("wreck")
var _ = require("lodash")
var lru = require("simple-lru-cache")
// Exports
module.exports = Client

// Defaults opts
function clientOptions(opts) {
    if (typeof opts === "undefined")
      opts = {}

    this.host = opts.host || '127.0.0.1'
    this.port = opts.port || '2113'
    this.user = opts.user || 'admin'
    this.password = opts.password || 'changeit'

    this.ssl = opts.ssl || false
    this.rejectUnauthorized = opts.rejectUnauthorized || true

    this.timeout = opts.timeout || 5000 //1 sec timeout
    this.maxDataSize = opts.maxDataSize || 1048576 //1mb default

    this.maxCacheSize = opts.maxCacheSize || 1000

    this.uri = (this.ssl ? "https://" : "http://") + this.host + ':' + this.port
}

// Client interface fabricator
function Client(opts) {

    this.opts = new clientOptions(opts)
    this.streamData = {}
    this.currentIndex = 0
    this.cachedItems = new lru({maxSize: this.opts.maxCacheSize})
}



Client.prototype.write = function write(streamName, data, eventType, callback) {

  if (_.isObject(data))
    data = JSON.stringify(data)

  transferData("POST", this.opts.uri + "/streams/" + streamName, data, eventType, this.opts, callback)

}

Client.prototype.loadStream = function loadStream(streamName, callback) {

  var that = this

  if (this.streamData.name !== streamName)
  {
    getFeedDetails(streamName, this.opts, function(err, dataSet){
      if (err)
        callback(err)
      else {
          that.streamData = dataSet

          callback(null, that.streamData)
      }
    })
  }
  else {
    callback(null, this.streamData)
  }
}

Client.prototype.readFirst = function readFirst(streamName, callback) {
  var that = this;

  this.loadStream(streamName, function(err, dataSet){
    if (err)
      callback(err);
    else {
      if (typeof dataSet.nav.first !== "undefined") {
        getFeedDataPoint(dataSet.nav.first, that.opts, function(err, dataSet){
          if (dataSet.items.length > 0) {
            that.currentIndex = 0;
            that.streamData = dataSet;
            getFeedDataItem(dataSet.items[0].link, that, callback);
          }
          else
            callback(null, null);
        })
      }
      else {
        callback(null, null);
      }
    }
  })
}

Client.prototype.readLast = function readLast(streamName, callback) {
  var that = this;

  this.loadStream(streamName, function(err, dataSet){
    if (err)
      callback(err);
    else {
      if (typeof dataSet.nav.last === "undefined") {
        if (dataSet.items.length > 0) {
          that.currentIndex = dataSet.items.length - 1;
          getFeedDataItem(dataSet.items[that.currentIndex].link, that, callback);
        }
        else
          callback(null, null);
      }
      else {
        getFeedDataPoint(dataSet.nav.last, that.opts, function(err, dataSet){
          if (dataSet.items.length > 0) {
            that.currentIndex = dataSet.items.length - 1;
            that.streamData = dataSet;

            getFeedDataItem(dataSet.items[that.currentIndex].link, that, callback);

          }
          else
            callback(null, null);
        })
        }
    }
  })
}


Client.prototype.readPrevious = function readPrevious(streamName, callback) {
  var that = this;

  this.loadStream(streamName, function(err, dataSet){

    if (err)
      callback(err);
    else {

      if (that.currentIndex > 0)
      {
        that.currentIndex--;
        getFeedDataItem(dataSet.items[that.currentIndex].link, that, callback)
      }
      else {
        if (typeof dataSet.nav.previous !== "undefined" && !dataSet.atHead) {


          getFeedDataPoint(dataSet.nav.previous, that.opts, function(err, dataSet){
            if (err)
              callback(err);
            else {
              if (dataSet.items.length > 0) {

                that.streamData = dataSet;
                that.currentIndex = dataSet.items.length - 1;

                getFeedDataItem(dataSet.items[that.currentIndex].link, that, callback);
              }
              else
                callback(null, null);
            }
          })
        }
        else {
          callback(null, null);
        }
      }
    }
  })
}

Client.prototype.readNext = function readNext(streamName, callback) {
  var that = this;

  this.loadStream(streamName, function(err, dataSet){
    if (err)
      callback(err);
    else {

      if (that.currentIndex < dataSet.items.length - 1)
      {
        that.currentIndex++;
        getFeedDataItem(dataSet.items[that.currentIndex].link, that, callback);
      }
      else {
        if (typeof dataSet.nav.next !== "undefined") {

          getFeedDataPoint(dataSet.nav.next, that.opts, function(err, dataSet){
            if (err)
              callback(err);
            else {
              if (dataSet.items.length > 0) {
                that.streamData = dataSet;
                that.currentIndex = 0;
                getFeedDataItem(dataSet.items[that.currentIndex].link, that, callback);
              }
              else
                callback(null, null);
            }
          });
        }
        else {
          callback(null, null);
        }
      }
    }
  })
}

Client.prototype.deleteStream = function deleteStream(streamName, hardDelete, callback)
{
  var options = {
    headers:   {},
    redirects: 1,
    timeout: this.opts.timeout,
    rejectUnauthorized: this.opts.rejectUnauthorized,
    downstreamRes: null,
    secureProtocol: 'SSLv3_method' // The SSL method to use
  };

  if (hardDelete)
    options.headers["ES-HardDelete"] = true;

  var req = wreck.request("DELETE", this.opts.uri + "/streams/" + streamName, options, function(err, res){
    if (err)
      callback(err);
    else {
      callback(null);
    }
  });

}

function transferData(method, uri, payload, eventType, opts, cb)
{
  var method = method;

  // all attributes are optional
  var options = {
    payload:   payload,
    headers:   {"Content-Type":"application/json", "Accept": "application/json"},
    redirects: 1,
    timeout:   opts.timeout,
    maxBytes:  opts.maxDataSize,
    rejectUnauthorized: opts.rejectUnauthorized,
    downstreamRes: null,
    secureProtocol: 'SSLv3_method' // The SSL method to use
  };

  if (method === "POST") {
    options.headers["ES-EventType"] = eventType;
    options.headers["ES-EventId"] = uuid.v1();
  }


  var callback = function (err, res) {

    /* handle err if it exists, in which case res will be undefined */
    if (err)
    {
      res.destroy();
      cb(err)
    }
    else if (res.statusCode === 410 || res.statusCode === 204)
    {
      res.destroy();
      cb(Error("Sream has been deleted"));
    }
    else {
      // buffer the response stream
      wreck.read(res, null, function (err, body) {

        cb(null, body);
      });
    }
  };

  var req = wreck.request(method, uri, options, callback);
}

function getFeedDetails(streamName, opts, callback) {
  transferData("GET", opts.uri + "/streams/" + streamName, null, null, opts, function(err, data){
    if (err)
      callback(err);
    else {
      extractStreamData(data, callback);
    }
  })
}

function getFeedDataPoint(uri, opts, callback) {
  transferData("GET", uri, null, null, opts, function(err, data){
    if (err)
      callback(err);
    else {
      extractStreamData(data, function(err, dataSet){
        if (err)
          callback(err);
        else
          callback(null, dataSet);
      });
    }
  })
}

function getFeedDataItem(uri, parentObj, callback) {
  var that = parentObj;

  var cacheItem = that.cachedItems.get(uri);

  if (cacheItem === null || typeof cacheItem === "undefined")
  {
    transferData("GET", uri, null, null, that.opts, function(err, data){
      if (err)
      {
        callback(err);
      }
      else {
        var item = JSON.parse(data);
        that.cachedItems.set(uri, item);
        callback(null, item);

      }

    })
  }
  else {
    callback(null, cacheItem);
  }
}


function extractStreamData(data, callback) {
  var navLinks = {};
  var feedLinks = [];
  var skipEnd = false;
  var i = 0, j = 0;

  if (data.toString() === "")
    data = "{}";

//console.log(data.toString())
  var feedData = JSON.parse(data.toString());

  if (typeof feedData.links !== "undefined") {
    for (i = 0; i < feedData.links.length; i++)
    {
      var navLink = feedData.links[i];
      navLinks[navLink.relation] = navLink.uri;
    }
  }

  if (typeof feedData.entries !== "undefined") {
    for (i = 0; i < feedData.entries.length; i++)
    {
      var entry = feedData.entries[i];

      for (j = 0; j < entry.links.length; j++)
      {
        var linkItem = entry.links[j];

        if (linkItem.relation === "alternate")
          feedLinks.push({link: linkItem.uri, title: entry.title, index: parseLinkIndex(linkItem.uri)});
      }
    }
  }

  callback(null, {name: feedData.streamId, atHead: feedData.headOfStream, nav: navLinks, items: feedLinks});

}

function parseLinkIndex(id)
{
  var parts = id.split("/");
  return parseInt(parts[parts.length - 1]);
}
