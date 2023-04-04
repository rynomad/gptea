import mermaidAPI from "mermaid";

const codeBlocks = new Map();
let documentObserver: any;

function createMermaidContainer() {
  const container = document.createElement("div");
  container.classList.add("mermaid-container");
  return container;
}

function renderMermaid(container: any, mermaidCode: any) {
  try {
    // Temporarily disconnect the document observer to prevent infinite loops
    documentObserver.disconnect();

    mermaidAPI.render(randomSelector(10), mermaidCode, (svgCode) => {
      container.innerHTML = svgCode;

      // Reconnect the document observer
      observeDocument();
    });
  } catch (e) {
    console.log(e);
  }
}

function isMermaidGraph(codeElement: any) {
  const mermaidGraphTypes = [
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "gantt",
    "pie",
    "gitGraph",
    "flowchart",
  ];

  const codeContent = codeElement.textContent.trim();
  const firstLine = codeContent.split("\n")[0].trim();

  return mermaidGraphTypes.some((type) => firstLine.startsWith(type));
}

function observeCodeBlock(codeBlock: any) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        const currentText = codeBlock.textContent || "";

        const container = codeBlocks.get(codeBlock);
        if (container) {
          renderMermaid(container, currentText);
        }
      }
    });
  });

  observer.observe(codeBlock, { characterData: true, subtree: true });

  // Initial rendering of the Mermaid graph
  const currentText = codeBlock.textContent || "";
  const container = createMermaidContainer();
  codeBlocks.set(codeBlock, container);
  codeBlock.insertAdjacentElement("afterend", container);
  renderMermaid(container, currentText);
}

function processNewNode(node: any) {
  if (node.nodeName === "CODE" && isMermaidGraph(node)) {
    observeCodeBlock(node);
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    node.querySelectorAll("code").forEach((codeElement: any) => {
      if (isMermaidGraph(codeElement)) {
        observeCodeBlock(codeElement);
      }
    });
  }
}

function observeDocument() {
  documentObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => processNewNode(node));
      }
    });
  });

  documentObserver.observe(document, { childList: true, subtree: true });
}

// Wait for the Mermaid library to be loaded
mermaidAPI.initialize({ startOnLoad: false });
console.log("Mermaid initialized");

// Initial scan of the DOM
const codeElements = document.querySelectorAll("code");
codeElements.forEach((codeElement) => {
  if (isMermaidGraph(codeElement)) {
    observeCodeBlock(codeElement);
  }
});

// Observe changes in the DOM and process new code blocks when they are added
observeDocument();
function randomSelector(length: any) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "r";

  for (let i = 0; i < length - 1; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }

  return result;
}
