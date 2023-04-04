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
/*!************************************!*\
  !*** ./src/scripts/focus/index.ts ***!
  \************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../client */ "./src/client.ts");

const client = new _client__WEBPACK_IMPORTED_MODULE_0__.BrokerClient();
const debounce = (func, wait) => {
    let timeout;
    return function () {
        clearTimeout(timeout);
        timeout = setTimeout(func, wait);
    };
};
const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
        client.dispatch({
            type: "visibilitychange",
            payload: { visible: true },
        });
    }
};
const handleScroll = debounce(() => {
    const scrollPosition = window.scrollY;
    client.dispatch({
        type: "scroll",
        payload: { scrollPosition },
    });
}, 100);
document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("scroll", handleScroll);
// Remember to remove event listeners and disconnect the client when appropriate
// For example, you could add the following function:
const cleanup = () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("scroll", handleScroll);
    client.disconnect();
};
// Call cleanup() when you need to remove the listeners and disconnect the client

}();
/******/ })()
;
//# sourceMappingURL=focus.bundle.js.map