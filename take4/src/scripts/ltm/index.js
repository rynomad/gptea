// Create a style element to define CSS for the extension components
const style = document.createElement("style");
style.textContent = `
  .token-count {
    padding: 0px 6px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: bold;
  }

  .star-container {
    display: inline-flex;
    align-items: center;
    margin-left: 5px;
  }

  .star-button {
    width: 20px;
    height: 20px;
    margin-left: 5px;
    cursor: pointer;
  }

  .reminder {
    margin-right: 4px; /* Adjust this value to your desired spacing */
  }

`;
document.head.appendChild(style);

// Helper function to create a hash from a string
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// Helper function to compute the token count
function computeTokenCount(group) {
  const textBases = group.querySelectorAll(".text-base");
  let totalWords = 0;
  textBases.forEach((tb) => {
    totalWords += tb.textContent.trim().split(/\s+/).length;
  });

  const laterSiblings = [];
  let sibling = group.nextElementSibling;
  while (sibling) {
    if (sibling.matches(".group.w-full")) {
      laterSiblings.push(sibling);
    }
    sibling = sibling.nextElementSibling;
  }

  laterSiblings.forEach((ls) => {
    totalWords += ls.textContent.trim().split(/\s+/).length;
  });

  return Math.round(totalWords * 1.5);
}

// Helper function to get background color based on token count
function getBackgroundColor(tokenCount) {
  if (tokenCount > 4000) {
    return "black";
  } else {
    const red = Math.floor((tokenCount / 4000) * 255);
    const green = 255 - red;
    return `rgb(${red}, ${green}, 0)`;
  }
}

// Helper function to get font color based on background color
function getFontColor(backgroundColor) {
  const rgbMatch = backgroundColor.match(/\d+/g);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch.map(Number);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "black" : "white";
  }
  return "black"; // Default font color in case the regex match fails
}

// Helper function to save reminders to localStorage
function saveReminders(reminders) {
  localStorage.setItem("reminders", JSON.stringify(reminders));
}

// Helper function to load reminders from localStorage
function loadReminders() {
  const reminders = localStorage.getItem("reminders");
  return reminders ? JSON.parse(reminders) : [];
}

// Function to create a reminder element
function createReminderElement(name, currentContainerId, originContainerId) {
  const reminder = document.createElement("span");
  reminder.className = "reminder";
  reminder.textContent = "★"; // Add the Unicode filled star character
  reminder.title = name; // Set the tooltip text
  reminder.style.cursor = "pointer";
  reminder.dataset.currentContainerId = currentContainerId;
  reminder.dataset.originContainerId = originContainerId;

  // Add click event listener to remove the reminder
  reminder.addEventListener("click", () => {
    if (confirm(`Do you want to remove the reminder "${name}"?`)) {
      const updatedReminders = loadReminders().filter((r) => r.name !== name);
      saveReminders(updatedReminders);
      reminder.remove();
    }
  });

  return reminder;
}

// Function to insert a reminder into the star container
function insertReminder(starContainer, containerId, name) {
  const reminder = createReminderElement(name);
  reminder.dataset.containerId = containerId;
  starContainer.appendChild(reminder);
}

