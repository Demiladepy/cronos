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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setTimeout(() => {
        // Clear any captured AI speech before restarting listening
        resetTranscript();
        // Only restart listening if we aren't currently analyzing
        if (!isSearchLockedRef.current) {
            SpeechRecognition.startListening({ continuous: true, interimResults: true });
        }
        if (onEnd) onEnd();
      }, 500); // Increased delay to ensure TTS audio has fully dissipated
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
    if (isSearchLockedRef.current || !query || query.length < 2) return;

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
      const response = await fetch(`http://localhost:3001/api/scrape/all/${encodeURIComponent(query)}`, { 
        signal: abortControllerRef.current.signal 
      });
      const data = await response.json();
      const allMergedProducts = data.platforms.flatMap((p: any) => p.products);

      const topSorted: ResultItem[] = allMergedProducts
        .filter((item: any) => item.price > 0)
        .map((item: any): ResultItem => ({
          ...item,
          normalizedPrice: ['amazon', 'aliexpress'].includes(item.vendor.toLowerCase()) ? item.price * 1450 : item.price
        }))
        .sort((a: ResultItem, b: ResultItem) => (a.normalizedPrice || 0) - (b.normalizedPrice || 0))
        .slice(0, 3);

      if (topSorted.length > 0) {
        setAllResults(topSorted); 
        onResult(topSorted);
        setProgress(100);
        speak(`I found the top result on ${topSorted[0].vendor} for ${topSorted[0].price}. Command me to proceed to checkout.`);
      } else {
        setIsAnalyzing(false);
        speak("I found nothing. Command me to search for something else.");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setIsAnalyzing(false);
    } finally {
        // 🔓 3. UNLOCK: Always release the lock when done
        clearTimeout(lockTimeout);
        isSearchLockedRef.current = false;
        // Restart listening safely
        setTimeout(() => SpeechRecognition.startListening({ continuous: true }), 500);
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
        setTimeout(() => SpeechRecognition.startListening({ continuous: true, interimResults: true }), 500);
      });
      return;
    }

    // 🛑 4. BUSY GUARD: If searching, ignore all other commands
    if (isSearchLockedRef.current || isAnalyzing) return;

    // --- WAKE WORD ---
    if (!isVoiceGuided && (currentSpeech.includes("blind bargain") || currentSpeech.includes("hey bargain"))) {
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

    // --- COMMANDS ---
    if (currentSpeech.includes("click get my bargain") || currentSpeech.includes("click the blue button")) {
      resetTranscript();
      const button = document.querySelector('button[class*="bg-blue-600"]') as HTMLElement;
      if (button) button.click();
      speak("Clicking Get My Bargain. What product should I look for?", () => {
        isWaitingForProductRef.current = true;
      });
      return;
    }

    if (isWaitingForProductRef.current && transcript.length > 2) {
      const query = transcript;
      isWaitingForProductRef.current = false;
      resetTranscript();
      SpeechRecognition.stopListening();
      setTimeout(() => SpeechRecognition.startListening({ continuous: true }), 100);
      handleStartAnalyze(query);
      return;
    }

    // Combined "Proceed" Logic (Removed duplicate block)
    if (allResults.length > 0 && (currentSpeech.includes("proceed") || currentSpeech.includes("checkout"))) {
      resetTranscript();
      speak("Opening store page.");
      const targetUrl = `${allResults[0].url}#blindbargain`; 
      window.open(targetUrl, '_blank');
      return;
    }

  }, [transcript, interimTranscript, isVoiceGuided, allResults, isAnalyzing, speak, readLandingPage, resetTranscript, onResult]);

  useEffect(() => {
    SpeechRecognition.startListening({ continuous: true, interimResults: true });
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
          onClick={() => speak("Manual trigger. What should I search for?", () => { isWaitingForProductRef.current = true; })} 
          className="mb-4 w-full max-w-sm rounded-lg bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-500 transition disabled:opacity-50"
        >
          GET MY BARGAIN
        </button>

        <button 
          onClick={() => speak("Voice search active. What are you looking for?", () => { isWaitingForProductRef.current = true; })} 
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