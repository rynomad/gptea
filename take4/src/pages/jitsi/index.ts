import { BrokerClient as Client } from "../../client";
import { EventEmitter } from "events";
import {
  FocusEventTypes,
  ScrollEvent,
  FocusEventPayload,
  VisibilityChangeEvent,
} from "../../scripts/focus";
import { BrokerEvent } from "types";

type User = {
  id: string;
  displayName: string;
};

type NavigationUpdateEvent = {
  user: User;
  tabId: number;
  url: string;
};

class Deffered {
  promise: Promise<any>;
  resolve: any;
  reject: any;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class CoGrouper extends EventEmitter {
  private brokerClient: Client<FocusEventTypes, FocusEventPayload>;
  private localUser: User;
  private windowId: number;
  private userGroups: Record<string, number> = {};
  private remoteTabIds: Record<number, number> = {};

  constructor(localUser: User, windowId: number) {
    super();
    this.localUser = localUser;
    this.windowId = windowId;

    this.brokerClient = new Client<FocusEventTypes, FocusEventPayload>();
    this.brokerClient.on("scroll", async (eventData) => {
      const { tabId } = eventData;
      const { scrollPosition } = eventData.payload as ScrollEvent;

      const tab = (await chrome.tabs.get(tabId!)) as chrome.tabs.Tab;

      console.log(
        "scroll",
        tabId,
        scrollPosition,
        tab.groupId,
        this.userGroups[this.localUser.id]
      );
      if (tab.groupId === this.userGroups[this.localUser.id]) {
        this.emit("scrollEvent", {
          user: this.localUser,
          tabId,
          scrollPosition,
        });
      }
    });

    this.brokerClient.on("visibilitychange", async (eventData) => {
      const { tabId } = eventData;
      const { visible } = eventData.payload as VisibilityChangeEvent;
      const tab = await chrome.tabs.get(tabId!);

      console.log(
        "visibilitychange",
        tabId,
        visible,
        tab.groupId,
        this.userGroups[this.localUser.id]
      );
      if (tab.groupId === this.userGroups[this.localUser.id]) {
        this.emit("visibilityChangeEvent", {
          user: this.localUser,
          tabId,
          visible,
        });
      }
    });
  }

  async reset() {
    const tabs = await chrome.tabs.query({
      pinned: false,
      windowId: this.windowId,
    });

    const newTab = await chrome.tabs.create({
      url: "chrome://newtab",
      windowId: this.windowId,
    });

    const groupId = (this.userGroups[this.localUser.id] =
      await chrome.tabs.group({
        tabIds: newTab.id,
        createProperties: { windowId: this.windowId },
      }));

    await chrome.tabGroups.update(groupId, {
      title: this.localUser.displayName,
    });

    const clearTabs = true; //confirm("Do you want to clear all tabs?");
    if (clearTabs) {
      await new Promise((resolve) =>
        chrome.tabs.remove(
          tabs.map((tab) => tab.id!),
          resolve
        )
      );
    } else {
      await chrome.tabs.group({
        tabIds: tabs.map((tab) => tab.id!),
        groupId,
      });
    }
  }

  async init() {
    chrome.tabs.onCreated.addListener(async (tab) => {
      console.log("onCreated", tab.url, tab.pendingUrl);
      if (
        tab.url === "https://example.com/" &&
        tab.pendingUrl === "https://example.com/"
      ) {
        return;
      }

      if (tab.windowId !== this.windowId) {
        return;
      }

      const groupId = this.userGroups[this.localUser.id];
      if (groupId !== undefined) {
        await new Promise((resolve) =>
          chrome.tabs.group({ tabIds: tab.id!, groupId }, resolve)
        );
      }
    });

    chrome.webNavigation.onCompleted.addListener(async (details) => {
      console.log("onCompleted", details.url);
      const tab = await new Promise<chrome.tabs.Tab>((resolve) =>
        chrome.tabs.get(details.tabId, resolve)
      );

      if (tab.windowId !== this.windowId) {
        console.log("onCompleted: wrong window", tab.windowId, this.windowId);
        return;
      }

      console.log(
        "onCompleted: right group",
        tab.groupId,
        this.userGroups[this.localUser.id]
      );
      if (tab.groupId === this.userGroups[this.localUser.id]) {
        this.emit("NavigationUpdateEvent", {
          user: this.localUser,
          tabId: tab.id!,
          url: tab.url,
        });
      }
    });
  }

  async handleScroll({ user, tabId, scrollPosition }: any) {
    const localTabId = this.remoteTabIds[tabId];

    if (localTabId !== undefined) {
      chrome.scripting.executeScript({
        target: {
          tabId: localTabId,
        },
        func: (scrolly) => window.scrollTo(0, scrolly),
        args: [scrollPosition],
      });
    }
  }

  async handleVisibility({ user, tabId, visible }: any) {
    const localTabId = this.remoteTabIds[tabId];

    if (localTabId !== undefined && visible) {
      chrome.tabs.update(localTabId, { active: true });
    }
  }

  async handleRemoteNavigation({ user, url, tabId }: NavigationUpdateEvent) {
    console.log("handleRemoteNavigation", user, url, tabId);
    const localTabId = this.remoteTabIds[tabId];

    if (localTabId !== undefined) {
      await new Promise((resolve) =>
        chrome.tabs.update(localTabId, { url, active: false }, resolve)
      );
      return;
    }

    const newTab = await chrome.tabs.create({
      url: "https://example.com/",
      windowId: this.windowId,
      active: false,
    });

    this.remoteTabIds[tabId] = newTab.id!;

    let groupId = this.userGroups[user.id];

    if (groupId === undefined) {
      groupId = await chrome.tabs.group({
        tabIds: newTab.id,
        createProperties: { windowId: this.windowId },
      });

      await chrome.tabGroups.update(groupId, { title: user.displayName });

      this.userGroups[user.id] = groupId;
    } else {
      await new Promise((resolve) =>
        chrome.tabs.group({ tabIds: newTab.id, groupId }, resolve)
      );
    }

    await new Promise((resolve) =>
      chrome.tabs.update(newTab.id!, { url, active: false }, resolve)
    );
  }

  async getLocalNavigationEvents(): Promise<NavigationUpdateEvent[]> {
    const groupId = this.userGroups[this.localUser.id];
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) =>
      chrome.tabs.query(
        { groupId, pinned: false, windowId: this.windowId },
        resolve
      )
    );

