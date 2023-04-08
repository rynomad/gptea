import { BrokerClient } from "../../client";
import { showLoadingSpinner } from "./../../lib/spinnerModal.js";

const client = new BrokerClient();

function pollForToken(callback) {
  const checkForToken = () => {
    const tokenElement = document.querySelector("#new-access-token");
    if (tokenElement) {
      callback(tokenElement);
    } else {
      setTimeout(checkForToken, 100);
    }
  };
  checkForToken();
}

showLoadingSpinner();
pollForToken((tokenElement) => {
  const tokenValue = tokenElement.value;
  const tokenNameElement = document.querySelector(
    "#user_programmatic_access_name"
  );
  const tokenName = tokenNameElement ? tokenNameElement.value : "";
  console.log("Token value: ", tokenValue);
  client.dispatch({
    type: "NEW_GIST_TOKEN",
    payload: {
      tokenName,
      tokenValue,
    },
  });
});
