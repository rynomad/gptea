// Background Script and Message Broker Types
export interface Message {
  type: string;
  payload?: any;
}

export interface PortConnection {
  port: chrome.runtime.Port;
  subscriptions: Set<string>;
}

export class MessageBroker {
  connections: Map<string, PortConnection>;

  constructor();

  addConnection(port: chrome.runtime.Port): void;
  removeConnection(portId: string): void;
  onMessage(portId: string, message: Message): void;
  dispatchMessage(type: string, payload: any, senderPortId: string): void;
  subscribe(portId: string, messageType: string): void;
  unsubscribe(portId: string, messageType: string): void;
}

// Client Library Types
export type BrokerEvent<T extends string, P> = {
  type: T;
  payload: P;
  tabId?: number;
};

export type EventCallback<T extends string, P> = (
  event: BrokerEvent<T, P>
) => void;

export class BrokerClient<T extends string, P> {
  port: chrome.runtime.Port;
  eventListeners: Map<string, Set<EventCallback<T, P>>>;

  constructor(portName: string);

  connect(): void;
  disconnect(): void;
  on<T extends string>(eventType: string, callback: EventCallback<T, P>): void;
  off(eventType: string, callback: EventCallback<T, P>): void;
  dispatch<T extends string, P>(event: BrokerEvent<T, P>): void;
}
