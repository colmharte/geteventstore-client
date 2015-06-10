var uuid = require("node-uuid")
var wreck = require("wreck")
var _ = require("lodash")

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
    this.rejectUnauthorized = opts.rejectUnauthorized || false

    this.timeout = opts.timeout || 5000 //1 sec timeout
    this.maxSize = opts.maxSize || 1048576 //1mb default


    this.uri = (this.ssl ? "https://" : "http://") + this.host + ':' + this.port
}

// Client interface fabricator
function Client(opts) {

    this.opts = new clientOptions(opts)
    this.streamData = {}
    this.currentIndex = 0
}



// Put key
Client.prototype.write = function write(streamName, data, eventType, callback) {
//  curl -i -d@/home/greg/myevent.txt "http://127.0.0.1:2113/streams/newstream" -H "Content-Type:application/json" -H "ES-EventType: SomeEvent" -H "ES-EventId: C322E299-CB73-4B47-97C5-5054F920746E"

  if (_.isObject(data))
    data = JSON.stringify(data)

  transferData("POST", this.opts.uri + "/streams/" + streamName, data, eventType, this.opts, callback)

}

Client.prototype.loadStream = function loadStream(streamName, callback) {
console.log(this.currentIndex)
  var that = this
  if (this.streamData.name !== streamName)
  {
    getFeedDetails(streamName, this.opts, function(err, dataSet){
      if (err)
        callback(err)
      else {
          dataSet.name = streamName
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
  var opts = this.opts
  var that = this

  this.loadStream(streamName, function(err, dataSet){
    if (err)
      callback(err)
    else {
      getFeedDataPoint(dataSet.nav.first, opts, function(err, dataSet){
        if (dataSet.items.length > 0) {
          that.currentIndex = 0
          getFeedDataItem(dataSet.items[0].link, opts, callback)
        }
        else
          callback(null, null)
      })
    }
  })
}

Client.prototype.readLast = function readLast(streamName, callback) {
  var opts = this.opts
  var that = this

  this.loadStream(streamName, function(err, dataSet){
    if (err)
      callback(err)
    else {
      if (typeof dataSet.nav.last === "undefined") {
        if (dataSet.items.length > 0) {
          that.currentIndex = dataSet.items.length - 1
          getFeedDataItem(dataSet.items[dataSet.items.length - 1].link, opts, callback)
        }
        else
          callback(null, null)
      }
      else {
        getFeedDataPoint(dataSet.nav.last, opts, function(err, dataSet){
          if (dataSet.items.length > 0) {
            that.currentIndex = dataSet.items.length - 1
            getFeedDataItem(dataSet.items[dataSet.items.length - 1].link, opts, callback)
          }
          else
            callback(null, null)
        })
        }
    }
  })
}

Client.prototype.readNext = function readNext(streamName, callback) {
  var opts = this.opts
  var that = this

  this.loadStream(streamName, function(err, dataSet){
    if (err)
      callback(err)
    else {

      if (that.currentIndex > 0)
      {
        that.currentIndex--;
        getFeedDataItem(dataSet.items[that.currentIndex].link, opts, callback)
      }
      else {
        if (typeof dataSet.nav.next !== "undefined") {

          getFeedDataPoint(dataSet.nav.next, opts, function(err, dataSet){
            if (err)
              callback(err)
            else {
              if (dataSet.items.length > 0) {
                that.currentIndex = dataSet.items[dataSet.items.length - 1]
                getFeedDataItem(dataSet.items[dataSet.items.length - 1].link, opts, callback)
              }
              else
                callback(null, null)
            }
          })
        }
        else {
          callback(null, null)
        }
      }
    }
  })
}

Client.prototype.readPrevious = function readPrevious(streamName, callback) {
  var opts = this.opts
  var that = this

  this.loadStream(streamName, function(err, dataSet){
    if (err)
      callback(err)
    else {
    
      if (that.currentIndex < dataSet.items.length - 1)
      {
        that.currentIndex++;
        getFeedDataItem(dataSet.items[that.currentIndex].link, opts, callback)
      }
      else {
        if (typeof dataSet.nav.previous !== "undefined") {

          getFeedDataPoint(dataSet.nav.previous, opts, function(err, dataSet){
            if (err)
              callback(err)
            else {
              if (dataSet.items.length > 0) {
                that.currentIndex = dataSet.items[dataSet.items.length - 1]
                getFeedDataItem(dataSet.items[dataSet.items.length - 1].link, opts, callback)
              }
              else
                callback(null, null)
            }
          })
        }
        else {
          callback(null, null)
        }
      }
    }
  })
}

function transferData(method, uri, payload, eventType, opts, cb)
{
  var method = method;

  // all attributes are optional
  var options = {
    payload:   payload,
    headers:   {"Content-Type":"application/json", "Accept": "application/json"},
    redirects: 3,
    timeout:   opts.timeout,
    maxBytes:  opts.maxSize,
    rejectUnauthorized: opts.rejectUnauthorized,
    downstreamRes: null,
    secureProtocol: 'SSLv3_method' // The SSL method to use
  };

  if (method === "POST") {
    options.headers["ES-EventType"] = eventType
    options.headers["ES-EventId"] = uuid.v1()
  }


  var callback = function (err, res) {

    /* handle err if it exists, in which case res will be undefined */
    if (err)
    {
      cb(err)
    }
    else {
      // buffer the response stream
      wreck.read(res, null, function (err, body) {

        cb(null, body)
      });
    }
  };

  var req = wreck.request(method, uri, options, callback);
}

function getFeedDetails(streamName, opts, callback) {
  transferData("GET", opts.uri + "/streams/" + streamName, null, null, opts, function(err, data){
    if (err)
      callback(err)
    else {
      extractStreamData(data, callback)
    }
  })
}

function getFeedDataPoint(uri, opts, callback) {
  transferData("GET", uri, null, null, opts, function(err, data){
    if (err)
      callback(err)
    else {
      extractStreamData(data, function(err, dataSet){
        if (err)
          callback(err)
        else
          callback(null, dataSet)
      })
    }
  })
}

function getFeedDataItem(uri, opts, callback) {
console.log("etting " + uri)
  transferData("GET", uri, null, null, opts, function(err, data){
    if (err)
    {
      callback(err)
    }
    else {

      callback(null, JSON.parse(data))

    }
  })
}


function extractStreamData(data, callback) {
  var navLinks = {}
  var feedLinks = []
  var skipEnd = false
  var i = 0, j = 0

  feedData = JSON.parse(data.toString())

  if (typeof feedData.links !== "undefined") {
    for (i = 0; i < feedData.links.length; i++)
    {
      var navLink = feedData.links[i]
      navLinks[navLink.relation] = navLink.uri
    }
  }
  for (i = 0; i < feedData.entries.length; i++)
  {
    var entry = feedData.entries[i]

    for (j = 0; j < entry.links.length; j++)
    {
      var linkItem = entry.links[j]

      if (linkItem.relation === "alternate")
        feedLinks.push({link: linkItem.uri, title: entry.title, index: parseLinkIndex(linkItem.uri)})
    }
  }
//  console.log({nav: navLinks, items: feedLinks})
  callback(null, {nav: navLinks, items: feedLinks})


}

function parseLinkIndex(id)
{
  var parts = id.split("/")
  return parseInt(parts[parts.length - 1])
}
