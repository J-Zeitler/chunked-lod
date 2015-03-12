'use strict';

var assert = require('assert');
var util = require('util');
var load = require(__dirname + '/loadModule');

var TEST = {};
load(__dirname + '/../client/libs/cache.js', TEST);

describe('Cache', function(){
  describe('instantiation', function(){
    it('should create a new Cache instance with desired properties', function(){
      var cache = new TEST.Cache({capacity: 40});
      assert.equal(40, cache.capacity);
      assert.deepEqual([], cache.asArray());
    });
  });

  var items = [];
  beforeEach(function (done) {
    items = [];
    items.push({key: 'k0', value: 'v0'});
    items.push({key: 'k1', value: 'v1'});
    items.push({key: 'k2', value: 'v2'});

    done();
  });

  describe('insert', function(){
    it('should insert new items into the Cache', function(){
      var cache = new TEST.Cache();

      cache.insert(items[2]);
      cache.insert(items[1]);
      cache.insert(items[0]);

      assert.deepEqual(items, cache.asArray());
    });
  });

  describe('remove', function(){
    it('should remove items', function(){
      var cache = new TEST.Cache();
      cache.insert(items[2]);
      cache.insert(items[1]);
      cache.insert(items[0]);

      cache.remove('k1');
      assert.deepEqual([items[0], items[2]], cache.asArray());

      cache.remove('k2');
      assert.deepEqual([items[0]], cache.asArray());

      cache.remove('k0');
      assert.deepEqual([], cache.asArray());
    });
  });

  describe('pop', function(){
    it('should pop items off the front of the Cache', function(){
      var cache = new TEST.Cache();
      cache.insert(items[2]);
      cache.insert(items[1]);
      cache.insert(items[0]);

      assert.deepEqual(items[0], cache.pop());
      assert.deepEqual([items[1], items[2]], cache.asArray());

      assert.deepEqual(items[1], cache.pop());
      assert.deepEqual([items[2]], cache.asArray());

      assert.deepEqual(items[2], cache.pop());
      assert.deepEqual([], cache.asArray());

      assert.deepEqual(null, cache.pop());
      assert.deepEqual([], cache.asArray());
    });
  });

  describe('promote', function(){
    it('should promote inserted item to front', function(){
      var cache = new TEST.Cache();
      cache.insert(items[2]);
      cache.insert(items[1]);
      cache.insert(items[0]);

      cache.insert(items[1]);

      assert.deepEqual([items[1], items[0], items[2]], cache.asArray());
    });
  });

  describe('overfill', function(){
    it('should delete last item if the Cache is overfull', function(){
      var cache = new TEST.Cache({capacity: 3});
      cache.insert(items[2]);
      cache.insert(items[1]);
      cache.insert(items[0]);

      var fourth = {key: 'k3', value: 'v3'};
      cache.insert(fourth);

      assert.deepEqual([fourth, items[0], items[1]], cache.asArray());
    });
  });
});