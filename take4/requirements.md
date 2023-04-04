1. TypeScript Configuration and Project Setup:

   - Create a sensible tsconfig for the project.
   - Set up a package.json file for managing dependencies.
   - Use Jest as the test runner for the project.
     - Dependency Notes: None
     - Context needed from upstream tasks: None
     - Acceptance Criteria:
       - TypeScript project compiles without errors.
       - The tsconfig file has appropriate settings for the Chrome extension.
       - The package.json file is properly structured.
       - All required dependencies are included.
       - Jest is set up as the test runner and properly configured.

2. Webpack Build System and Build System Tests:
   - Configure Webpack to compile the background script.
   - Implement dynamic scanning of the project directory for pages and content scripts, and build them.
   - Generate a v3 manifest.json file from a template, merged with any manifest.json fragments found in content scripts and pages.
   - Provide a way for each page and script to access a dynamically generated index of all scripts and pages.
   - Support handling of both React and vanilla TypeScript for pages.
   - Compile full HTML, CSS, and JavaScript files.
   - Create a test suite that dynamically verifies all requirements of the build system without manually referencing any page or script directories.
     - Dependency Notes: Depends on Task 1 - TypeScript Configuration and Project Setup
     - Context needed from upstream tasks: tsconfig settings, package.json file, and Jest configuration
     - Acceptance Criteria:
       - Webpack successfully compiles background script, content scripts, and pages.
       - Webpack dynamically generates manifest.json based on the project's structure and content.
       - Each page and script can access the dynamically generated index.
       - Both React and vanilla TypeScript pages are supported and built correctly.
       - Webpack compiles HTML, CSS, and JavaScript files as needed.
       - The test suite checks Webpack build functionality.
       - Test suite does not require manual referencing of page or script directories.
       - Tests pass, indicating that build system requirements are met.
3. Background Script and Message Broker, and Broker/Client Functionality Tests:
   - Develop the background script with an efficient message broker using Chrome ports.
   - Create a client library for the message broker that can be used in any content scripts or pages to connect to the broker and subscribe to/dispatch events, with support for wildcard "\*" matches.
   - Create separate type definition files for the background script and message broker, as well as the client library.
   - Develop a test suite for the message broker and client functionality.
     - Dependency Notes: Depends on Task 1 - TypeScript Configuration and Project Setup
     - Context needed from upstream tasks: tsconfig settings, package.json file, and Jest configuration
     - Acceptance Criteria:
       - The message broker efficiently handles messages using Chrome ports.
       - The client library allows for easy connection, subscription, and dispatch of events.
       - Wildcard "\*" matching functionality is supported.
       - Separate type definition files are created and maintained for the background script, message broker, and client library.
       - Type definition files correctly define types and interfaces for the respective components, improving maintainability and enabling better integration with other code.
       - The test suite checks the message broker and client library functionality.
       - Tests cover various scenarios for message handling, subscription, and dispatching.
       - Tests pass, indicating that broker/client requirements are met.

We are building a TypeScript-based Chrome Extension boilerplate targeting the v3 architecture for improved security, privacy, and performance.
TypeScript is our primary language, so ensure understanding of TypeScript concepts, syntax, and best practices.
Webpack is our build tool, responsible for bundling and compiling TypeScript, HTML, CSS, and JavaScript files.
The boilerplate includes an efficient message broker in the background script, facilitating communication within the extension.
Our build system should dynamically scan the project directory, compile pages and content scripts, and generate an accessible index.
Support both React-based and vanilla TypeScript pages for flexibility in project requirements.
Generate a v3 manifest.json file by merging a template with manifest.json fragments from content scripts and pages.
Use Jest as our test runner in a Node.js environment, ensuring high test coverage and confidence in code correctness.
Minimize browser and Chrome Extension API dependencies in code to enable easy testing without browser-specific functionality.
Use mocking and stubbing techniques in Jest to isolate and test code dependent on browser or extension-specific APIs.
Keep these concise context points and testing guidelines in mind to ensure a robust, modular, and efficient TypeScript Chrome Extension boilerplate.
