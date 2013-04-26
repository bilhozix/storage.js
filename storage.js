'use strict';

var DEBUG = false;

function _error(msg) {
  if (DEBUG == true) {
    console.error(msg);
  }
}

function IDBStorage() {
  var DBNAME = 'storage_js';
  var DBVERSION = 1;
  var STORENAME = 'keyvaluepairs';
  var db = null;

  function withStore(type, f) {
    if (db) {
      f(db.transaction(STORENAME, type).objectStore(STORENAME));
    } else {
      var openreq = indexedDB.open(DBNAME, DBVERSION);
      openreq.onerror = function withStoreOnError() {
        _error("storage.js: can't open database:" + openreq.error.name);
      };
      openreq.onupgradeneeded = function withStoreOnUpgradeNeeded() {
        // First time setup: create an empty object store
        openreq.result.createObjectStore(STORENAME);
      };
      openreq.onsuccess = function withStoreOnSuccess() {
        db = openreq.result;
        f(db.transaction(STORENAME, type).objectStore(STORENAME));
      };
    }
  }

  function get(key, callback) {
    withStore('readonly', function getBody(store) {
      var req = store.get(key);
      req.onsuccess = function getOnSuccess() {
        var value = req.result;
        if (value === undefined)
          value = null;
        setTimeout(function() { callback(value); }, 0);
      };
      req.onerror = function getOnError() {
        _error('Error in storage.get(): ' + req.error.name);
      };
    });
  }

  function set(key, value, callback) {
    // IE10 has a bug and miserably fails when store.put(null, key) is called.
    if (value == null) {
      return remove(key, callback);
    }
    withStore('readwrite', function setmBody(store) {
      var req = store.put(value, key);
      if (callback) {
        req.onsuccess = function setOnSuccess() {
          setTimeout(callback, 0);
        };
      }
      req.onerror = function setOnError() {
        _error('Error in storage.set(): ' + req.error.name);
      };
    });
  }

  function remove(key, callback) {
    withStore('readwrite', function removeBody(store) {
      var req = store['delete'](key);
      if (callback) {
        req.onsuccess = function removeOnSuccess() {
          setTimeout(callback, 0);
        };
      }
      req.onerror = function removeOnError() {
        _error('Error in storage.remove(): ' + req.error.name);
      };
    });
  }

  function clear(callback) {
    withStore('readwrite', function clearBody(store) {
      var req = store.clear();
      if (callback) {
        req.onsuccess = function clearOnSuccess() {
          setTimeout(callback, 0);
        };
      }
      req.onerror = function clearOnError() {
        _error('Error in storage.clear(): ' + req.error.name);
      };
    });
  }

  function length(callback) {
    withStore('readonly', function lengthBody(store) {
      var req = store.count();
      req.onsuccess = function lengthOnSuccess() {
        setTimeout(function() { callback(req.result); }, 0);
      };
      req.onerror = function lengthOnError() {
        _error('Error in storage.length(): ' + req.error.name);
      };
    });
  }

  return {
    get: get,
    set: set,
    remove: remove,
    clear: clear,
    length: length,
  };
}

function LocalStorage() {
  function get(key, callback) {
    var value = localStorage.get(key);
    try {
      value = JSON.parse(value);
      if (value['-moz-stringifier']) {
        value = value['-moz-stringifier'];
      }
    } catch(e) {
    } finally {
      setTimeout(function() { callback(value); }, 0);
    }
  }

  function set(key, value, callback) {
    if (value === null || value === undefined) {
      return remove(key, callback);
    }

    if (typeof value === 'object') {
      value = { '-moz-stringifier': value };
      value = JSON.stringify(value);
    }
    localStorage.set(key, value);
    setTimeout(callback, 0);
  }

  function remove(key, callback) {
    localStorage.remove(key);
    setTimeout(callback, 0);
  }

  function clear(callback) {
    localStorage.clear();
    setTimeout(callback, 0);
  }

  function length(callback) {
    var length = localStorage.length;
    setTimeout(function() { callback(length); }, 0);
  }

  return {
    get: get,
    set: set,
    remove: remove,
    clear: clear,
    length: length,
  };
}

this.storage = (function() {
  if ('indexedDB' in window) {
    return IDBStorage();
  }
  // We don't expect any other kind of fallback for the moment.
  return LocalStorage();
}());