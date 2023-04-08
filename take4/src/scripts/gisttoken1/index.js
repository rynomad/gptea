import { showLoadingSpinner } from "./../../lib/spinnerModal.js";
function findGistScopeSummary() {
  const strongElements = Array.from(document.querySelectorAll("strong"));
  const gistsStrongElement = strongElements.find((strong) =>
    strong.textContent.includes("Gists")
  );
  if (gistsStrongElement) {
    const parentLiElement = gistsStrongElement.closest("li");
    if (parentLiElement) {
      return parentLiElement.querySelector("summary");
    }
  }
  return null;
}

async function generateToken() {
  if (location.hash === "#gptauto") {
    const noteInput = document.querySelector("#user_programmatic_access_name");
    const gistScopeSummary = findGistScopeSummary();
    const gistScopeRadio = document.querySelector(
      'input[name="integration[default_permissions][gists]"][value="write"]'
    );
    const generateTokenButton = document.querySelector(
      ".js-integrations-install-form-submit"
    );

    if (
      noteInput &&
      gistScopeSummary &&
      gistScopeRadio &&
      generateTokenButton
    ) {
      const randomSuffix = Math.random().toString(36).substr(2, 5);
      noteInput.value = `GPGist-${randomSuffix}`;
      gistScopeSummary.click();

      setTimeout(() => {
        gistScopeRadio.click();
        gistScopeSummary.click(); // Close the dropdown
        generateTokenButton.click();
      }, 500);
    } else {
      console.error(
        "Failed to find required elements for generating the token."
      );
    }
  }
}

showLoadingSpinner();
generateToken();
