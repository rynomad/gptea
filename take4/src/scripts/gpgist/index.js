import { BrokerClient } from "../../client";
import codeElementsWatcher from "../../lib/codeHandles";
const buttonStyle = `
  display: inline-block;
  background-color: #0366d6;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
`;

const client = new BrokerClient();

function publishGist(language, content) {
  if (localStorage.getItem("gistTokenValue")) {
    // get the gist token and publish the gist
    const tokenValue = localStorage.getItem("gistTokenValue");

    const filename = prompt("Enter a filename for your gist: ");
    const description = prompt("Enter a description for your gist: ");
    const _public = confirm("Make your gist public?");

    const gistPayload = {
      description,
      public: _public,
      files: {
        [filename]: {
          content: content,
        },
      },
    };

    const requestOptions = {
      method: "POST",
      headers: {
        Authorization: `token ${tokenValue}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gistPayload),
    };

    fetch("https://api.github.com/gists", requestOptions)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        const open = confirm(
          `Gist Published: ${data.html_url}\n press ok to open the raw file (for violentmonkey user scripts) or cancel to copy the gist link to your clipboard`
        );
        if (open) {
          chrome.runtime.sendMessage({
            action: "openTab",
            url: data.files[filename].raw_url,
          });
        } else {
          navigator.clipboard.writeText(data.html_url);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  } else {
    alert(
      "You need to get a token to publish a gist. we're going to take you to github. you may need to login"
    );
    // prompt the user for a gist token
    client.on("NEW_GIST_TOKEN", (event) => {
      const { tokenValue } = event.payload;
      console.log(event.payload);
      localStorage.setItem("gistTokenValue", tokenValue);
      chrome.runtime.sendMessage({
        action: "closePopup",
        tabId: event.tabId,
      });
      if (tokenValue) {
        publishGist(language, content);
      }
    });

    chrome.runtime.sendMessage({
      action: "openPopup",
      url: "https://github.com/settings/personal-access-tokens/new#gptauto",
    });
  }
}

codeElementsWatcher.on("code", (codeElement) => {
  codeElement.addAction("Publish Gist", publishGist);
});
