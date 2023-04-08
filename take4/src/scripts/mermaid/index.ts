import mermaidAPI from "mermaid";

const codeBlocks = new Map<Element, HTMLDivElement>();

function createMermaidContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.classList.add("mermaid-container");
  container.setAttribute(
    "style",
    "background-color: #e0f0ff; border-radius: 8px; padding: 10px; cursor: pointer;"
  );
  container.onclick = () => showModal(container.innerHTML);
  return container;
}

function showModal(svgCode: string): void {
  const modal = document.createElement("div");
  modal.classList.add("mermaid-modal");
  modal.setAttribute(
    "style",
    "position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 9999; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center;"
  );
  modal.onclick = () => closeModal(modal);

  const modalContent = document.createElement("div");
  modalContent.setAttribute(
    "style",
    "background-color: white; width: 80%; height: 80%; border-radius: 8px; overflow: auto; position: relative;"
  );
  modalContent.innerHTML = svgCode;

  const closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;";
  closeButton.setAttribute(
    "style",
    "position: absolute; right: 10px; top: 10px; border: none; background: none; font-size: 24px; font-weight: bold; cursor: pointer;"
  );
  closeButton.onclick = (e) => {
    e.stopPropagation();
    closeModal(modal);
  };

  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

function closeModal(modal: HTMLDivElement): void {
  document.body.removeChild(modal);
}

function renderMermaid(container: HTMLDivElement, mermaidCode: string): void {
  try {
    mermaidAPI.render(randomSelector(10), mermaidCode, (svgCode) => {
      container.innerHTML = svgCode;
    });
  } catch (e) {
    console.log(e);
  }
}

function isMermaidGraph(codeElement: Element): boolean {
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

  const codeContent = codeElement.textContent?.trim() || "";
  const firstLine = codeContent.split("\n")[0].trim();
  return mermaidGraphTypes.some((type) => firstLine.startsWith(type));
}

function observeCodeBlock(codeElement: Element): MutationObserver {
  const observer = new MutationObserver(() => {
    const container = codeBlocks.get(codeElement);
    if (container) {
      renderMermaid(container, codeElement.textContent || "");
    }
  });

  observer.observe(codeElement, { characterData: true, subtree: true });

  return observer;
}

function processCodeElement(codeElement: Element): void {
  if (isMermaidGraph(codeElement) && !codeBlocks.has(codeElement)) {
    const currentText = codeElement.textContent || "";
    const container = createMermaidContainer();
    codeBlocks.set(codeElement, container);
    codeElement.insertAdjacentElement("afterend", container);
    renderMermaid(container, currentText);

    const observer = observeCodeBlock(codeElement);
    codeElement.addEventListener("DOMNodeRemoved", () => {
      observer.disconnect();
      codeBlocks.delete(codeElement);
    });
  }
}

function checkCodeElements(): void {
  const codeElements = document.querySelectorAll("code");
  codeElements.forEach((codeElement) => {
    processCodeElement(codeElement);
  });

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(checkCodeElements);
  } else {
    setTimeout(checkCodeElements, 1000);
  }
}

mermaidAPI.initialize({ theme: "neutral", startOnLoad: false });
console.log("Mermaid initialized");

checkCodeElements();

function randomSelector(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "r";

  for (let i = 0; i < length - 1; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }

  return result;
}
