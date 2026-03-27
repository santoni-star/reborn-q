// background.js (REBORN - Persistent Background Bridge - FIXED AUTO-WAKE)

let isProcessing = false;
const requestQueue = [];
const ports = new Map();

// Keep-alive for Service Worker
setInterval(() => {
    ports.forEach(port => {
        try { port.postMessage({ action: "ping" }); } catch (e) {}
    });
}, 20000);

const getProviderFromUrl = (url) => {
    if (!url) return null;
    const u = url.toLowerCase();
    if (u.includes('chatgpt.com') || u.includes('chat.openai.com')) return 'chatgpt';
    if (u.includes('gemini.google')) return 'gemini';
    if (u.includes('claude.ai')) return 'claude';
    if (u.includes('grok.com') || u.includes('x.com/i/grok')) return 'grok';
    return null;
};

chrome.runtime.onConnect.addListener((port) => {
    const tabId = port.sender?.tab?.id;
    if (!tabId) return;
    
    ports.set(tabId, port);
    console.log(`[Background] Port connected: ${port.name} from tab ${tabId}`);

    port.onMessage.addListener((msg) => {
        if (msg.action === "check_connection") {
            checkConnections(msg.provider, tabId, msg.requestId);
        }
        if (msg.action === "process_text" || msg.action === "raw_query") {
            handleProcessRequest(msg, tabId);
        }
        if (msg.action === "return_result") {
            forwardToApp(msg.data, msg.sourceTabId);
        }
    });

    port.onDisconnect.addListener(() => {
        ports.delete(tabId);
    });
});

async function checkConnections(provider, portTabId, requestId) {
    const tabs = await chrome.tabs.query({});
    const found = tabs.some(t => getProviderFromUrl(t.url) === provider.toLowerCase());
    const port = ports.get(portTabId);
    if (port) {
        port.postMessage({ 
            action: "connection_status", 
            connected: found, 
            provider, 
            requestId 
        });
    }
}

function handleProcessRequest(request, sourceTabId) {
    requestQueue.push({ ...request, sourceTabId });
    processNextInQueue();
}

async function processNextInQueue() {
    if (isProcessing || requestQueue.length === 0) return;
    isProcessing = true;

    const request = requestQueue.shift();
    try {
        const tabs = await chrome.tabs.query({});
        const targetTab = tabs.find(t => getProviderFromUrl(t.url) === request.provider.toLowerCase());

        if (!targetTab) throw new Error(`${request.provider} tab not found.`);

        console.log(`[Auto-Wake] Starting for provider: ${request.provider}`);

        // 1. Store the CURRENT active tab and its window
        const originalTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const originalTab = originalTabs[0];

        // 2. ACTIVATE WINDOW AND TAB
        await chrome.windows.update(targetTab.windowId, { focused: true });
        await chrome.tabs.update(targetTab.id, { active: true });
        
        console.log(`[Auto-Wake] Activated tab ${targetTab.id} in window ${targetTab.windowId}`);

        // 3. Wait for activation to settle
        await new Promise(r => setTimeout(r, 800));

        // 4. Send command
        const port = ports.get(targetTab.id);
        const message = { ...request, action: "interactions_process" };
        
        if (port) {
            port.postMessage(message);
        } else {
            await chrome.tabs.sendMessage(targetTab.id, message);
        }

        // 5. Wait for input to be processed, then return
        setTimeout(async () => {
            if (originalTab && originalTab.id !== targetTab.id) {
                console.log(`[Auto-Wake] Returning to original tab: ${originalTab.id}`);
                await chrome.windows.update(originalTab.windowId, { focused: true }).catch(() => {});
                await chrome.tabs.update(originalTab.id, { active: true }).catch(() => {});
            }
        }, 1500);

    } catch (err) {
        console.error(`[Auto-Wake] Error: ${err.message}`);
        forwardToApp({ 
            success: false, 
            error: err.message, 
            requestId: request.requestId, 
            provider: request.provider,
            action: "process_text_response"
        }, request.sourceTabId);
    } finally {
        setTimeout(() => { isProcessing = false; processNextInQueue(); }, 3000);
    }
}

async function forwardToApp(data, targetTabId) {
    const tabs = await chrome.tabs.query({});
    const appTabs = tabs.filter(t => t.url && (t.url.includes('web.app') || t.url.includes('localhost') || t.url.includes('firebaseapp.com')));
    
    appTabs.forEach(tab => {
        const port = ports.get(tab.id);
        if (port) {
            port.postMessage({ action: "extension_result", data });
        } else {
            chrome.tabs.sendMessage(tab.id, { action: "extension_result", data }).catch(() => {});
        }
    });
}
