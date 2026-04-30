// WebSdk is loaded as a global at runtime via <script src="...websdk.client.ui.min.js"></script>
// in index.html. This shim only exists so the bundler can resolve `import 'WebSdk'` from
// @digitalpersona/devices without trying to bundle the actual SDK.
export {};
