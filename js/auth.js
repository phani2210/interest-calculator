// Authentication Manager for Loan Tracker App
// Handles PIN-based authentication, biometric authentication, and security

class AuthManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.currentLanguage = 'te';
        this.isAuthenticated = false;
        this.authTimeout = null;
        this.maxAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        
        this.translations = {
            te: {
                enterPin: 'పిన్ నమోదు చేయండి',
                createPin: 'కొత్త పిన్ సృష్టించండి',
                confirmPin: 'పిన్‌ను నిర్ధారించండి',
                incorrectPin: 'తప్పు పిన్',
                pinMismatch: 'పిన్‌లు సరిపోలలేదు',
                accountLocked: 'ఖాతా లాక్ చేయబడింది',
                biometricPrompt: 'బయోమెట్రిక్ ధృవీకరణ',
                loginSuccess: 'విజయవంతంగా లాగిన్ అయ్యారు',
                logoutSuccess: 'విజయవంతంగా లాగౌట్ అయ్యారు',
                sessionExpired: 'సెషన్ గడువు ముగిసింది',
                forgotPin: 'పిన్ మర్చిపోయారా?',
                resetPin: 'పిన్ రీసెట్ చేయండి',
                securityQuestion: 'భద్రతా ప్రశ్న',
                answer: 'సమాధానం'
            },
            en: {
                enterPin: 'Enter PIN',
                createPin: 'Create New PIN',
                confirmPin: 'Confirm PIN',
                incorrectPin: 'Incorrect PIN',
                pinMismatch: 'PINs do not match',
                accountLocked: 'Account locked',
                biometricPrompt: 'Biometric Authentication',
                loginSuccess: 'Login successful',
                logoutSuccess: 'Logout successful',
                sessionExpired: 'Session expired',
                forgotPin: 'Forgot PIN?',
                resetPin: 'Reset PIN',
                securityQuestion: 'Security Question',
                answer: 'Answer'
            }
        };
        
        this.init();
    }

    async init() {
        try {
            // Check if user has existing PIN
            const hasPin = await this.hasExistingPin();
            
            if (!hasPin) {
                // First time user - show PIN setup
                this.showPinSetup();
            } else {
                // Existing user - show login
                this.showLogin();
            }
            
            // Set up auto-logout timer
            this.setupAutoLogout();
            
        } catch (error) {
            console.error('Auth initialization error:', error);
        }
    }

    async hasExistingPin() {
        try {
            const authData = await this.storageManager.getItem('authData');
            return authData && authData.pinHash;
        } catch (error) {
            return false;
        }
    }

    showPinSetup() {
        const modal = this.createAuthModal('setup');
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Focus on first input
        const firstInput = modal.querySelector('.pin-input');
        if (firstInput) {
            firstInput.focus();
        }
    }

    showLogin() {
        const modal = this.createAuthModal('login');
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Focus on first input
        const firstInput = modal.querySelector('.pin-input');
        if (firstInput) {
            firstInput.focus();
        }
    }

    createAuthModal(type) {
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'authModal';
        
        const isSetup = type === 'setup';
        const title = isSetup ? this.translate('createPin') : this.translate('enterPin');
        
        modal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-header">
                    <h2>${title}</h2>
                    <div class="auth-subtitle">
                        ${isSetup ? 
                            (this.currentLanguage === 'te' ? 'మీ డేటాను భద్రపరచడానికి 4-అంకెల పిన్ సృష్టించండి' : 'Create a 4-digit PIN to secure your data') :
                            (this.currentLanguage === 'te' ? 'కొనసాగించడానికి మీ పిన్ నమోదు చేయండి' : 'Enter your PIN to continue')
                        }
                    </div>
                </div>
                
                <div class="pin-container">
                    <div class="pin-inputs">
                        <input type="password" class="pin-input" maxlength="1" data-index="0">
                        <input type="password" class="pin-input" maxlength="1" data-index="1">
                        <input type="password" class="pin-input" maxlength="1" data-index="2">
                        <input type="password" class="pin-input" maxlength="1" data-index="3">
                    </div>
                    
                    ${isSetup ? `
                        <div class="pin-confirm" style="display: none;">
                            <div class="pin-label">${this.translate('confirmPin')}</div>
                            <div class="pin-inputs">
                                <input type="password" class="pin-input confirm" maxlength="1" data-index="0">
                                <input type="password" class="pin-input confirm" maxlength="1" data-index="1">
                                <input type="password" class="pin-input confirm" maxlength="1" data-index="2">
                                <input type="password" class="pin-input confirm" maxlength="1" data-index="3">
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="auth-actions">
                    ${!isSetup ? `
                        <button class="auth-btn secondary" onclick="authManager.showBiometricAuth()">
                            <i class="fas fa-fingerprint"></i>
                            ${this.translate('biometricPrompt')}
                        </button>
                    ` : ''}
                    
                    <button class="auth-btn primary" onclick="authManager.${isSetup ? 'handlePinSetup' : 'handlePinLogin'}()">
                        ${isSetup ? (this.currentLanguage === 'te' ? 'సృష్టించు' : 'Create') : (this.currentLanguage === 'te' ? 'లాగిన్' : 'Login')}
                    </button>
                    
                    ${!isSetup ? `
                        <button class="auth-btn link" onclick="authManager.showForgotPin()">
                            ${this.translate('forgotPin')}
                        </button>
                    ` : ''}
                </div>
                
                <div class="auth-error" id="authError"></div>
                
                ${!isSetup ? `
                    <div class="auth-attempts" id="authAttempts"></div>
                ` : ''}
            </div>
        `;
        
        // Set up PIN input handlers
        this.setupPinInputs(modal);
        
        return modal;
    }

    setupPinInputs(modal) {
        const inputs = modal.querySelectorAll('.pin-input');
        
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Only allow numbers
                if (!/^\d$/.test(value)) {
                    e.target.value = '';
                    return;
                }
                
                // Move to next input
                if (value && index < inputs.length - 1) {
                    const nextInput = modal.querySelector(`.pin-input[data-index="${index + 1}"]`);
                    if (nextInput && !nextInput.classList.contains('confirm')) {
                        nextInput.focus();
                    }
                }
                
                // Check if all inputs are filled
                this.checkPinComplete(modal);
            });
            
            input.addEventListener('keydown', (e) => {
                // Handle backspace
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    const prevInput = modal.querySelector(`.pin-input[data-index="${index - 1}"]`);
                    if (prevInput && !prevInput.classList.contains('confirm')) {
                        prevInput.focus();
                    }
                }
                
                // Handle Enter key
                if (e.key === 'Enter') {
                    const isSetup = modal.querySelector('.pin-confirm');
                    if (isSetup) {
                        this.handlePinSetup();
                    } else {
                        this.handlePinLogin();
                    }
                }
            });
        });
    }

    checkPinComplete(modal) {
        const inputs = modal.querySelectorAll('.pin-input:not(.confirm)');
        const pin = Array.from(inputs).map(input => input.value).join('');
        
        if (pin.length === 4) {
            const confirmContainer = modal.querySelector('.pin-confirm');
            if (confirmContainer) {
                // Show confirm PIN inputs
                confirmContainer.style.display = 'block';
                const firstConfirmInput = modal.querySelector('.pin-input.confirm[data-index="0"]');
                if (firstConfirmInput) {
                    firstConfirmInput.focus();
                }
            }
        }
    }

    async handlePinSetup() {
        const modal = document.getElementById('authModal');
        const inputs = modal.querySelectorAll('.pin-input:not(.confirm)');
        const confirmInputs = modal.querySelectorAll('.pin-input.confirm');
        
        const pin = Array.from(inputs).map(input => input.value).join('');
        const confirmPin = Array.from(confirmInputs).map(input => input.value).join('');
        
        if (pin.length !== 4) {
            this.showAuthError('Please enter a 4-digit PIN');
            return;
        }
        
        if (confirmPin.length !== 4) {
            this.showAuthError('Please confirm your PIN');
            return;
        }
        
        if (pin !== confirmPin) {
            this.showAuthError(this.translate('pinMismatch'));
            this.clearPinInputs(modal, true); // Clear only confirm inputs
            return;
        }
        
        try {
            // Hash and store PIN
            const pinHash = await this.hashPin(pin);
            const authData = {
                pinHash: pinHash,
                createdAt: Date.now(),
                attempts: 0,
                lockedUntil: null
            };
            
            await this.storageManager.setItem('authData', authData);
            
            // Close modal and authenticate
            this.closeAuthModal();
            this.setAuthenticated(true);
            
            // Show success message
            if (window.app) {
                window.app.showToast(this.translate('loginSuccess'), 'success');
            }
            
        } catch (error) {
            console.error('PIN setup error:', error);
            this.showAuthError('Failed to create PIN');
        }
    }

    async handlePinLogin() {
        const modal = document.getElementById('authModal');
        const inputs = modal.querySelectorAll('.pin-input');
        const pin = Array.from(inputs).map(input => input.value).join('');
        
        if (pin.length !== 4) {
            this.showAuthError('Please enter your 4-digit PIN');
            return;
        }
        
        try {
            const authData = await this.storageManager.getItem('authData');
            
            if (!authData) {
                this.showAuthError('No PIN found. Please set up authentication.');
                return;
            }
            
            // Check if account is locked
            if (authData.lockedUntil && Date.now() < authData.lockedUntil) {
                const remainingTime = Math.ceil((authData.lockedUntil - Date.now()) / 60000);
                this.showAuthError(`${this.translate('accountLocked')}. Try again in ${remainingTime} minutes.`);
                return;
            }
            
            // Verify PIN
            const isValid = await this.verifyPin(pin, authData.pinHash);
            
            if (isValid) {
                // Reset attempts and unlock
                authData.attempts = 0;
                authData.lockedUntil = null;
                await this.storageManager.setItem('authData', authData);
                
                // Close modal and authenticate
                this.closeAuthModal();
                this.setAuthenticated(true);
                
                // Show success message
                if (window.app) {
                    window.app.showToast(this.translate('loginSuccess'), 'success');
                }
                
            } else {
                // Increment attempts
                authData.attempts = (authData.attempts || 0) + 1;
                
                if (authData.attempts >= this.maxAttempts) {
                    // Lock account
                    authData.lockedUntil = Date.now() + this.lockoutDuration;
                    await this.storageManager.setItem('authData', authData);
                    
                    this.showAuthError(`${this.translate('accountLocked')}. Try again in 15 minutes.`);
                } else {
                    const remainingAttempts = this.maxAttempts - authData.attempts;
                    this.showAuthError(`${this.translate('incorrectPin')}. ${remainingAttempts} attempts remaining.`);
                    await this.storageManager.setItem('authData', authData);
                }
                
                this.clearPinInputs(modal);
                this.updateAttemptsDisplay(authData.attempts);
            }
            
        } catch (error) {
            console.error('PIN login error:', error);
            this.showAuthError('Login failed. Please try again.');
        }
    }

    async showBiometricAuth() {
        if (!('credentials' in navigator)) {
            this.showAuthError('Biometric authentication not supported');
            return;
        }
        
        try {
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: new Uint8Array(32),
                    rp: { name: "Loan Tracker" },
                    user: {
                        id: new Uint8Array(16),
                        name: "user@loantracker.app",
                        displayName: "Loan Tracker User"
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    }
                }
            });
            
            if (credential) {
                this.closeAuthModal();
                this.setAuthenticated(true);
                
                if (window.app) {
                    window.app.showToast(this.translate('loginSuccess'), 'success');
                }
            }
            
        } catch (error) {
            console.error('Biometric auth error:', error);
            this.showAuthError('Biometric authentication failed');
        }
    }

    showForgotPin() {
        // Simple PIN reset - in a real app, this would involve security questions or other verification
        const confirmReset = confirm(this.currentLanguage === 'te' ? 
            'మీరు ఖచ్చితంగా పిన్ రీసెట్ చేయాలనుకుంటున్నారా? ఇది మీ అన్ని డేటాను తొలగిస్తుంది.' :
            'Are you sure you want to reset your PIN? This will clear all your data.'
        );
        
        if (confirmReset) {
            this.resetAuth();
        }
    }

    async resetAuth() {
        try {
            // Clear auth data
            await this.storageManager.removeItem('authData');
            
            // Clear all user data
            await this.storageManager.clearAllData();
            
            // Close current modal and show setup
            this.closeAuthModal();
            this.showPinSetup();
            
            if (window.app) {
                window.app.showToast('PIN reset successfully', 'success');
            }
            
        } catch (error) {
            console.error('Reset auth error:', error);
            this.showAuthError('Failed to reset PIN');
        }
    }

    async hashPin(pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + 'loan_tracker_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verifyPin(pin, hash) {
        const pinHash = await this.hashPin(pin);
        return pinHash === hash;
    }

    setAuthenticated(authenticated) {
        this.isAuthenticated = authenticated;
        
        if (authenticated) {
            // Set up auto-logout
            this.resetAutoLogout();
            
            // Store session
            sessionStorage.setItem('authenticated', 'true');
        } else {
            // Clear session
            sessionStorage.removeItem('authenticated');
            
            // Clear auto-logout
            if (this.authTimeout) {
                clearTimeout(this.authTimeout);
                this.authTimeout = null;
            }
        }
    }

    setupAutoLogout() {
        // Auto-logout after 30 minutes of inactivity
        const autoLogoutTime = 30 * 60 * 1000; // 30 minutes
        
        const resetTimer = () => {
            if (this.authTimeout) {
                clearTimeout(this.authTimeout);
            }
            
            if (this.isAuthenticated) {
                this.authTimeout = setTimeout(() => {
                    this.logout(true);
                }, autoLogoutTime);
            }
        };
        
        // Reset timer on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        resetTimer();
    }

    resetAutoLogout() {
        if (this.authTimeout) {
            clearTimeout(this.authTimeout);
        }
        
        if (this.isAuthenticated) {
            this.authTimeout = setTimeout(() => {
                this.logout(true);
            }, 30 * 60 * 1000); // 30 minutes
        }
    }

    logout(sessionExpired = false) {
        this.setAuthenticated(false);
        
        // Show login screen
        this.showLogin();
        
        // Show appropriate message
        if (window.app) {
            const message = sessionExpired ? this.translate('sessionExpired') : this.translate('logoutSuccess');
            window.app.showToast(message, sessionExpired ? 'warning' : 'success');
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.remove();
        }
    }

    clearPinInputs(modal, confirmOnly = false) {
        const selector = confirmOnly ? '.pin-input.confirm' : '.pin-input';
        const inputs = modal.querySelectorAll(selector);
        inputs.forEach(input => {
            input.value = '';
        });
        
        // Focus on first input
        const firstInput = modal.querySelector(confirmOnly ? '.pin-input.confirm[data-index="0"]' : '.pin-input[data-index="0"]');
        if (firstInput) {
            firstInput.focus();
        }
    }

    showAuthError(message) {
        const errorElement = document.getElementById('authError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    updateAttemptsDisplay(attempts) {
        const attemptsElement = document.getElementById('authAttempts');
        if (attemptsElement && attempts > 0) {
            const remaining = this.maxAttempts - attempts;
            attemptsElement.textContent = `${remaining} attempts remaining`;
            attemptsElement.style.display = 'block';
        }
    }

    setLanguage(language) {
        this.currentLanguage = language;
    }

    translate(key) {
        return this.translations[this.currentLanguage][key] || this.translations.en[key] || key;
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated || sessionStorage.getItem('authenticated') === 'true';
    }

    // Require authentication for sensitive operations
    requireAuth(callback) {
        if (this.isUserAuthenticated()) {
            callback();
        } else {
            this.showLogin();
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for storage manager to be available
    if (window.app && window.app.storageManager) {
        window.authManager = new AuthManager(window.app.storageManager);
    } else {
        // Retry after a short delay
        setTimeout(() => {
            if (window.app && window.app.storageManager) {
                window.authManager = new AuthManager(window.app.storageManager);
            }
        }, 1000);
    }
});