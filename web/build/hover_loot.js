(function () {
  const CONSTANTS = {
    UI: {
      SLOT_SELECTOR: ".inventory-slot",
      OCCUPIED_SELECTORS: ".item-slot-wrapper, img",
      ITEM_LOADER_CLASS: "hover-loot-loader",
      QUEUE_ICON_CLASS: "hover-queue-icon",
    },
    VISUALS: {
      ACCENT_COLOR: "#ffffff",
      LOADER_Z_INDEX: "2000",
      QUEUE_ICON_Z_INDEX: "1500",
      LOADER_STROKE_WIDTH: "4",
      SVG_NAMESPACE: "http://www.w3.org/2000/svg"
    },
    TIMING: {
      DEFAULT_DELAY: 200,
      QUEUE_PROCESS_INTERVAL: 50,
    }
  };

  let hoverDelay = CONSTANTS.TIMING.DEFAULT_DELAY;
  let isKeyPressed = false;
  const actionQueue = [];
  let isProcessingQueue = false;
  let currentlyHoveredElement = null;


  window.addEventListener("message", function (event) {
    const data = event.data;

    if (data.action === "setupHoverLoot") {
      hoverDelay = data.delay || CONSTANTS.TIMING.DEFAULT_DELAY;
    }

    if (data.action === "setHoverState") {
      isKeyPressed = !!data.pressed;

      if (isKeyPressed && currentlyHoveredElement) {
        const slot = currentlyHoveredElement.closest(CONSTANTS.UI.SLOT_SELECTOR);
        if (slot) handleHover(slot);
      }
    }
  });

  function createLoadingAnimation(parent) {
    removeLoadingAnimation(parent);

    const svg = document.createElementNS(CONSTANTS.VISUALS.SVG_NAMESPACE, "svg");
    svg.setAttribute("viewBox", "0 0 36 36");
    svg.setAttribute("class", CONSTANTS.UI.ITEM_LOADER_CLASS);
    svg.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 75%; height: 75%;
      pointer-events: none; z-index: ${CONSTANTS.VISUALS.LOADER_Z_INDEX};
    `;

    const path = document.createElementNS(CONSTANTS.VISUALS.SVG_NAMESPACE, "path");
    path.setAttribute("d", "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831");
    path.setAttribute("stroke", CONSTANTS.VISUALS.ACCENT_COLOR);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", CONSTANTS.VISUALS.LOADER_STROKE_WIDTH);
    path.setAttribute("stroke-dasharray", "0, 100");

    const animation = document.createElementNS(CONSTANTS.VISUALS.SVG_NAMESPACE, "animate");
    animation.setAttribute("attributeName", "stroke-dasharray");
    animation.setAttribute("from", "0, 100");
    animation.setAttribute("to", "100, 100");
    animation.setAttribute("dur", hoverDelay / 1000 + "s");
    animation.setAttribute("fill", "freeze");

    path.appendChild(animation);
    svg.appendChild(path);
    parent.appendChild(svg);
  }

  function removeLoadingAnimation(parent) {
    if (!parent) return;
    parent.querySelectorAll(`.${CONSTANTS.UI.ITEM_LOADER_CLASS}`).forEach(loader => loader.remove());
  }

  function createQueuedIcon(parent) {
    if (parent.querySelector(`.${CONSTANTS.UI.QUEUE_ICON_CLASS}`)) return;

    const icon = document.createElement("div");
    icon.className = CONSTANTS.UI.QUEUE_ICON_CLASS;
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>`;
    icon.style.cssText = `
      position: absolute; top: 5px; right: 5px;
      color: ${CONSTANTS.VISUALS.ACCENT_COLOR};
      z-index: ${CONSTANTS.VISUALS.QUEUE_ICON_Z_INDEX};
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 50%; pointer-events: none;
    `;

    parent.appendChild(icon);
  }

  function removeQueuedIcon(parent) {
    if (!parent) return;
    parent.querySelectorAll(`.${CONSTANTS.UI.QUEUE_ICON_CLASS}`).forEach(icon => icon.remove());
  }

  function isSlotOccupied(element) {
    return !!element.querySelector(CONSTANTS.UI.OCCUPIED_SELECTORS);
  }

  function handleHover(element) {
    if (!isKeyPressed) return;
    if (!isSlotOccupied(element)) return;
    if (element.dataset.hoverQueued === "true") return;

    element.dataset.hoverQueued = "true";
    createQueuedIcon(element);
    actionQueue.push(element);

    processActionQueue();
  }

  async function processActionQueue() {
    if (isProcessingQueue || actionQueue.length === 0) return;
    isProcessingQueue = true;

    while (actionQueue.length > 0) {
      const element = actionQueue.shift();

      if (!element) continue;

      removeQueuedIcon(element);
      createLoadingAnimation(element);

      await new Promise(resolve => setTimeout(resolve, hoverDelay));

      if (isSlotOccupied(element)) {
        try {
          const options = {
            view: window,
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            buttons: 1,
            pointerId: 1,
            isPrimary: true
          };

          element.dispatchEvent(new PointerEvent("pointerdown", options));
          element.dispatchEvent(new MouseEvent("mousedown", options));
          element.dispatchEvent(new PointerEvent("pointerup", options));
          element.dispatchEvent(new MouseEvent("mouseup", options));
          element.dispatchEvent(new MouseEvent("click", options));
        } catch (err) {
          console.error("[Hover Loot] Dispatch Error:", err);
        }
      }

      removeLoadingAnimation(element);
      element.dataset.hoverQueued = "false";

      await new Promise(resolve => setTimeout(resolve, CONSTANTS.TIMING.QUEUE_PROCESS_INTERVAL));
    }

    isProcessingQueue = false;
  }

  document.addEventListener("mouseover", (e) => {
    currentlyHoveredElement = e.target;
    const slot = e.target.closest(CONSTANTS.UI.SLOT_SELECTOR);
    if (slot) handleHover(slot);
  }, true);

})();
