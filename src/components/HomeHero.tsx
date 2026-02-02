import { useEffect, useState, useCallback, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import AnalyzingModal from './AnalyzingModal';
import { HomeHeroProps, ResultItem } from '../types';

const HomeHero: React.FC<HomeHeroProps> = ({ onResult }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [allResults, setAllResults] = useState<ResultItem[]>([]);
  const [isVoiceGuided, setIsVoiceGuided] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isWaitingForProductRef = useRef(false);
  const isLandingReadRef = useRef(false); 
  const isSpeakingRef = useRef(false); 
  
  // 🔒 1. NEW: The Search Lock
  const isSearchLockedRef = useRef(false);
  const isStoppingRef = useRef(false);
  const stopCooldownRef = useRef(false);

  const { transcript, listening, resetTranscript, interimTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  const speak = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    SpeechRecognition.stopListening(); 
    // Clear transcript immediately when starting to speak
    resetTranscript();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    
    utterance.onend = () => {
      isSpeakingRef.current = false;
      // Wait 1 second for audio to fully dissipate before doing anything
      setTimeout(() => {
        // Clear any captured AI speech again before restarting listening
        resetTranscript();
        
        // Call the callback FIRST (before restarting mic)
        // This allows setting flags like isWaitingForProductRef
        if (onEnd) onEnd();
        
        // Then restart listening with a small additional delay
        setTimeout(() => {
          if (!isSearchLockedRef.current) {
            resetTranscript(); // Clear one more time right before listening
            SpeechRecognition.startListening({ continuous: true, interimResults: true, language: 'en-NG' });
          }
        }, 300);
      }, 1000); // Increased to 1 second to ensure TTS audio has fully dissipated
    };
    
    window.speechSynthesis.speak(utterance);
  }, [resetTranscript]);

  const readLandingPage = useCallback(() => {
    isLandingReadRef.current = true;
    const script = 
      "I am reading the screen for you. The title is: Find a better deal for the product on your current tab. " +
      "There are two buttons. One: Get My Bargain. Two: Use Voice Command. " +
      "Command me to click one, or say 'Search for' followed by a product name.";
    speak(script);
  }, [speak]);

  const handleStartAnalyze = async (query: string) => {
    // 🛑 2. GUARD: Prevent double-firing
    if (isSearchLockedRef.current || !query || query.length < 2) {
      console.log('⚠️ Search blocked:', { locked: isSearchLockedRef.current, query, length: query?.length });
      return;
    }
    console.log('🔍 Starting search for:', query);

    // Lock the search
    isSearchLockedRef.current = true;
    
    abortControllerRef.current = new AbortController();
    setIsAnalyzing(true);
    setProgress(10);
    
    // Mute mic while searching
    SpeechRecognition.stopListening();
    speak(`Searching for ${query}. Command me to stop if you change your mind.`);

    // Safety timeout to unlock if something goes wrong
    const lockTimeout = setTimeout(() => {
      isSearchLockedRef.current = false;
    }, 30000);

    try {
      console.log('📡 Fetching from backend...');
      const response = await fetch(`http://localhost:3001/api/scrape/all/${encodeURIComponent(query)}`, { 
        signal: abortControllerRef.current.signal 
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Raw backend response:', JSON.stringify(data, null, 2));
      
      // Check if platforms exist
      if (!data.platforms || !Array.isArray(data.platforms)) {
        console.error('❌ Invalid response structure - no platforms array');
        throw new Error('Invalid response from backend');
      }
      
      const allMergedProducts = data.platforms.flatMap((p: any) => p.products || []);
      console.log('🛒 All merged products:', allMergedProducts.length, 'items');
      console.log('🛒 Products sample:', allMergedProducts.slice(0, 2));

      const topSorted: ResultItem[] = allMergedProducts
        .filter((item: any) => {
          const hasPrice = item.price > 0;
          if (!hasPrice) console.log('⚠️ Filtered out (no price):', item.name);
          return hasPrice;
        })
        .map((item: any): ResultItem => ({
          ...item,
          normalizedPrice: ['amazon', 'aliexpress'].includes(item.vendor?.toLowerCase()) ? item.price * 1450 : item.price
        }))
        .sort((a: ResultItem, b: ResultItem) => (a.normalizedPrice || 0) - (b.normalizedPrice || 0))
        .slice(0, 3);

      console.log('✅ Top sorted results:', topSorted.length, 'items');
      console.log('✅ Results:', topSorted);

      if (topSorted.length > 0) {
        setAllResults(topSorted); 
        onResult(topSorted);
        setProgress(100);
        setIsAnalyzing(false);
        speak(`I found the top result on ${topSorted[0].vendor} for ${topSorted[0].price}. Command me to proceed to checkout.`);
      } else {
        setIsAnalyzing(false);
        speak("I found nothing. Command me to search for something else.");
      }
    } catch (err: any) {
      setIsAnalyzing(false);
      console.error('❌ Search error details:', err);
      console.error('❌ Error name:', err.name);
      console.error('❌ Error message:', err.message);
      if (err.name !== 'AbortError') {
        speak("Sorry, the search failed. Please try again.");
      }
    } finally {
        // 🔓 3. UNLOCK: Always release the lock when done
        clearTimeout(lockTimeout);
        isSearchLockedRef.current = false;
        // Restart listening safely
        setTimeout(() => SpeechRecognition.startListening({ continuous: true, interimResults: true, language: 'en-NG' }), 500);
    }
  };

  useEffect(() => {
    // Guard: Don't listen if AI is speaking
    if (isSpeakingRef.current) return;

    const currentSpeech = (transcript + " " + interimTranscript).toLowerCase();
    if (!currentSpeech.trim()) return;

    // --- PRIORITY COMMAND: STOP ---
    // This is the ONLY command allowed while analyzing
    if ((currentSpeech.includes("stop") || currentSpeech.includes("cancel")) && !isStoppingRef.current && !stopCooldownRef.current) {
      isStoppingRef.current = true;
      stopCooldownRef.current = true;

      window.speechSynthesis.cancel();
      setIsAnalyzing(false);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      
      isSearchLockedRef.current = false;
      isWaitingForProductRef.current = false;
      
      resetTranscript();
      SpeechRecognition.stopListening();
      speak("Paused. Waiting for your next command.", () => {
        isStoppingRef.current = false;
        // Reset cooldown after 2 seconds to prevent re-triggering from AI's own voice
        setTimeout(() => {
          stopCooldownRef.current = false;
        }, 2000);
        setTimeout(() => SpeechRecognition.startListening({ continuous: true, interimResults: true, language: 'en-NG' }), 500);
      });
      return;
    }

    // 🛑 4. BUSY GUARD: If searching, ignore all other commands
    if (isSearchLockedRef.current || isAnalyzing) return;

    // --- PRODUCT CAPTURE (moved before isVoiceGuided check for button-triggered flows) ---
    if (isWaitingForProductRef.current && transcript.trim().length > 1) {
      const query = transcript.trim();
      console.log('🎯 Product captured:', query);
      isWaitingForProductRef.current = false;
      resetTranscript();
      SpeechRecognition.stopListening();
      handleStartAnalyze(query);
      return;
    }

    // --- WAKE WORD (with flexible matching for Nigerian accents) ---
    if (!isVoiceGuided && (
      currentSpeech.includes("blind bargain") || 
      currentSpeech.includes("hey bargain") ||
      currentSpeech.includes("hey blind") ||
      currentSpeech.includes("line bargain") ||  // Common mishearing
      currentSpeech.includes("blind begun") ||   // Common mishearing
      currentSpeech.endsWith("bargain")          // Catch partial wake words
    )) {
      setIsVoiceGuided(true);
      resetTranscript();
      if (!isLandingReadRef.current) {
        readLandingPage();
      } else {
        speak("I'm back. What is your command?");
      }
      return;
    }

    if (!isVoiceGuided) return;

    // --- COMMANDS (with flexible matching for Nigerian accents) ---
    if (
      currentSpeech.includes("click get my bargain") || 
      currentSpeech.includes("click the blue button") ||
      currentSpeech.includes("get my bargain") ||
      currentSpeech.includes("get bargain") ||
      currentSpeech.includes("my bargain") ||
      currentSpeech.includes("click bargain")
    ) {
      resetTranscript();
      // Speak first, then set waiting flag AFTER speech ends
      speak("What product should I look for?", () => {
        isWaitingForProductRef.current = true;
      });
      return;
    }

    // Combined "Proceed" Logic - Opens the product page on the vendor's site
    if (allResults.length > 0 && (currentSpeech.includes("proceed") || currentSpeech.includes("checkout"))) {
      resetTranscript();
      const productUrl = allResults[0].url;
      
      // Log for debugging
      console.log('🛒 Opening product URL:', productUrl);
      
      // Validate URL exists and is absolute
      if (!productUrl || !productUrl.startsWith('http')) {
        speak("Sorry, the product link is not available. Please try searching again.");
        return;
      }
      
      speak("Opening the store page now.");
      // Add hash for extension detection (only if URL doesn't already have a hash)
      const targetUrl = productUrl.includes('#') ? productUrl : `${productUrl}#blindbargain`;
      window.open(targetUrl, '_blank');
      return;
    }

  }, [transcript, interimTranscript, isVoiceGuided, allResults, isAnalyzing, speak, readLandingPage, resetTranscript, onResult]);

  useEffect(() => {
    SpeechRecognition.startListening({ continuous: true, interimResults: true, language: 'en-NG' });
  }, []);

  if (!browserSupportsSpeechRecognition) return null;

  return (
    <>
      <main className="flex flex-col items-center justify-center text-center px-4 py-12 md:py-20 bg-[#0b1220] text-white min-h-[calc(100vh-64px)]">
        <div className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-medium ${isVoiceGuided ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
          <span className={`h-2 w-2 rounded-full ${isVoiceGuided ? 'bg-green-400' : 'bg-red-400'}`} />
          {isVoiceGuided ? "Ready and connected" : "say 'blind bargain' to activate voice mode"}
        </div>

        <h1 className="max-w-xl text-2xl md:text-4xl font-bold leading-tight mb-8">Find a better deal for the product on your current tab.</h1>

        <button 
          onClick={() => {
            // Clear any stale transcript immediately
            resetTranscript();
            setIsVoiceGuided(true);
            // Speak first, then set waiting flag AFTER speech ends
            speak("What should I search for?", () => {
              isWaitingForProductRef.current = true;
            });
          }} 
          className="mb-4 w-full max-w-sm rounded-lg bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-500 transition disabled:opacity-50"
        >
          GET MY BARGAIN
        </button>

        <button 
          onClick={() => {
            // Clear any stale transcript immediately
            resetTranscript();
            setIsVoiceGuided(true);
            // Speak first, then set waiting flag AFTER speech ends
            speak("Voice search active. What are you looking for?", () => {
              isWaitingForProductRef.current = true;
            });
          }} 
          className="mb-6 w-full max-w-sm rounded-lg border border-white/20 py-3 flex items-center justify-center gap-2 hover:bg-white/10 transition"
        >
          {listening ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} />} 
          {listening ? 'Listening...' : 'Use Voice Command'}
        </button>
        <p className="max-w-md text-xs text-white/60">
          We will automatically compare prices across 50+ stores to find you the lowest price.
        </p>
      </main>

      <AnalyzingModal isOpen={isAnalyzing} progress={progress} onCancel={() => setIsAnalyzing(false)} />
    </>
  );
};

export default HomeHero;