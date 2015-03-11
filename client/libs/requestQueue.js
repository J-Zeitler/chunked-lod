'use strict';

var Node = function (value, prev, next) {
  this.value = value;
  this.prev = prev;
  this.next = next;
};

/**
 * A queue/stack/hashmap for request prioritization. Each item in the queue is unique.
 * If an existing value is inserted, it is instead moved to the front of the queue.
 *
 * All Insert/Remove/Find operations are O(1).
 */
var RequestQueue = function (opts) {
  opts = opts || {};

  this.capacity = opts.capacity || 999;
  if (this.capacity < 1) {
    throw 'RequestQueue: capacity must be > 0';
  }
  this.length = 0;

  this.hashedItems = {};
  this._initQueue();
};

RequestQueue.prototype._initQueue = function () {
  var head = new Node(null);
  var tail = new Node(null, head, null);
  head.next = tail;
  this.queue = {
    head: head,
    tail: tail
  };
};

RequestQueue.prototype._insertNode = function (node) {
  node.next = this.queue.head.next;
  node.prev = this.queue.head;
  node.next.prev = node;
  this.queue.head.next = node;
};

RequestQueue.prototype._removeNode = function (node) {
  node.prev.next = node.next;
  node.next.prev = node.prev;
};

RequestQueue.prototype.insert = function (value) {
  if (typeof value !== 'string') {
    throw 'RequestQueue: insert() requires \'string\' as parameter';
  }

  if (this.length >= this.capacity) {
    this._removeNode(this.queue.tail.prev);
  }

  var node = this.hashedItems[value];

  if (node) {
    this._removeNode(node);
    this._insertNode(node);
  } else {
    node = new Node(value);
    this._insertNode(node);
    this.hashedItems[value] = node;
    this.length++;
  }

  return node;
};

RequestQueue.prototype.remove = function (value) {
  var node = this.hashedItems[value];

  if (node) {
    this._removeNode(node);
    delete this.hashedItems[value];
    this.length--;
    return node;
  }

  return null;
};

RequestQueue.prototype.pop = function () {
  var node = this.remove(this.queue.head.next.value);
  if (node) {
    return node.value;
  }
  return null;
};

RequestQueue.prototype.find = function (value) {
  var node = this.hashedItems[value];
  if (node) return node;
  return null;
};

// O(n) of course
RequestQueue.prototype.asArray = function () {
  var node = this.queue.head.next;

  var arr = [];
  while (node !== this.queue.tail) {
    arr.push(node.value);
    node = node.next;
  }

  return arr;
};
