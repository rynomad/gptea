/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/events/events.js":
/*!***************************************!*\
  !*** ./node_modules/events/events.js ***!
  \***************************************/
/***/ (function(module) {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}


/***/ }),

/***/ "./src/client.ts":
/*!***********************!*\
  !*** ./src/client.ts ***!
  \***********************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BrokerClient": function() { return /* binding */ BrokerClient; }
/* harmony export */ });
class BrokerClient {
    constructor() {
        this.port = chrome.runtime.connect({ name: `${Math.random()}` });
        this.eventListeners = new Map();
        this.port.onMessage.addListener(this.handleMessage.bind(this));
    }
    handleMessage(event) {
        // Process non-wildcard events
        if (event.type !== "*") {
            const callbacks = this.eventListeners.get(event.type);
            if (callbacks) {
                for (const callback of callbacks) {
                    callback(event);
                }
            }
        }
        // Process wildcard events
        const wildcardCallbacks = this.eventListeners.get("*");
        if (wildcardCallbacks) {
            for (const callback of wildcardCallbacks) {
                callback(event);
            }
        }
    }
    connect() {
        this.port.postMessage({ type: "SUBSCRIBE", payload: "*" });
    }
    disconnect() {
        this.port.postMessage({ type: "UNSUBSCRIBE", payload: "*" });
        this.port.disconnect();
    }
    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType)?.add(callback);
        this.port.postMessage({ type: "SUBSCRIBE", payload: eventType });
    }
    off(eventType, callback) {
        const callbacks = this.eventListeners.get(eventType);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.port.postMessage({ type: "UNSUBSCRIBE", payload: eventType });
            }
        }
    }
    dispatch(event) {
        this.port.postMessage(event);
    }
}
/* harmony default export */ __webpack_exports__["default"] = (BrokerClient);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
!function() {
/*!**********************************!*\
  !*** ./src/pages/jitsi/index.ts ***!
  \**********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../client */ "./src/client.ts");
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! events */ "./node_modules/events/events.js");
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(events__WEBPACK_IMPORTED_MODULE_1__);


