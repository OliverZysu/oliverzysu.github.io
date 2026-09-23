/* Progressive enhancement. All page content exists in static HTML.
 * Language switching swaps pre-rendered templates, without network requests.
 * The native links remain valid Chinese / English pages when JavaScript is off.
 */
(() => {
  "use strict";
  const configNode = document.getElementById("homepage-config");
  const root = document.getElementById("site-root");
  if (!configNode || !root) return;
  let config;
  try { config = JSON.parse(configNode.textContent); } catch (_) { return; }
  const valid = (value) => value === "zh" || value === "en";
  const storageKey = "ziyang-homepage-language";
  let language = config.defaultLanguage;
  let toastTimer = null;
  let scrollScheduled = false;

  function readPreference() {
    try { return localStorage.getItem(storageKey); } catch (_) { return null; }
  }
  function remember(value) {
    try { localStorage.setItem(storageKey, value); } catch (_) { /* Private browsing can block storage. */ }
  }
  function requestedLanguage() {
    try { return new URL(window.location.href).searchParams.get("lang"); } catch (_) { return null; }
  }
  function updateURL(value, mode) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", value);
      if (url.href !== window.location.href) {
        history[mode === "push" ? "pushState" : "replaceState"]({ language: value }, "", url);
      }
    } catch (_) { /* File previews still switch even when history is restricted. */ }
  }
  function headerHeight() {
    return document.querySelector(".site-header")?.getBoundingClientRect().height || 68;
  }
  function capturePosition() {
    if (window.scrollY < 70) return { top: true };
    const limit = headerHeight() + 30;
    let match = null;
    for (const element of document.querySelectorAll("[data-scroll-anchor]")) {
      const rect = element.getBoundingClientRect();
      if (rect.top <= limit) match = { id: element.id, offset: rect.top };
    }
    return match || { top: true };
  }
  function restorePosition(position) {
    if (!position) return;
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    if (position.top) {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      const target = document.getElementById(position.id);
      if (target) {
        const offset = Math.max(position.offset, -target.offsetHeight + headerHeight() + 20);
        window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset), behavior: "instant" });
      }
    }
    document.documentElement.style.scrollBehavior = previous;
  }
  function updateActiveSection() {
    const links = [...document.querySelectorAll(".nav-link[data-section]")];
    let active = "about";
    const threshold = headerHeight() + 75;
    for (const link of links) {
      const section = document.getElementById(link.dataset.section);
      if (section && section.getBoundingClientRect().top <= threshold) active = section.id;
    }
    for (const link of links) {
      if (link.dataset.section === active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }
  function setLanguage(value, options = {}) {
    if (!valid(value)) return;
    const { urlMode = null, preserveScroll = false, focusSwitch = false } = options;
    const position = preserveScroll ? capturePosition() : null;
    const template = document.getElementById(`page-${value}`);
    if (!template) return;
    if (value !== language) {
      clearTimeout(toastTimer);
      root.replaceChildren(template.content.cloneNode(true));
    }
    language = value;
    document.documentElement.lang = value === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.language = value;
    document.title = config.languages[value].title;
    const meta = config.languages[value];
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", meta.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", meta.description);
    remember(value);
    if (urlMode) updateURL(value, urlMode);
    requestAnimationFrame(() => {
      restorePosition(position);
      updateActiveSection();
      if (focusSwitch) document.querySelector(`.language-link[data-language="${value}"]`)?.focus({ preventScroll: true });
    });
  }
  function notify(message) {
    const toast = document.querySelector(".toast");
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
  }
  async function copyEmail(address) {
    let success = false;
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(address); success = true; } catch (_) { /* Fall through to local-file fallback. */ }
    }
    if (!success) {
      const active = document.activeElement;
      const box = document.createElement("textarea");
      box.value = address;
      box.setAttribute("readonly", "");
      box.setAttribute("aria-hidden", "true");
      Object.assign(box.style, { position: "fixed", opacity: "0", left: "-9999px", top: "0" });
      document.body.appendChild(box);
      box.select();
      try { success = document.execCommand("copy"); } catch (_) { success = false; }
      box.remove();
      if (active instanceof HTMLElement) active.focus({ preventScroll: true });
    }
    notify(config.languages[language][success ? "copied" : "copyFailed"]);
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const switchLink = event.target.closest("a[data-language]");
    if (switchLink && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      setLanguage(switchLink.dataset.language, { urlMode: "push", preserveScroll: true, focusSwitch: event.detail === 0 });
      return;
    }
    const copyButton = event.target.closest("button[data-copy-email]");
    if (copyButton) copyEmail(copyButton.dataset.copyEmail);
  });
  window.addEventListener("scroll", () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => { updateActiveSection(); scrollScheduled = false; });
  }, { passive: true });
  window.addEventListener("resize", updateActiveSection, { passive: true });
  window.addEventListener("popstate", () => {
    const requested = requestedLanguage();
    setLanguage(valid(requested) ? requested : config.defaultLanguage);
  });
  window.addEventListener("hashchange", updateActiveSection);
  const requested = requestedLanguage();
  const preferred = readPreference();
  // An explicit URL language wins; the dedicated /en/ entry always opens in English.
  const initial = valid(requested) ? requested : (config.defaultLanguage === "en" ? "en" : (valid(preferred) ? preferred : "zh"));
  setLanguage(initial, { urlMode: "replace" });
})();
