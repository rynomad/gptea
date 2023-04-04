/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
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
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MessageBroker": function() { return /* binding */ MessageBrokerImpl; }
/* harmony export */ });
class MessageBrokerImpl {
    constructor() {
        this.connections = new Map();
        chrome.runtime.onConnect.addListener(this.addConnection.bind(this));
    }
    generateConnectionKey(tabId, frameId, portName) {
        const sanitizedTabId = tabId !== undefined ? tabId : -1;
        const sanitizedFrameId = frameId !== undefined ? frameId : -1;
        return `${sanitizedTabId}_${sanitizedFrameId}_${portName}`;
    }
    addConnection(port) {
        const portConnection = {
            port,
            subscriptions: new Set(),
        };
        const connectionKey = this.generateConnectionKey(port.sender?.tab?.id, port.sender?.frameId, port.name);
        this.connections.set(connectionKey, portConnection);
        port.onDisconnect.addListener(() => this.removeConnection(connectionKey));
        port.onMessage.addListener((message) => this.onMessage(connectionKey, message));
    }
    removeConnection(connectionKey) {
        this.connections.delete(connectionKey);
    }
    onMessage(connectionKey, message) {
        switch (message.type) {
            case "SUBSCRIBE":
                this.subscribe(connectionKey, message.payload);
                break;
            case "UNSUBSCRIBE":
                this.unsubscribe(connectionKey, message.payload);
                break;
            default:
                this.dispatchMessage(message.type, message.payload, connectionKey);
                break;
        }
    }
    dispatchMessage(type, payload, _senderPortId) {
        console.log("dispatchMessage");
        for (const [_portId, connection] of this.connections.entries()) {
            console.log("connection.subscriptions.has(type)", connection.subscriptions.has(type), connection);
            if (connection.subscriptions.has(type) ||
                connection.subscriptions.has("*")) {
                connection.port.postMessage({
                    type,
                    payload,
                    tabId: Number.parseInt(_portId.split("_")[0]),
                });
            }
        }
    }
    subscribe(connectionKey, messageType) {
        const connection = this.connections.get(connectionKey);
        if (connection) {
            connection.subscriptions.add(messageType);
        }
    }
    unsubscribe(connectionKey, messageType) {
        const connection = this.connections.get(connectionKey);
        if (connection) {
            connection.subscriptions.delete(messageType);
        }
    }
}

// Initialize the message broker in the background script
if (chrome.runtime.id) {
    const broker = new MessageBrokerImpl();
    function detachOnTabClose(tabId) {
        chrome.tabs.onRemoved.addListener((closedTabId) => {
            if (closedTabId === tabId) {
                chrome.debugger.detach({ tabId: tabId });
            }
        });
    }
    function onRequestWillBeSent(source, method, params) {
        if (method === "Network.requestWillBeSent") {
            console.log("Request will be sent:", params.request);
        }
    }
    const responseMap = new Map();
    function onResponseReceived(source, method, params) {
        if (method === "Network.responseReceived") {
            console.log("Response received:", params.response);
            responseMap.set(params.requestId, params.response);
        }
    }
    function onLoadingFinished(source, method, params) {
        if (method === "Network.loadingFinished") {
            chrome.debugger.sendCommand({ tabId: source.tabId }, "Network.getResponseBody", { requestId: params.requestId }, ({ body, base64Encoded }) => {
                const response = responseMap.get(params.requestId);
                const responseBody = base64Encoded ? atob(body) : body;
                broker.dispatchMessage("NETWORK_RESPONSE", {
                    url: response?.url,
                    body: responseBody,
                }, "-1");
                responseMap.delete(params.requestId);
            });
        }
    }
    chrome.debugger.onEvent.addListener(onRequestWillBeSent);
    chrome.debugger.onEvent.addListener(onResponseReceived);
    chrome.debugger.onEvent.addListener(onLoadingFinished);
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const tabId = sender.tab?.id;
        function enableNetwork() {
            chrome.debugger.sendCommand({ tabId: tabId }, "Network.enable");
        }
        function attachDebugger() {
            chrome.debugger.attach({ tabId: tabId }, "1.2", enableNetwork);
        }
        function detachDebugger() {
            chrome.debugger.detach({ tabId: tabId });
        }
        if (message.action === "inspectNetwork") {
            // Attach the debugger to the tab
            attachDebugger();
            sendResponse({ tabId: tabId });
        }
        else if (message.action === "stopInspectNetwork") {
            detachDebugger();
            sendResponse({ tabId: tabId });
        }
    });
}

/******/ })()
;
//# sourceMappingURL=background.bundle.js.map