class Deffered {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
class CoGrouper extends events__WEBPACK_IMPORTED_MODULE_1__.EventEmitter {
    constructor(localUser, windowId) {
        super();
        this.userGroups = {};
        this.remoteTabIds = {};
        this.localUser = localUser;
        this.windowId = windowId;
        this.brokerClient = new _client__WEBPACK_IMPORTED_MODULE_0__.BrokerClient();
        this.brokerClient.on("scroll", async (eventData) => {
            const { tabId } = eventData;
            const { scrollPosition } = eventData.payload;
            const tab = (await chrome.tabs.get(tabId));
            console.log("scroll", tabId, scrollPosition, tab.groupId, this.userGroups[this.localUser.id]);
            if (tab.groupId === this.userGroups[this.localUser.id]) {
                this.emit("scrollEvent", {
                    user: this.localUser,
                    tabId,
                    scrollPosition,
                });
            }
        });
        this.brokerClient.on("visibilitychange", async (eventData) => {
            const { tabId } = eventData;
            const { visible } = eventData.payload;
            const tab = await chrome.tabs.get(tabId);
            console.log("visibilitychange", tabId, visible, tab.groupId, this.userGroups[this.localUser.id]);
            if (tab.groupId === this.userGroups[this.localUser.id]) {
                this.emit("visibilityChangeEvent", {
                    user: this.localUser,
                    tabId,
                    visible,
                });
            }
        });
    }
    async reset() {
        const tabs = await chrome.tabs.query({
            pinned: false,
            windowId: this.windowId,
        });
        const newTab = await chrome.tabs.create({
            url: "chrome://newtab",
            windowId: this.windowId,
        });
        const groupId = (this.userGroups[this.localUser.id] =
            await chrome.tabs.group({
                tabIds: newTab.id,
                createProperties: { windowId: this.windowId },
            }));
        await chrome.tabGroups.update(groupId, {
            title: this.localUser.displayName,
        });
        const clearTabs = true; //confirm("Do you want to clear all tabs?");
        if (clearTabs) {
            await new Promise((resolve) => chrome.tabs.remove(tabs.map((tab) => tab.id), resolve));
        }
        else {
            await chrome.tabs.group({
                tabIds: tabs.map((tab) => tab.id),
                groupId,
            });
        }
    }
    async init() {
        chrome.tabs.onCreated.addListener(async (tab) => {
            console.log("onCreated", tab.url, tab.pendingUrl);
            if (tab.url === "https://example.com/" &&
                tab.pendingUrl === "https://example.com/") {
                return;
            }
            if (tab.windowId !== this.windowId) {
                return;
            }
            const groupId = this.userGroups[this.localUser.id];
            if (groupId !== undefined) {
                await new Promise((resolve) => chrome.tabs.group({ tabIds: tab.id, groupId }, resolve));
            }
        });
        chrome.webNavigation.onCompleted.addListener(async (details) => {
            console.log("onCompleted", details.url);
            const tab = await new Promise((resolve) => chrome.tabs.get(details.tabId, resolve));
            if (tab.windowId !== this.windowId) {
                console.log("onCompleted: wrong window", tab.windowId, this.windowId);
                return;
            }
            console.log("onCompleted: right group", tab.groupId, this.userGroups[this.localUser.id]);
            if (tab.groupId === this.userGroups[this.localUser.id]) {
                this.emit("NavigationUpdateEvent", {
                    user: this.localUser,
                    tabId: tab.id,
                    url: tab.url,
                });
            }
        });
    }
    async handleScroll({ user, tabId, scrollPosition }) {
        const localTabId = this.remoteTabIds[tabId];
        if (localTabId !== undefined) {
            chrome.scripting.executeScript({
                target: {
                    tabId: localTabId,
                },
                func: (scrolly) => window.scrollTo(0, scrolly),
                args: [scrollPosition],
            });
        }
    }
    async handleVisibility({ user, tabId, visible }) {
        const localTabId = this.remoteTabIds[tabId];
        if (localTabId !== undefined && visible) {
            chrome.tabs.update(localTabId, { active: true });
        }
    }
    async handleRemoteNavigation({ user, url, tabId }) {
        console.log("handleRemoteNavigation", user, url, tabId);
        const localTabId = this.remoteTabIds[tabId];
        if (localTabId !== undefined) {
            await new Promise((resolve) => chrome.tabs.update(localTabId, { url, active: false }, resolve));
            return;
        }
        const newTab = await chrome.tabs.create({
            url: "https://example.com/",
            windowId: this.windowId,
            active: false,
        });
        this.remoteTabIds[tabId] = newTab.id;
        let groupId = this.userGroups[user.id];
        if (groupId === undefined) {
            groupId = await chrome.tabs.group({
                tabIds: newTab.id,
                createProperties: { windowId: this.windowId },
            });
            await chrome.tabGroups.update(groupId, { title: user.displayName });
            this.userGroups[user.id] = groupId;
        }
        else {
            await new Promise((resolve) => chrome.tabs.group({ tabIds: newTab.id, groupId }, resolve));
        }
        await new Promise((resolve) => chrome.tabs.update(newTab.id, { url, active: false }, resolve));
    }
    async getLocalNavigationEvents() {
        const groupId = this.userGroups[this.localUser.id];
        const tabs = await new Promise((resolve) => chrome.tabs.query({ groupId, pinned: false, windowId: this.windowId }, resolve));
        return tabs.map((tab) => ({
            user: this.localUser,
            tabId: tab.id,
            url: tab.url,
        }));
    }
}
class CoBrowser {
    constructor(api) {
        this.users = {};
        this.api = api;
    }
    async init() {
        const ready = new Deffered();
        this.api.on("dataChannelOpened", () => ready.resolve());
        this.api.on("videoConferenceJoined", async (event) => {
            const localUser = { id: event.id, displayName: event.displayName };
            const windowId = parseInt(new URLSearchParams(window.location.search).get("windowId") || "", 10);
            this.cogrouper = new CoGrouper(localUser, windowId);
            const roomsInfo = await this.api.getRoomsInfo();
            this.users = roomsInfo.rooms.reduce((acc, room) => {
                room.participants.forEach((participant) => {
                    acc[participant.id] = participant;
                });
                return acc;
            }, {});
            await this.cogrouper.init();
            await this.cogrouper.reset();
            const localNavigationEvents = await this.cogrouper.getLocalNavigationEvents();
            for (const userId in this.users) {
                await ready.promise;
                this.api.executeCommand("sendEndpointTextMessage", userId, JSON.stringify(localNavigationEvents));
            }
            this.cogrouper.on("NavigationUpdateEvent", async (event) => {
                console.log('on("NavigationUpdateEvent", async (event: NavigationUpdateEvent');
                await ready.promise;
                console.log("post ready", this.users);
                for (const userId in this.users) {
                    this.api.executeCommand("sendEndpointTextMessage", userId, JSON.stringify(event));
                }
            });
            this.cogrouper.on("scrollEvent", async (event) => {
                await ready.promise;
                for (const userId in this.users) {
                    this.api.executeCommand("sendEndpointTextMessage", userId, JSON.stringify({ type: "scrollEvent", event }));
                }
            });
            this.cogrouper.on("visibilityChangeEvent", async (event) => {
                await ready.promise;
                for (const userId in this.users) {
                    this.api.executeCommand("sendEndpointTextMessage", userId, JSON.stringify({ type: "visibilityChangeEvent", event }));
                }
            });
        });
        this.api.on("participantJoined", async (event) => {
            const user = { id: event.id, displayName: event.displayName };
            this.users[user.id] = user;
            if (this.cogrouper) {
                const localNavigationEvents = await this.cogrouper.getLocalNavigationEvents();
                await ready.promise;
                this.api.executeCommand("sendEndpointTextMessage", user.id, JSON.stringify(localNavigationEvents));
            }
        });
        this.api.on("participantLeft", async (event) => {
            delete this.users[event.id];
        });
        this.api.on("endpointTextMessageReceived", async (event) => {
            const eventData = JSON.parse(event.data.eventData.text);
            if (eventData.type === "scrollEvent") {
                this.cogrouper?.handleScroll(eventData.event);
            }
            else if (eventData.type === "visibilityChangeEvent") {
                this.cogrouper?.handleVisibility(eventData.event);
            }
            else if (Array.isArray(eventData)) {
                eventData.forEach((navEvent) => this.cogrouper?.handleRemoteNavigation(navEvent));
            }
            else {
                this.cogrouper?.handleRemoteNavigation(eventData);
            }
        });
    }
}
async function init() {
    const client = new _client__WEBPACK_IMPORTED_MODULE_0__.BrokerClient();
    const domain = "meet.jit.si";
    const options = {
        roomName: "goodloops2",
        parentNode: document.getElementById("jitsi-container"),
        width: "100%",
        height: "100%",
    };
    const api = (window.api = new window.JitsiMeetExternalAPI(domain, options));
    api.addEventListeners({
        readyToClose: () => {
            client.dispatch({
                type: "jitsi_readyToClose",
                payload: {
                    message: "readyToClose",
                },
            });
        },
        videoConferenceJoined: (params) => {
            api.executeCommand("setTileView", true);
            client.dispatch({
                type: "jitsi_videoConferenceJoined",
                payload: {
                    id: params.id,
                    displayName: params.displayName,
                    role: params.role,
                },
            });
        },
        // Add other Jitsi events you want to listen to and broadcast
    });
    chrome.windows.getCurrent({ populate: true }, (windowInfo) => {
        if (windowInfo.type !== "popup") {
            chrome.system.display.getInfo((displays) => {
                const screenHeight = displays[0].workArea.height;
                const screenWidth = displays[0].workArea.width;
                // Create new popup window
                chrome.windows.create({
                    url: chrome.runtime.getURL("/pages/jitsi.html?windowId=" + windowInfo.id),
                    type: "popup",
                    width: 300,
                    height: screenHeight,
                    left: 0,
                    top: 0,
                });
                // Update the original window
                if (!windowInfo.id)
                    return;
                chrome.windows.update(windowInfo.id, {
                    left: 300,
                    top: 0,
                    width: screenWidth - 300,
                    height: screenHeight,
                });
                // Close the current Jitsi instance
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                        chrome.tabs.remove(tabs[0].id);
                    }
                });
            });
        }
    });
    const cobrowser = new CoBrowser(window.api);
    cobrowser.init();
}
init();

}();
/******/ })()
;
//# sourceMappingURL=jitsi.bundle.js.map