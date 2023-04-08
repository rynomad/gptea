import { EventEmitter } from "events";

export class CodeElement extends EventEmitter {
  private readonly codeElement: HTMLElement;
  private actionsDiv: HTMLDivElement | undefined = undefined;

  constructor(codeElement: HTMLElement) {
    super();
    this.codeElement = codeElement;
    this.setupActions();
    this.setupAutomation();
    this.setupObserver();
  }

  get language(): string | undefined {
    const classes = Array.from(this.codeElement.classList);
    const languageClass = classes.find((c) => c.startsWith("language-"));
    if (languageClass) {
      return languageClass.substring("language-".length);
    }
    return undefined;
  }

  addAction(
    name: string,
    callback: (language: string | undefined, code: string) => void
  ): void {
    const actionsDiv = this.ensureActionsDiv();
    if (!actionsDiv) return;
    const button = document.createElement("button");
    button.textContent = name;
    button.addEventListener("click", () =>
      callback(this.language, this.codeElement.textContent ?? "")
    );
    button.style.backgroundColor = "white";
    button.style.color = "black";
    button.style.border = "1px solid black";
    button.style.borderRadius = "5px";
    button.style.padding = "5px";
    button.style.marginRight = "5px";
    actionsDiv.appendChild(button);
  }

  addAutomation(
    callback: (language: string | undefined, code: string) => void
  ): void {
    this.on("ready", () =>
      callback(this.language, this.codeElement.textContent ?? "")
    );
  }

  private ensureActionsDiv(): HTMLDivElement | undefined {
    const language = this.language;
    if (!language) return;

    const existingActionsDiv = this.codeElement
      .previousElementSibling as HTMLDivElement | null;
    if (existingActionsDiv?.id === "actions") {
      this.actionsDiv = existingActionsDiv;
      return existingActionsDiv;
    }

    const actionsDiv = document.createElement("div");
    actionsDiv.id = "actions";
    actionsDiv.style.width = "100%";
    actionsDiv.style.height = "4em";
    actionsDiv.style.overflowX = "scroll";
    actionsDiv.style.display = "flex";
    actionsDiv.style.flexDirection = "row";
    this.codeElement.parentElement?.insertBefore(actionsDiv, this.codeElement);
    this.actionsDiv = actionsDiv;
    return actionsDiv;
  }

  private setupActions(): void {
    this.addAction("Copy", (language, code) =>
      navigator.clipboard.writeText(code)
    );
  }

  private setupAutomation(): void {
    this.addAutomation((language, code) =>
      console.log("Automated:", language, code)
    );
  }

  private setupObserver(): void {
    let previousTextContent = this.codeElement.textContent;
    let timeoutHandle: number | undefined = undefined;

    const onTextChanged = () => {
      const currentTextContent = this.codeElement.textContent;
      if (previousTextContent !== currentTextContent) {
        previousTextContent = currentTextContent;
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(
          () => this.emit("ready"),
          5000
        ) as unknown as number;
      }
    };

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "characterData") {
          onTextChanged();
          this.ensureActionsDiv();
        }
      }
    });

    observer.observe(this.codeElement, {
      characterData: true,
      subtree: true,
    });
  }
}

export class CodeElementWatcher extends EventEmitter {
  private observer: MutationObserver;

  constructor() {
    super();

    this.observer = new MutationObserver(this.processCodeElements.bind(this));
    this.observer.observe(document, { childList: true, subtree: true });
  }

  private processCodeElements() {
    const codeElements = document.querySelectorAll("code");
    codeElements.forEach((codeElement: HTMLElement) => {
      if (!codeElement.dataset.processed) {
        const codeElementInstance = new CodeElement(codeElement);
        this.emit("code", codeElementInstance);
        codeElementInstance.on("ready", () => {
          this.emit("ready", codeElementInstance);
        });
        codeElement.dataset.processed = "true";
      }
    });
  }

  public addListener(event: string, listener: any): this {
    super.addListener(event, listener);
    if (event === "code") {
      this.processCodeElements();
    }
    return this;
  }

  public stopWatching() {
    this.observer.disconnect();
  }
}

export default new CodeElementWatcher();
