// Loan Management System
class LoanManager {
    constructor() {
        this.loans = [];
        this.currentLoan = null;
        this.filters = {
            status: 'all',
            sortBy: 'nextDueDate',
            sortOrder: 'asc'
        };
        this.reminderInterval = null;
        this.translations = {
            te: {
                active: 'చురుకు',
                completed: 'పూర్తయింది',
                overdue: 'బకాయి',
                pending: 'వేచి ఉంది',
                paid: 'చెల్లించబడింది',
                due: 'చెల్లించాల్సింది',
                simple: 'సాధారణ వడ్డీ',
                compound: 'చక్రవడ్డీ',
                monthly: 'నెలవారీ',
                yearly: 'సంవత్సరానికి',
                daily: 'రోజువారీ',
                weekly: 'వారానికి',
                addLoan: 'లోన్ జోడించు',
                editLoan: 'లోన్ సవరించు',
                deleteLoan: 'లోన్ తొలగించు',
                markPaid: 'చెల్లించినట్లు గుర్తించు',
                viewDetails: 'వివరాలు చూడు',
                dueToday: 'ఈరోజు చెల్లించాల్సింది',
                dueTomorrow: 'రేపు చెల్లించాల్సింది',
                overdueDays: 'రోజుల బకాయి'
            },
            en: {
                active: 'Active',
                completed: 'Completed',
                overdue: 'Overdue',
                pending: 'Pending',
                paid: 'Paid',
                due: 'Due',
                simple: 'Simple Interest',
                compound: 'Compound Interest',
                monthly: 'Monthly',
                yearly: 'Yearly',
                daily: 'Daily',
                weekly: 'Weekly',
                addLoan: 'Add Loan',
                editLoan: 'Edit Loan',
                deleteLoan: 'Delete Loan',
                markPaid: 'Mark as Paid',
                viewDetails: 'View Details',
                dueToday: 'Due Today',
                dueTomorrow: 'Due Tomorrow',
                overdueDays: 'Days Overdue'
            }
        };
        this.currentLanguage = 'te';
        
        this.init();
    }

    async init() {
        try {
            await this.loadLoans();
            this.setupEventListeners();
            this.startReminderSystem();
            this.renderLoansList();
            console.log('Loan Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Loan Manager:', error);
        }
    }

    // Data management
    async loadLoans() {
        try {
            this.loans = await StorageManager.getLoans() || [];
            this.updateLoanStatuses();
            console.log('Loaded loans:', this.loans.length);
        } catch (error) {
            console.error('Failed to load loans:', error);
            this.loans = [];
        }
    }

    async saveLoan(loanData) {
        try {
            const loan = this.createLoanObject(loanData);
            
            if (loan.id && this.loans.find(l => l.id === loan.id)) {
                // Update existing loan
                const index = this.loans.findIndex(l => l.id === loan.id);
                this.loans[index] = loan;
            } else {
                // Add new loan
                loan.id = this.generateLoanId();
                this.loans.push(loan);
            }

            await StorageManager.saveLoan(loan);
            this.updateLoanStatuses();
            this.renderLoansList();
            
            return loan;
        } catch (error) {
            console.error('Failed to save loan:', error);
            throw error;
        }
    }

    async deleteLoan(loanId) {
        try {
            await StorageManager.deleteLoan(loanId);
            this.loans = this.loans.filter(loan => loan.id !== loanId);
            this.renderLoansList();
            return true;
        } catch (error) {
            console.error('Failed to delete loan:', error);
            return false;
        }
    }

