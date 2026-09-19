// Interactive picker for "Select element to save..." -- replaces guessing
// from whatever was under the cursor at right-click time (which, for a
// canvas-based chart wrapped in a styled card, kept landing on just the
// bare <canvas> instead of the card around it, and gave the user no way to
// see or correct that). Hovering highlights a candidate; scrolling walks
// the highlight up/down the ancestor chain to widen or narrow it; clicking
// confirms. The highlight itself is the UX fix -- the user sees exactly
// what will be captured before committing, instead of finding out after.

// Smart starting guess for whatever's under the cursor -- widen to the
// nearest card-like container so a single hover over MUI's (or similar
// component libraries') `Card` convention already lands on something
// reasonable; scrolling from there refines it either direction.
const CONTAINER_SELECTOR = '[class*="Card"],[class*="card"],[role="img"],figure,article';

function findDefaultTarget(el: Element): Element {
  return el.closest(CONTAINER_SELECTOR) ?? el;
}

function chainFrom(el: Element): Element[] {
  const chain: Element[] = [];
  let node: Element | null = el;
  while (node && node !== document.documentElement) {
    chain.push(node);
    node = node.parentElement;
  }
  return chain.length > 0 ? chain : [el];
}

let pickerActive = false;
let hoverChain: Element[] = [document.body];
let depthOffset = 0;
let highlightEl: HTMLDivElement | null = null;
let labelEl: HTMLDivElement | null = null;

function ensureOverlay() {
  if (!highlightEl) {
    highlightEl = document.createElement("div");
    Object.assign(highlightEl.style, {
      position: "fixed",
      zIndex: "2147483646",
      pointerEvents: "none",
      border: "2px solid #7c6cf6",
      background: "rgba(124, 108, 246, 0.15)",
      borderRadius: "4px",
      boxSizing: "border-box",
    });
    document.body.appendChild(highlightEl);
  }
  if (!labelEl) {
    labelEl = document.createElement("div");
    labelEl.textContent = "Click to save -- scroll to widen/narrow -- Esc to cancel";
    Object.assign(labelEl.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#111111",
      color: "#ffffff",
      padding: "8px 14px",
      borderRadius: "999px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: "13px",
      pointerEvents: "none",
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    });
    document.body.appendChild(labelEl);
  }
}

function clampIndex(v: number, max: number) {
  return Math.min(Math.max(v, 0), max);
}

function currentTarget(): Element {
  const idx = clampIndex(depthOffset, hoverChain.length - 1);
  return hoverChain[idx];
}

function updateHighlight() {
  ensureOverlay();
  const target = currentTarget();
  const rect = target.getBoundingClientRect();
  if (!highlightEl) return;
  highlightEl.style.left = `${rect.left}px`;
  highlightEl.style.top = `${rect.top}px`;
  highlightEl.style.width = `${rect.width}px`;
  highlightEl.style.height = `${rect.height}px`;
}

function onPickerMouseMove(e: MouseEvent) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === highlightEl || el === labelEl) return;
  hoverChain = chainFrom(findDefaultTarget(el));
  depthOffset = 0;
  updateHighlight();
}

function onPickerWheel(e: WheelEvent) {
  e.preventDefault();
  depthOffset = clampIndex(depthOffset + (e.deltaY > 0 ? 1 : -1), hoverChain.length - 1);
  updateHighlight();
}

function onPickerClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  const target = currentTarget();
  const rect = target.getBoundingClientRect();
  stopPicker();
  if (rect.width < 4 || rect.height < 4) return;
  chrome.runtime.sendMessage({
    type: "mushy-picker-result",
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, devicePixelRatio: window.devicePixelRatio || 1 },
  });
}

function onPickerKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  stopPicker();
}

function startPicker() {
  if (pickerActive) return;
  pickerActive = true;
  document.addEventListener("mousemove", onPickerMouseMove, true);
  document.addEventListener("wheel", onPickerWheel, { capture: true, passive: false });
  document.addEventListener("click", onPickerClick, true);
  document.addEventListener("keydown", onPickerKeydown, true);
  document.body.style.cursor = "crosshair";
  ensureOverlay();
}

function stopPicker() {
  pickerActive = false;
  document.removeEventListener("mousemove", onPickerMouseMove, true);
  document.removeEventListener("wheel", onPickerWheel, true);
  document.removeEventListener("click", onPickerClick, true);
  document.removeEventListener("keydown", onPickerKeydown, true);
  document.body.style.cursor = "";
  highlightEl?.remove();
  highlightEl = null;
  labelEl?.remove();
  labelEl = null;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "mushy-start-picker") {
    startPicker();
  }
});
