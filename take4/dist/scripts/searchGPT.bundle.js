/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

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


/***/ }),

/***/ "./node_modules/idb/build/index.js":
/*!*****************************************!*\
  !*** ./node_modules/idb/build/index.js ***!
  \*****************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "deleteDB": function() { return /* binding */ deleteDB; },
/* harmony export */   "openDB": function() { return /* binding */ openDB; },
/* harmony export */   "unwrap": function() { return /* reexport safe */ _wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__.u; },
/* harmony export */   "wrap": function() { return /* reexport safe */ _wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__.w; }
/* harmony export */ });
/* harmony import */ var _wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./wrap-idb-value.js */ "./node_modules/idb/build/wrap-idb-value.js");



/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = (0,_wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__.w)(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade((0,_wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__.w)(request.result), event.oldVersion, event.newVersion, (0,_wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__.w)(request.transaction), event);
        });
    }
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event.newVersion, event));
    }
    openPromise
        .then((db) => {
        if (terminated)
            db.addEventListener('close', () => terminated());
        if (blocking) {
            db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
        }
    })
        .catch(() => { });
    return openPromise;
}
/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
function deleteDB(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event));
    }
    return (0,_wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__.w)(request).then(() => undefined);
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map();
function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string')) {
        return;
    }
    if (cachedMethods.get(prop))
        return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
        !(isWrite || readMethods.includes(targetFuncName))) {
        return;
    }
    const method = async function (storeName, ...args) {
        // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
        const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
        let target = tx.store;
        if (useIndex)
            target = target.index(args.shift());
        // Must reject if op rejects.
        // If it's a write operation, must reject if tx.done rejects.
        // Must reject with op rejection first.
        // Must resolve with op value.
        // Must handle both promises (no unhandled rejections)
        return (await Promise.all([
            target[targetFuncName](...args),
            isWrite && tx.done,
        ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
}
(0,_wrap_idb_value_js__WEBPACK_IMPORTED_MODULE_0__.r)((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
}));




/***/ }),

/***/ "./node_modules/idb/build/wrap-idb-value.js":
/*!**************************************************!*\
  !*** ./node_modules/idb/build/wrap-idb-value.js ***!
  \**************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "a": function() { return /* binding */ reverseTransformCache; },
/* harmony export */   "i": function() { return /* binding */ instanceOfAny; },
/* harmony export */   "r": function() { return /* binding */ replaceTraps; },
/* harmony export */   "u": function() { return /* binding */ unwrap; },
/* harmony export */   "w": function() { return /* binding */ wrap; }
/* harmony export */ });
const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