    createLoanObject(data) {
        const now = new Date();
        const startDate = new Date(data.startDate || now);
        const endDate = new Date(startDate);
        
        // Calculate end date based on duration
        if (data.durationUnit === 'months') {
            endDate.setMonth(endDate.getMonth() + parseInt(data.loanDuration));
        } else {
            endDate.setFullYear(endDate.getFullYear() + parseInt(data.loanDuration));
        }

        // Calculate EMI and payment schedule
        const emiData = this.calculateEMI(data);
        const paymentSchedule = this.generatePaymentSchedule(data, emiData);

        return {
            id: data.id || null,
            loanName: data.loanName || `Loan ${Date.now()}`,
            loanAmount: parseFloat(data.loanAmount),
            interestRate: parseFloat(data.interestRate),
            loanDuration: parseInt(data.loanDuration),
            durationUnit: data.durationUnit || 'years',
            interestType: data.interestType || 'simple',
            compoundingFrequency: data.compoundingFrequency || 'monthly',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalInterest: emiData.totalInterest,
            totalAmount: emiData.totalAmount,
            emi: emiData.emi,
            paymentSchedule: paymentSchedule,
            paidInstallments: data.paidInstallments || 0,
            remainingAmount: emiData.totalAmount - (data.paidAmount || 0),
            nextDueDate: this.getNextDueDate(paymentSchedule, data.paidInstallments || 0),
            status: this.calculateLoanStatus(paymentSchedule, data.paidInstallments || 0),
            createdAt: data.createdAt || now.toISOString(),
            updatedAt: now.toISOString(),
            notes: data.notes || '',
            category: data.category || 'personal',
            lenderName: data.lenderName || '',
            guarantor: data.guarantor || '',
            collateral: data.collateral || '',
            purpose: data.purpose || ''
        };
    }

    calculateEMI(loanData) {
        const principal = parseFloat(loanData.loanAmount);
        const rate = parseFloat(loanData.interestRate) / 100;
        const duration = parseInt(loanData.loanDuration);
        const durationUnit = loanData.durationUnit || 'years';
        const interestType = loanData.interestType || 'simple';

        let totalInterest, totalAmount, emi;
        let timeInYears = durationUnit === 'months' ? duration / 12 : duration;
        let numberOfPayments = durationUnit === 'months' ? duration : duration * 12;

        if (interestType === 'simple') {
            totalInterest = principal * rate * timeInYears;
            totalAmount = principal + totalInterest;
            emi = totalAmount / numberOfPayments;
        } else {
            // Compound interest
            const monthlyRate = rate / 12;
            const compoundAmount = principal * Math.pow(1 + monthlyRate, numberOfPayments);
            totalInterest = compoundAmount - principal;
            totalAmount = compoundAmount;
            
            if (monthlyRate > 0) {
                emi = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
            } else {
                emi = principal / numberOfPayments;
            }
        }

        return {
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            emi: Math.round(emi * 100) / 100
        };
    }

    generatePaymentSchedule(loanData, emiData) {
        const schedule = [];
        const startDate = new Date(loanData.startDate || new Date());
        const numberOfPayments = loanData.durationUnit === 'months' ? 
            parseInt(loanData.loanDuration) : parseInt(loanData.loanDuration) * 12;

        let remainingPrincipal = parseFloat(loanData.loanAmount);
        const monthlyRate = parseFloat(loanData.interestRate) / 100 / 12;

        for (let i = 0; i < numberOfPayments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            let interestAmount, principalAmount;

            if (loanData.interestType === 'simple') {
                interestAmount = (parseFloat(loanData.loanAmount) * parseFloat(loanData.interestRate) / 100) / numberOfPayments;
                principalAmount = emiData.emi - interestAmount;
            } else {
                interestAmount = remainingPrincipal * monthlyRate;
                principalAmount = emiData.emi - interestAmount;
                remainingPrincipal -= principalAmount;
            }

            schedule.push({
                installmentNumber: i + 1,
                dueDate: dueDate.toISOString(),
                emiAmount: emiData.emi,
                principalAmount: Math.round(principalAmount * 100) / 100,
                interestAmount: Math.round(interestAmount * 100) / 100,
                remainingPrincipal: Math.max(0, Math.round(remainingPrincipal * 100) / 100),
                status: 'pending',
                paidDate: null,
                paidAmount: 0,
                lateFee: 0
            });
        }

        return schedule;
    }

