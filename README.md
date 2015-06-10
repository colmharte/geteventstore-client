# geteventstore-client

### Basic client for talking to GetEventStore using the AtomPub over HTTP interface

### Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@colmharte](http://twitter.com/colmharte)

Current Version: 0.1.0

Tested on: Node 0.10.38, Seneca 0.6.1



### Quick example

```JavaScript
var gesClient = require('geteventstore-client')

var client = gesClient.createClient({host: 'localhost', port: 2113})

client.write("teststream", {testing: true, otherdata: "some data"}, "changed", function(err){
  if (err)
    console.log("Something failed " + err)
  else
    client.readFirst("teststream", function(err, data){
      console.log(data)
    })
})

```


## Install

```sh
npm install geteventstore-client
```


## Usage


```JavaScript



### Methods


## Test

```bash
cd test
mocha cockroach.test.js --seneca.log.print
```
