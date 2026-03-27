// extension/content.js (Persistent & Background Resilient - GHOST PARSING)

let port = null;

function connectPort() {
    try {
        port = chrome.runtime.connect({ name: "ai-content" });
        port.onMessage.addListener((request) => {
            if (request.action === "interactions_process") handleInteraction(request);
            if (request.action === "ping") port.postMessage({ action: "pong" });
        });
        port.onDisconnect.addListener(() => setTimeout(connectPort, 1000));
    } catch (e) {}
}
connectPort();

function querySelectorAllShadow(selector, root = document) {
  const elements = Array.from(root.querySelectorAll(selector));
  const roots = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
  for (const r of roots) elements.push(...querySelectorAllShadow(selector, r.shadowRoot));
  return elements;
}

function findInput() {
  const selectors = [
    'div[contenteditable="true"][data-testid$="input"]', 
    'div[contenteditable="true"][aria-label*="Grok"]',
    'div[contenteditable="true"][role="textbox"]', 
    '[data-testid="message-input"]',
    '.ql-editor',
    'textarea'
  ];
  for (const s of selectors) {
    const found = querySelectorAllShadow(s);
    if (found.length > 0) return found[found.length - 1];
  }
  return null;
}

async function handleInteraction(request) {
  const text = request.content || request.text || "";
  const { isRaw, provider, requestId, language } = request;
  
  try {
    const targetLang = language || "uk";
    const prompt = isRaw ? text : `ACT AS A TECHNICAL NOTETAKER. Respond in ${targetLang}. OUTPUT VALID JSON ONLY: { "title": "string", "formattedContent": "markdown", "type": "idea|bug|architecture|todo", "tags": [] } \n\n INPUT: "${text}"`;

    const textarea = findInput();
    if (!textarea) throw new Error(`${provider} input not found.`);

    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    if (textarea.innerText.length > 0) textarea.innerText = "";
    
    await new Promise(r => setTimeout(r, 200));
    document.execCommand('insertText', false, prompt);
    
    ['input', 'change', 'beforeinput'].forEach(type => {
        textarea.dispatchEvent(new Event(type, { bubbles: true }));
    });

    await new Promise(r => setTimeout(r, 500));

    let sendAttempts = 0;
    const attemptSend = setInterval(() => {
        sendAttempts++;
        const sendBtn = querySelectorAllShadow('button[data-testid*="send"], button[aria-label*="Send"], button[aria-label*="Grok"], .send-button')[0];
        
        if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
            clearInterval(attemptSend);
            setupMutationWatcher(request);
        } else if (sendAttempts > 15) {
            textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, keyCode: 13, key: 'Enter', code: 'Enter', which: 13 }));
            clearInterval(attemptSend);
            setupMutationWatcher(request);
        }
    }, 300);

  } catch (e) {
    sendError(request, e.message);
  }
}

// GHOST WATCHER: Uses MutationObserver to detect changes even when tab is backgrounded
function setupMutationWatcher(request) {
    console.log("[Content] Setting up MutationObserver for background parsing...");
    
    let lastText = "";
    let stableTimer = null;
    const { provider, requestId } = request;

    const observer = new MutationObserver(() => {
        let elements = [];
        if (provider === 'gemini') elements = querySelectorAllShadow('model-response');
        else if (provider === 'claude') elements = document.querySelectorAll('[data-testid="message-container"]');
        else elements = document.querySelectorAll('article, [data-message-author-role="assistant"], [data-testid^="assistant-message-"]');

        const lastMessage = elements[elements.length - 1];
        // textContent is better than innerText for background tabs (no layout reflow needed)
        const currentText = lastMessage?.textContent || "";

        if (currentText && currentText !== lastText) {
            lastText = currentText;
            
            // If text is changing, reset the stability timer
            if (stableTimer) clearTimeout(stableTimer);
            
            // If no changes for 3 seconds, consider it finished
            stableTimer = setTimeout(() => {
                const stopBtn = document.querySelector('button[aria-label*="Stop"], [data-testid*="stop"]');
                if (!stopBtn && currentText.length > 20) {
                    observer.disconnect();
                    console.log(`[Content] Background parsing complete (ID: ${requestId})`);
                    sendResult(request, currentText);
                }
            }, 3000);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Global timeout safety (3 minutes)
    setTimeout(() => {
        observer.disconnect();
        if (lastText.length > 20) sendResult(request, lastText);
        else sendError(request, "Global timeout in background");
    }, 180000);
}

function sendResult(request, text) {
    let data = { raw: text, title: "AI Response", formattedContent: text, type: "generic", tags: [] };
    try {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonCandidate = codeBlockMatch ? codeBlockMatch[1] : text;
        const jsonMatch = jsonCandidate.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            data = { ...data, ...parsed, raw: text };
        }
    } catch(e) {}

    const response = {
        action: "return_result",
        sourceTabId: request.sourceTabId,
        data: { success: true, data, provider: request.provider, requestId: request.requestId, action: "process_text_response" }
    };

    if (port) try { port.postMessage(response); } catch (e) { chrome.runtime.sendMessage(response); }
    else chrome.runtime.sendMessage(response);
}

function sendError(request, error) {
    const response = {
        action: "return_result",
        sourceTabId: request.sourceTabId,
        data: { success: false, error, provider: request.provider, requestId: request.requestId, action: "process_text_response" }
    };
    if (port) try { port.postMessage(response); } catch (e) { chrome.runtime.sendMessage(response); }
    else chrome.runtime.sendMessage(response);
}
