import { Message, MessageBroker, PortConnection } from "./types";
import { BrokerClient } from "./client";

class MessageBrokerImpl implements MessageBroker {
  connections: Map<string, PortConnection>;

  constructor() {
    this.connections = new Map();
    chrome.runtime.onConnect.addListener(this.addConnection.bind(this));
  }

  generateConnectionKey(
    tabId: number | undefined,
    frameId: number | undefined,
    portName: string
  ): string {
    const sanitizedTabId = tabId !== undefined ? tabId : -1;
    const sanitizedFrameId = frameId !== undefined ? frameId : -1;
    return `${sanitizedTabId}_${sanitizedFrameId}_${portName}`;
  }

  addConnection(port: chrome.runtime.Port): void {
    const portConnection: PortConnection = {
      port,
      subscriptions: new Set(),
    };

    const connectionKey = this.generateConnectionKey(
      port.sender?.tab?.id,
      port.sender?.frameId,
      port.name
    );
    this.connections.set(connectionKey, portConnection);

    port.onDisconnect.addListener(() => this.removeConnection(connectionKey));
    port.onMessage.addListener((message: Message) =>
      this.onMessage(connectionKey, message)
    );
  }

  removeConnection(connectionKey: string): void {
    this.connections.delete(connectionKey);
  }

  onMessage(connectionKey: string, message: Message): void {
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

  dispatchMessage(type: string, payload: any, _senderPortId: string): void {
    console.log("dispatchMessage");
    for (const [_portId, connection] of this.connections.entries()) {
      console.log(
        "connection.subscriptions.has(type)",
        connection.subscriptions.has(type),
        connection
      );
      if (
        connection.subscriptions.has(type) ||
        connection.subscriptions.has("*")
      ) {
        connection.port.postMessage({
          type,
          payload,
          tabId: Number.parseInt(_portId.split("_")[0]),
        });
      }
    }
  }

  subscribe(connectionKey: string, messageType: string): void {
    const connection = this.connections.get(connectionKey);
    if (connection) {
      connection.subscriptions.add(messageType);
    }
  }

  unsubscribe(connectionKey: string, messageType: string): void {
    const connection = this.connections.get(connectionKey);
    if (connection) {
      connection.subscriptions.delete(messageType);
    }
  }
}
export { MessageBrokerImpl as MessageBroker };

// Initialize the message broker in the background script
if (chrome.runtime.id) {
  const broker = new MessageBrokerImpl();
  function detachOnTabClose(tabId: number) {
    chrome.tabs.onRemoved.addListener((closedTabId) => {
      if (closedTabId === tabId) {
        chrome.debugger.detach({ tabId: tabId });
      }
    });
  }

  function onRequestWillBeSent(source: any, method: any, params: any) {
    if (method === "Network.requestWillBeSent") {
      console.log("Request will be sent:", params.request);
    }
  }

  const responseMap = new Map();

  function onResponseReceived(source: any, method: any, params: any) {
    if (method === "Network.responseReceived") {
      console.log("Response received:", params.response);
      responseMap.set(params.requestId, params.response);
    }
  }

  function onLoadingFinished(source: any, method: any, params: any) {
    if (method === "Network.loadingFinished") {
      chrome.debugger.sendCommand(
        { tabId: source.tabId },
        "Network.getResponseBody",
        { requestId: params.requestId },
        ({ body, base64Encoded }: any) => {
          const response = responseMap.get(params.requestId);
          const responseBody = base64Encoded ? atob(body) : body;
          broker.dispatchMessage(
            "NETWORK_RESPONSE",
            {
              url: response?.url,
              body: responseBody,
            },
            "-1"
          );
          responseMap.delete(params.requestId);
        }
      );
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
    } else if (message.action === "stopInspectNetwork") {
      detachDebugger();
      sendResponse({ tabId: tabId });
    }
  });
}
