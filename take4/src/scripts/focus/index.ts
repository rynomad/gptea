import { BrokerClient } from "../../client";

export type FocusEventTypes = "scroll" | "visibilitychange";

export type ScrollEvent = {
  scrollPosition: number;
};

export type VisibilityChangeEvent = {
  visible: boolean;
};

export type FocusEventPayload = ScrollEvent | VisibilityChangeEvent;

const client = new BrokerClient<FocusEventTypes, FocusEventPayload>();

const debounce = (func: () => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
};

const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    client.dispatch({
      type: "visibilitychange",
      payload: { visible: true },
    });
  }
};

const handleScroll = debounce(() => {
  const scrollPosition = window.scrollY;
  client.dispatch({
    type: "scroll",
    payload: { scrollPosition },
  });
}, 100);

document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("scroll", handleScroll);

// Remember to remove event listeners and disconnect the client when appropriate
// For example, you could add the following function:
const cleanup = () => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("scroll", handleScroll);
  client.disconnect();
};

// Call cleanup() when you need to remove the listeners and disconnect the client
