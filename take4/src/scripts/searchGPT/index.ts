import { BrokerClient } from "../../client";
import { openDB, IDBPDatabase } from "idb";

type ConversationItem = {
  id: string;
  title: string;
  create_time: string;
  update_time: string;
};

type Conversation = {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: any;
};

class Deferred {
  promise: Promise<void>;
  resolve: (() => void) | undefined;
  reject: (() => void) | undefined;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class DBJobQueue {
  private queue: (() => Promise<void>)[] = [];
  private isRunning: boolean = false;
  private deferred: Deferred | undefined;

  async addJob(job: () => Promise<void>) {
    this.queue.push(job);
    if (!this.isRunning) {
      this.isRunning = true;
      await this.processQueue();
      this.isRunning = false;
    } else {
      await this.deferred?.promise;
    }
  }

  private async processQueue() {
    this.deferred = new Deferred();
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      // console.log("job", job);
      if (job) {
        await job();
      }
      // console.log("job done");
    }
    this.deferred.resolve && this.deferred.resolve();
  }
}

class GPTDatabase {
  private dbPromise: Promise<IDBPDatabase> | undefined;
  private DB_NAME = "gpt";
  private DB_VERSION = 1;
  private META_STORE = "meta";
  private jobQueue: DBJobQueue;

  constructor() {
    this.init();
    this.jobQueue = new DBJobQueue();
  }

  private async closeDB(db: IDBPDatabase): Promise<void> {
    db.close();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  private async openDB(
    name: string,
    version: number,
    onUpgradeNeeded: (
      db: IDBPDatabase,
      oldVersion: number,
      newVersion: number
    ) => void
  ) {
    return await openDB(name, version, {
      upgrade(db, oldVersion, newVersion) {
        onUpgradeNeeded(db, oldVersion, newVersion as number);
      },
    });
  }

  async init() {
    const storedVersion = parseInt(localStorage.getItem("db_version") || "1");
    this.DB_VERSION = storedVersion;
    this.dbPromise = this.openDBWithRetries(
      this.DB_NAME,
      this.DB_VERSION,
      (db, oldVersion, newVersion) => {
        if (oldVersion < 1) {
          const indexStore = db.createObjectStore(this.META_STORE, {
            keyPath: "id",
          });
          // Index by title
          indexStore.createIndex("title", "title");

          // Index by create_time
          indexStore.createIndex("create_time", "create_time");

          // Index by update_time
          indexStore.createIndex("update_time", "update_time");
        }
        // Additional upgrades can be handled here
      }
    );
  }

  private async openDBWithRetries(
    name: string,
    version: number,
    upgradeCallback: (
      db: IDBPDatabase,
      oldVersion: number,
      newVersion: number
    ) => void
  ): Promise<IDBPDatabase> {
    try {
      return await this.openDB(name, version, upgradeCallback);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.message.match(
          /The requested version \(\d+\) is less than the existing version \(\d+\)./
        )
      ) {
        const [, requestedVersion, existingVersion] = error.message.match(
          /The requested version \((\d+)\) is less than the existing version \((\d+)\)./
        )!;
        const newVersion = parseInt(existingVersion);
        this.DB_VERSION = newVersion;
        localStorage.setItem("db_version", newVersion.toString());
        return this.openDBWithRetries(name, newVersion, upgradeCallback);
      } else {
        throw error;
      }
    }
  }

  async upgradeDB(createStoreName: string) {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      console.log("got db");
      await this.closeDB(db);
      console.log("closed db");
    }