    getNextDueDate(paymentSchedule, paidInstallments) {
        const nextInstallment = paymentSchedule.find(payment => 
            payment.installmentNumber > paidInstallments && payment.status === 'pending'
        );
        return nextInstallment ? nextInstallment.dueDate : null;
    }

    calculateLoanStatus(paymentSchedule, paidInstallments) {
        const totalInstallments = paymentSchedule.length;
        
        if (paidInstallments >= totalInstallments) {
            return 'completed';
        }

        const nextDue = this.getNextDueDate(paymentSchedule, paidInstallments);
        if (nextDue) {
            const dueDate = new Date(nextDue);
            const today = new Date();
            
            if (dueDate < today) {
                return 'overdue';
            }
        }

        return 'active';
    }

    updateLoanStatuses() {
        this.loans.forEach(loan => {
            loan.status = this.calculateLoanStatus(loan.paymentSchedule, loan.paidInstallments);
            loan.nextDueDate = this.getNextDueDate(loan.paymentSchedule, loan.paidInstallments);
        });
    }

    // Payment management
    async markPaymentAsPaid(loanId, installmentNumber, paidAmount = null, paidDate = null) {
        try {
            const loan = this.loans.find(l => l.id === loanId);
            if (!loan) throw new Error('Loan not found');

            const installment = loan.paymentSchedule.find(p => p.installmentNumber === installmentNumber);
            if (!installment) throw new Error('Installment not found');

            installment.status = 'paid';
            installment.paidDate = paidDate || new Date().toISOString();
            installment.paidAmount = paidAmount || installment.emiAmount;

            // Update loan counters
            loan.paidInstallments = Math.max(loan.paidInstallments, installmentNumber);
            loan.remainingAmount = loan.totalAmount - this.getTotalPaidAmount(loan);
            loan.status = this.calculateLoanStatus(loan.paymentSchedule, loan.paidInstallments);
            loan.nextDueDate = this.getNextDueDate(loan.paymentSchedule, loan.paidInstallments);
            loan.updatedAt = new Date().toISOString();

            await StorageManager.saveLoan(loan);
            this.renderLoansList();

            return true;
        } catch (error) {
            console.error('Failed to mark payment as paid:', error);
            return false;
        }
    }

    getTotalPaidAmount(loan) {
        return loan.paymentSchedule
            .filter(p => p.status === 'paid')
            .reduce((total, p) => total + p.paidAmount, 0);
    }

    // Filtering and sorting
    setFilter(filterType, value) {
        this.filters[filterType] = value;
        this.renderLoansList();
    }

