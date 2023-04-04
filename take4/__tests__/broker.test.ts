import { MessageBroker } from "../src/background";
import { BrokerClient } from "../src/client";
import { BrokerEvent } from "../src/types";

type CustomEventTypes = "test-event" | "test-event-1" | "test-event-2";
type CustomPayloads = { data: string };

describe("Message Broker and Client Functionality", () => {
  let broker: MessageBroker;
  let client1: BrokerClient<CustomEventTypes, CustomPayloads>;
  let client2: BrokerClient<CustomEventTypes, CustomPayloads>;

  beforeAll(() => {
    broker = new MessageBroker();
  });
  beforeEach(() => {
    client1 = new BrokerClient();
    client2 = new BrokerClient();
  });

  afterEach(() => {
    client1.disconnect();
    client2.disconnect();
  });

  test("Clients can subscribe and unsubscribe to events", () => {
    const eventType: CustomEventTypes = "test-event";
    const callback = (
      event: BrokerEvent<CustomEventTypes, CustomPayloads>
    ) => {};

    client1.on(eventType, callback);
    expect(client1.eventListeners.get(eventType)).toContain(callback);

    client1.off(eventType, callback);
    expect(client1.eventListeners.get(eventType)).not.toContain(callback);
  });

  test("Clients can dispatch events", () => {
    const eventType1: CustomEventTypes = "test-event-1";
    const eventType2: CustomEventTypes = "test-event-2";
    const payload = { data: "test-payload" };

    const receivedEvent1: BrokerEvent<CustomEventTypes, CustomPayloads>[] = [];
    const receivedEvent2: BrokerEvent<CustomEventTypes, CustomPayloads>[] = [];

    const callback1 = (
      event: BrokerEvent<CustomEventTypes, CustomPayloads>
    ) => {
      receivedEvent1.push(event);
    };

    const callback2 = (
      event: BrokerEvent<CustomEventTypes, CustomPayloads>
    ) => {
      receivedEvent2.push(event);
    };

    client1.on(eventType1, callback1);
    client2.on(eventType2, callback2);

    client1.dispatch({ type: eventType1, payload: { data: "test-payload" } });
    client2.dispatch({ type: eventType2, payload: { data: "test-payload" } });

    expect(receivedEvent1).toHaveLength(1);
    expect(receivedEvent1[0].type).toBe(eventType1);
    expect(receivedEvent1[0].payload).toEqual(payload);

    expect(receivedEvent2).toHaveLength(1);
    expect(receivedEvent2[0].type).toBe(eventType2);
    expect(receivedEvent2[0].payload).toEqual(payload);
  });

  test("Wildcard '*' subscriptions work correctly", () => {
    const eventType1: CustomEventTypes = "test-event-1";
    const eventType2: CustomEventTypes = "test-event-2";
    const payload1 = { data: "test-payload-1" };
    const payload2 = { data: "test-payload-2" };

    const receivedEvents: BrokerEvent<CustomEventTypes, CustomPayloads>[] = [];

    const wildcardCallback = (
      event: BrokerEvent<CustomEventTypes, CustomPayloads>
    ) => {
      receivedEvents.push(event);
    };

    client1.on("*", wildcardCallback);

    client2.dispatch({ type: eventType1, payload: payload1 });
    client2.dispatch({ type: eventType2, payload: payload2 });

    // Check that the wildcard subscriber received both events
    expect(receivedEvents).toHaveLength(2);
    expect(receivedEvents[0].type).toBe(eventType1);
    expect(receivedEvents[0].payload).toEqual(payload1);
    expect(receivedEvents[1].type).toBe(eventType2);
    expect(receivedEvents[1].payload).toEqual(payload2);
  });
});