    this.DB_VERSION += 1;
    localStorage.setItem("db_version", this.DB_VERSION.toString());
    this.dbPromise = this.openDBWithRetries(
      this.DB_NAME,
      this.DB_VERSION,
      (db, oldVersion, newVersion) => {
        console.log("creating store", createStoreName);
        if (!db.objectStoreNames.contains(createStoreName)) {
          db.createObjectStore(createStoreName, { keyPath: "id" });
        }
      }
    );
  }

  async addConversationItems(items: ConversationItem[]) {
    await this.jobQueue.addJob(async () => {
      try {
        const db = await this.dbPromise;
        const tx = db!.transaction(this.META_STORE, "readwrite");
        const indexStore = tx.objectStore(this.META_STORE);

        for (const item of items) {
          await indexStore.put(item);
        }

        await tx.done;
      } catch (error) {
        console.warn("Error in addConversationItems transaction:", error);
      }
    });
  }

  async createConversationStore(id: string, conversation: any) {
    const { title, create_time, update_time, mapping } = conversation;

    await this.jobQueue.addJob(async () => {
      const db = await this.dbPromise;

      if (!db!.objectStoreNames.contains(id)) {
        console.log("creating store", id);
        await this.upgradeDB(id);
        console.log("store created1", id);
      }
    });

    await this.jobQueue.addJob(async () => {
      const db = await this.dbPromise;
      console.log("store created2", id);

      const tx = db!.transaction(id, "readwrite");
      const conversationStore = tx.objectStore(id);

      const indexObj = { id, title, create_time, update_time };
      console.log("putting index", indexObj);
      await conversationStore.put(indexObj);
      for (const key in mapping) {
        const obj = mapping[key];
        await conversationStore.put(obj);
      }
      console.log("putting index done");
      await tx.done;
    });
  }

  async scan(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.jobQueue.addJob(async () => {
        // alert("scan start");
        const db = await this.dbPromise;
        const tx = db!.transaction(this.META_STORE, "readonly");
        const indexStore = tx.objectStore(this.META_STORE);
        let cursor = await indexStore.openCursor();

        const promises = [];

        while (cursor) {
          const { value } = cursor;

          cursor = await cursor.continue();
          // console.log("checking", value.id, "...");
          promises.push(
            (async () => {
              try {
                const conversationStoreTx = db!.transaction(
                  value.id,
                  "readonly"
                );
                const conversationStore = conversationStoreTx.objectStore(
                  value.id
                );
                const indexObj = await conversationStore.get(value.id);

                if (indexObj) {
                  // Convert Unix timestamp to milliseconds
                  const indexUpdateTime = new Date(
                    indexObj.update_time * 1000
                  ).getTime();

                  // Create a Date object using the UTC timestamp
                  const valueUpdateTime = new Date(value.update_time).getTime();

                  // Calculate the timezone offset in milliseconds
                  const timezoneOffset =
                    new Date().getTimezoneOffset() * 60 * 1000;

                  // Adjust the valueUpdateTime for the timezone offset
                  const valueUpdateTimeAdjusted =
                    valueUpdateTime - timezoneOffset;

                  // Calculate the absolute time difference
                  const timeDifference = Math.abs(
                    indexUpdateTime - valueUpdateTimeAdjusted
                  );

                  if (timeDifference > 1000) {
                    console.log(
                      "found difference",
                      value.id,
                      indexUpdateTime,
                      valueUpdateTimeAdjusted,
                      timeDifference
                    );
                    resolve(value.id);
                    return;
                  }
                } else {
                  console.log("found missing", value.id);
                  resolve(value.id);
                  return;
                }
              } catch (e) {
                console.log("found missing", value.id);
                resolve(value.id);
                return;
              }
            })()
          );
        }

        await Promise.all(promises);

        resolve(null);
        return;
      });
    });
  }

  async searchConversation(
    conversationId: string,
    searchTerm: string
  ): Promise<{ conversationId: string; matches: Set<string> } | null> {
    try {
      const db = await this.dbPromise;

      if (!db!.objectStoreNames.contains(conversationId)) {
        return null;
      }

      const tx = db!.transaction(conversationId, "readonly");
      const conversationStore = tx.objectStore(conversationId);
      let cursor = await conversationStore.openCursor();
      const matches: Set<string> = new Set();
      const rval = { conversationId, matches, title: "" };

      while (cursor) {
        const value = cursor.value;

        if (value.title) {
          rval.title = value.title;
        }

        if (
          value.message &&
          value.message.content &&
          value.message.content.parts
        ) {
          for (const part of value.message.content.parts) {
            if (part.toLowerCase().includes(searchTerm.toLowerCase())) {
              matches.add(part);
            }
          }
        }

        cursor = await cursor.continue();
      }

      if (matches.size > 0) {
        return rval;
      } else {
        return null;
      }
    } catch (error) {
      console.warn("Error while searching conversation:", error);
      throw error;
    }
  }

  async search(
    searchTerm: string
  ): Promise<
    Array<{ conversationId: string; matches: Set<string>; title: string }>
  > {
    return new Promise(async (resolve, reject) => {
      this.jobQueue.addJob(async () => {
        try {
          const db = await this.dbPromise;
          const tx = db!.transaction(this.META_STORE, "readonly");
          const indexStore = tx.objectStore(this.META_STORE);
          let cursor = await indexStore.openCursor();

          const searchPromises: Promise<{
            conversationId: string;
            matches: Set<string>;
          } | null>[] = [];

          while (cursor) {
            const value = cursor.value;
            const conversationId = value.id;
            searchPromises.push(
              this.searchConversation(conversationId, searchTerm)
            );
            cursor = await cursor.continue();
          }

          const results = await Promise.all(searchPromises);
          const filteredResults = results.filter(
            (result) => result !== null
          ) as Array<{
            conversationId: string;
            matches: Set<string>;
            title: string;
          }>;

          resolve(filteredResults);
        } catch (error) {
          console.warn("Error while searching:", error);
          reject(error);
        }
      });
    });
  }
}