let idbProxyableTypes;
let cursorAdvanceMethods;
// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes() {
    return (idbProxyableTypes ||
        (idbProxyableTypes = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
        ]));
}
// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods() {
    return (cursorAdvanceMethods ||
        (cursorAdvanceMethods = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
        ]));
}
const cursorRequestMap = new WeakMap();
const transactionDoneMap = new WeakMap();
const transactionStoreNamesMap = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();
function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
        const unlisten = () => {
            request.removeEventListener('success', success);
            request.removeEventListener('error', error);
        };
        const success = () => {
            resolve(wrap(request.result));
            unlisten();
        };
        const error = () => {
            reject(request.error);
            unlisten();
        };
        request.addEventListener('success', success);
        request.addEventListener('error', error);
    });
    promise
        .then((value) => {
        // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
        // (see wrapFunction).
        if (value instanceof IDBCursor) {
            cursorRequestMap.set(value, request);
        }
        // Catching to avoid "Uncaught Promise exceptions"
    })
        .catch(() => { });
    // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache.set(promise, request);
    return promise;
}
function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx))
        return;
    const done = new Promise((resolve, reject) => {
        const unlisten = () => {
            tx.removeEventListener('complete', complete);
            tx.removeEventListener('error', error);
            tx.removeEventListener('abort', error);
        };
        const complete = () => {
            resolve();
            unlisten();
        };
        const error = () => {
            reject(tx.error || new DOMException('AbortError', 'AbortError'));
            unlisten();
        };
        tx.addEventListener('complete', complete);
        tx.addEventListener('error', error);
        tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap.set(tx, done);
}
let idbProxyTraps = {
    get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
            // Special handling for transaction.done.
            if (prop === 'done')
                return transactionDoneMap.get(target);
            // Polyfill for objectStoreNames because of Edge.
            if (prop === 'objectStoreNames') {
                return target.objectStoreNames || transactionStoreNamesMap.get(target);
            }
            // Make tx.store return the only store in the transaction, or undefined if there are many.
            if (prop === 'store') {
                return receiver.objectStoreNames[1]
                    ? undefined
                    : receiver.objectStore(receiver.objectStoreNames[0]);
            }
        }
        // Else transform whatever we get back.
        return wrap(target[prop]);
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        if (target instanceof IDBTransaction &&
            (prop === 'done' || prop === 'store')) {
            return true;
        }
        return prop in target;
    },
};
function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
    if (func === IDBDatabase.prototype.transaction &&
        !('objectStoreNames' in IDBTransaction.prototype)) {
        return function (storeNames, ...args) {
            const tx = func.call(unwrap(this), storeNames, ...args);
            transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
            return wrap(tx);
        };
    }
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods().includes(func)) {
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            func.apply(unwrap(this), args);
            return wrap(cursorRequestMap.get(this));
        };
    }
    return function (...args) {
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        return wrap(func.apply(unwrap(this), args));
    };
}
function transformCachableValue(value) {
    if (typeof value === 'function')
        return wrapFunction(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction)
        cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
        return new Proxy(value, idbProxyTraps);
    // Return the same value back if we're not going to transform it.
    return value;
}
function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest)
        return promisifyRequest(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache.has(value))
        return transformCache.get(value);
    const newValue = transformCachableValue(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
        transformCache.set(value, newValue);
        reverseTransformCache.set(newValue, value);
    }
    return newValue;
}
const unwrap = (value) => reverseTransformCache.get(value);




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
/*!****************************************!*\
  !*** ./src/scripts/searchGPT/index.ts ***!
  \****************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../client */ "./src/client.ts");
/* harmony import */ var idb__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! idb */ "./node_modules/idb/build/index.js");


