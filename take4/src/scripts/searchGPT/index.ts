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
    this.dbPromise = this.openDB(
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

  async upgradeDB(createStoreName: string) {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      console.log("got db");
      await this.closeDB(db);
      console.log("closed db");
    }

    this.DB_VERSION += 1;
    localStorage.setItem("db_version", this.DB_VERSION.toString());
    this.dbPromise = this.openDB(
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

function findClosestScrollableParent(element: HTMLElement): HTMLElement | null {
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    const overflowY = window.getComputedStyle(currentElement).overflowY;
    if (overflowY === "scroll" || overflowY === "auto") {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  return null;
}

function debounce(
  func: (...args: any[]) => void,
  wait: number
): (...args: any[]) => void {
  let timeout: number | undefined;

  return function (...args: any[]): void {
    const later = () => {
      timeout = undefined;
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait) as unknown as number;
  };
}

interface TooltipWithInfo extends HTMLElement {
  matchingElement: HTMLElement;
  updateTooltipPosition: () => void;
}

function setupSearchBox(gptDatabase: GPTDatabase): void {
  const searchBox = document.createElement("input");
  searchBox.type = "text";
  searchBox.placeholder = "Search...";
  searchBox.style.position = "fixed";
  searchBox.style.top = "10px";
  searchBox.style.right = "10px";
  searchBox.style.border = "1px solid #ccc";
  searchBox.style.borderRadius = "3px";
  searchBox.style.padding = "5px";
  searchBox.style.fontSize = "14px";
  searchBox.style.color = "black";
  setTimeout(() => document.body.appendChild(searchBox), 100);

  let activeTooltips: TooltipWithInfo[] = [];

  function clearTooltips() {
    for (const tooltip of activeTooltips) {
      const scrollableParent = findClosestScrollableParent(
        tooltip.matchingElement
      );
      if (scrollableParent) {
        scrollableParent.removeEventListener(
          "scroll",
          tooltip.updateTooltipPosition
        );
      }
      tooltip.remove();
    }
    activeTooltips = [];
  }

  const debouncedSearch = debounce(async (event: Event) => {
    clearTooltips();

    const searchTerm = (event.target as HTMLInputElement).value;

    if (searchTerm.length < 4) {
      return;
    }

    const results = await gptDatabase.search(searchTerm);

    for (const result of results) {
      const matchingElements = Array.from(
        document.querySelectorAll("div")
      ).filter((element) => element.innerText === result.title);

      for (const element of matchingElements) {
        const tooltip = document.createElement(
          "div"
        ) as unknown as TooltipWithInfo;
        tooltip.matchingElement = element;

        const scrollableParent = findClosestScrollableParent(element);
        if (scrollableParent) {
          scrollableParent.addEventListener("scroll", updateTooltipPosition);
        }
        function updateTooltipPosition() {
          const parentRect = scrollableParent!.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          tooltip.style.left = `${parentRect.right + 5}px`;
          tooltip.style.top = `${elementRect.top}px`;
        }

        tooltip.updateTooltipPosition = updateTooltipPosition;

        tooltip.style.position = "fixed";
        tooltip.style.zIndex = "10";
        tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        tooltip.style.color = "white";
        tooltip.style.borderRadius = "3px";
        tooltip.style.padding = "5px";
        tooltip.style.fontSize = "12px";
        tooltip.style.maxWidth = "500px";
        tooltip.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        // Add a left-pointing nub
        const nub = document.createElement("div");
        nub.style.position = "absolute";
        nub.style.width = "0";
        nub.style.height = "0";
        nub.style.borderTop = "6px solid transparent";
        nub.style.borderBottom = "6px solid transparent";
        nub.style.borderLeft = "6px solid white";
        nub.style.top = "10px";
        nub.style.right = "-6px";
        tooltip.appendChild(nub);

        // Bring the tooltip to the front when hovered
        tooltip.addEventListener("mouseenter", () => {
          tooltip.style.zIndex = "1000";
        });

        tooltip.addEventListener("mouseleave", () => {
          tooltip.style.zIndex = "10";
        });

        tooltip.matchingElement = element;
        tooltip.updateTooltipPosition = updateTooltipPosition;

        updateTooltipPosition();

        tooltip.innerHTML = Array.from(result.matches)
          .map((match) => {
            const firstOccurrenceIndex = match
              .toLowerCase()
              .indexOf(searchTerm.toLowerCase());
            const start = Math.max(0, firstOccurrenceIndex - 25);
            const end = Math.min(
              match.length,
              firstOccurrenceIndex + searchTerm.length + 25
            );
            const truncatedMatch = `...${match.slice(start, end)}...`;
            return truncatedMatch.replace(
              new RegExp(`(${searchTerm})`, "gi"),
              '<mark style="background-color: yellow;">$1</mark>'
            );
          })
          .join("<br>");

        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        element.parentNode!.insertBefore(wrapper, element);
        wrapper.appendChild(element);
        wrapper.appendChild(tooltip);
        activeTooltips.push(tooltip);
      }
    }
  }, 1000);

  searchBox.addEventListener("input", debouncedSearch);
}

(async () => {
  const client = new BrokerClient();
  const db = new GPTDatabase();
  // alert("db created");
  setupSearchBox(db);
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