    return tabs.map((tab) => ({
      user: this.localUser,
      tabId: tab.id!,
      url: tab.url!,
    }));
  }
}

class CoBrowser {
  private api: any;
  private cogrouper: CoGrouper | undefined;
  private users: Record<string, User> = {};

  constructor(api: any) {
    this.api = api;
  }

  async init() {
    const ready = new Deffered();
    this.api.on("dataChannelOpened", () => ready.resolve());
    this.api.on("videoConferenceJoined", async (event: any) => {
      const localUser = { id: event.id, displayName: event.displayName };
      const windowId = parseInt(
        new URLSearchParams(window.location.search).get("windowId") || "",
        10
      );
      this.cogrouper = new CoGrouper(localUser, windowId);

      const roomsInfo = await this.api.getRoomsInfo();
      this.users = roomsInfo.rooms.reduce(
        (acc: Record<string, User>, room: any) => {
          room.participants.forEach((participant: User) => {
            acc[participant.id] = participant;
          });
          return acc;
        },
        {}
      );

      await this.cogrouper.init();
      await this.cogrouper.reset();

      const localNavigationEvents =
        await this.cogrouper.getLocalNavigationEvents();

      for (const userId in this.users) {
        await ready.promise;
        this.api.executeCommand(
          "sendEndpointTextMessage",
          userId,
          JSON.stringify(localNavigationEvents)
        );
      }

      this.cogrouper.on(
        "NavigationUpdateEvent",
        async (event: NavigationUpdateEvent) => {
          console.log(
            'on("NavigationUpdateEvent", async (event: NavigationUpdateEvent'
          );
          await ready.promise;
          console.log("post ready", this.users);
          for (const userId in this.users) {
            this.api.executeCommand(
              "sendEndpointTextMessage",
              userId,
              JSON.stringify(event)
            );
          }
        }
      );

      this.cogrouper.on("scrollEvent", async (event: any) => {
        await ready.promise;
        for (const userId in this.users) {
          this.api.executeCommand(
            "sendEndpointTextMessage",
            userId,
            JSON.stringify({ type: "scrollEvent", event })
          );
        }
      });

      this.cogrouper.on("visibilityChangeEvent", async (event: any) => {
        await ready.promise;
        for (const userId in this.users) {
          this.api.executeCommand(
            "sendEndpointTextMessage",
            userId,
            JSON.stringify({ type: "visibilityChangeEvent", event })
          );
        }
      });
    });

    this.api.on("participantJoined", async (event: any) => {
      const user = { id: event.id, displayName: event.displayName };
      this.users[user.id] = user;
      if (this.cogrouper) {
        const localNavigationEvents =
          await this.cogrouper.getLocalNavigationEvents();
        await ready.promise;
        this.api.executeCommand(
          "sendEndpointTextMessage",
          user.id,
          JSON.stringify(localNavigationEvents)
        );
      }
    });

    this.api.on("participantLeft", async (event: any) => {
      delete this.users[event.id];
    });

    this.api.on("endpointTextMessageReceived", async (event: any) => {
      const eventData = JSON.parse(event.data.eventData.text);

      if (eventData.type === "scrollEvent") {
        this.cogrouper?.handleScroll(eventData.event);
      } else if (eventData.type === "visibilityChangeEvent") {
        this.cogrouper?.handleVisibility(eventData.event);
      } else if (Array.isArray(eventData)) {
        eventData.forEach((navEvent: NavigationUpdateEvent) =>
          this.cogrouper?.handleRemoteNavigation(navEvent)
        );
      } else {
        this.cogrouper?.handleRemoteNavigation(
          eventData as NavigationUpdateEvent
        );
      }
    });
  }
}

