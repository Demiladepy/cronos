// background.js

// 1. Listen for speech requests from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SPEAK') {
    // Cancel any ongoing speech first
    chrome.tts.stop();
    chrome.tts.speak(message.text, {
      rate: 0.95,
      pitch: 1.0,
      lang: 'en-NG', // Nigerian English for better local accent support
      voiceName: 'Google US English' // Fallback to clear voice
    });
  }
  
  // Relay voice commands to content script
  if (message.type === 'VOICE_COMMAND') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'VOICE_COMMAND', 
          command: message.command 
        });
      }
    });
  }
});

// 2. Detect "Blind Bargain" redirects automatically and activate copilot
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('#blindbargain') || tab.url.includes('mode=accessibility')) {
      chrome.tabs.sendMessage(tabId, { type: 'ACTIVATE_COPILOT' });
    }
  }
});

// 3. Handle extension icon click - toggle copilot on current tab
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_COPILOT' });
});