class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
class DBJobQueue {
    constructor() {
        this.queue = [];
        this.isRunning = false;
    }
    async addJob(job) {
        this.queue.push(job);
        if (!this.isRunning) {
            this.isRunning = true;
            await this.processQueue();
            this.isRunning = false;
        }
        else {
            await this.deferred?.promise;
        }
    }
    async processQueue() {
        this.deferred = new Deferred();
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            // console.log("job", job);
            if (job) {
                await job();
            }
            // console.log("job done");
        }
        this.deferred.resolve && this.deferred.resolve();
    }
}
class GPTDatabase {
    constructor() {
        this.DB_NAME = "gpt";
        this.DB_VERSION = 1;
        this.META_STORE = "meta";
        this.init();
        this.jobQueue = new DBJobQueue();
    }
    async closeDB(db) {
        db.close();
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    async openDB(name, version, onUpgradeNeeded) {
        return await (0,idb__WEBPACK_IMPORTED_MODULE_1__.openDB)(name, version, {
            upgrade(db, oldVersion, newVersion) {
                onUpgradeNeeded(db, oldVersion, newVersion);
            },
        });
    }
    async init() {
        const storedVersion = parseInt(localStorage.getItem("db_version") || "1");
        this.DB_VERSION = storedVersion;
        this.dbPromise = this.openDB(this.DB_NAME, this.DB_VERSION, (db, oldVersion, newVersion) => {
            if (oldVersion < 1) {
                const indexStore = db.createObjectStore(this.META_STORE, {
                    keyPath: "id",
                });
                // Index by title
                indexStore.createIndex("title", "title");
                // Index by create_time
                indexStore.createIndex("create_time", "create_time");
                // Index by update_time
                indexStore.createIndex("update_time", "update_time");
            }
            // Additional upgrades can be handled here
        });
    }
    async upgradeDB(createStoreName) {
        if (this.dbPromise) {
            const db = await this.dbPromise;
            console.log("got db");
            await this.closeDB(db);
            console.log("closed db");
        }
        this.DB_VERSION += 1;
        localStorage.setItem("db_version", this.DB_VERSION.toString());
        this.dbPromise = this.openDB(this.DB_NAME, this.DB_VERSION, (db, oldVersion, newVersion) => {
            console.log("creating store", createStoreName);
            if (!db.objectStoreNames.contains(createStoreName)) {
                db.createObjectStore(createStoreName, { keyPath: "id" });
            }
        });
    }
    async addConversationItems(items) {
        await this.jobQueue.addJob(async () => {
            try {
                const db = await this.dbPromise;
                const tx = db.transaction(this.META_STORE, "readwrite");
                const indexStore = tx.objectStore(this.META_STORE);
                for (const item of items) {
                    await indexStore.put(item);
                }
                await tx.done;
            }
            catch (error) {
                console.warn("Error in addConversationItems transaction:", error);
            }
        });
    }
    async createConversationStore(id, conversation) {
        const { title, create_time, update_time, mapping } = conversation;
        await this.jobQueue.addJob(async () => {
            const db = await this.dbPromise;
            if (!db.objectStoreNames.contains(id)) {
                console.log("creating store", id);
                await this.upgradeDB(id);
                console.log("store created1", id);
            }
        });
        await this.jobQueue.addJob(async () => {
            const db = await this.dbPromise;
            console.log("store created2", id);
            const tx = db.transaction(id, "readwrite");
            const conversationStore = tx.objectStore(id);
            const indexObj = { id, title, create_time, update_time };
            console.log("putting index", indexObj);
            await conversationStore.put(indexObj);
            for (const key in mapping) {
                const obj = mapping[key];
                await conversationStore.put(obj);
            }
            console.log("putting index done");
            await tx.done;
        });
    }
    async scan() {
        return new Promise((resolve, reject) => {
            this.jobQueue.addJob(async () => {
                // alert("scan start");
                const db = await this.dbPromise;
                const tx = db.transaction(this.META_STORE, "readonly");
                const indexStore = tx.objectStore(this.META_STORE);
                let cursor = await indexStore.openCursor();
                const promises = [];
                while (cursor) {
                    const { value } = cursor;
                    cursor = await cursor.continue();
                    // console.log("checking", value.id, "...");
                    promises.push((async () => {
                        try {
                            const conversationStoreTx = db.transaction(value.id, "readonly");
                            const conversationStore = conversationStoreTx.objectStore(value.id);
                            const indexObj = await conversationStore.get(value.id);
                            if (indexObj) {
                                // Convert Unix timestamp to milliseconds
                                const indexUpdateTime = new Date(indexObj.update_time * 1000).getTime();
                                // Create a Date object using the UTC timestamp
                                const valueUpdateTime = new Date(value.update_time).getTime();
                                // Calculate the timezone offset in milliseconds
                                const timezoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
                                // Adjust the valueUpdateTime for the timezone offset
                                const valueUpdateTimeAdjusted = valueUpdateTime - timezoneOffset;
                                // Calculate the absolute time difference
                                const timeDifference = Math.abs(indexUpdateTime - valueUpdateTimeAdjusted);
                                if (timeDifference > 1000) {
                                    console.log("found difference", value.id, indexUpdateTime, valueUpdateTimeAdjusted, timeDifference);
                                    resolve(value.id);
                                    return;
                                }
                            }
                            else {
                                console.log("found missing", value.id);
                                resolve(value.id);
                                return;
                            }
                        }
                        catch (e) {
                            console.log("found missing", value.id);
                            resolve(value.id);
                            return;
                        }
                    })());
                }
                await Promise.all(promises);
                resolve(null);
                return;
            });
        });
    }
    async searchConversation(conversationId, searchTerm) {
        try {
            const db = await this.dbPromise;
            if (!db.objectStoreNames.contains(conversationId)) {
                return null;
            }
            const tx = db.transaction(conversationId, "readonly");
            const conversationStore = tx.objectStore(conversationId);
            let cursor = await conversationStore.openCursor();
            const matches = new Set();
            const rval = { conversationId, matches, title: "" };
            while (cursor) {
                const value = cursor.value;
                if (value.title) {
                    rval.title = value.title;
                }
                if (value.message &&
                    value.message.content &&
                    value.message.content.parts) {
                    for (const part of value.message.content.parts) {
                        if (part.toLowerCase().includes(searchTerm.toLowerCase())) {
                            matches.add(part);
                        }
                    }
                }
                cursor = await cursor.continue();
            }
            if (matches.size > 0) {
                return rval;
            }
            else {
                return null;
            }
        }
        catch (error) {
            console.warn("Error while searching conversation:", error);
            throw error;
        }
    }
    async search(searchTerm) {
        return new Promise(async (resolve, reject) => {
            this.jobQueue.addJob(async () => {
                try {
                    const db = await this.dbPromise;
                    const tx = db.transaction(this.META_STORE, "readonly");
                    const indexStore = tx.objectStore(this.META_STORE);
                    let cursor = await indexStore.openCursor();
                    const searchPromises = [];
                    while (cursor) {
                        const value = cursor.value;
                        const conversationId = value.id;
                        searchPromises.push(this.searchConversation(conversationId, searchTerm));
                        cursor = await cursor.continue();
                    }
                    const results = await Promise.all(searchPromises);
                    const filteredResults = results.filter((result) => result !== null);
                    resolve(filteredResults);
                }
                catch (error) {
                    console.warn("Error while searching:", error);
                    reject(error);
                }
            });
        });
    }
}
function findClosestScrollableParent(element) {
    let currentElement = element;
    while (currentElement) {
        const overflowY = window.getComputedStyle(currentElement).overflowY;
        if (overflowY === "scroll" || overflowY === "auto") {
            return currentElement;
        }
        currentElement = currentElement.parentElement;
    }
    return null;
}
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const later = () => {
            timeout = undefined;
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function setupSearchBox(gptDatabase) {
    const searchBox = document.createElement("input");
    searchBox.type = "text";
    searchBox.placeholder = "Search...";
    searchBox.style.position = "fixed";
    searchBox.style.top = "10px";
    searchBox.style.right = "10px";
    searchBox.style.border = "1px solid #ccc";
    searchBox.style.borderRadius = "3px";
    searchBox.style.padding = "5px";
    searchBox.style.fontSize = "14px";
    searchBox.style.color = "black";
    setTimeout(() => document.body.appendChild(searchBox), 100);
    let activeTooltips = [];
    function clearTooltips() {
        for (const tooltip of activeTooltips) {
            const scrollableParent = findClosestScrollableParent(tooltip.matchingElement);
            if (scrollableParent) {
                scrollableParent.removeEventListener("scroll", tooltip.updateTooltipPosition);
            }
            tooltip.remove();
        }
        activeTooltips = [];
    }
    const debouncedSearch = debounce(async (event) => {
        clearTooltips();
        const searchTerm = event.target.value;
        if (searchTerm.length < 4) {
            return;
        }
        const results = await gptDatabase.search(searchTerm);
        for (const result of results) {
            const matchingElements = Array.from(document.querySelectorAll("div")).filter((element) => element.innerText === result.title);
            for (const element of matchingElements) {
                const tooltip = document.createElement("div");
                tooltip.matchingElement = element;
                const scrollableParent = findClosestScrollableParent(element);
                if (scrollableParent) {
                    scrollableParent.addEventListener("scroll", updateTooltipPosition);
                }
                function updateTooltipPosition() {
                    const parentRect = scrollableParent.getBoundingClientRect();
                    const elementRect = element.getBoundingClientRect();
                    tooltip.style.left = `${parentRect.right + 5}px`;
                    tooltip.style.top = `${elementRect.top}px`;
                }
                tooltip.updateTooltipPosition = updateTooltipPosition;
                tooltip.style.position = "fixed";
                tooltip.style.zIndex = "10";
                tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                tooltip.style.color = "white";
                tooltip.style.borderRadius = "3px";
                tooltip.style.padding = "5px";
                tooltip.style.fontSize = "12px";
                tooltip.style.maxWidth = "500px";
                tooltip.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                // Add a left-pointing nub
                const nub = document.createElement("div");
                nub.style.position = "absolute";
                nub.style.width = "0";
                nub.style.height = "0";
                nub.style.borderTop = "6px solid transparent";
                nub.style.borderBottom = "6px solid transparent";
                nub.style.borderLeft = "6px solid white";
                nub.style.top = "10px";
                nub.style.right = "-6px";
                tooltip.appendChild(nub);
                // Bring the tooltip to the front when hovered
                tooltip.addEventListener("mouseenter", () => {
                    tooltip.style.zIndex = "1000";
                });
                tooltip.addEventListener("mouseleave", () => {
                    tooltip.style.zIndex = "10";
                });
                tooltip.matchingElement = element;
                tooltip.updateTooltipPosition = updateTooltipPosition;
                updateTooltipPosition();
                tooltip.innerHTML = Array.from(result.matches)
                    .map((match) => {
                    const firstOccurrenceIndex = match
                        .toLowerCase()
                        .indexOf(searchTerm.toLowerCase());
                    const start = Math.max(0, firstOccurrenceIndex - 25);
                    const end = Math.min(match.length, firstOccurrenceIndex + searchTerm.length + 25);
                    const truncatedMatch = `...${match.slice(start, end)}...`;
                    return truncatedMatch.replace(new RegExp(`(${searchTerm})`, "gi"), '<mark style="background-color: yellow;">$1</mark>');
                })
                    .join("<br>");
                const wrapper = document.createElement("div");
                wrapper.style.position = "relative";
                wrapper.style.display = "inline-block";
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
                wrapper.appendChild(tooltip);
                activeTooltips.push(tooltip);
            }
        }
    }, 1000);
    searchBox.addEventListener("input", debouncedSearch);
}
(async () => {
    const client = new _client__WEBPACK_IMPORTED_MODULE_0__.BrokerClient();
    const db = new GPTDatabase();
    // alert("db created");
    setupSearchBox(db);
    if (window.location.hash === "#scan") {
        client.on("NETWORK_RESPONSE", async ({ payload }) => {
            if (payload.url?.includes("backend-api")) {
                // console.log("NETWORK_RESPONSE", payload.url, payload.body);
                const body = JSON.parse(payload.body);
                if (payload.url.includes("conversations")) {
                    await db.addConversationItems(body.items);
                }
                else if (payload.url.includes("conversation/")) {
                    // alert("conversation found:  " + payload.url);
                    const { pathname } = new URL(payload.url);
                    const id = pathname.split("/").pop();
                    await db.createConversationStore(id, body);
                    // alert("scan for next update");
                    const next = await db.scan();
                    // alert("scan complete");
                    chrome.runtime.sendMessage({
                        action: "stopInspectNetwork",
                    }, () => {
                        // alert("stop inspect network");
                        if (next) {
                            // alert("next update found" + id + " " + next);
                            window.location.href = location.href.replace(id, next);
                        }
                        else {
                            alert("no more updates found");
                            window.location.href = location.href.split("#")[0];
                        }
                    });
                }
            }
        });
        const response = await new Promise((resolve) => chrome.runtime.sendMessage({
            action: "inspectNetwork",
        }, resolve));
    }
})();

}();
/******/ })()
;
//# sourceMappingURL=searchGPT.bundle.js.map