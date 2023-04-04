class ChromeRuntimeMock {
  constructor() {
    this.onConnect = new EventMock();
  }

  connect(connectInfo, extensionId = "fake-extension-id") {
    const port1 = new PortMock(
      extensionId,
      { ...connectInfo, name: connectInfo.name + "-1" },
      this
    );
    const port2 = new PortMock(
      extensionId,
      { ...connectInfo, name: connectInfo.name + "-2" },
      this
    );

    port1._setPeer(port2);
    port2._setPeer(port1);

    this.onConnect.dispatch(port2);

    return port1;
  }
}

class EventMock {
  constructor() {
    this.listeners = [];
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  dispatch(...args) {
    this.listeners.forEach((listener) => listener(...args));
  }
}
// ... (rest of the code above PortMock class remains unchanged)

class PortMock {
  constructor(extensionId, connectInfo, runtime) {
    this.sender = { id: extensionId };
    this.name = connectInfo.name;
    this.runtime = runtime;
    this.onMessage = new EventMock();
    this.onDisconnect = new EventMock();
    this.peer = null;
  }

  postMessage(message) {
    this.peer?.onMessage?.dispatch(message);
  }

  disconnect() {
    this.peer._disconnect();
    this.runtime = null;
  }

  _setPeer(port) {
    this.peer = port;
  }

  _disconnect() {
    this.runtime = null;
    this.peer = null;
  }
}

global.chrome = {
  runtime: new ChromeRuntimeMock(),
};

// ... (rest of the code below PortMock class remains unchanged)