// Create an instance of CoBrowser with window.api

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
    api: any;
  }
}

export type JitsiEvent = "jitsi_readyToClose" | "jitsi_videoConferenceJoined";

export type jitsi_readyToClose = {
  message: string;
};

export type jitsi_videoConferenceJoined = {
  id: string;
  displayName: string;
  role: string;
};

export type JitsiEventData = jitsi_readyToClose | jitsi_videoConferenceJoined;

async function init() {
  const client = new Client<JitsiEvent, JitsiEventData>();

  const domain = "meet.jit.si";
  const options = {
    roomName: "goodloops2",
    parentNode: document.getElementById("jitsi-container"),
    width: "100%",
    height: "100%",
  };

  const api = (window.api = new window.JitsiMeetExternalAPI(domain, options));

  api.addEventListeners({
    readyToClose: () => {
      client.dispatch({
        type: "jitsi_readyToClose",
        payload: {
          message: "readyToClose",
        },
      });
    },
    videoConferenceJoined: (params: any) => {
      api.executeCommand("setTileView", true);
      client.dispatch({
        type: "jitsi_videoConferenceJoined",
        payload: {
          id: params.id,
          displayName: params.displayName,
          role: params.role,
        },
      });
    },
    // Add other Jitsi events you want to listen to and broadcast
  });

  chrome.windows.getCurrent({ populate: true }, (windowInfo) => {
    if (windowInfo.type !== "popup") {
      chrome.system.display.getInfo((displays) => {
        const screenHeight = displays[0].workArea.height;
        const screenWidth = displays[0].workArea.width;

        // Create new popup window
        chrome.windows.create({
          url: chrome.runtime.getURL(
            "/pages/jitsi.html?windowId=" + windowInfo.id
          ),
          type: "popup",
          width: 300,
          height: screenHeight,
          left: 0,
          top: 0,
        });

        // Update the original window
        if (!windowInfo.id) return;
        chrome.windows.update(windowInfo.id, {
          left: 300,
          top: 0,
          width: screenWidth - 300,
          height: screenHeight,
        });

        // Close the current Jitsi instance
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.remove(tabs[0].id);
          }
        });
      });
    }
  });

  const cobrowser = new CoBrowser(window.api);
  cobrowser.init();
}

init();
