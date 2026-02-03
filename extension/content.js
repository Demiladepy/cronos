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
    // Check if there's a login modal visible - if so, prioritize login buttons
    const loginModal = detectLoginModal();
    if (loginModal) {
        const loginKeywords = ['sign in', 'login', 'log in', 'submit', 'continue'];
        const loginButtons = Array.from(loginModal.querySelectorAll('button, input[type="submit"], [role="button"]'));
        
        const loginBtn = loginButtons.find(el => {
            const text = el.innerText || el.value || el.getAttribute('aria-label') || "";
            const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
            return isVisible && loginKeywords.some(key => text.toLowerCase().includes(key));
        });
        
        if (loginBtn) return loginBtn;
    }
    
    // Standard e-commerce button keywords
    const keywords = ['add to cart', 'buy now', 'checkout', 'add to bag', 'proceed', 'continue', 'place order'];
    // Scan buttons, links, and inputs
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
    } else if (lowerCmd.includes('go to cart') || lowerCmd.includes('view cart') || lowerCmd.includes('open cart')) {
        goToCart();
    } else if (lowerCmd.includes('login') || lowerCmd.includes('sign in')) {
        checkForLoginForm();
    }
}

// ============ CART NAVIGATION ============

function goToCart() {
    // Find cart link/button using common selectors
    const cartSelectors = [
        'a[href*="cart"]',
        'a[href*="basket"]',
        '[class*="cart"] a',
        '[class*="basket"] a',
        '[aria-label*="cart"]',
        '[aria-label*="Cart"]',
        '[data-testid*="cart"]',
        // Jumia specific
        '.-cart a',
        '.cart-icon',
        // Konga specific
        '[class*="shopping-cart"]',
        // Generic icon buttons
        'button[class*="cart"]',
        '[class*="header"] [class*="cart"]'
    ];
    
    for (const selector of cartSelectors) {
        const cartLink = document.querySelector(selector);
        if (cartLink && isElementVisible(cartLink)) {
            speak("Opening your cart.");
            cartLink.click();
            return;
        }
    }
    
    // If no cart link found, try to navigate directly
    const currentUrl = window.location.href;
    const baseUrl = new URL(currentUrl).origin;
    
    // Common cart URLs
    const cartUrls = ['/cart', '/basket', '/checkout/cart', '/shopping-cart'];
    for (const cartPath of cartUrls) {
        speak(`Trying to navigate to cart at ${baseUrl}${cartPath}`);
        window.location.href = baseUrl + cartPath;
        return;
    }
    
    speak("I couldn't find the cart link. Try looking for a cart icon on the page.");
}

function checkForLoginForm() {
    const loginModal = detectLoginModal();
    if (loginModal) {
        readLoginForm(loginModal);
    } else {
        // Look for login link
        const loginLink = document.querySelector('a[href*="login"], a[href*="signin"], button[class*="login"], [class*="sign-in"]');
        if (loginLink && isElementVisible(loginLink)) {
            speak("I found a login link. Say 'click' to open the login page.");
            highlightButton(loginLink);
        } else {
            speak("I couldn't find a login form on this page.");
        }
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
        return;
    }
    
    speak(`Clicking ${btn.innerText || 'button'}`);
    btn.click();
    
    // Wait and check what happened after the click
    setTimeout(() => {
        checkPostClickState();
    }, 1500);
}

// ============ POST-CLICK STATE DETECTION ============

function checkPostClickState() {
    // Check for login modal first
    const loginModal = detectLoginModal();
    if (loginModal) {
        speak("A login form appeared. You need to sign in first. Let me read the login fields.");
        readLoginForm(loginModal);
        return;
    }
    
    // Check for success indicators
    if (detectCartSuccess()) {
        speak("Item added to cart successfully. Say 'go to cart' to proceed to checkout.");
        return;
    }
    
    // Check for error messages
    const errorMsg = detectErrorMessage();
    if (errorMsg) {
        speak(`There was an issue: ${errorMsg}`);
        return;
    }
    
    speak("The button was clicked. Please wait for the page to respond.");
}

// ============ LOGIN MODAL DETECTION ============

function detectLoginModal() {
    // Common login modal selectors across e-commerce sites
    const loginSelectors = [
        // Generic modal with login content
        '[class*="login-modal"]',
        '[class*="signin-modal"]',
        '[class*="auth-modal"]',
        '[id*="login-modal"]',
        '[id*="signin"]',
        '[id*="loginModal"]',
        // Jumia specific
        '.osh-modal [class*="login"]',
        '[data-testid="login-form"]',
        '.-login',
        // Konga specific
        '[class*="auth"] form',
        // Common patterns - forms with login indicators
        'form[action*="login"]',
        'form[action*="signin"]',
        'form[action*="authenticate"]',
        // Modal with email + password fields (strong indicator)
        '.modal input[type="email"]',
        '.modal input[type="password"]',
        '[role="dialog"] input[type="password"]',
        // Generic overlays with login content
        '[class*="overlay"] input[type="password"]',
        '[class*="popup"] input[type="password"]'
    ];
    
    for (const selector of loginSelectors) {
        const element = document.querySelector(selector);
        if (element && isElementVisible(element)) {
            // Return the modal container or the element itself
            return element.closest('.modal, [class*="modal"], [role="dialog"], [class*="overlay"], [class*="popup"]') || element;
        }
    }
    return null;
}

