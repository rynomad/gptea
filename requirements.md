# Requirements Document

## Introduction

This document outlines the functional and technical requirements for a library that provides a simple messaging system for Chrome extensions. The library should include a Broker class that runs in the background service worker and manages a list of currently connected ports, as well as a Client class that opens a port to the Broker and exposes an event listener interface and an event dispatch interface.

## Functional Requirements

- The library should include a Broker class that listens for incoming connect events on the 'extension messaging' namespace, manages a list of currently connected ports, and broadcasts messages to all the other ports that have an active listener for the message type.
- The library should include a Client class that opens a port to the Broker and exposes an event listener interface and an event dispatch interface.
- The Client class should be able to add and remove event listeners, dispatch events, and handle events received from other clients.
- The Broker class should only broadcast messages to ports for which it knows there is an active listener.
- The library should include Mocha tests for the Client class that cover adding and removing event listeners, dispatching events, and receiving events from other clients. The tests should also verify that listeners are called within 1 second of the message being dispatched. The tests should be bundled into a spec bundle using Webpack and included in the popup page.
- The library should include a build target in the Webpack configuration to create a Chrome extension with a popup page that runs the Mocha tests.

## Technical Requirements

- The library should be implemented in JavaScript and should be compatible with Chrome extensions.
- The library should be packaged as an npm module.
- The library should include a README.md file that provides information on how to use the library, including code examples and instructions on how to run the Mocha tests.
- The library should use Webpack to bundle the code and its dependencies into a single file.
- The library should be written in ES6 and transpiled to ES5 for browser compatibility.
- The library should use Mocha and Chai for testing, and the tests should be bundled into a spec bundle using Webpack and included in the popup page.
- The Webpack configuration should include a build target to create a Chrome extension with a popup page that runs the Mocha tests.
- The Chrome extension should have a harness subdirectory that includes a minimal Chrome extension definition, just enough that the popup page can reference the spec bundle.

## Outputs

The outputs for this project should include the following:

- `package.json`: This file should include the necessary dependencies, such as webpack, mocha, and chai.
- `webpack.config.js`: This file should contain the configuration for Webpack, which is used to bundle the library and its dependencies into a single file. It should include a build target to create a Chrome extension with a popup page that runs the Mocha tests.
- `client.js`: This file should contain the implementation of the Client class.
- `broker.js`: This file should contain the implementation of the Broker class.
- `client.spec.js`: This file should contain the Mocha tests for the Client class, including tests for adding and removing event listeners, dispatching events, and receiving events from other clients. It should also include a test to verify that listeners are called within 1 second of the message being dispatched. The tests should be bundled into a spec bundle using Webpack.
- `messaging-library.spec.bundle.js`: This file should contain the bundled Mocha tests for the Client class and any necessary dependencies.
- `README.md`: This file should provide information on how to use the library, including code examples and instructions on how to run the Mocha tests.
- `harness/popup.html`: This file should contain the HTML and JavaScript for a popup page that runs the Mocha tests when opened in a Chrome extension. It should include a reference to the generated spec bundle.
- `harness/manifest.json`: This file should contain the minimal Chrome extension definition necessary to run the Mocha tests in the popup page.
