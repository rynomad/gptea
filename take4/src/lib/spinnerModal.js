export function showLoadingSpinner() {
  // create the modal container element
  const modalContainer = document.createElement("div");
  modalContainer.style.position = "fixed";
  modalContainer.style.top = "0";
  modalContainer.style.left = "0";
  modalContainer.style.width = "100%";
  modalContainer.style.height = "100%";
  modalContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  modalContainer.style.zIndex = "9999";

  // create the spinner element
  const spinner = document.createElement("div");
  spinner.style.borderTop = "2px solid rgba(255, 255, 255, 0.2)";
  spinner.style.borderRight = "2px solid rgba(255, 255, 255, 0.2)";
  spinner.style.borderBottom = "2px solid rgba(255, 255, 255, 0.2)";
  spinner.style.borderLeft = "2px solid #ffffff";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "30px";
  spinner.style.height = "30px";
  spinner.style.animation = "spin 1s linear infinite";
  spinner.style.position = "absolute";
  spinner.style.top = "50%";
  spinner.style.left = "50%";
  spinner.style.transform = "translate(-50%, -50%)";
  spinner.style.animationName = "spin";
  spinner.style.animationDuration = "1s";
  spinner.style.animationTimingFunction = "linear";
  spinner.style.animationIterationCount = "infinite";

  // add the spinner and @keyframes rule to the modal container
  modalContainer.appendChild(spinner);
  modalContainer.setAttribute(
    "style",
    modalContainer.getAttribute("style") +
      " " +
      `
    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  `
  );

  // add the modal container to the document body
  document.body.appendChild(modalContainer);
}
