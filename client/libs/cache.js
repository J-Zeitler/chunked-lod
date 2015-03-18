'use strict';

var Node = function (key, value, prev, next) {
  this.key = key;
  this.value = value;
  this.prev = prev;
  this.next = next;

  this.asPair = function () {
    return {key: this.key, value: this.value};
  };
};

/**
 * A queue/stack/hashmap for caching. Each item in the cache is unique.
 * If an existing value is inserted, it is instead moved to the front of the cache.
 *
 * All Insert/Remove/Find operations are O(1).
 */
var Cache = function (opts) {
  opts = opts || {};

  this.capacity = opts.capacity || 9999;
  if (this.capacity < 1) {
    throw 'Cache: capacity must be > 0';
  }
  this.length = 0;

  this.hashedItems = {};
  this.queue = {};
  this._initQueue();
};

Cache.prototype._initQueue = function () {
  var head = new Node(null, null);
  var tail = new Node(null, null, head, null);
  head.next = tail;
  this.queue.head = head;
  this.queue.tail = tail;
};

Cache.prototype._insertNode = function (node) {
  node.next = this.queue.head.next;
  node.prev = this.queue.head;
  node.next.prev = node;
  this.queue.head.next = node;
};

Cache.prototype._removeNode = function (node) {
  node.prev.next = node.next;
  node.next.prev = node.prev;
};

Cache.prototype._promoteNode = function (node) {
  this._removeNode(node);
  this._insertNode(node);
}

Cache.prototype.insert = function (key, value) {
  // Ceck if object format insert
  if (key.key && key.value && !value) {
    value = key.value;
    key = key.key;
  }

  if (typeof key !== 'string') {
    throw 'Cache: insert() requires \'string\' as parameter';
  }

  if (this.length >= this.capacity) {
    this.remove(this.queue.tail.prev.key);
  }

  var node = this.hashedItems[key];

  if (node) {
    this._promoteNode(node);
  } else {
    node = new Node(key, value);
    this._insertNode(node);
    this.hashedItems[key] = node;
    this.length++;
  }

  return node;
};

Cache.prototype.remove = function (key) {
  var node = this.hashedItems[key];

  if (node) {
    this._removeNode(node);
    delete this.hashedItems[key];
    this.length--;
    return node;
  }
  return null;
};

Cache.prototype.pop = function () {
  var node = this.remove(this.queue.head.next.key);
  if (node && node != this.queue.tail) {
    return node.asPair();
  }
  return null;
};

Cache.prototype.peek = function (key) {
  var node;
  if (key) {
    node = this.hashedItems[key];
  } else {
    // No key -> peek at first item
    node = this.queue.head.next;
  }

  if (node && node != this.queue.tail) {
    return node.asPair();
  }
  return null;
};

Cache.prototype.find = function (key) {
  var node = this.hashedItems[key];
  if (node) {
    this._promoteNode(node);
    return node.asPair();
  }
  return null;
};

// O(n) of course
Cache.prototype.asArray = function () {
  var node = this.queue.head.next;

  var arr = [];
  while (node !== this.queue.tail) {
    arr.push(node.asPair());
    node = node.next;
  }

  return arr;
};