// Main function to scan the DOM and add the container
function processGroups() {
  const reminders = loadReminders();
  const groups = document.querySelectorAll(".group.w-full");

  groups.forEach((group) => {
    // Check if the container already exists
    const existingContainer = group.querySelector(".extension-container");
    if (existingContainer) {
      const tokenCountValue = computeTokenCount(group);
      // Update tokenCount
      const tokenCount = existingContainer.querySelector(".token-count");
      tokenCount.textContent = tokenCountValue;

      // Update background color and font color
      tokenCount.style.backgroundColor = getBackgroundColor(tokenCountValue);
      tokenCount.style.color = getFontColor(tokenCount.style.backgroundColor);

      return;
    }

    group.style.position = "relative";

    // Create the container and its elements
    const container = document.createElement("div");
    container.className = "extension-container";

    const tokenCount = document.createElement("span");
    tokenCount.className = "token-count";

    const starContainer = document.createElement("div");
    starContainer.className = "star-container";

    const starButton = document.createElement("button");
    starButton.className = "star-button";
    starButton.textContent = "☆"; // Add the Unicode hollow star character

    // Add click event listener to the star button
    starButton.addEventListener("click", () => {
      const reminderName = prompt("Enter a name for the reminder:");
      if (!reminderName) {
        return;
      }
      const reminders = loadReminders();

      const existingReminder = reminders.find((r) => r.name === reminderName);
      if (existingReminder) {
        const confirmed = confirm(
          "A reminder with this name already exists. Do you want to remove it?"
        );
        if (confirmed) {
          // Remove the existing reminder from localStorage
          const updatedReminders = reminders.filter(
            (r) => r.name !== reminderName
          );
          saveReminders(updatedReminders);

          // Remove the existing reminder from the star container
          const starContainer = document.querySelector(
            `.star-container [data-container-id="${existingReminder.currentContainerId}"]`
          );
          const reminderToRemove = starContainer.querySelector(
            `.reminder[title="${reminderName}"]`
          );
          starContainer.removeChild(reminderToRemove);
        }
      } else {
        // Add the new reminder to localStorage
        const newReminder = {
          currentContainerId: container.id,
          originContainerId: container.id,
          name: reminderName,
        };
        reminders.push(newReminder);
        saveReminders(reminders);

        // Add the new reminder to the star container
        insertReminder(starContainer, container.id, reminderName);
      }
    });
    // Compute the token count and set the container ID
    const tokenCountValue = computeTokenCount(group);
    const hashValue = hashString(group.textContent);
    container.id = `container-${hashValue}`;

    // Update the token count element
    tokenCount.textContent = tokenCountValue;
    tokenCount.style.backgroundColor = getBackgroundColor(tokenCountValue);
    tokenCount.style.color = getFontColor(tokenCount.style.backgroundColor);

    // Add elements to the container and append the container to the group
    container.appendChild(tokenCount);
    container.appendChild(starContainer);
    container.appendChild(starButton);
    group.appendChild(container);

    // Position the container
    container.style.position = "absolute";
    container.style.bottom = "10px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.display = "flex";
    container.style.alignItems = "center";

    reminders.forEach((reminder) => {
      if (reminder.currentContainerId === container.id) {
        const reminderElement = createReminderElement(
          reminder.name,
          reminder.currentContainerId,
          reminder.originContainerId
        );
        starContainer.appendChild(reminderElement);
      }
    });
  });

  // Schedule the next idle callback
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(processGroups);
  } else {
    setTimeout(processGroups, 100);
  }
}

// Start processing groups on idle callback
if (typeof requestIdleCallback !== "undefined") {
  setTimeout(() => requestIdleCallback(processGroups), 2000);
} else {
  setTimeout(processGroups, 2000);
}

function insertReminders() {
  const textarea = document.querySelector("textarea");
  const reminders = loadReminders();
  const activeReminders = reminders.filter((r) => {
    const tokenCount = document.querySelector(
      `#${r.currentContainerId} .token-count`
    );
    return tokenCount && parseInt(tokenCount.textContent) > 3000;
  });

  console.log(activeReminders);

  activeReminders.forEach((reminder) => {
    console.log("inserting reminder", reminder);
    const originContainer = document.getElementById(reminder.originContainerId);
    if (originContainer) {
      console.log("originContainer", originContainer);
      const originTextContent =
        originContainer.parentElement.textContent.trim();
      textarea.value += `\n\nPS, here's a reminder:\n\n ${originTextContent}\n\n END REMINDER. please respond to the message above the reminders as if they weren't here`;
    }
  });

  setTimeout(() => {
    activeReminders.forEach((reminder) => {
      console.log("reminder", reminder);
      const secondToLastGroup = document.querySelectorAll(
        ".group.w-full:nth-last-child(3)"
      )[0];
      if (secondToLastGroup) {
        const newContainer = secondToLastGroup.querySelector(
          ".extension-container"
        );
        if (newContainer) {
          const starContainer = newContainer.querySelector(".star-container");
          const reminderElement = document.querySelector(
            `.reminder[title="${reminder.name}"]`
          );
          starContainer.appendChild(reminderElement);
          reminderElement.dataset.currentContainerId = newContainer.id;

          // Save the reminder's new location
          const updatedReminder = {
            ...reminder,
            currentContainerId: newContainer.id,
          };
          const otherReminders = reminders.filter(
            (r) => r.name !== reminder.name
          );
          saveReminders([...otherReminders, updatedReminder]);
        }
      }
    });
  }, 5000);
}
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      console.log("enter pressed", e);
      e.preventDefault();
      e.stopPropagation();
      const textarea = document.querySelector("textarea");
      const button = textarea.nextElementSibling;
      button.click();
    }
  },
  { capture: true }
);
function initPatchButtonAndEnter() {
  const textarea = document.querySelector("textarea");
  if (textarea) {
    const button = textarea.nextElementSibling;
    if (button) {
      function patchButton() {
        const textarea = document.querySelector("textarea");
        const button = textarea.nextElementSibling;
        if (!button) {
          return requestIdleCallback(patchButton);
        }

        button.onclick = insertReminders;

        setTimeout(() => requestIdleCallback(patchButton), 2000);
      }

      patchButton();
    } else {
      //   alert("no button");
      requestIdleCallback(initPatchButtonAndEnter);
    }
  } else {
    // alert("no textarea");
    requestIdleCallback(initPatchButtonAndEnter);
  }
}

initPatchButtonAndEnter();
