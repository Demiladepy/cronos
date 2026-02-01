// content.js

let isCopilotActive = window.location.hash.includes('blindbargain') || 
                      new URLSearchParams(window.location.search).get('mode') === 'accessibility';

// Listen for activation from background (Double check)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'ACTIVATE_COPILOT') {
    isCopilotActive = true;
    startSession();
  }
});

if (isCopilotActive) startSession();

function startSession() {
    // 1. Send "Hello" to the Background Script (Bypasses Autoplay Block)
    speak("Copilot connected. I am scanning the page structure.");

    // 2. Use MutationObserver to wait for dynamic content (React/Angular sites)
    const observer = new MutationObserver((mutations, obs) => {
        const btn = findPrimaryButton();
        if (btn) {
            highlightButton(btn);
            speak(`I found the ${btn.innerText} button. Say 'Click it' to proceed.`);
            obs.disconnect(); // Stop watching once found
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    // Fallback if button is already there
    setTimeout(() => {
        const btn = findPrimaryButton();
        if (btn) highlightButton(btn);
    }, 1000);
}

function speak(text) {
    // 🚀 CRITICAL: Send to background.js instead of speaking directly
    chrome.runtime.sendMessage({ type: 'SPEAK', text: text });
}

function findPrimaryButton() {
    const keywords = ['add to cart', 'buy now', 'checkout', 'add to bag'];
    // Scan buttons, links, and inputs
    const elements = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
    
    return elements.find(el => {
        // Check text content
        const text = el.innerText || el.value || el.getAttribute('aria-label') || "";
        // Check visibility (don't click hidden mobile menu buttons)
        const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
        
        return isVisible && keywords.some(key => text.toLowerCase().includes(key));
    });
}

function highlightButton(btn) {
    btn.style.border = "5px solid #ff0000";
    btn.style.boxShadow = "0 0 20px #ff0000";
    btn.style.zIndex = "99999";
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
}