(async () => {
  const client = new BrokerClient();
  const search = new GPTSearch();
  const db = search.db;
  // alert("db created");
  if (window.location.hash === "#scan") {
    client.on("NETWORK_RESPONSE", async ({ payload }: any) => {
      if (payload.url?.includes("backend-api")) {
        // console.log("NETWORK_RESPONSE", payload.url, payload.body);
        const body = JSON.parse(payload.body);
        if (payload.url.includes("conversations")) {
          await db.addConversationItems(body.items);
        } else if (payload.url.includes("conversation/")) {
          // alert("conversation found:  " + payload.url);
          const { pathname } = new URL(payload.url);
          const id = pathname.split("/").pop();
          await db.createConversationStore(id as string, body);
          // alert("scan for next update");
          const next = await db.scan();
          // alert("scan complete");
          chrome.runtime.sendMessage(
            {
              action: "stopInspectNetwork",
            },
            () => {
              // alert("stop inspect network");
              if (next) {
                // alert("next update found" + id + " " + next);
                window.location.href = location.href.replace(
                  id as string,
                  next as string
                );
              } else {
                alert("no more updates found");
                window.location.href = location.href.split("#")[0];
              }
            }
          );
        }
      }
    });
    const response = await new Promise((resolve) =>
      chrome.runtime.sendMessage(
        {
          action: "inspectNetwork",
        },
        resolve
      )
    );
  }
})();

function createSearchResultElement(
  title: string,
  previews: string[],
  searchTerm: string
): HTMLElement {
  const resultContainer = document.createElement("a");
  resultContainer.className =
    "search-result-item flex py-3 px-3 items-center gap-3 relative rounded-md hover:bg-[#2A2B32] cursor-pointer break-all hover:pr-4 group";
  resultContainer.style.position = "relative";

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke-width", "2");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("class", "h-4 w-4");
  icon.innerHTML =
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';

  const titleContainer = document.createElement("div");
  titleContainer.className =
    "flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative";
  titleContainer.textContent = title;

  const fadeEffect = document.createElement("div");
  fadeEffect.className =
    "absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-gray-900 group-hover:from-[#2A2B32]";
  titleContainer.appendChild(fadeEffect);

  resultContainer.appendChild(icon);
  resultContainer.appendChild(titleContainer);

  const tooltip = document.createElement("span");
  tooltip.className =
    "hidden group-hover:block absolute bg-gray-800 text-white text-sm rounded-md shadow-lg whitespace-pre-wrap border border-gray-700";
  tooltip.style.zIndex = "10";
  tooltip.style.position = "fixed";
  tooltip.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.3)";
  resultContainer.appendChild(tooltip);

  const highlightSearchTerm = (text: string): string => {
    return text
      .split(new RegExp(`(${searchTerm})`, "gi"))
      .map((part, index) => {
        if (part.toLowerCase() === searchTerm.toLowerCase()) {
          return `<span style="background-color: #e8e8e8; color: #000; border-radius: 2px;">${part}</span>`;
        }
        return part;
      })
      .join("");
  };

  const previewHtml = previews
    .map((preview) => {
      const searchTermIndex = preview
        .toLowerCase()
        .indexOf(searchTerm.toLowerCase());
      const previewStart = Math.max(0, searchTermIndex - 40);
      const previewEnd = Math.min(
        preview.length,
        searchTermIndex + searchTerm.length + 40
      );
      const previewSnippet =
        (previewStart > 0 ? "..." : "") +
        preview.slice(previewStart, previewEnd) +
        (previewEnd < preview.length ? "..." : "");
      return highlightSearchTerm(previewSnippet);
    })
    .join("<br>");

  tooltip.innerHTML = previewHtml;

  resultContainer.addEventListener("mouseover", (event: MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    tooltip.style.left = `${
      rect.right + 2 * parseFloat(getComputedStyle(resultContainer).fontSize)
    }px`;
    tooltip.style.top = `${rect.top + window.scrollY}px`;
    tooltip.classList.remove("hidden");
  });

  resultContainer.addEventListener("mouseout", () => {
    tooltip.classList.add("hidden");
  });

  return resultContainer;
}

