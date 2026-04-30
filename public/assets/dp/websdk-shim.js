// Empty ES module that satisfies `import 'WebSdk'` in @digitalpersona/devices.
// The actual WebSdk runtime is loaded as a global via websdk.client.ui.min.js
// (script tag injected by DpFingerprintService.ensureWebSdkLoaded()).
export default {};
