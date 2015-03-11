'use strict';

var assert = require('assert');
var util = require('util');
var load = require(__dirname + '/loadModule');

// Ugly but efficient for testing non-CommonJS modules
var TEST = {};
load(__dirname + '/../client/libs/requestQueue.js', TEST);

describe('RequestQueue', function(){
  describe('instantiation', function(){
    it('should create a new RequestQueue instance with desired properties', function(){
      var rq = new TEST.RequestQueue();
      assert.equal(80, rq.capacity);
      var rq2 = new TEST.RequestQueue({capacity: 40});
      assert.equal(40, rq2.capacity);

      assert.deepEqual([], rq.asArray());
    });
  });

  describe('insert', function(){
    it('should insert new items into the RequestQueue', function(){
      var rq = new TEST.RequestQueue();
      rq.insert('1');
      rq.insert('2');
      rq.insert('3');

      assert.deepEqual(['3', '2', '1'], rq.asArray());
    });
  });

  describe('remove', function(){
    it('should remove items', function(){
      var rq = new TEST.RequestQueue();
      rq.insert('1');
      rq.insert('2');
      rq.insert('3');

      rq.remove('2');
      assert.deepEqual(['3', '1'], rq.asArray());

      rq.remove('3');
      assert.deepEqual(['1'], rq.asArray());

      rq.remove('1');
      assert.deepEqual([], rq.asArray());
    });
  });

  describe('pop', function(){
    it('should pop off the items in front', function(){
      var rq = new TEST.RequestQueue();
      rq.insert('1');
      rq.insert('2');
      rq.insert('3');

      assert.equal('3', rq.pop());
      assert.deepEqual(['2', '1'], rq.asArray());

      assert.equal('2', rq.pop());
      assert.deepEqual(['1'], rq.asArray());

      assert.equal('1', rq.pop());
      assert.deepEqual([], rq.asArray());
    });
  });

  describe('promote', function(){
    it('should promote inserted item to front', function(){
      var rq = new TEST.RequestQueue();
      rq.insert('1');
      rq.insert('2');
      rq.insert('3');

      rq.insert('2');

      assert.deepEqual(['2', '3', '1'], rq.asArray());
    });
  });
});
