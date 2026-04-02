import { createSvgElement } from "../dom.js";

export function createBookmarkHistoryIcon(direction) {
  const icon = document.createElement("span");
  icon.className = "cgptbm-history-controls__icon";
  icon.setAttribute("aria-hidden", "true");
  if (direction === "redo") {
    icon.textContent = "\u21BB";
  } else if (direction === "collapse") {
    icon.textContent = "\u229F";
  } else if (direction === "expand") {
    icon.textContent = "\u229E";
  } else if (direction === "restore") {
    icon.textContent = "\u229E";
  } else {
    icon.textContent = "\u21BA";
  }
  return icon;
}

export function createButtonSvgIcon(type) {
  const icon = document.createElement("span");
  icon.className =
    "cgptbm-history-controls__icon cgptbm-history-controls__icon--svg";
  icon.setAttribute("aria-hidden", "true");
  if (type === "tab-collapse") {
    icon.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2.5" y1="6" x2="9.5" y2="6"/></svg>';
  } else if (type === "tab-extend") {
    icon.innerHTML =
      '<svg viewBox="-5 5 48 48" width="11" height="11" fill="currentColor" stroke="none"><path d="M31 3L32.5 3L45 15.5Q45.8 17.8 43.5 17Q42.2 19.3 37.5 18L36 19.5L32 25.5Q33.9 34.9 29.5 38L10 19.5L11.5 17Q15 14.5 22.5 16L30 10.5Q29.4 5.1 31 3Z"/><path d="M15.5 30L18 31.5L6.5 44Q2.8 45.3 4 41.5L15.5 30Z"/></svg>';
  } else if (type === "tab-extend-hover") {
    icon.innerHTML =
      '<svg viewBox="-5 5 48 48" width="11" height="11" fill="currentColor" stroke="none"><path d="M31 3L32.5 3L45 15.5Q45.8 17.8 43.5 17Q42.2 19.3 37.5 18L36 19.5L32 25.5Q33.9 34.9 29.5 38L10 19.5L11.5 17Q15 14.5 22.5 16L30 10.5Q29.4 5.1 31 3Z"/></svg>';
  } else if (type === "tab-extend-disabled") {
    icon.innerHTML =
      '<svg viewBox="-5 5 48 48" width="11" height="11" fill="currentColor" stroke="none"><path d="M31 3L32.5 3L45 15.5Q45.8 17.8 43.5 17Q42.2 19.3 37.5 18L36 19.5L32 25.5Q33.9 34.9 29.5 38L10 19.5L11.5 17Q15 14.5 22.5 16L30 10.5Q29.4 5.1 31 3Z"/></svg>';
  } else if (type === "postit-extend") {
    icon.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" stroke="none"><path d="M4 3L10 3L10 9Q9.5 3.5 4 3"/><path d="M8 9L2 9L2 3Q2.5 8.5 8 9"/></svg>';
  } else if (type === "postit-extend-phase2") {
    icon.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" stroke="none" style="overflow:visible"><rect x="1.5" y="5.5" width="9" height="7" rx="1" fill="#888"/><g transform="translate(1.6,0) scale(0.66)"><path d="M8 1.6C10.08 1.6 11.45 2.7 11.45 4.04C11.45 4.67 11.15 5.24 10.6 5.64L10.32 7.72L11.95 8.98C12.26 9.22 12.09 9.72 11.7 9.72H8.82V13.08C8.82 13.44 8.46 13.72 8 13.72C7.54 13.72 7.18 13.44 7.18 13.08V9.72H4.3C3.91 9.72 3.74 9.22 4.05 8.98L5.68 7.72L5.4 5.64C4.85 5.24 4.55 4.67 4.55 4.04C4.55 2.7 5.92 1.6 8 1.6Z"/><ellipse cx="8" cy="4.02" rx="2.25" ry="1.14" fill="rgba(255,255,255,0.28)"/></g></svg>';
  } else if (type === "postit-extend-outward") {
    icon.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" stroke="none" style="overflow:visible"><path d="M8 -1L8 5L14 5Q8.5 4.5 8 -1"/><path d="M4 13L4 7L-2 7Q3.5 7.5 4 13"/></svg>';
  } else if (type === "postit-close-hover") {
    icon.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" stroke="none"><path d="M6 1L6 7L12 7Q6.5 6.5 6 1"/><path d="M6 11L6 5L0 5Q5.5 5.5 6 11"/></svg>';
  } else if (type === "postit-open-hover") {
    icon.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" stroke="none" style="overflow:visible"><path d="M6 1L12 1L12 7Q11.5 1.5 6 1"/><path d="M6 11L0 11L0 5Q0.5 10.5 6 11"/></svg>';
  } else if (type === "postit-extend-inward") {
    icon.innerHTML =
      '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" stroke="none"><path d="M4 3L10 3L10 9Q9.5 3.5 4 3"/><path d="M8 9L2 9L2 3Q2.5 8.5 8 9"/></svg>';
  }
  return icon;
}

export function renderTabActionButtonContent(button, action) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const nextAction = action || {};
  const label = typeof nextAction.label === "string" ? nextAction.label : "";
  const icon = typeof nextAction.icon === "string" ? nextAction.icon : "";

  button.textContent = "";
  button.classList.toggle("cgptbm-tab__action--has-icon", Boolean(icon));

  if (!icon) {
    button.textContent = label;
    return;
  }

  const iconElement = buildTabActionIcon(icon);
  if (!iconElement) {
    button.textContent = label;
    button.classList.remove("cgptbm-tab__action--has-icon");
    return;
  }

  button.appendChild(iconElement);
}

export function buildTabActionIcon(icon) {
  const iconType = String(icon || "");
  if (!iconType) {
    return null;
  }

  const svg = createSvgElement("svg", {
    viewBox: "0 0 16 16",
    "aria-hidden": "true",
    class: "cgptbm-tab__action-icon cgptbm-tab__action-icon--" + iconType,
  });

  if (iconType === "expand-pin") {
    svg.appendChild(
      createSvgElement("path", {
        d: "M10.33 1L10.83 1L15 5.17Q15.27 5.93 14.5 5.67Q14.07 6.43 12.5 6L12 6.5L10.67 8.5Q11.3 11.63 9.83 12.67L3.33 6.5L3.83 5.67Q5 4.83 7.5 5.33L10 3.5Q9.8 1.7 10.33 1Z",
        fill: "currentColor",
        class: "cgptbm-tab__pin-body",
      }),
    );
    svg.appendChild(
      createSvgElement("path", {
        d: "M5.17 10L6 10.5L2.17 14.67Q0.93 15.1 1.33 13.83L5.17 10Z",
        fill: "currentColor",
        class: "cgptbm-tab__pin-needle",
      }),
    );
    return svg;
  }

  if (iconType === "edit") {
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.appendChild(
      createSvgElement("path", {
        d: "M 17.5 2.5 L 21.5 6.5 L 8.5 19.5 L 3 21 L 4.5 15.5 Z",
      }),
    );
    svg.appendChild(
      createSvgElement("line", {
        x1: "15",
        y1: "5",
        x2: "19",
        y2: "9",
      }),
    );
    return svg;
  }

  return null;
}
