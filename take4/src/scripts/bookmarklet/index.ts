let scriptCounter = 0;

function getNextScriptId() {
  return `tempScript_${scriptCounter++}`;
}

function getDefaultExport(codeElement: HTMLElement) {
  const scriptId = getNextScriptId();
  codeElement.setAttribute("data-script-id", scriptId);

  const script = document.createElement("script");
  script.id = scriptId;
  script.src = URL.createObjectURL(
    new Blob(
      [
        `
    (async () => {
      try {
        const module = await import("${URL.createObjectURL(
          new Blob([codeElement.textContent!], { type: "text/javascript" })
        )}");
        if (typeof module.default === 'string' && module.default.startsWith('javascript:(')) {
          window.postMessage({scriptId: "${scriptId}", defaultExport: module.default}, "*");
        } else {
          window.postMessage({scriptId: "${scriptId}", defaultExport: null}, "*");
        }
      } catch (error) {
        console.error(error);
        window.postMessage({scriptId: "${scriptId}", defaultExport: null}, "*");
      }
    })();`,
      ],
      { type: "text/javascript" }
    )
  );
  document.head.appendChild(script);
}

function createDragHandle(exportValue: string, codeElement: HTMLElement) {
  const existingDragHandle = codeElement.previousElementSibling;
  if (
    existingDragHandle &&
    existingDragHandle.classList.contains("drag-handle")
  ) {
    existingDragHandle.remove();
  }

  const dragHandle = document.createElement("div");
  dragHandle.classList.add("drag-handle");
  dragHandle.textContent = "drag me to bookmarks";
  dragHandle.style.backgroundColor = "blue";
  dragHandle.style.borderRadius = "5px";
  dragHandle.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("text/plain", exportValue);
  });
  codeElement.insertAdjacentElement("beforebegin", dragHandle);
}

function handleDefaultExport(event: MessageEvent) {
  console.log(event);
  if (!event.data.scriptId) return;
  const script = document.getElementById(event.data.scriptId);
  if (script) {
    script.remove();
  }
  if (event.data.defaultExport) {
    console.log(event.data.defaultExport);
    const codeElement = document.querySelector(
      `code[data-script-id="${event.data.scriptId}"]`
    );
    if (codeElement) {
      createDragHandle(event.data.defaultExport, codeElement as HTMLElement);
    }
  }
}

window.addEventListener("message", handleDefaultExport, false);

function handleAddedNode(node: HTMLElement) {
  if (
    node.nodeType === Node.ELEMENT_NODE &&
    node.tagName.toLowerCase() === "code"
  ) {
    getDefaultExport(node);
    observer.observe(node, {
      childList: true,
      characterData: true,
      characterDataOldValue: true,
    });
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const newCodeElements = node.querySelectorAll("code.language-javascript");
    newCodeElements.forEach((codeElement) => {
      getDefaultExport(codeElement as HTMLElement);
      observer.observe(codeElement, {
        childList: true,
        characterData: true,
        characterDataOldValue: true,
      });
    });
  }
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach(handleAddedNode as (node: Node) => void);
    } else if (
      mutation.type === "characterData" &&
      (mutation.target as HTMLElement).tagName.toLowerCase() === "code"
    ) {
      const oldContent = mutation.oldValue;
      const newContent = mutation.target.textContent;

      if (oldContent !== newContent) {
        getDefaultExport(mutation.target as HTMLElement);
      }
    }
  });
});

const codeElements = document.querySelectorAll("code.language-javascript");
codeElements.forEach((codeElement) => {
  console.log(codeElement);
  getDefaultExport(codeElement as HTMLElement);

  // Observe the code element for changes
  observer.observe(codeElement, {
    childList: true,
    characterData: true,
    characterDataOldValue: true,
  });
});

console.log("observing");

// Observe the entire DOM for new code elements
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