    getFilteredLoans() {
        let filteredLoans = [...this.loans];

        // Apply status filter
        if (this.filters.status !== 'all') {
            filteredLoans = filteredLoans.filter(loan => loan.status === this.filters.status);
        }

        // Apply sorting
        filteredLoans.sort((a, b) => {
            let aValue = a[this.filters.sortBy];
            let bValue = b[this.filters.sortBy];

            if (this.filters.sortBy === 'nextDueDate') {
                aValue = aValue ? new Date(aValue) : new Date('9999-12-31');
                bValue = bValue ? new Date(bValue) : new Date('9999-12-31');
            }

            if (this.filters.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filteredLoans;
    }

    // Reminder system
    startReminderSystem() {
        // Check for due loans every hour
        this.reminderInterval = setInterval(() => {
            this.checkDueLoans();
        }, 60 * 60 * 1000);

        // Initial check
        this.checkDueLoans();
    }

    checkDueLoans() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dueToday = this.loans.filter(loan => {
            if (!loan.nextDueDate) return false;
            const dueDate = new Date(loan.nextDueDate);
            return dueDate.toDateString() === today.toDateString();
        });

        const dueTomorrow = this.loans.filter(loan => {
            if (!loan.nextDueDate) return false;
            const dueDate = new Date(loan.nextDueDate);
            return dueDate.toDateString() === tomorrow.toDateString();
        });

        const overdue = this.loans.filter(loan => loan.status === 'overdue');

        // Show notifications
        if (dueToday.length > 0) {
            this.showDueNotification(dueToday, 'today');
        }

        if (dueTomorrow.length > 0) {
            this.showDueNotification(dueTomorrow, 'tomorrow');
        }

        if (overdue.length > 0) {
            this.showOverdueNotification(overdue);
        }
    }

    showDueNotification(loans, when) {
        const message = when === 'today' 
            ? `${loans.length} లోన్(లు) ఈరోజు చెల్లించాల్సింది / ${loans.length} loan(s) due today`
            : `${loans.length} లోన్(లు) రేపు చెల్లించాల్సింది / ${loans.length} loan(s) due tomorrow`;

        this.showNotification(message, 'warning');

        // Voice notification if available
        if (window.voiceManager) {
            window.voiceManager.speak(message);
        }
    }

    showOverdueNotification(loans) {
        const message = `${loans.length} లోన్(లు) బకాయి ఉన్నాయి / ${loans.length} loan(s) are overdue`;
        this.showNotification(message, 'error');

        if (window.voiceManager) {
            window.voiceManager.speak(message);
        }
    }

    // UI Rendering
    renderLoansList() {
        const container = document.getElementById('loansContainer');
        if (!container) return;

        const filteredLoans = this.getFilteredLoans();
        
        if (filteredLoans.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        const loansHTML = filteredLoans.map(loan => this.renderLoanCard(loan)).join('');
        container.innerHTML = loansHTML;

        // Update summary
        this.updateLoansSummary(filteredLoans);
    }

    renderLoanCard(loan) {
        const t = this.translations[this.currentLanguage];
        const nextDue = loan.nextDueDate ? new Date(loan.nextDueDate) : null;
        const today = new Date();
        
        let dueDateInfo = '';
        if (nextDue) {
            const daysDiff = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 0) {
                dueDateInfo = `<span class="due-today">${t.dueToday}</span>`;
            } else if (daysDiff === 1) {
                dueDateInfo = `<span class="due-tomorrow">${t.dueTomorrow}</span>`;
            } else if (daysDiff < 0) {
                dueDateInfo = `<span class="overdue">${Math.abs(daysDiff)} ${t.overdueDays}</span>`;
            } else {
                dueDateInfo = `<span class="due-future">${daysDiff} days</span>`;
            }
        }

        const progress = (loan.paidInstallments / loan.paymentSchedule.length) * 100;

        return `
            <div class="loan-card" data-loan-id="${loan.id}">
                <div class="loan-header">
                    <h3 class="loan-name">${loan.loanName}</h3>
                    <span class="loan-status status-${loan.status}">${t[loan.status]}</span>
                </div>
                
                <div class="loan-amount">
                    <div class="amount-row">
                        <span class="label">Loan Amount:</span>
                        <span class="value">₹${loan.loanAmount.toLocaleString()}</span>
                    </div>
                    <div class="amount-row">
                        <span class="label">Remaining:</span>
                        <span class="value">₹${loan.remainingAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div class="loan-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        ${loan.paidInstallments}/${loan.paymentSchedule.length} installments paid
                    </div>
                </div>

                <div class="loan-due-date">
                    <i class="fas fa-calendar-alt"></i>
                    ${nextDue ? `Next Due: ${nextDue.toLocaleDateString()} ${dueDateInfo}` : 'Completed'}
                </div>

                <div class="loan-actions">
                    <button class="btn btn-sm btn-primary" onclick="loanManager.viewLoanDetails('${loan.id}')">
                        <i class="fas fa-eye"></i> ${t.viewDetails}
                    </button>
                    ${loan.status !== 'completed' ? `
                        <button class="btn btn-sm btn-success" onclick="loanManager.markNextPayment('${loan.id}')">
                            <i class="fas fa-check"></i> ${t.markPaid}
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="loanManager.editLoan('${loan.id}')">
                        <i class="fas fa-edit"></i> ${t.editLoan}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="loanManager.confirmDeleteLoan('${loan.id}')">
                        <i class="fas fa-trash"></i> ${t.deleteLoan}
                    </button>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        const t = this.translations[this.currentLanguage];
        return `
            <div class="empty-state">
                <i class="fas fa-hand-holding-usd"></i>
                <h3>No loans found</h3>
                <p>Add your first loan to start tracking payments</p>
                <button class="btn btn-primary" onclick="app.showPage('calculator')">
                    <i class="fas fa-plus"></i> ${t.addLoan}
                </button>
            </div>
        `;
    }

    updateLoansSummary(loans) {
        const summary = {
            totalLoans: loans.length,
            activeLoans: loans.filter(l => l.status === 'active').length,
            overdueLoans: loans.filter(l => l.status === 'overdue').length,
            completedLoans: loans.filter(l => l.status === 'completed').length,
            totalAmount: loans.reduce((sum, l) => sum + l.loanAmount, 0),
            totalRemaining: loans.reduce((sum, l) => sum + l.remainingAmount, 0)
        };

        const summaryContainer = document.getElementById('loansSummary');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <div class="summary-item">
                        <span class="summary-label">Total Loans</span>
                        <span class="summary-value">${summary.totalLoans}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Active</span>
                        <span class="summary-value text-primary">${summary.activeLoans}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Overdue</span>
                        <span class="summary-value text-danger">${summary.overdueLoans}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Amount</span>
                        <span class="summary-value">₹${summary.totalAmount.toLocaleString()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Remaining</span>
                        <span class="summary-value">₹${summary.totalRemaining.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }
    }

    // Event handlers
    setupEventListeners() {
        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.filter-btn')) {
                const filterType = e.target.dataset.filter;
                const filterValue = e.target.dataset.value;
                this.setFilter(filterType, filterValue);
                
                // Update active filter button
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });

        // Sort dropdown
        const sortSelect = document.getElementById('loanSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                this.setFilter('sortBy', sortBy);
                this.setFilter('sortOrder', sortOrder);
            });
        }
    }

    // Public methods for UI interaction
    async viewLoanDetails(loanId) {
        const loan = this.loans.find(l => l.id === loanId);
        if (!loan) return;

        this.currentLoan = loan;
        this.showLoanDetailsModal(loan);
    }

    showLoanDetailsModal(loan) {
        const modal = document.getElementById('loanDetailsModal');
        if (!modal) return;

        const modalContent = this.renderLoanDetailsContent(loan);
        modal.querySelector('.modal-body').innerHTML = modalContent;
        modal.style.display = 'block';
    }

    renderLoanDetailsContent(loan) {
        const t = this.translations[this.currentLanguage];
        
        return `
            <div class="loan-details">
                <div class="loan-info-grid">
                    <div class="info-item">
                        <label>Loan Name:</label>
                        <span>${loan.loanName}</span>
                    </div>
                    <div class="info-item">
                        <label>Amount:</label>
                        <span>₹${loan.loanAmount.toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <label>Interest Rate:</label>
                        <span>${loan.interestRate}%</span>
                    </div>
                    <div class="info-item">
                        <label>Duration:</label>
                        <span>${loan.loanDuration} ${loan.durationUnit}</span>
                    </div>
                    <div class="info-item">
                        <label>Interest Type:</label>
                        <span>${t[loan.interestType]}</span>
                    </div>
                    <div class="info-item">
                        <label>EMI:</label>
                        <span>₹${loan.emi.toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <label>Total Interest:</label>
                        <span>₹${loan.totalInterest.toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <label>Total Amount:</label>
                        <span>₹${loan.totalAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div class="payment-schedule">
                    <h4>Payment Schedule</h4>
                    <div class="schedule-table">
                        <div class="schedule-header">
                            <span>No.</span>
                            <span>Due Date</span>
                            <span>EMI</span>
                            <span>Status</span>
                            <span>Action</span>
                        </div>
                        ${loan.paymentSchedule.map(payment => `
                            <div class="schedule-row ${payment.status}">
                                <span>${payment.installmentNumber}</span>
                                <span>${new Date(payment.dueDate).toLocaleDateString()}</span>
                                <span>₹${payment.emiAmount.toLocaleString()}</span>
                                <span class="status-${payment.status}">${t[payment.status]}</span>
                                <span>
                                    ${payment.status === 'pending' ? `
                                        <button class="btn btn-sm btn-success" 
                                                onclick="loanManager.markPaymentAsPaid('${loan.id}', ${payment.installmentNumber})">
                                            Pay
                                        </button>
                                    ` : payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : ''}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async markNextPayment(loanId) {
        const loan = this.loans.find(l => l.id === loanId);
        if (!loan) return;

        const nextPayment = loan.paymentSchedule.find(p => 
            p.installmentNumber > loan.paidInstallments && p.status === 'pending'
        );

        if (nextPayment) {
            const success = await this.markPaymentAsPaid(loanId, nextPayment.installmentNumber);
            if (success) {
                this.showToast('Payment marked as paid successfully', 'success');
            } else {
                this.showToast('Failed to mark payment as paid', 'error');
            }
        }
    }

    editLoan(loanId) {
        const loan = this.loans.find(l => l.id === loanId);
        if (!loan) return;

        // Navigate to calculator with loan data
        if (window.app) {
            window.app.showPage('calculator');
            
            // Populate form with loan data
            setTimeout(() => {
                if (window.calculator) {
                    window.calculator.loadLoanForEditing(loan);
                }
            }, 100);
        }
    }

    confirmDeleteLoan(loanId) {
        const loan = this.loans.find(l => l.id === loanId);
        if (!loan) return;

        if (confirm(`Are you sure you want to delete "${loan.loanName}"? This action cannot be undone.`)) {
            this.deleteLoan(loanId).then(success => {
                if (success) {
                    this.showToast('Loan deleted successfully', 'success');
                } else {
                    this.showToast('Failed to delete loan', 'error');
                }
            });
        }
    }

    // Utility methods
    generateLoanId() {
        return 'loan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setLanguage(language) {
        this.currentLanguage = language;
        this.renderLoansList();
    }

    showDueLoans() {
        this.setFilter('status', 'active');
        // Additional filtering for due loans can be added here
    }

    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        } else {
            console.log(`Toast (${type}):`, message);
        }
    }

    showNotification(message, type = 'info') {
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification('Loan Tracker', {
                body: message,
                icon: '/favicon.ico'
            });
        }
        
        this.showToast(message, type);
    }

    // Export methods
    async exportLoansData() {
        try {
            const data = {
                loans: this.loans,
                exportedAt: new Date().toISOString(),
                totalLoans: this.loans.length
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `loans-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Failed to export loans:', error);
            return false;
        }
    }

    // Statistics
    getStatistics() {
        return {
            totalLoans: this.loans.length,
            activeLoans: this.loans.filter(l => l.status === 'active').length,
            completedLoans: this.loans.filter(l => l.status === 'completed').length,
            overdueLoans: this.loans.filter(l => l.status === 'overdue').length,
            totalLoanAmount: this.loans.reduce((sum, l) => sum + l.loanAmount, 0),
            totalInterestAmount: this.loans.reduce((sum, l) => sum + l.totalInterest, 0),
            totalRemainingAmount: this.loans.reduce((sum, l) => sum + l.remainingAmount, 0),
            averageInterestRate: this.loans.length > 0 ? 
                this.loans.reduce((sum, l) => sum + l.interestRate, 0) / this.loans.length : 0
        };
    }
}

// Initialize loan manager when script loads
if (typeof window !== 'undefined') {
    window.LoanManager = LoanManager;
}