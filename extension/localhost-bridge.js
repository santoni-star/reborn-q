// localhost-bridge.js (REBORN Persistent Port with Deduplication)
console.log("DevVoice Bridge: Persistent Port Active with Deduplication");

let port = null;
const seenRequests = new Set();

function connectPort() {
    port = chrome.runtime.connect({ name: "app-bridge" });
    
    port.onMessage.addListener((msg) => {
        if (msg.action === "extension_result" || msg.action === "connection_status") {
            const data = msg.data || msg;
            window.dispatchEvent(new CustomEvent('DevVoiceResponse', { detail: data }));
            window.postMessage({ type: 'DEVVOICE_BRIDGE_RESPONSE', ...data }, '*');
        }
    });

    port.onDisconnect.addListener(() => {
        setTimeout(connectPort, 1000);
    });
}

connectPort();

const forwardToExtension = (data) => {
    if (!data || !data.requestId || !port) return;
    
    // Deduplication logic
    if (seenRequests.has(data.requestId)) return;
    seenRequests.add(data.requestId);
    setTimeout(() => seenRequests.delete(data.requestId), 5000);

    console.log(`[Bridge] Forwarding unique request: ${data.action} (ID: ${data.requestId})`);
    port.postMessage(data);
};

window.addEventListener('DevVoiceRequest', (event) => {
    forwardToExtension(event.detail);
});

window.addEventListener('message', (event) => {
    if (event.data?.type === 'DEVVOICE_BRIDGE_REQUEST') {
        forwardToExtension(event.data);
    }
});