function createSearchItem(): HTMLInputElement | undefined {
  const anchorElements = document.querySelectorAll("a.flex");
  let newChatElement: HTMLElement | null = null;

  for (const anchor of anchorElements) {
    if (anchor.textContent && anchor.textContent.includes("New chat")) {
      newChatElement = anchor as HTMLElement;
      break;
    }
  }

  if (!newChatElement) {
    console.error("New chat element not found.");
    return;
  }

  const searchContainer = document.createElement("div");
  searchContainer.className =
    "search-input-container flex py-3 px-3 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white text-sm mb-2 flex-shrink-0 border border-white/20";

  const searchIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  searchIcon.setAttribute("stroke", "currentColor");
  searchIcon.setAttribute("fill", "none");
  searchIcon.setAttribute("stroke-width", "2");
  searchIcon.setAttribute("viewBox", "0 0 24 24");
  searchIcon.setAttribute("stroke-linecap", "round");
  searchIcon.setAttribute("stroke-linejoin", "round");
  searchIcon.setAttribute("class", "h-4 w-4");
  searchIcon.innerHTML =
    '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>';

  const searchInput = document.createElement("input");
  searchInput.setAttribute("type", "text");
  searchInput.setAttribute("placeholder", "Search Chats...");
  searchInput.style.border = "none";
  searchInput.style.backgroundColor = "transparent";
  searchInput.style.color = "white";
  searchInput.style.textDecoration = "none";
  searchInput.style.width = "100%";
  searchInput.style.padding = "0";
  searchInput.style.marginBottom = "2px";
  searchInput.style.borderBottom = "1px solid white";
  searchInput.style.outline = "none";

  searchInput.addEventListener("focus", () => {
    searchInput.style.borderBottom = "2px solid rgba(255, 255, 255, 0.8)";
    searchInput.style.boxShadow = "none";
  });
  searchInput.addEventListener("blur", () => {
    searchInput.style.borderBottom = "1px solid white";
  });

  searchContainer.appendChild(searchIcon);
  searchContainer.appendChild(searchInput);
  newChatElement.parentNode!.prepend(searchContainer);

  return searchInput;
}

class GPTSearch {
  private gptDatabase: GPTDatabase;
  private searchInput: HTMLInputElement | undefined;
  private searchResultsContainer: HTMLElement | undefined | null;

  constructor() {
    this.gptDatabase = new GPTDatabase();
    this.ensureSearchElementInDOM();
  }

  get db() {
    return this.gptDatabase;
  }

  private ensureSearchElementInDOM(): void {
    const insertSearchElementIfMissing = () => {
      const searchInputContainer = document.querySelector(
        ".search-input-container"
      );
      if (!searchInputContainer) {
        this.searchInput = createSearchItem();
        this.init();
      }
    };

    const checkAndInsertSearchElement = () => {
      requestIdleCallback(() => {
        insertSearchElementIfMissing();
        checkAndInsertSearchElement();
      });
    };

    checkAndInsertSearchElement();
  }

  private init(): void {
    this.searchInput?.addEventListener("input", async (event) => {
      const searchTerm = (event.target as HTMLInputElement).value;
      this.clearSearchResults();

      if (searchTerm.length > 4) {
        console.log("Searching for", searchTerm);
        const results = await this.gptDatabase.search(searchTerm);
        this.insertSearchResults(results);
      }
    });
  }

  private clearSearchResults(): void {
    const searchResultElements = document.querySelectorAll(
      ".search-result-item"
    );
    searchResultElements.forEach((element) => {
      element.remove();
    });
  }

  private insertSearchResults(
    searchResults: Array<{
      conversationId: string;
      matches: Set<string>;
      title: string;
    }>
  ): void {
    const targetContainer = document.querySelector(
      ".flex.flex-col.gap-2.text-gray-100.text-sm"
    );
    console.log("Target container", targetContainer);
    if (targetContainer) {
      for (const result of searchResults.reverse()) {
        const searchResultElement = createSearchResultElement(
          result.title,
          Array.from(result.matches),
          this.searchInput!.value
        );
        searchResultElement.setAttribute(
          "href",
          `https://chat.openai.com/chat/${result.conversationId}`
        );
        targetContainer.prepend(searchResultElement);
      }
    }
  }
}

// Initialize the GPTSearch class
const gptSearch = new GPTSearch();
