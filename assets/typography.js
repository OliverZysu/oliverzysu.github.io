/* Local Kai comes first. Only devices without an installed Kai face request
 * the external, open-source WenKai fallback. No font binaries are packaged.
 * The page remains usable if this optional external resource is unavailable.
 */
(() => {
  "use strict";
  const fallback = () => {
    if (document.getElementById("kai-web-fallback")) return;
    const style = document.createElement("link");
    style.id = "kai-web-fallback";
    style.rel = "stylesheet";
    style.href = "https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css";
    document.head.appendChild(style);
  };
  if (!document.fonts || typeof document.fonts.load !== "function") return;
  document.fonts.load('16px "Homepage Kai"', '苏梓阳')
    .then(faces => { if (!faces.length) fallback(); })
    .catch(fallback);
})();
