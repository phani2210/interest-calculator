// Voice Integration Module for Speech-to-Text and Text-to-Speech
class VoiceManager {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentLanguage = 'te-IN'; // Telugu by default
        this.fallbackLanguage = 'en-IN'; // English fallback
        this.isSupported = this.checkSupport();
        this.voices = [];
        this.currentVoice = null;
        
        this.init();
    }

    checkSupport() {
        const hasSTT = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        const hasTTS = 'speechSynthesis' in window;
        
        return {
            speechToText: hasSTT,
            textToSpeech: hasTTS,
            full: hasSTT && hasTTS
        };
    }

    async init() {
        if (this.isSupported.speechToText) {
            this.setupSpeechRecognition();
        }
        
        if (this.isSupported.textToSpeech) {
            await this.setupTextToSpeech();
        }

        this.setupVoiceCommands();
        console.log('Voice Manager initialized:', this.isSupported);
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.showListeningIndicator();
            console.log('Voice recognition started');
        };

        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
            this.handleSpeechError(event);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.hideListeningIndicator();
            console.log('Voice recognition ended');
        };
    }

    async setupTextToSpeech() {
        // Wait for voices to load
        if (this.synthesis.getVoices().length === 0) {
            await new Promise(resolve => {
                this.synthesis.onvoiceschanged = resolve;
            });
        }

        this.voices = this.synthesis.getVoices();
        this.selectBestVoice();
        console.log('Available voices:', this.voices.length);
    }

    selectBestVoice() {
        // Try to find Telugu voice first
        let teluguVoice = this.voices.find(voice => 
            voice.lang.includes('te') || voice.name.toLowerCase().includes('telugu')
        );

        // If no Telugu voice, try Hindi
        if (!teluguVoice) {
            teluguVoice = this.voices.find(voice => 
                voice.lang.includes('hi') || voice.name.toLowerCase().includes('hindi')
            );
        }

        // Fallback to English (India)
        if (!teluguVoice) {
            teluguVoice = this.voices.find(voice => 
                voice.lang === 'en-IN' || (voice.lang.includes('en') && voice.name.toLowerCase().includes('india'))
            );
        }

        // Final fallback to any English voice
        if (!teluguVoice) {
            teluguVoice = this.voices.find(voice => voice.lang.includes('en'));
        }

        this.currentVoice = teluguVoice || this.voices[0];
        console.log('Selected voice:', this.currentVoice?.name, this.currentVoice?.lang);
    }

    // Speech-to-Text methods
    startListening(callback, options = {}) {
        if (!this.isSupported.speechToText) {
            this.showToast('వాయిస్ రికగ్నిషన్ సపోర్ట్ లేదు / Voice recognition not supported', 'error');
            return false;
        }

        if (this.isListening) {
            this.stopListening();
            return false;
        }

        this.recognition.lang = options.language || this.currentLanguage;
        this.recognition.continuous = options.continuous || false;
        this.recognition.interimResults = options.interimResults !== false;

        this.currentCallback = callback;
        this.recognition.start();
        
        return true;
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    handleSpeechResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (this.currentCallback) {
            this.currentCallback({
                final: finalTranscript,
                interim: interimTranscript,
                confidence: event.results[0]?.confidence || 0
            });
        }

        // Process voice commands
        if (finalTranscript) {
            this.processVoiceCommand(finalTranscript.toLowerCase().trim());
        }
    }

    handleSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        
        const errorMessages = {
            'no-speech': 'మాట్లాడలేదు / No speech detected',
            'audio-capture': 'మైక్రోఫోన్ యాక్సెస్ లేదు / Microphone access denied',
            'not-allowed': 'మైక్రోఫోన్ అనుమతి లేదు / Microphone permission denied',
            'network': 'నెట్వర్క్ ఎర్రర్ / Network error',
            'service-not-allowed': 'సేవ అనుమతించబడలేదు / Service not allowed'
        };

        const message = errorMessages[event.error] || `వాయిస్ ఎర్రర్: ${event.error} / Voice error: ${event.error}`;
        this.showToast(message, 'error');
    }

    // Text-to-Speech methods
    speak(text, options = {}) {
        if (!this.isSupported.textToSpeech) {
            console.warn('Text-to-speech not supported');
            return false;
        }

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice
        if (this.currentVoice) {
            utterance.voice = this.currentVoice;
        }

        // Set language
        utterance.lang = options.language || this.currentLanguage;
        
        // Set speech parameters
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;

        // Event handlers
        utterance.onstart = () => {
            console.log('Speech started');
            this.showSpeakingIndicator();
        };

        utterance.onend = () => {
            console.log('Speech ended');
            this.hideSpeakingIndicator();
            if (options.onEnd) options.onEnd();
        };

        utterance.onerror = (event) => {
            console.error('Speech error:', event.error);
            this.hideSpeakingIndicator();
            if (options.onError) options.onError(event);
        };

        this.synthesis.speak(utterance);
        return true;
    }

    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
    }

    // Voice command processing
    setupVoiceCommands() {
        this.commands = {
            // Navigation commands
            'home': () => this.navigateToPage('dashboard'),
            'హోమ్': () => this.navigateToPage('dashboard'),
            'dashboard': () => this.navigateToPage('dashboard'),
            'డాష్‌బోర్డ్': () => this.navigateToPage('dashboard'),
            
            'calculator': () => this.navigateToPage('calculator'),
            'కాలిక్యులేటర్': () => this.navigateToPage('calculator'),
            'calculate': () => this.navigateToPage('calculator'),
            'లెక్కించు': () => this.navigateToPage('calculator'),
            
            'loans': () => this.navigateToPage('loans'),
            'లోన్లు': () => this.navigateToPage('loans'),
            'my loans': () => this.navigateToPage('loans'),
            'నా లోన్లు': () => this.navigateToPage('loans'),
            
            'reports': () => this.navigateToPage('reports'),
            'రిపోర్ట్లు': () => this.navigateToPage('reports'),
            
            // Action commands
            'add loan': () => this.triggerAction('addLoan'),
            'లోన్ జోడించు': () => this.triggerAction('addLoan'),
            'new loan': () => this.triggerAction('addLoan'),
            'కొత్త లోన్': () => this.triggerAction('addLoan'),
            
            'calculate interest': () => this.triggerAction('calculateInterest'),
            'వడ్డీ లెక్కించు': () => this.triggerAction('calculateInterest'),
            
            'show due loans': () => this.triggerAction('showDueLoans'),
            'బకాయి లోన్లు చూపించు': () => this.triggerAction('showDueLoans'),
            
            // Help commands
            'help': () => this.showHelp(),
            'సహాయం': () => this.showHelp(),
            'what can you do': () => this.showHelp(),
            'మీరు ఏమి చేయగలరు': () => this.showHelp()
        };
    }

    processVoiceCommand(command) {
        console.log('Processing voice command:', command);
        
        // Use external command handler if available
        if (this.commandHandler) {
            this.commandHandler(command, { source: 'voice' });
            return;
        }
        
        // Check for exact matches first
        if (this.commands[command]) {
            this.commands[command]();
            return;
        }

        // Check for partial matches
        for (const [key, action] of Object.entries(this.commands)) {
            if (command.includes(key)) {
                action();
                return;
            }
        }

        // Check for loan amount input
        if (this.isLoanAmountInput(command)) {
            this.handleLoanAmountInput(command);
            return;
        }

        // Check for interest rate input
        if (this.isInterestRateInput(command)) {
            this.handleInterestRateInput(command);
            return;
        }

        // Check for duration input
        if (this.isDurationInput(command)) {
            this.handleDurationInput(command);
            return;
        }

        // If no command matched, show help
        this.speak('కమాండ్ అర్థం కాలేదు. సహాయం కోసం "సహాయం" అని చెప్పండి / Command not understood. Say "help" for assistance');
    }

    // Loan input processing
    isLoanAmountInput(command) {
        const patterns = [
            /(\d+)\s*(రూపాయలు|rupees|thousand|వేలు|lakh|లక్ష)/i,
            /amount\s*(\d+)/i,
            /రొక్కం\s*(\d+)/i
        ];
        return patterns.some(pattern => pattern.test(command));
    }

    handleLoanAmountInput(command) {
        const amount = this.extractNumber(command);
        if (amount) {
            const amountField = document.getElementById('loanAmount');
            if (amountField) {
                amountField.value = amount;
                amountField.dispatchEvent(new Event('input'));
                this.speak(`లోన్ మొత్తం ${amount} రూపాయలు సెట్ చేయబడింది / Loan amount set to ${amount} rupees`);
            }
        }
    }

    isInterestRateInput(command) {
        const patterns = [
            /(\d+(?:\.\d+)?)\s*(percent|percentage|శాతం|వడ్డీ)/i,
            /rate\s*(\d+(?:\.\d+)?)/i,
            /వడ్డీ\s*రేటు\s*(\d+(?:\.\d+)?)/i
        ];
        return patterns.some(pattern => pattern.test(command));
    }

    handleInterestRateInput(command) {
        const rate = this.extractNumber(command);
        if (rate) {
            const rateField = document.getElementById('interestRate');
            if (rateField) {
                rateField.value = rate;
                rateField.dispatchEvent(new Event('input'));
                this.speak(`వడ్డీ రేటు ${rate} శాతం సెట్ చేయబడింది / Interest rate set to ${rate} percent`);
            }
        }
    }

    isDurationInput(command) {
        const patterns = [
            /(\d+)\s*(years|సంవత్సరాలు|months|నెలలు)/i,
            /duration\s*(\d+)/i,
            /కాలం\s*(\d+)/i
        ];
        return patterns.some(pattern => pattern.test(command));
    }

    handleDurationInput(command) {
        const duration = this.extractNumber(command);
        const isYears = /years|సంవత్సరాలు/i.test(command);
        const isMonths = /months|నెలలు/i.test(command);
        
        if (duration) {
            const durationField = document.getElementById('loanDuration');
            const unitField = document.getElementById('durationUnit');
            
            if (durationField) {
                durationField.value = duration;
                durationField.dispatchEvent(new Event('input'));
            }
            
            if (unitField) {
                if (isYears) {
                    unitField.value = 'years';
                } else if (isMonths) {
                    unitField.value = 'months';
                }
                unitField.dispatchEvent(new Event('change'));
            }
            
            const unit = isYears ? 'సంవత్సరాలు / years' : isMonths ? 'నెలలు / months' : 'సంవత్సరాలు / years';
            this.speak(`కాలం ${duration} ${unit} సెట్ చేయబడింది / Duration set to ${duration} ${unit}`);
        }
    }

    extractNumber(text) {
        const match = text.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : null;
    }

    // Navigation and actions
    navigateToPage(page) {
        if (window.app && window.app.showPage) {
            window.app.showPage(page);
            const pageNames = {
                dashboard: 'డాష్‌బోర్డ్ / Dashboard',
                calculator: 'కాలిక్యులేటర్ / Calculator',
                loans: 'లోన్లు / Loans',
                reports: 'రిపోర్ట్లు / Reports'
            };
            this.speak(`${pageNames[page]} పేజీకి వెళ్లారు / Navigated to ${pageNames[page]} page`);
        }
    }

    triggerAction(action) {
        const actions = {
            addLoan: () => {
                this.navigateToPage('calculator');
                this.speak('కొత్త లోన్ జోడించడానికి వివరాలు చెప్పండి / Please provide loan details to add new loan');
            },
            calculateInterest: () => {
                this.navigateToPage('calculator');
                this.speak('వడ్డీ లెక్కించడానికి లోన్ వివరాలు చెప్పండి / Please provide loan details to calculate interest');
            },
            showDueLoans: () => {
                this.navigateToPage('loans');
                if (window.loanManager && window.loanManager.showDueLoans) {
                    window.loanManager.showDueLoans();
                }
                this.speak('బకాయి లోన్లు చూపిస్తున్నాను / Showing due loans');
            }
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    showHelp() {
        const helpText = `
            మీరు ఈ కమాండ్లు ఉపయోగించవచ్చు:
            - హోమ్ లేదా డాష్‌బోర్డ్
            - కాలిక్యులేటర్ లేదా లెక్కించు
            - లోన్లు లేదా నా లోన్లు
            - రిపోర్ట్లు
            - లోన్ జోడించు
            - వడ్డీ లెక్కించు
            - బకాయి లోన్లు చూపించు
            
            You can use these commands:
            - Home or Dashboard
            - Calculator or Calculate
            - Loans or My Loans
            - Reports
            - Add Loan
            - Calculate Interest
            - Show Due Loans
        `;
        
        this.speak(helpText);
        this.showToast('వాయిస్ కమాండ్లు / Voice Commands', 'info');
    }

    // UI indicators
    showListeningIndicator() {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            indicator.classList.add('listening');
            indicator.innerHTML = '<i class="fas fa-microphone"></i> వింటున్నాను... / Listening...';
        }
    }

    hideListeningIndicator() {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            indicator.classList.remove('listening');
            indicator.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        }
    }

    showSpeakingIndicator() {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            indicator.classList.add('speaking');
            indicator.innerHTML = '<i class="fas fa-volume-up"></i> మాట్లాడుతున్నాను... / Speaking...';
        }
    }

    hideSpeakingIndicator() {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            indicator.classList.remove('speaking');
            indicator.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        }
    }

    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        } else {
            console.log(`Toast (${type}):`, message);
        }
    }

    // Language switching
    setLanguage(language) {
        this.currentLanguage = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
        this.selectBestVoice();
    }

    // Voice settings
    getVoiceSettings() {
        return {
            currentLanguage: this.currentLanguage,
            currentVoice: this.currentVoice?.name,
            isSupported: this.isSupported,
            availableVoices: this.voices.map(voice => ({
                name: voice.name,
                lang: voice.lang,
                localService: voice.localService
            }))
        };
    }

    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.currentVoice = voice;
            return true;
        }
        return false;
    }

    // Utility methods
    isListening() {
        return this.isListening;
    }

    isSpeaking() {
        return this.synthesis.speaking;
    }

    getSupport() {
        return this.isSupported;
    }

    toggle() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening((result) => {
                this.processVoiceCommand(result);
            });
        }
    }

    setCommandHandler(handler) {
        this.commandHandler = handler;
    }
}

// Initialize voice manager when script loads
if (typeof window !== 'undefined') {
    window.VoiceManager = VoiceManager;
}