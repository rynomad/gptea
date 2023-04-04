import "./index.css";

declare const PAGE_INDEX: { [name: string]: string };

const app = document.getElementById("app");

if (app) {
  const list = document.createElement("ul");
  list.className = "page-list";

  Object.entries(PAGE_INDEX).forEach(([name, pagePath]) => {
    if (name === "popup") {
      return;
    }
    const listItem = document.createElement("li");
    listItem.className = "page-list-item";

    const link = document.createElement("a");
    link.href = "#";
    link.textContent = name;
    link.onclick = () => {
      chrome.tabs.create({
        url: pagePath,
        pinned: true,
      });
    };

    listItem.appendChild(link);
    list.appendChild(listItem);
  });

  app.appendChild(list);
}
