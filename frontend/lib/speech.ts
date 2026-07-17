// Speech-to-text
export function startListening(
    lang: string, 
    onResult: (text: string) => void,
    onError: (error: any) => void,
    onEnd: () => void,
    onInterim?: (text: string) => void
): any {
    if (typeof window === 'undefined') return null;
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        onError("Speech Recognition not supported in this browser.");
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Set language based on selection, Swahili default for demo
    recognition.lang = lang;
    recognition.interimResults = !!onInterim;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
            onResult(finalTranscript);
        } else if (interimTranscript && onInterim) {
            onInterim(interimTranscript);
        }
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        onError(event.error);
    };

    recognition.onend = () => {
        onEnd();
    };

    try {
        recognition.start();
        return recognition;
    } catch (e) {
        console.error("Failed to start speech recognition", e);
        onError(e);
        return null;
    }
}

// Text-to-speech
export function speak(text: string, lang = 'sw-KE'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Try to find a matching voice if possible
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    
    if (targetVoice) {
        utterance.voice = targetVoice;
    }
    
    // Slight adjustments for natural sound
    utterance.rate = 0.95;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
}
