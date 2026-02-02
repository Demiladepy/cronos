// content.js

let isCopilotActive = window.location.hash.includes('blindbargain') || 
                      new URLSearchParams(window.location.search).get('mode') === 'accessibility';

// Track current focused field for navigation
let currentFieldIndex = 0;
let formFields = [];

// Listen for activation from background (Double check)
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
    // 1. Send "Hello" to the Background Script (Bypasses Autoplay Block)
    speak("Copilot connected. I am scanning the page structure.");

    // 2. Check if this is a checkout/cart page first
    setTimeout(() => {
        if (detectAndReadCheckoutPage()) {
            return; // Checkout page handling takes over
        }
        
        // 3. Otherwise, look for primary buttons (Add to Cart, Buy Now, etc.)
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
            if (btn) {
                highlightButton(btn);
                speak(`I found the ${btn.innerText} button. Say 'Click it' to proceed.`);
            }
        }, 1000);
    }, 500);
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

// ============ CHECKOUT PAGE READING ============

function detectAndReadCheckoutPage() {
    // Detect if this is a checkout/cart/payment page
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
    
    // Find all form fields
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
    
    // Build description of fields
    const fieldDescriptions = formFields.map((field, index) => {
        const label = getFieldLabel(field);
        const type = getFieldType(field);
        const required = field.required ? 'required' : 'optional';
        return `Field ${index + 1}: ${label || 'unlabeled'}, ${type}, ${required}`;
    });
    
    // Speak summary
    speak(`I found ${formFields.length} fields. ${fieldDescriptions.slice(0, 5).join('. ')}. Say 'next field' to navigate or 'read field' to hear the current field.`);
    
    // Focus the first field
    if (formFields[0]) {
        highlightField(formFields[0]);
        currentFieldIndex = 0;
    }
    
    return true;
}

function getFieldLabel(field) {
    // Try multiple methods to find the label
    const id = field.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent.trim();
    }
    
    // Check for parent label
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    
    // Check for aria-label
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // Check placeholder
    if (field.placeholder) return field.placeholder;
    
    // Check name attribute (convert from camelCase/snake_case)
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
    // Remove previous highlights
    document.querySelectorAll('.blind-bargain-highlight').forEach(el => {
        el.style.outline = '';
        el.style.boxShadow = '';
        el.classList.remove('blind-bargain-highlight');
    });
    
    // Highlight current field
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
    const btn = findPrimaryButton();
    if (btn) {
        speak(`Clicking ${btn.innerText || 'button'}`);
        btn.click();
    } else {
        speak("I couldn't find a button to click.");
    }
}