// background.js

// 1. Listen for speech requests from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SPEAK') {
    chrome.tts.speak(message.text, {
      rate: 1.0,
      lang: 'en-US',
      gender: 'female'
    });
  }
});

// 2. Optional: Detect "Blind Bargain" redirects automatically
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('#blindbargain') || tab.url.includes('mode=accessibility')) {
      chrome.tabs.sendMessage(tabId, { type: 'ACTIVATE_COPILOT' });
    }
  }
});