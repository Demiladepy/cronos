let isCopilotActive = window.location.hash.includes('blindbargain') || 
                      new URLSearchParams(window.location.search).get('mode') === 'accessibility';

let recognition = null; // Store globally to prevent duplicates

// Listen for activation from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'ACTIVATE_COPILOT') {
    isCopilotActive = true;
    startSession();
  }
  // Handle voice commands from background
  if (msg.type === 'VOICE_COMMAND') {
    handleVoiceCommand(msg.command);
  }
});

if (isCopilotActive) startSession();

function startSession() {
    // 1. JIJI CHECK 
    if (window.location.hostname.includes('jiji')) {
        speak("I am on Jiji. Say 'Show Contact' to see the number.");
        startVoiceListener(null, 'jiji');
        return;
    }

    // 2. SCANNING
    speak("Copilot connected. Scanning page.");

    // 3. CHECKOUT DETECTION
    setTimeout(() => {
        if (detectAndReadCheckoutPage()) {
            startVoiceListener(null, 'checkout'); 
            return; 
        }
        
        // 4. BUTTON DETECTION
        const observer = new MutationObserver((mutations, obs) => {
            const btn = findPrimaryButton();
            if (btn) {
                highlightButton(btn);
                speak(`Found ${btn.innerText}. Say 'Click it'.`);
                obs.disconnect(); 
                startVoiceListener(btn, 'standard'); 
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        
        // Fallback check
        setTimeout(() => {
            const btn = findPrimaryButton();
            if (btn) {
                highlightButton(btn);
                speak(`Found ${btn.innerText}. Say 'Click it'.`);
                startVoiceListener(btn, 'standard'); 
            } else {
                // If we found nothing, listen anyway for generic commands
                startVoiceListener(null, 'standard');
            }
        }, 1500);
    }, 1000);
}

// ============ VOICE LISTENER (FIXED) ============

function startVoiceListener(targetButton, mode) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return console.error("No Voice Support");

    // Prevent multiple listeners fighting
    if (recognition) {
        try { recognition.stop(); } catch(e){}
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // 🎤 DEBUG: Log everything it hears
    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('')
            .toLowerCase()
            .trim();

        console.log("👂 Extension Heard:", transcript); // <--- CHECK THIS LOG

        // JIJI MODE
        if (mode === 'jiji') {
            if (transcript.includes("show") || transcript.includes("contact")) {
                recognition.stop();
                clickJijiButton();
            }
            return;
        }

        // CHECKOUT MODE
        if (mode === 'checkout') {
            handleVoiceCommand(transcript);
            return;
        }

        // STANDARD MODE
        if (transcript.includes("click") || transcript.includes("buy") || transcript.includes("yes") || transcript.includes("select")) {
            console.log("✅ Command Matched! Clicking...");
            recognition.stop();
            speak("Clicking now.");
            
            // Re-find button just in case DOM changed
            const freshBtn = targetButton || findPrimaryButton();
            if (freshBtn) {
                forceClick(freshBtn);
            } else {
                speak("I lost the button. Scanning again.");
                startSession(); // Restart scan
            }
        }
    };

    // 🚨 CRITICAL: Handle Permission Errors
    recognition.onerror = (event) => {
        console.error("🎤 Mic Error:", event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            speak("Microphone is blocked on this site. Please click the lock icon in the address bar and allow microphone access.");
        }
    };

    recognition.onend = () => {
        // Restart unless we are clicking (which stops it manually)
        console.log("🔄 Listener restarted");
        try { recognition.start(); } catch(e) {}
    };
    
    try { 
        recognition.start(); 
        console.log("🎤 Listener Started");
    } catch(e) {
        console.error("Could not start listener:", e);
    }
}

// ============ ACTION HELPERS ============

function speak(text) {
    chrome.runtime.sendMessage({ type: 'SPEAK', text: text });
}

function findPrimaryButton() {
    const keywords = ['add to cart', 'buy now', 'checkout', 'add to bag', 'proceed'];
    const elements = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
    
    return elements.find(el => {
        const text = (el.innerText || el.value || el.getAttribute('aria-label') || "").toLowerCase();
        const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
        return isVisible && keywords.some(key => text.includes(key));
    });
}

function highlightButton(btn) {
    btn.style.border = "5px solid #ff0000";
    btn.style.boxShadow = "0 0 20px #ff0000";
    btn.style.zIndex = "99999";
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function forceClick(element) {
    element.style.border = "5px solid #00ff00"; 
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        const options = {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        };
        // Pointer events (Mobile/Modern)
        try {
            element.dispatchEvent(new PointerEvent('pointerdown', options));
            element.dispatchEvent(new PointerEvent('pointerup', options));
        } catch (e) {}
        // Mouse events (Legacy/React)
        element.dispatchEvent(new MouseEvent('mouseover', options));
        element.dispatchEvent(new MouseEvent('mousedown', options));
        element.dispatchEvent(new MouseEvent('mouseup', options));
        element.dispatchEvent(new MouseEvent('click', options));
        // Native
        element.click();
    }, 500);
}

function clickJijiButton() {
    const btns = Array.from(document.querySelectorAll('button, a, div[class*="show-contact"], div[class*="qa-show-contact"]'));
    const contactBtn = btns.find(b => {
        const txt = (b.innerText || "").toLowerCase();
        return txt.includes('show') || txt.includes('call') || txt.includes('contact');
    });
    
    if (contactBtn) {
        speak("Revealing number.");
        forceClick(contactBtn);
    } else {
        speak("Contact button not found.");
    }
}

// ============ CHECKOUT PAGE READING ============

function detectAndReadCheckoutPage() {
    const url = window.location.href.toLowerCase();
    const isCheckoutPage = 
        url.includes('checkout') ||
        url.includes('cart') ||
        url.includes('payment') ||
        url.includes('order') ||
        url.includes('shipping') ||
        document.querySelector('form[action*="checkout"]') ||
        document.querySelector('[class*="checkout"]') ||
        document.querySelector('[class*="payment"]');
    
    if (!isCheckoutPage) return false;
    
    speak("You are on a checkout page. Let me read the form fields for you.");
    
    formFields = Array.from(document.querySelectorAll('input, select, textarea'))
        .filter(field => {
            const type = field.type || 'text';
            const isVisible = field.offsetWidth > 0 && field.offsetHeight > 0;
            return isVisible && !['hidden', 'submit', 'button', 'image'].includes(type);
        });
    
    if (formFields.length === 0) {
        speak("I couldn't find any form fields on this page.");
        return true;
    }
    
    const fieldDescriptions = formFields.map((field, index) => {
        const label = getFieldLabel(field);
        const type = getFieldType(field);
        const required = field.required ? 'required' : 'optional';
        return `Field ${index + 1}: ${label || 'unlabeled'}, ${type}, ${required}`;
    });
    
    speak(`I found ${formFields.length} fields. ${fieldDescriptions.slice(0, 5).join('. ')}. Say 'next field' to navigate or 'read field' to hear the current field.`);
    
    if (formFields[0]) {
        highlightField(formFields[0]);
        currentFieldIndex = 0;
    }
    
    return true;
}

function getFieldLabel(field) {
    const id = field.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent.trim();
    }
    
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    if (field.placeholder) return field.placeholder;
    
    if (field.name) {
        return field.name
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .trim();
    }
    
    return '';
}

