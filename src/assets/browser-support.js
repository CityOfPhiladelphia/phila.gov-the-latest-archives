
function isIE10 () {
  var ie10 = window.matchMedia("screen and (-ms-high-contrast: active), (-ms-high-contrast: none)");
  if (ie10.matches) {
    require("./polyfills/Array.find.js");
    require("./polyfills/Number.isInteger.js");
  }
}

export default {
  isIE10,
};