function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return el.offsetWidth > 0 && 
           el.offsetHeight > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' &&
           style.opacity !== '0';
}

function readLoginForm(modal) {
    // Find login form fields within the modal
    const emailField = modal.querySelector(
        'input[type="email"], input[name*="email"], input[name*="user"], input[name*="phone"], input[placeholder*="email"], input[placeholder*="phone"]'
    );
    const passwordField = modal.querySelector('input[type="password"]');
    const submitBtn = modal.querySelector(
        'button[type="submit"], input[type="submit"], button[class*="login"], button[class*="signin"], button:not([type="button"])'
    );
    
    // Update form fields for navigation
    formFields = [emailField, passwordField].filter(f => f && isElementVisible(f));
    currentFieldIndex = 0;
    
    if (formFields.length === 0) {
        speak("I detected a login prompt but couldn't find the input fields. The page may need to load more.");
        return;
    }
    
    // Highlight and focus the first field
    if (emailField && isElementVisible(emailField)) {
        highlightField(emailField);
        const fieldLabel = getFieldLabel(emailField) || 'email or phone number';
        speak(`Login form detected. First field is ${fieldLabel}. Type your credentials and say 'next' for password, then 'click' to sign in.`);
    } else if (passwordField) {
        highlightField(passwordField);
        speak("Login form detected. I found the password field. Type your password and say 'click' to sign in.");
    }
}

// ============ CART SUCCESS DETECTION ============

function detectCartSuccess() {
    // Common success indicators across e-commerce sites
    const successSelectors = [
        // Cart count indicators
        '[class*="cart-count"]:not(:empty)',
        '[class*="cart-badge"]:not(:empty)',
        '[class*="cart-quantity"]:not(:empty)',
        // Success messages
        '[class*="added-to-cart"]',
        '[class*="add-success"]',
        '[class*="success-message"]',
        '.toast-success',
        '[data-testid*="success"]',
        // Jumia specific
        '.-success',
        '.cart-confirmation',
        // Generic success alerts
        '.alert-success',
        '[role="alert"][class*="success"]'
    ];
    
    // Check for success elements
    for (const selector of successSelectors) {
        const el = document.querySelector(selector);
        if (el && isElementVisible(el)) {
            return true;
        }
    }
    
    // Check for toast/notification with success text
    const toastSelectors = '[class*="toast"], [class*="notification"], [class*="alert"], [class*="snackbar"], [class*="message"]';
    const toasts = document.querySelectorAll(toastSelectors);
    for (const toast of toasts) {
        if (isElementVisible(toast)) {
            const text = toast.textContent.toLowerCase();
            if (text.includes('added') || 
                text.includes('success') || 
                text.includes('cart updated') ||
                text.includes('item in cart')) {
                return true;
            }
        }
    }
    
    return false;
}

// ============ ERROR DETECTION ============

function detectErrorMessage() {
    const errorSelectors = [
        // Generic error classes
        '.error-message',
        '[class*="error"]:not(input)',
        '[class*="err-msg"]',
        '.toast-error',
        '.alert-danger',
        '.alert-error',
        '[role="alert"]:not([class*="success"])',
        // Form validation errors
        '.validation-error',
        '.field-error',
        '[class*="invalid-feedback"]',
        // Jumia/Konga specific
        '.-error',
        '.form-error'
    ];
    
    for (const selector of errorSelectors) {
        const el = document.querySelector(selector);
        if (el && isElementVisible(el)) {
            const text = el.textContent.trim();
            // Filter out empty or irrelevant content
            if (text && text.length > 3 && text.length < 200) {
                return text;
            }
        }
    }
    
    // Check for error toasts
    const toasts = document.querySelectorAll('[class*="toast"], [class*="notification"], [class*="alert"]');
    for (const toast of toasts) {
        if (isElementVisible(toast)) {
            const text = toast.textContent.toLowerCase();
            if (text.includes('error') || 
                text.includes('failed') || 
                text.includes('invalid') ||
                text.includes('unable') ||
                text.includes('problem')) {
                return toast.textContent.trim().slice(0, 100);
            }
        }
    }
    
    return null;
}