function getFieldType(field) {
    const type = field.type || field.tagName.toLowerCase();
    const typeMap = {
        'text': 'text input',
        'email': 'email input',
        'tel': 'phone number',
        'password': 'password',
        'number': 'number input',
        'select-one': 'dropdown',
        'select-multiple': 'multi-select',
        'textarea': 'text area',
        'checkbox': 'checkbox',
        'radio': 'radio button'
    };
    return typeMap[type] || type;
}

function highlightField(field) {
    document.querySelectorAll('.blind-bargain-highlight').forEach(el => {
        el.style.outline = '';
        el.style.boxShadow = '';
        el.classList.remove('blind-bargain-highlight');
    });
    
    field.style.outline = "4px solid #00ff00";
    field.style.boxShadow = "0 0 15px #00ff00";
    field.classList.add('blind-bargain-highlight');
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus();
}

// ============ VOICE COMMAND HANDLERS ============

function handleVoiceCommand(command) {
    const lowerCmd = command.toLowerCase();
    
    if (lowerCmd.includes('next field') || lowerCmd.includes('next')) {
        focusNextField();
    } else if (lowerCmd.includes('previous field') || lowerCmd.includes('back')) {
        focusPreviousField();
    } else if (lowerCmd.includes('read field') || lowerCmd.includes('what field')) {
        readCurrentField();
    } else if (lowerCmd.includes('click') || lowerCmd.includes('submit') || lowerCmd.includes('press')) {
        clickCurrentButton();
    } else if (lowerCmd.includes('read page') || lowerCmd.includes('scan page')) {
        detectAndReadCheckoutPage();
    }
}

function focusNextField() {
    if (formFields.length === 0) {
        speak("No form fields found. Say 'scan page' to find fields.");
        return;
    }
    
    currentFieldIndex = (currentFieldIndex + 1) % formFields.length;
    const field = formFields[currentFieldIndex];
    highlightField(field);
    
    const label = getFieldLabel(field);
    const type = getFieldType(field);
    const value = field.value ? `Current value: ${field.value}` : 'Empty';
    speak(`${label || 'Field ' + (currentFieldIndex + 1)}, ${type}. ${value}`);
}

function focusPreviousField() {
    if (formFields.length === 0) {
        speak("No form fields found. Say 'scan page' to find fields.");
        return;
    }
    
    currentFieldIndex = currentFieldIndex === 0 ? formFields.length - 1 : currentFieldIndex - 1;
    const field = formFields[currentFieldIndex];
    highlightField(field);
    
    const label = getFieldLabel(field);
    const type = getFieldType(field);
    const value = field.value ? `Current value: ${field.value}` : 'Empty';
    speak(`${label || 'Field ' + (currentFieldIndex + 1)}, ${type}. ${value}`);
}

function readCurrentField() {
    if (formFields.length === 0) {
        speak("No form fields found. Say 'scan page' to find fields.");
        return;
    }
    
    const field = formFields[currentFieldIndex];
    const label = getFieldLabel(field);
    const type = getFieldType(field);
    const required = field.required ? 'This field is required.' : 'This field is optional.';
    const value = field.value ? `Current value is: ${field.value}` : 'This field is empty.';
    
    speak(`${label || 'Field ' + (currentFieldIndex + 1)}. ${type}. ${required} ${value}`);
}

function clickCurrentButton() {
    // ⚡ UPDATE: Uses forceClick logic instead of simple .click()
    const btn = findPrimaryButton();
    if (btn) {
        speak(`Clicking ${btn.innerText || 'button'}`);
        forceClick(btn);
    } else {
        speak("I couldn't find a button to click.");
    }
}