// ==UserScript==
// @name         DevVoice Scratchpad Bridge
// @namespace    http://tampermonkey.net/
// @version      2.7
// @description  Stabilized cross-domain bridge with robust auto-scroll
// @author       DevVoice Team
// @match        https://scratchpad-86a79.web.app/*
// @match        http://localhost:5173/*
// @match        http://127.0.0.1:5173/*
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://gemini.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const isChatGPT = window.location.host.includes('chatgpt.com') || window.location.host.includes('chat.openai.com');
    const isGemini = window.location.host.includes('gemini.google.com');
    const isAiPage = isChatGPT || isGemini;
    let lastRequestTs = 0;
    let lastResponseTs = 0;

    // --- VISUAL INDICATOR ---
    const div = document.createElement('div');
    div.style = "position:fixed; bottom:10px; right:10px; padding:6px 10px; background:#6366f1; color:white; border-radius:6px; font-size:11px; z-index:99999; font-family:monospace; box-shadow:0 4px 15px rgba(0,0,0,0.4); pointer-events:none;";
    div.innerText = `DV Bridge v2.8 (${isChatGPT ? 'GPT' : (isGemini ? 'Gemini' : 'App')})`;
    document.body.appendChild(div);

    const sendToPage = (data) => {
        window.postMessage({ type: 'DEVVOICE_BRIDGE_RESPONSE', ...data }, '*');
        window.dispatchEvent(new CustomEvent('DevVoiceResponse', { detail: data }));
    };

    // --- APP SIDE ---
    if (!isAiPage) {
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'DEVVOICE_BRIDGE_REQUEST') {
                const { action, data } = e.data;
                const provider = e.data.provider || data?.provider || 'chatgpt';
                
                if (action === 'check_connection') {
                    console.log(`DV Bridge: Connection check for ${provider}`);
                    sendToPage({ 
                        action: provider === 'gemini' ? 'gemini_response' : 'chatgpt_response', 
                        connected: true, 
                        type: 'connection_status', 
                        provider: 'tampermonkey-v2.9' 
                    });
                } else {
                    lastRequestTs = Date.now();
                    GM_setValue('app_request', { action, data, provider, ts: lastRequestTs });
                    div.style.background = '#f59e0b';
                    div.innerText = `DV Bridge: Sending (${provider})...`;
                }
            }
        });

        setInterval(() => {
            const response = GM_getValue('ai_response');
            if (response && response.ts > lastResponseTs) {
                lastResponseTs = response.ts;
                sendToPage(response);
                div.style.background = '#6366f1';
                div.innerText = 'DV Bridge v2.8 (App)';
            }
        }, 1000);
    }

    // --- AI SIDE (ChatGPT or Gemini) ---
    if (isAiPage) {
        setInterval(() => {
            const request = GM_getValue('app_request');
            if (request && request.ts > lastRequestTs) {
                // Only process if the request matches current provider
                const currentProvider = isGemini ? 'gemini' : 'chatgpt';
                if (request.provider && request.provider !== currentProvider) return;

                lastRequestTs = request.ts;
                const isRaw = request.action === 'raw_query';
                handleAI(request.data.prompt || request.data.text, isRaw);
                div.style.background = '#f59e0b';
                div.innerText = `DV Bridge: Working (${currentProvider}${isRaw ? ' RAW' : ''})...`;
            }
        }, 1000);

        async function handleAI(text, isRaw = false) {
            const prompt = isRaw ? text : `IMPORTANT: Output ONLY JSON. Format: { "title": "...", "formattedContent": "...", "type": "idea|bug|architecture|todo", "tags": [] }. Input: "${text}"`;
            
            let textarea;
            if (isGemini) {
                textarea = document.querySelector('div[contenteditable="true"][role="textbox"]') || 
                           document.querySelector('.ql-editor') ||
                           document.querySelector('div[contenteditable="true"]');
            } else {
                textarea = document.querySelector('#prompt-textarea') || document.querySelector('textarea');
            }
            
            if (!textarea) return;
            
            if (isGemini || textarea.tagName === 'DIV' || textarea.contentEditable === 'true') {
                textarea.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
                document.execCommand('insertText', false, prompt);
            } else {
                textarea.value = prompt;
            }
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
                let btn;
                if (isGemini) {
                    btn = document.querySelector('button[aria-label="Send prompt"]') || document.querySelector('.send-button');
                } else {
                    btn = document.querySelector('button[data-testid="send-button"]') || document.querySelector('button[aria-label="Send prompt"]');
                }
                
                if (btn && !btn.disabled) btn.click();
                else {
                    const enterEvent = new KeyboardEvent('keydown', {
                        bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter'
                    });
                    textarea.dispatchEvent(enterEvent);
                }
                observe();
            }, 600);
        }

        function observe() {
            let lastSeenText = "";
            let stableCount = 0;
            
            const checkInterval = setInterval(() => {
                let rawText = "";
                let isStopGone = true;

                if (isGemini) {
                    const responses = document.querySelectorAll('model-response');
                    const last = responses[responses.length - 1];
                    if (last) {
                        rawText = last.innerText;
                        const stopBtn = document.querySelector('button[aria-label="Stop response"]');
                        const hasFooter = last.querySelector('.response-footer') || last.querySelector('button[aria-label="Good response"]');
                        isStopGone = !stopBtn && (hasFooter || document.querySelector('button[aria-label="Send prompt"]:not([disabled])'));
                    }
                } else {
                    const articles = document.querySelectorAll('article');
                    const last = articles[articles.length - 1];
                    if (last && !last.querySelector('[data-testid="user-message"]')) {
                        rawText = last.innerText;
                        const stopBtn = document.querySelector('button[aria-label="Stop generating"]');
                        isStopGone = !stopBtn;
                    }
                }

                if (!rawText) return;
                
                // Robust auto-scroll
                window.scrollTo(0, document.body.scrollHeight);

                if (rawText === lastSeenText && rawText.length > 0) stableCount++;
                else { stableCount = 0; lastSeenText = rawText; }

                const firstBrace = rawText.indexOf('{');
                const lastBrace = rawText.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    if (isStopGone || stableCount >= 3) {
                        const jsonCandidate = rawText.substring(firstBrace, lastBrace + 1);
                        let dataToReturn = { raw: rawText };
                        if (!isRaw) {
                            try { 
                                const parsed = JSON.parse(jsonCandidate.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
                                dataToReturn = { ...parsed, raw: rawText };
                            } catch(e) {
                                dataToReturn = { raw: rawText };
                            }
                        }
                        
                        const responseEvent = { 
                            action: isGemini ? 'gemini_response' : 'chatgpt_response', 
                            success: true, 
                            data: dataToReturn, 
                            raw: rawText, 
                            ts: Date.now() 
                        };
                        
                        GM_setValue('ai_response', responseEvent);
                        div.style.background = '#10a37f';
                        div.innerText = 'DV Bridge: Captured';
                        clearInterval(checkInterval);
                    }
                } else if (isRaw && (isStopGone || stableCount >= 3)) {
                     const responseEvent = { 
                        action: isGemini ? 'gemini_response' : 'chatgpt_response', 
                        success: true, 
                        data: { raw: rawText }, 
                        raw: rawText, 
                        ts: Date.now() 
                    };
                    GM_setValue('ai_response', responseEvent);
                    div.style.background = '#10a37f';
                    div.innerText = 'DV Bridge: Captured (Raw)';
                    clearInterval(checkInterval);
                }
            }, 1000);
            setTimeout(() => clearInterval(checkInterval), 90000);
        }
    }
})();