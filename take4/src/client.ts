import { BrokerEvent, EventCallback } from "./types";

export class BrokerClient<T extends string, P> {
  port: chrome.runtime.Port;
  eventListeners: Map<string, Set<EventCallback<T, P>>>;

  constructor() {
    this.port = chrome.runtime.connect({ name: `${Math.random()}` });
    this.eventListeners = new Map();
    this.port.onMessage.addListener(this.handleMessage.bind(this));
  }

  handleMessage(event: BrokerEvent<T, P>): void {
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

  connect(): void {
    this.port.postMessage({ type: "SUBSCRIBE", payload: "*" });
  }

  disconnect(): void {
    this.port.postMessage({ type: "UNSUBSCRIBE", payload: "*" });
    this.port.disconnect();
  }

  on(eventType: string, callback: EventCallback<T, P>): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)?.add(callback);
    this.port.postMessage({ type: "SUBSCRIBE", payload: eventType });
  }

  off(eventType: string, callback: EventCallback<T, P>): void {
    const callbacks = this.eventListeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.port.postMessage({ type: "UNSUBSCRIBE", payload: eventType });
      }
    }
  }

  dispatch(event: BrokerEvent<T, P>): void {
    this.port.postMessage(event);
  }
}

export default BrokerClient;
