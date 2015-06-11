// Load modules


var Code = require('code');
var Lab = require('lab');
var gesClient = require('../index.js');


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

var streamName = "gesClient-" + new Date().getTime();
var client = gesClient.createClient();

describe('write()', function (done) {

    it('writes data to a stream with a callback', function (done) {


        var counter = 0;

        populateStream(streamName, counter);

        function populateStream(streamName, counter)
        {
          client.write(streamName, {counter: counter}, "added", function(err){
            expect(err).to.not.exist();
            counter++;

            if (counter <= 50)
              populateStream(streamName, counter);
            else {
              done();
            }
          });
        }
    });
});

describe('readLast()', function (done) {

    it('reads the last item', function (done) {

        client.readLast(streamName, function(err, data){
          expect(err).to.not.exist();
          expect(data.counter).equal(0);

          done();
        });

    });
});

describe('readFirst()', function (done) {

    it('reads the first item', function (done) {

        client.readFirst(streamName, function(err, data){
          expect(err).to.not.exist();
          expect(data.counter).equal(50);

          done();
        });

    });
});

describe('readNext()', function (done) {

    it('iterate backwards through the stream', function (done) {

        client.readFirst(streamName, function(err, data){
          expect(err).to.not.exist();
          expect(data.counter).equal(50);

          readNextItem(data.counter);

        });

        function readNextItem(currentItem)
        {
          client.readNext(streamName, function(err, data){
            expect(err).to.not.exist();
            expect(data.counter).equal(currentItem - 1);

            if (data.counter > 0)
              readNextItem(data.counter);
            else {
              client.readNext(streamName, function(err, data){
                expect(err).to.not.exist();
                expect(data).to.not.exist();

                done();
              })
            }
          })
        }
    });
});

describe('readPrev()', function (done) {

    it('iterate forwards through the stream', function (done) {

        client.readLast(streamName, function(err, data){
          expect(err).to.not.exist();
          expect(data.counter).equal(0);

          readPrevItem(data.counter);

        });

        function readPrevItem(currentItem)
        {
          client.readPrevious(streamName, function(err, data){
            expect(err).to.not.exist();
            expect(data.counter).equal(currentItem + 1);

            if (data.counter < 50)
              readPrevItem(data.counter);
            else {
              client.readPrevious(streamName, function(err, data){
                expect(err).to.not.exist();
                expect(data).to.not.exist();

                done();
              })
            }
          })
        }
    });
});
