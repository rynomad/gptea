/******/ (function() { // webpackBootstrap
var __webpack_exports__ = {};
/*!*****************************************************!*\
  !*** ./src/scripts/jitsi_hide_screenshare/index.js ***!
  \*****************************************************/
//@ts-ignore

const calculateTotalHeight = (videoContainers) => {
  let totalHeight = 0;
  videoContainers.forEach((container) => {
    totalHeight += container.offsetHeight;
  });
  return totalHeight;
};

const evenlyFillHeight = (videoContainers, totalHeight) => {
  const heightPerContainer = totalHeight / videoContainers.length;
  videoContainers.forEach((container, index) => {
    container.style.top = `${heightPerContainer * index}px`;
  });
};

const removeLocalScreenshareContainers = (videoContainers) => {
  return videoContainers.filter((container) => {
    const video = container.querySelector("video");
    if (video && video.id === "localScreenshare_container") {
      container.remove();
      return false;
    }
    return true;
  });
};

const processVideoContainers = () => {
  let videoContainers = Array.from(
    document.querySelectorAll("span.videocontainer")
  );
  const totalHeight = calculateTotalHeight(videoContainers);

  videoContainers = removeLocalScreenshareContainers(videoContainers);
  evenlyFillHeight(videoContainers, totalHeight);
};

const idleCallback = () => {
  requestIdleCallback(() => {
    processVideoContainers();
    idleCallback();
  });
};

idleCallback();

/******/ })()
;
//# sourceMappingURL=jitsi_hide_screenshare.bundle.js.map