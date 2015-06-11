# geteventstore-client

### Client for talking to GetEventStore using the AtomPub interface over HTTP

### Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@colmharte](http://twitter.com/colmharte)

Current Version: 0.1.0

Tested on: Node 0.10.38



### Quick example

```JavaScript
var gesClient = require('geteventstore-client');

var client = gesClient.createClient({host: 'localhost', port: 2113});

client.write("teststream", {testing: true, otherdata: "some data"}, "changed", function(err){
  if (err)
    console.log("Something failed " + err);
  else {
    client.readFirst("teststream", function(err, data){
      console.log(data);
    });
  }
});

```


## Install

```sh
npm install geteventstore-client
```

### `createClient(options)`

Creates a client object.
- `options` - Object specifying the connectioon details.
  - host: host name of the server. Defaults to localhost.
  - port: port to use. Defaults to 2113
  - ssl: true to connect over ssl. Defaults to false
  - rejectUnauthorized: false to disable rejecting unauthorized requests based on the validity of ssl certs. Defaults to true.
  - timeout: Timeout for calls, Defaults to 5 seconds.
  - maxDataSize: The maximum data size sent to a stream. Defaults to 1048576 (1mb).
  - maxCacheSize: The number of objects to cache locally to speed up retrieval. Defaults to 1000.

### `client.write(streamName, data, eventType, callback)`

Writes an item into a stream. A stream will automatically be created if this is the first time an object has been written to it.
- `streamName` - A string specifying the stream name.
- `data` - An object to be stored.
- `eventType` - The event type to record when writing this object to the stream.
- `callback` - Called when the function completes using the signature `function (err)` where:
    - `err` - Any error that may have occurred during the handling of the request.

### `client.readFirst(streamName, callback)`

Reads the latest item added to the stream.
- `streamName` - A string specifying the stream name.
- `callback` - Called when the function completes using the signature `function (err, data)` where:
    - `err` - Any error that may have occurred during the handling of the request.
    - `data` - The object that was stored last.

### `client.readLast(streamName, callback)`

Reads the first item added to the stream.
- `streamName` - A string specifying the stream name.
- `callback` - Called when the function completes using the signature `function (err, data)` where:
    - `err` - Any error that may have occurred during the handling of the request.
    - `data` - The original object stored in the stream.

### `client.readPrevious(streamName, callback)`

Reads the next newest item from the current position. The starting position can be set by calling readFirst or readLast.
- `streamName` - A string specifying the stream name.
- `callback` - Called when the function completes using the signature `function (err, data)` where:
    - `err` - Any error that may have occurred during the handling of the request.
    - `data` - The object stored at the the position.

### `client.readLast(streamName, callback)`

Reads the previous older item from the current position. The starting position can be set by calling readFirst or readLast.
- `streamName` - A string specifying the stream name.
- `callback` - Called when the function completes using the signature `function (err, data)` where:
    - `err` - Any error that may have occurred during the handling of the request.
    - `data` - The object stored at the position.


### `client.deleteStream(streamName, hardDelete, callback)`

Deletes a stream.
- `streamName` - A string specifying the stream name.
- `hardDelete` - Set to true to permanently delete the stream.
- `callback` - Called when the function completes using the signature `function (err)` where:
    - `err` - Any error that may have occurred during the handling of the request.


## Test

```bash
npm test
```
