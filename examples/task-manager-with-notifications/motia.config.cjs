// 1. Mock window BEFORE requiring plugins
if (typeof global !== "undefined") {
    global.window = {
        matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
        localStorage: { getItem: () => null, setItem: () => {} },
        location: { href: "" },
        document: { body: { classList: { add: () => {}, remove: () => {} } } }
    };
}

// 2. Require plugins (CommonJS style)
const { defineConfig } = require("motia");
const { observability } = require("@motiadev/plugin-observability");
const { states } = require("@motiadev/plugin-states");
const { endpoint } = require("@motiadev/plugin-endpoint");
const { logs } = require("@motiadev/plugin-logs");
const { bullmq } = require("@motiadev/plugin-bullmq");

// 3. Export config
module.exports = defineConfig({
  plugins: [
    observability(),
    states(),
    endpoint(),
    logs(),
    bullmq()
  ]
});
