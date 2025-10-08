// Interest Calculator Engine
class InterestCalculator {
    constructor(storageManager = null) {
        this.form = null;
        this.resultsContainer = null;
        this.currentCalculation = null;
        this.storageManager = storageManager;
        
        this.translations = {
            te: {
                'simple_interest': 'సాధారణ వడ్డీ',
                'compound_interest': 'చక్రవడ్డీ',
                'monthly': 'నెలవారీ',
                'quarterly': 'త్రైమాసిక',
                'yearly': 'వార్షిక',
                'months': 'నెలలు',
                'years': 'సంవత్సరాలు',
                'calculation_complete': 'లెక్కింపు పూర్తయింది',
                'invalid_input': 'చెల్లని ఇన్‌పుట్',
                'loan_saved': 'రుణం సేవ్ అయింది'
            },
            en: {
                'simple_interest': 'Simple Interest',
                'compound_interest': 'Compound Interest',
                'monthly': 'Monthly',
                'quarterly': 'Quarterly',
                'yearly': 'Yearly',
                'months': 'Months',
                'years': 'Years',
                'calculation_complete': 'Calculation Complete',
                'invalid_input': 'Invalid Input',
                'loan_saved': 'Loan Saved'
            }
        };
    }

    init() {
        this.form = document.getElementById('interest-form');
        this.resultsContainer = document.getElementById('calculation-results');
        
        if (this.form) {
            this.setupEventListeners();
            this.setupFormValidation();
        }
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateInterest();
        });

        // Clear form button
        const clearBtn = document.getElementById('clear-form');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearForm();
            });
        }

        // Interest type change
        const interestTypeSelect = document.getElementById('interest-type');
        if (interestTypeSelect) {
            interestTypeSelect.addEventListener('change', () => {
                this.toggleCompoundOptions();
            });
        }

        // Save loan button
        const saveLoanBtn = document.getElementById('save-loan');
        if (saveLoanBtn) {
            saveLoanBtn.addEventListener('click', () => {
                this.saveLoan();
            });
        }

        // Speak results button
        const speakResultsBtn = document.getElementById('speak-results');
        if (speakResultsBtn) {
            speakResultsBtn.addEventListener('click', () => {
                this.speakResults();
            });
        }

        // Voice input buttons
        const voiceInputBtns = document.querySelectorAll('.voice-input-btn');
        voiceInputBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const fieldId = btn.getAttribute('data-field');
                this.startVoiceInput(fieldId);
            });
        });

        // Real-time calculation on input change
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.debounce(() => {
                    if (this.isFormValid()) {
                        this.calculateInterest();
                    }
                }, 500)();
            });
        });
    }

    setupFormValidation() {
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    validateField(field) {
        const value = parseFloat(field.value);
        let isValid = true;
        let errorMessage = '';

        switch (field.id) {
            case 'loan-amount':
                if (!value || value <= 0) {
                    isValid = false;
                    errorMessage = 'రుణ మొత్తం తప్పనిసరి | Loan amount is required';
                } else if (value > 10000000) { // 1 crore limit
                    isValid = false;
                    errorMessage = 'రుణ మొత్తం చాలా ఎక్కువ | Loan amount too high';
                }
                break;
            
            case 'interest-rate':
                if (!value || value <= 0) {
                    isValid = false;
                    errorMessage = 'వడ్డీ రేటు తప్పనిసరి | Interest rate is required';
                } else if (value > 50) {
                    isValid = false;
                    errorMessage = 'వడ్డీ రేటు చాలా ఎక్కువ | Interest rate too high';
                }
                break;
            
            case 'loan-duration':
                if (!value || value <= 0) {
                    isValid = false;
                    errorMessage = 'వ్యవధి తప్పనిసరి | Duration is required';
                } else if (value > 30) {
                    isValid = false;
                    errorMessage = 'వ్యవధి చాలా ఎక్కువ | Duration too long';
                }
                break;
        }

        this.showFieldValidation(field, isValid, errorMessage);
        return isValid;
    }

    showFieldValidation(field, isValid, message) {
        // Remove existing validation
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        field.classList.remove('error', 'success');

        if (!isValid && message) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = message;
            field.parentNode.appendChild(errorDiv);
        } else if (isValid && field.value) {
            field.classList.add('success');
        }
    }

    isFormValid() {
        const requiredFields = this.form.querySelectorAll('input[required]');
        return Array.from(requiredFields).every(field => {
            return field.value && parseFloat(field.value) > 0;
        });
    }

    toggleCompoundOptions() {
        const interestType = document.getElementById('interest-type').value;
        const compoundOptions = document.getElementById('compound-options');
        
        if (compoundOptions) {
            if (interestType === 'compound') {
                compoundOptions.style.display = 'block';
            } else {
                compoundOptions.style.display = 'none';
            }
        }
    }

    calculateInterest() {
        if (!this.isFormValid()) {
            this.showToast('దయచేసి అన్ని ఫీల్డ్‌లను పూరించండి | Please fill all fields', 'warning');
            return;
        }

        try {
            const formData = this.getFormData();
            const calculation = this.performCalculation(formData);
            
            this.currentCalculation = {
                ...formData,
                ...calculation,
                calculatedAt: new Date().toISOString()
            };

            this.displayResults(calculation);
            this.showToast(this.translate('calculation_complete'), 'success');

        } catch (error) {
            console.error('Calculation error:', error);
            this.showToast('లెక్కింపులో లోపం | Calculation error', 'error');
        }
    }

    getFormData() {
        return {
            loanAmount: parseFloat(document.getElementById('loan-amount').value),
            interestRate: parseFloat(document.getElementById('interest-rate').value),
            loanDuration: parseInt(document.getElementById('loan-duration').value),
            durationUnit: document.getElementById('duration-unit').value,
            interestType: document.getElementById('interest-type').value,
            compoundFrequency: document.getElementById('compound-frequency').value
        };
    }

    performCalculation(data) {
        const { loanAmount, interestRate, loanDuration, durationUnit, interestType, compoundFrequency } = data;
        
        // Convert duration to years
        const durationInYears = durationUnit === 'months' ? loanDuration / 12 : loanDuration;
        const durationInMonths = durationUnit === 'months' ? loanDuration : loanDuration * 12;
        
        let totalInterest, totalAmount, emiAmount;

        if (interestType === 'simple') {
            // Simple Interest: SI = P * R * T / 100
            totalInterest = (loanAmount * interestRate * durationInYears) / 100;
            totalAmount = loanAmount + totalInterest;
            emiAmount = totalAmount / durationInMonths;
        } else {
            // Compound Interest: CI = P * (1 + R/100/n)^(n*t) - P
            const compoundingFrequency = this.getCompoundingFrequency(compoundFrequency);
            const rate = interestRate / 100 / compoundingFrequency;
            const periods = compoundingFrequency * durationInYears;
            
            totalAmount = loanAmount * Math.pow(1 + rate, periods);
            totalInterest = totalAmount - loanAmount;
            emiAmount = totalAmount / durationInMonths;
        }

        return {
            totalInterest: Math.round(totalInterest),
            totalAmount: Math.round(totalAmount),
            emiAmount: Math.round(emiAmount),
            effectiveRate: ((totalAmount / loanAmount - 1) / durationInYears * 100).toFixed(2)
        };
    }

    getCompoundingFrequency(frequency) {
        const frequencies = {
            'monthly': 12,
            'quarterly': 4,
            'yearly': 1
        };
        return frequencies[frequency] || 12;
    }

    displayResults(calculation) {
        if (!this.resultsContainer) return;

        // Update result values
        document.getElementById('result-interest').textContent = this.formatCurrency(calculation.totalInterest);
        document.getElementById('result-total').textContent = this.formatCurrency(calculation.totalAmount);
        document.getElementById('result-emi').textContent = this.formatCurrency(calculation.emiAmount);

        // Show results container
        this.resultsContainer.style.display = 'block';
        this.resultsContainer.scrollIntoView({ behavior: 'smooth' });

        // Add animation
        this.resultsContainer.classList.add('fade-in');
        setTimeout(() => {
            this.resultsContainer.classList.remove('fade-in');
        }, 500);
    }

    async saveLoan() {
        if (!this.currentCalculation) {
            this.showToast('దయచేసి ముందుగా లెక్కించండి | Please calculate first', 'warning');
            return;
        }

        try {
            const loan = {
                id: this.generateId(),
                ...this.currentCalculation,
                status: 'active',
                createdAt: new Date().toISOString(),
                nextDueDate: this.calculateNextDueDate(),
                paidAmount: 0,
                remainingAmount: this.currentCalculation.totalAmount
            };

            // Save to storage
            const loans = await StorageManager.getItem('loans') || [];
            loans.push(loan);
            await StorageManager.setItem('loans', loans);

            this.showToast(this.translate('loan_saved'), 'success');
            
            // Navigate to loans page
            if (window.app) {
                window.app.showPage('loans');
            }

        } catch (error) {
            console.error('Failed to save loan:', error);
            this.showToast('రుణం సేవ్ చేయడంలో లోపం | Failed to save loan', 'error');
        }
    }

    calculateNextDueDate() {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        return nextMonth.toISOString().split('T')[0];
    }

    generateId() {
        return 'loan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    speakResults() {
        if (!this.currentCalculation) {
            this.showToast('దయచేసి ముందుగా లెక్కించండి | Please calculate first', 'warning');
            return;
        }

        const { loanAmount, totalInterest, totalAmount, emiAmount } = this.currentCalculation;
        
        const teluguText = `
            రుణ మొత్తం ${loanAmount} రుపాయలు.
            మొత్తం వడ్డీ ${totalInterest} రుపాయలు.
            మొత్తం చెల్లింపు ${totalAmount} రుపాయలు.
            నెలవారీ EMI ${emiAmount} రుపాయలు.
        `;

        const englishText = `
            Loan amount is ${loanAmount} rupees.
            Total interest is ${totalInterest} rupees.
            Total payment is ${totalAmount} rupees.
            Monthly EMI is ${emiAmount} rupees.
        `;

        // Use voice assistant to speak
        if (window.app && window.app.voiceAssistant) {
            window.app.voiceAssistant.speak(teluguText, 'te');
            setTimeout(() => {
                window.app.voiceAssistant.speak(englishText, 'en');
            }, 5000);
        } else {
            // Fallback to browser TTS
            this.speakText(teluguText + ' ' + englishText);
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'te-IN';
            utterance.rate = 0.8;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        }
    }

    startVoiceInput(fieldId) {
        if (window.app && window.app.voiceAssistant) {
            window.app.voiceAssistant.startListening((result) => {
                this.processVoiceInput(fieldId, result);
            });
        } else {
            this.showToast('వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు | Voice input not available', 'warning');
        }
    }

    processVoiceInput(fieldId, voiceResult) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Extract numbers from voice result
        const numbers = voiceResult.match(/\d+/g);
        if (numbers && numbers.length > 0) {
            field.value = numbers[0];
            field.dispatchEvent(new Event('input'));
            this.showToast('వాయిస్ ఇన్‌పుట్ విజయవంతం | Voice input successful', 'success');
        } else {
            this.showToast('సంఖ్య గుర్తించలేకపోయింది | Number not recognized', 'warning');
        }
    }

    clearForm() {
        this.form.reset();
        this.resultsContainer.style.display = 'none';
        this.currentCalculation = null;
        
        // Clear validation states
        const fields = this.form.querySelectorAll('input, select');
        fields.forEach(field => {
            field.classList.remove('error', 'success');
        });

        // Remove error messages
        const errors = this.form.querySelectorAll('.field-error');
        errors.forEach(error => error.remove());

        // Hide compound options
        this.toggleCompoundOptions();

        this.showToast('ఫారం క్లియర్ అయింది | Form cleared', 'info');
    }

    // Quick calculation presets
    setQuickPreset(preset) {
        const presets = {
            'personal_loan': {
                interestRate: 12,
                durationUnit: 'years',
                loanDuration: 3,
                interestType: 'simple'
            },
            'home_loan': {
                interestRate: 8.5,
                durationUnit: 'years',
                loanDuration: 20,
                interestType: 'compound',
                compoundFrequency: 'monthly'
            },
            'agriculture_loan': {
                interestRate: 7,
                durationUnit: 'years',
                loanDuration: 5,
                interestType: 'simple'
            },
            'gold_loan': {
                interestRate: 10,
                durationUnit: 'months',
                loanDuration: 12,
                interestType: 'simple'
            }
        };

        const presetData = presets[preset];
        if (presetData) {
            Object.keys(presetData).forEach(key => {
                const field = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
                if (field) {
                    field.value = presetData[key];
                }
            });
            this.toggleCompoundOptions();
        }
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    setLanguage(language) {
        this.currentLanguage = language;
        // Update any UI elements that need language updates
        this.updateLanguageUI();
    }

    updateLanguageUI() {
        // Update form labels and placeholders if needed
        // This can be expanded based on specific UI requirements
    }

    translate(key) {
        const lang = this.currentLanguage || window.app ? window.app.currentLanguage : 'te';
        return this.translations[lang][key] || this.translations.en[key] || key;
    }

    showToast(message, type) {
        if (window.app) {
            window.app.showToast(message, type);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Export for use in other modules
window.InterestCalculator = InterestCalculator;