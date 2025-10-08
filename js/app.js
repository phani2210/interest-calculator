// Main Application Controller
class LoanTrackerApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isOnline = navigator.onLine;
        this.translations = {
            te: {
                // Telugu translations
                'offline': 'ఆఫ్‌లైన్',
                'online': 'ఆన్‌లైన్',
                'syncing': 'సింక్ అవుతోంది...',
                'synced': 'సింక్ అయింది',
                'error': 'లోపం',
                'success': 'విజయవంతం',
                'loading': 'లోడ్ అవుతోంది...',
                'saved': 'సేవ్ అయింది',
                'deleted': 'తొలగించబడింది',
                'updated': 'అప్‌డేట్ అయింది'
            },
            en: {
                // English translations
                'offline': 'Offline',
                'online': 'Online',
                'syncing': 'Syncing...',
                'synced': 'Synced',
                'error': 'Error',
                'success': 'Success',
                'loading': 'Loading...',
                'saved': 'Saved',
                'deleted': 'Deleted',
                'updated': 'Updated'
            }
        };
        this.currentLanguage = 'te'; // Default to Telugu
        
        // Initialize managers
        this.storageManager = null;
        this.calculator = null;
        this.loanManager = null;
        this.voiceAssistant = null;
        this.reportsManager = null;
        this.authManager = null;
        
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading();
            
            // Initialize storage
            await StorageManager.init();
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize components
            this.initializeComponents();
            
            // Setup offline/online detection
            this.setupNetworkDetection();
            
            // Check authentication
            if (this.authManager) {
                const isAuthenticated = await this.authManager.checkAuthentication();
                if (!isAuthenticated) {
                    // Show authentication modal
                    this.authManager.showAuthModal();
                    return; // Don't continue initialization until authenticated
                }
            }
            
            // Load initial data
            await this.loadInitialData();
            
            // Hide loading screen
            this.hideLoading();
            
            // Show dashboard
            this.showPage('dashboard');
            
            console.log('Loan Tracker App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to initialize application', 'error');
            this.hideLoading();
        }
    }

    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden'); // Hide immediately
        }
    }

    async loadUserPreferences() {
        try {
            if (this.storageManager) {
                const preferences = await this.storageManager.getUserPreferences();
                if (preferences) {
                    this.currentLanguage = preferences.language || 'te';
                    this.updateLanguage();
                }
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }
    }

    setupEventListeners() {
        // Menu toggle
        const menuBtn = document.getElementById('menu-btn');
        const navMenu = document.getElementById('nav-menu');
        const closeMenu = document.getElementById('close-menu');

        if (menuBtn && navMenu) {
            menuBtn.addEventListener('click', () => {
                navMenu.classList.add('open');
            });
        }

        if (closeMenu && navMenu) {
            closeMenu.addEventListener('click', () => {
                navMenu.classList.remove('open');
            });
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-list a[data-page]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.showPage(page);
                navMenu.classList.remove('open');
            });
        });

        // Voice button
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceAssistant();
            });
        }

        // Sync button
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.forcSync();
            });
        }

        // Quick action buttons
        const actionButtons = document.querySelectorAll('.action-btn[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });

        // Voice command button
        const voiceCommandBtn = document.getElementById('voice-command');
        if (voiceCommandBtn) {
            voiceCommandBtn.addEventListener('click', () => {
                this.toggleVoiceAssistant();
            });
        }

        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // Close modal buttons
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    initializeComponents() {
        // Initialize storage manager first
        if (window.StorageManager) {
            this.storageManager = window.StorageManager;
        }

        // Initialize authentication manager
        if (window.AuthManager) {
            this.authManager = new AuthManager();
        }

        // Initialize calculator
        if (window.InterestCalculator) {
            this.calculator = new InterestCalculator(this.storageManager);
            if (this.calculator && typeof this.calculator.setLanguage === 'function') {
                this.calculator.setLanguage(this.currentLanguage);
            }
        }

        // Initialize loan manager
        if (window.LoanManager) {
            this.loanManager = new LoanManager(this.storageManager);
            if (this.loanManager && typeof this.loanManager.setLanguage === 'function') {
                this.loanManager.setLanguage(this.currentLanguage);
            }
        }

        // Initialize voice manager
        if (window.VoiceManager) {
            this.voiceManager = new VoiceManager();
            if (this.voiceManager && typeof this.voiceManager.setLanguage === 'function') {
                this.voiceManager.setLanguage(this.currentLanguage);
            }
            if (this.voiceManager && typeof this.voiceManager.setCommandHandler === 'function') {
                this.voiceManager.setCommandHandler((command, data) => {
                    this.handleVoiceCommand(command, data);
                });
            }
        }

        // Initialize reports manager
        if (window.ReportsManager) {
            this.reportsManager = new ReportsManager(this.storageManager, this.loanManager);
            if (this.reportsManager && typeof this.reportsManager.setLanguage === 'function') {
                this.reportsManager.setLanguage(this.currentLanguage);
            }
        }
    }

    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus();
            this.showToast(this.translate('online'), 'success');
            this.autoSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus();
            this.showToast(this.translate('offline'), 'warning');
        });

        this.updateSyncStatus();
    }

    updateSyncStatus() {
        const syncStatusText = document.getElementById('sync-status-text');
        const syncIcon = document.getElementById('sync-icon');
        const syncStatus = document.querySelector('.sync-status');

        if (syncStatusText && syncIcon && syncStatus) {
            if (this.isOnline) {
                syncStatusText.textContent = `${this.translate('online')} | Online`;
                syncIcon.className = 'fas fa-cloud';
                syncStatus.className = 'sync-status online';
            } else {
                syncStatusText.textContent = `${this.translate('offline')} | Offline`;
                syncIcon.className = 'fas fa-cloud-slash';
                syncStatus.className = 'sync-status offline';
            }
        }
    }

    async loadInitialData() {
        try {
            // Load dashboard data
            await this.updateDashboard();
            
            // Load recent loans
            await this.loadRecentLoans();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async updateDashboard() {
        try {
            if (!this.storageManager) return;
            
            const loans = await this.storageManager.getAllLoans() || [];
            const stats = this.calculateDashboardStats(loans);
            
            // Update dashboard cards
            this.updateDashboardCard('total-loans', this.formatCurrency(stats.totalAmount));
            this.updateDashboardCard('loan-count', `${loans.length} ${this.currentLanguage === 'te' ? 'రుణాలు' : 'Loans'}`);
            this.updateDashboardCard('total-interest', this.formatCurrency(stats.totalInterest));
            this.updateDashboardCard('next-payment', this.formatCurrency(stats.nextPayment));
            this.updateDashboardCard('next-date', stats.nextDate ? this.formatDate(stats.nextDate) : (this.currentLanguage === 'te' ? 'తేదీ లేదు' : 'No Date'));
            this.updateDashboardCard('interest-rate', `${this.currentLanguage === 'te' ? 'సగటు రేటు' : 'Avg Rate'}: ${stats.avgRate.toFixed(1)}%`);

            // Update recent activity
            await this.updateRecentActivity(loans);

        } catch (error) {
            console.error('Failed to update dashboard:', error);
        }
    }

    calculateDashboardStats(loans) {
        const stats = {
            totalAmount: 0,
            totalInterest: 0,
            nextPayment: 0,
            nextDate: null,
            avgRate: 0,
            dueToday: 0,
            overdueLoans: 0
        };

        if (loans.length === 0) return stats;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        loans.forEach(loan => {
            stats.totalAmount += loan.loanAmount || loan.amount || 0;
            stats.totalInterest += loan.totalInterest || 0;
            stats.avgRate += loan.interestRate || 0;
            
            if (loan.nextDueDate) {
                const dueDate = new Date(loan.nextDueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate.getTime() === today.getTime()) {
                    stats.dueToday++;
                } else if (dueDate < today) {
                    stats.overdueLoans++;
                }
                
                // Find next payment
                if (!stats.nextDate || dueDate < new Date(stats.nextDate)) {
                    stats.nextDate = loan.nextDueDate;
                    stats.nextPayment = loan.emiAmount || 0;
                }
            }
        });

        stats.avgRate = stats.avgRate / loans.length;
        return stats;
    }

    async updateRecentActivity(loans) {
        try {
            const recentActivity = this.getRecentActivity(loans);
            
            const activityContainer = document.getElementById('recent-activity');
            if (activityContainer) {
                if (recentActivity.length === 0) {
                    activityContainer.innerHTML = `<p class="no-activity">${this.currentLanguage === 'te' ? 'ఇటీవలి కార్యకలాపాలు లేవు' : 'No recent activity'}</p>`;
                } else {
                    const activityHtml = recentActivity.map(activity => `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="fas ${activity.icon}"></i>
                            </div>
                            <div class="activity-content">
                                <div class="activity-text">${activity.text}</div>
                                <div class="activity-time">${activity.time}</div>
                            </div>
                        </div>
                    `).join('');
                    
                    activityContainer.innerHTML = activityHtml;
                }
            }
        } catch (error) {
            console.error('Error updating recent activity:', error);
        }
    }

    getRecentActivity(loans) {
        const activities = [];
        
        // Add loan creation activities
        loans.forEach(loan => {
            if (loan.createdAt) {
                const createdDate = new Date(loan.createdAt);
                const daysDiff = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysDiff <= 7) { // Show activities from last 7 days
                    activities.push({
                        icon: 'fa-plus-circle',
                        text: `${this.currentLanguage === 'te' ? 'రుణం జోడించబడింది' : 'Added loan'}: ${loan.loanName || (this.currentLanguage === 'te' ? 'పేరు లేని రుణం' : 'Unnamed Loan')}`,
                        time: this.formatRelativeTime(createdDate),
                        timestamp: createdDate.getTime()
                    });
                }
            }
        });

        // Sort by timestamp (most recent first) and take last 5
        return activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);
    }

    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (this.currentLanguage === 'te') {
            if (diffDays > 0) {
                return `${diffDays} రోజు${diffDays > 1 ? 'లు' : ''} క్రితం`;
            } else if (diffHours > 0) {
                return `${diffHours} గంట${diffHours > 1 ? 'లు' : ''} క్రితం`;
            } else if (diffMinutes > 0) {
                return `${diffMinutes} నిమిష${diffMinutes > 1 ? 'ాలు' : 'ం'} క్రితం`;
            } else {
                return 'ఇప్పుడే';
            }
        } else {
            if (diffDays > 0) {
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else if (diffHours > 0) {
                return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffMinutes > 0) {
                return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
            } else {
                return 'Just now';
            }
        }
    }

    updateDashboardCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    async loadRecentLoans() {
        try {
            if (!this.storageManager) return;
            
            const loans = await this.storageManager.getAllLoans() || [];
            const recentLoans = loans.slice(-3).reverse(); // Get last 3 loans
            
            const recentLoansList = document.getElementById('recent-loans-list');
            if (recentLoansList) {
                recentLoansList.innerHTML = '';
                
                if (recentLoans.length === 0) {
                    const emptyText = this.currentLanguage === 'te' ? 'రుణాలు లేవు' : 'No loans found';
                    const buttonText = this.currentLanguage === 'te' ? 'మొదటి రుణం జోడించండి' : 'Add First Loan';
                    
                    recentLoansList.innerHTML = `
                        <div class="empty-state">
                            <p>${emptyText}</p>
                            <button class="btn primary" data-action="add-loan">
                                <i class="fas fa-plus"></i>
                                ${buttonText}
                            </button>
                        </div>
                    `;
                } else {
                    recentLoans.forEach(loan => {
                        const loanElement = this.createLoanElement(loan);
                        recentLoansList.appendChild(loanElement);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load recent loans:', error);
        }
    }

    createLoanElement(loan) {
        const loanDiv = document.createElement('div');
        loanDiv.className = `loan-item ${loan.status}`;
        
        const statusClass = this.getLoanStatusClass(loan);
        const statusText = this.getLoanStatusText(loan);
        
        loanDiv.innerHTML = `
            <div class="loan-header">
                <div class="loan-amount">${this.formatCurrency(loan.amount)}</div>
                <div class="loan-status ${statusClass}">${statusText}</div>
            </div>
            <div class="loan-details">
                <div class="loan-detail">
                    <label>వడ్డీ రేటు | Interest Rate</label>
                    <span>${loan.interestRate}%</span>
                </div>
                <div class="loan-detail">
                    <label>వ్యవధి | Duration</label>
                    <span>${loan.duration} ${loan.durationUnit === 'months' ? 'నెలలు' : 'సంవత్సరాలు'}</span>
                </div>
                <div class="loan-detail">
                    <label>EMI</label>
                    <span>${this.formatCurrency(loan.emiAmount)}</span>
                </div>
                <div class="loan-detail">
                    <label>తదుపరి చెల్లింపు | Next Payment</label>
                    <span>${loan.nextDueDate ? this.formatDate(loan.nextDueDate) : 'N/A'}</span>
                </div>
            </div>
        `;
        
        loanDiv.addEventListener('click', () => {
            this.showLoanDetails(loan);
        });
        
        return loanDiv;
    }

    getLoanStatusClass(loan) {
        if (loan.status === 'completed') return 'paid';
        if (loan.status === 'overdue') return 'overdue';
        if (loan.nextDueDate && new Date(loan.nextDueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
            return 'due-soon';
        }
        return 'active';
    }

    getLoanStatusText(loan) {
        const statusMap = {
            'active': 'చురుకు | Active',
            'completed': 'పూర్తయింది | Completed',
            'overdue': 'మించిపోయింది | Overdue'
        };
        return statusMap[loan.status] || 'చురుకు | Active';
    }

    showPage(pageId) {
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
        }

        // Update navigation
        const navLinks = document.querySelectorAll('.nav-list a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            }
        });

        // Page-specific initialization
        this.initializePage(pageId);
    }

    initializePage(pageId) {
        switch (pageId) {
            case 'dashboard':
                this.updateDashboard();
                this.loadRecentLoans();
                break;
            case 'calculator':
                if (this.calculator) {
                    this.calculator.init();
                }
                break;
            case 'loans':
                if (this.loanManager) {
                    this.loanManager.loadLoans();
                }
                break;
            case 'reports':
                if (this.reportsManager) {
                    this.reportsManager.updateReports();
                }
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    handleQuickAction(action) {
        switch (action) {
            case 'add-loan':
                this.showPage('calculator');
                break;
            case 'calculate':
                this.showPage('calculator');
                break;
            case 'view-loans':
                this.showPage('loans');
                break;
            case 'reports':
                this.showPage('reports');
                break;
            case 'settings':
                this.showPage('settings');
                break;
        }
    }

    handleVoiceCommand(command, data) {
        switch (command) {
            case 'navigate':
                if (data.page) {
                    this.showPage(data.page);
                }
                break;
            case 'calculate':
                this.showPage('calculator');
                if (data.amount && this.calculator) {
                    this.calculator.setAmount(data.amount);
                }
                if (data.rate && this.calculator) {
                    this.calculator.setRate(data.rate);
                }
                if (data.duration && this.calculator) {
                    this.calculator.setDuration(data.duration);
                }
                break;
            case 'add_loan':
                this.showPage('calculator');
                break;
            case 'show_loans':
                this.showPage('loans');
                break;
            case 'show_reports':
                this.showPage('reports');
                break;
            default:
                console.log('Unknown voice command:', command);
        }
    }

    toggleVoiceAssistant() {
        if (this.voiceManager) {
            this.voiceManager.toggle();
        } else {
            this.showToast('Voice assistant not available', 'error');
        }
    }

    async forcSync() {
        if (!this.isOnline) {
            this.showToast('Cannot sync while offline', 'warning');
            return;
        }

        try {
            const syncIcon = document.getElementById('sync-icon');
            if (syncIcon) {
                syncIcon.className = 'fas fa-sync fa-spin';
            }

            this.showToast(this.translate('syncing'), 'info');
            
            // Simulate sync process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (syncIcon) {
                syncIcon.className = 'fas fa-cloud';
            }

            this.showToast(this.translate('synced'), 'success');
        } catch (error) {
            console.error('Sync failed:', error);
            this.showToast('Sync failed', 'error');
        }
    }

    async autoSync() {
        if (this.isOnline) {
            // Auto sync in background
            setTimeout(() => {
                this.forcSync();
            }, 5000);
        }
    }

    handleKeyboardShortcuts(e) {
        // Alt + M: Toggle menu
        if (e.altKey && e.key === 'm') {
            e.preventDefault();
            const navMenu = document.getElementById('nav-menu');
            if (navMenu) {
                navMenu.classList.toggle('open');
            }
        }

        // Alt + V: Toggle voice assistant
        if (e.altKey && e.key === 'v') {
            e.preventDefault();
            this.toggleVoiceAssistant();
        }

        // Alt + L: Toggle language
        if (e.altKey && e.key === 'l') {
            e.preventDefault();
            this.toggleLanguage();
        }

        // Alt + 1-5: Navigate to pages
        if (e.altKey && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const pages = ['dashboard', 'calculator', 'loans', 'reports', 'settings'];
            const pageIndex = parseInt(e.key) - 1;
            if (pages[pageIndex]) {
                this.showPage(pages[pageIndex]);
            }
        }

        // Escape: Close modals
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    async toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'te' ? 'en' : 'te';
        this.updateLanguage();
        
        // Save preference
        if (this.storageManager) {
            try {
                await this.storageManager.saveUserPreferences({
                    language: this.currentLanguage
                });
            } catch (error) {
                console.error('Error saving language preference:', error);
            }
        }
    }

    updateLanguage() {
        // Update document language
        document.documentElement.lang = this.currentLanguage;
        
        // Update all managers
        if (this.calculator) this.calculator.setLanguage(this.currentLanguage);
        if (this.loanManager) this.loanManager.setLanguage(this.currentLanguage);
        if (this.voiceManager) this.voiceManager.setLanguage(this.currentLanguage);
        if (this.reportsManager) this.reportsManager.setLanguage(this.currentLanguage);
        if (this.authManager) this.authManager.setLanguage(this.currentLanguage);
        
        // Update network status
        this.updateSyncStatus();
        
        // Refresh current page data
        this.initializePage(this.currentPage);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');

        if (toast && toastIcon && toastMessage) {
            // Set icon based on type
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };

            toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
            toastMessage.textContent = message;
            toast.className = `toast ${type}`;

            // Show toast
            toast.classList.add('show');

            // Hide toast after duration
            setTimeout(() => {
                toast.classList.remove('show');
            }, duration);
        }
    }

    translate(key) {
        return this.translations[this.currentLanguage][key] || 
               this.translations.en[key] || 
               key;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    showLoanDetails(loan) {
        // Navigate to loans page and show details
        this.showPage('loans');
        if (this.loanManager) {
            this.loanManager.showLoanDetails(loan.id);
        }
    }

    loadReports() {
        if (this.reportsManager) {
            this.reportsManager.updateReports();
        } else {
            console.log('Reports manager not available');
        }
    }

    loadSettings() {
        // Load settings page content
        this.updateSettingsPage();
    }

    updateSettingsPage() {
        const settingsContainer = document.getElementById('settings-content');
        if (settingsContainer) {
            const languageText = this.currentLanguage === 'te' ? 'భాష' : 'Language';
            const currentLangText = this.currentLanguage === 'te' ? 'తెలుగు' : 'English';
            const toggleLangText = this.currentLanguage === 'te' ? 'ఇంగ్లీష్‌కు మార్చు' : 'Switch to Telugu';
            const dataText = this.currentLanguage === 'te' ? 'డేటా నిర్వహణ' : 'Data Management';
            const exportText = this.currentLanguage === 'te' ? 'డేటా ఎగుమతి' : 'Export Data';
            const importText = this.currentLanguage === 'te' ? 'డేటా దిగుమతి' : 'Import Data';
            const clearText = this.currentLanguage === 'te' ? 'డేటా క్లియర్ చేయి' : 'Clear Data';
            
            settingsContainer.innerHTML = `
                <div class="settings-section">
                    <h3>${languageText}</h3>
                    <div class="setting-item">
                        <label>${this.currentLanguage === 'te' ? 'ప్రస్తుత భాష' : 'Current Language'}: ${currentLangText}</label>
                        <button class="btn secondary" onclick="app.toggleLanguage()">${toggleLangText}</button>
                    </div>
                </div>
                <div class="settings-section">
                    <h3>${dataText}</h3>
                    <div class="setting-item">
                        <button class="btn primary" onclick="app.exportData()">
                            <i class="fas fa-download"></i> ${exportText}
                        </button>
                    </div>
                    <div class="setting-item">
                        <button class="btn secondary" onclick="app.importData()">
                            <i class="fas fa-upload"></i> ${importText}
                        </button>
                    </div>
                    <div class="setting-item">
                        <button class="btn danger" onclick="app.clearAllData()">
                            <i class="fas fa-trash"></i> ${clearText}
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async exportData() {
        if (!this.storageManager) return;
        
        try {
            const data = await this.storageManager.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `loan-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast(this.translate('exported'), 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast(this.translate('error'), 'error');
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (this.storageManager) {
                    await this.storageManager.importAllData(data);
                    this.showToast(this.translate('imported'), 'success');
                    
                    // Refresh current page
                    this.initializePage(this.currentPage);
                }
            } catch (error) {
                console.error('Import failed:', error);
                this.showToast(this.translate('error'), 'error');
            }
        };
        
        input.click();
    }

    async clearAllData() {
        const confirmText = this.currentLanguage === 'te' ? 
            'మీరు ఖచ్చితంగా అన్ని డేటాను తొలగించాలనుకుంటున్నారా?' : 
            'Are you sure you want to clear all data?';
            
        if (confirm(confirmText)) {
            try {
                if (this.storageManager) {
                    await this.storageManager.clearAllData();
                    this.showToast(this.translate('deleted'), 'success');
                    
                    // Refresh dashboard
                    this.showPage('dashboard');
                }
            } catch (error) {
                console.error('Clear data failed:', error);
                this.showToast(this.translate('error'), 'error');
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting app initialization');
    
    // Fallback to hide loading screen after 2 seconds
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            console.log('Fallback: Hiding loading screen');
            loadingScreen.classList.add('hidden');
        }
    }, 2000);
    
    try {
        window.app = new LoanTrackerApp();
        console.log('App instance created successfully');
    } catch (error) {
        console.error('Failed to create app instance:', error);
        // Hide loading screen on error
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        alert('Failed to start application: ' + error.message);
    }
});

// Clear any existing service workers
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log('Service worker unregistered');
        }
    });
}