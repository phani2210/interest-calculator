class ReportsManager {
    constructor(storageManager, loanManager) {
        this.storageManager = storageManager;
        this.loanManager = loanManager;
        this.currentLanguage = 'te';
        this.translations = {
            te: {
                loanSummary: 'లోన్ సారాంశం',
                paymentHistory: 'చెల్లింపు చరిత్ర',
                interestAnalysis: 'వడ్డీ విశ్లేషణ',
                totalLoans: 'మొత్తం లోన్లు',
                activeLoans: 'చురుకు లోన్లు',
                completedLoans: 'పూర్తయిన లోన్లు',
                overdueLoans: 'బకాయి లోన్లు',
                totalAmount: 'మొత్తం మొత్తం',
                totalInterest: 'మొత్తం వడ్డీ',
                averageRate: 'సగటు రేటు',
                nextDueDate: 'తదుపరి చెల్లింపు తేదీ',
                recentPayments: 'ఇటీవలి చెల్లింపులు',
                noPayments: 'చెల్లింపులు లేవు',
                exportSuccess: 'విజయవంతంగా ఎక్స్‌పోర్ట్ చేయబడింది',
                exportError: 'ఎక్స్‌పోర్ట్ లో లోపం',
                generating: 'రిపోర్ట్ తయారు చేస్తోంది...',
                noData: 'డేటా లేదు'
            },
            en: {
                loanSummary: 'Loan Summary',
                paymentHistory: 'Payment History',
                interestAnalysis: 'Interest Analysis',
                totalLoans: 'Total Loans',
                activeLoans: 'Active Loans',
                completedLoans: 'Completed Loans',
                overdueLoans: 'Overdue Loans',
                totalAmount: 'Total Amount',
                totalInterest: 'Total Interest',
                averageRate: 'Average Rate',
                nextDueDate: 'Next Due Date',
                recentPayments: 'Recent Payments',
                noPayments: 'No Payments',
                exportSuccess: 'Exported Successfully',
                exportError: 'Export Error',
                generating: 'Generating Report...',
                noData: 'No Data Available'
            }
        };
    }

    setLanguage(language) {
        this.currentLanguage = language;
        this.updateReports();
    }

    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    async updateReports() {
        await this.updateLoanSummary();
        await this.updatePaymentHistory();
        await this.updateInterestAnalysis();
    }

    async updateLoanSummary() {
        const loans = await this.storageManager.getAllLoans();
        const summaryElement = document.getElementById('loanSummaryReport');
        
        if (!loans || loans.length === 0) {
            summaryElement.innerHTML = `<p class="no-data">${this.translate('noData')}</p>`;
            return;
        }

        const summary = this.calculateLoanSummary(loans);
        
        summaryElement.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">${this.translate('totalLoans')}</div>
                    <div class="summary-value">${summary.totalLoans}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">${this.translate('activeLoans')}</div>
                    <div class="summary-value">${summary.activeLoans}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">${this.translate('completedLoans')}</div>
                    <div class="summary-value">${summary.completedLoans}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">${this.translate('overdueLoans')}</div>
                    <div class="summary-value">${summary.overdueLoans}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">${this.translate('totalAmount')}</div>
                    <div class="summary-value">₹${summary.totalAmount.toLocaleString('en-IN')}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">${this.translate('totalInterest')}</div>
                    <div class="summary-value">₹${summary.totalInterest.toLocaleString('en-IN')}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">${this.translate('averageRate')}</div>
                    <div class="summary-value">${summary.averageRate.toFixed(2)}%</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">${this.translate('nextDueDate')}</div>
                    <div class="summary-value">${summary.nextDueDate || 'N/A'}</div>
                </div>
            </div>
        `;
    }

    calculateLoanSummary(loans) {
        const summary = {
            totalLoans: loans.length,
            activeLoans: 0,
            completedLoans: 0,
            overdueLoans: 0,
            totalAmount: 0,
            totalInterest: 0,
            averageRate: 0,
            nextDueDate: null
        };

        let totalRate = 0;
        let nextDue = null;

        loans.forEach(loan => {
            summary.totalAmount += loan.loanAmount;
            summary.totalInterest += loan.totalInterest || 0;
            totalRate += loan.interestRate;

            const status = this.loanManager.getLoanStatus(loan);
            if (status === 'completed') {
                summary.completedLoans++;
            } else if (status === 'overdue') {
                summary.overdueLoans++;
            } else {
                summary.activeLoans++;
            }

            // Find next due date
            if (loan.nextDueDate && (!nextDue || new Date(loan.nextDueDate) < new Date(nextDue))) {
                nextDue = loan.nextDueDate;
            }
        });

        summary.averageRate = loans.length > 0 ? totalRate / loans.length : 0;
        summary.nextDueDate = nextDue ? new Date(nextDue).toLocaleDateString('en-IN') : null;

        return summary;
    }

    async updatePaymentHistory() {
        const loans = await this.storageManager.getAllLoans();
        const historyElement = document.getElementById('paymentHistoryReport');
        
        if (!loans || loans.length === 0) {
            historyElement.innerHTML = `<p class="no-data">${this.translate('noData')}</p>`;
            return;
        }

        const payments = this.getRecentPayments(loans);
        
        if (payments.length === 0) {
            historyElement.innerHTML = `<p class="no-data">${this.translate('noPayments')}</p>`;
            return;
        }

        const paymentsHtml = payments.map(payment => `
            <div class="payment-item">
                <div class="payment-info">
                    <div class="payment-loan">${payment.loanName}</div>
                    <div class="payment-date">${payment.date}</div>
                </div>
                <div class="payment-amount">₹${payment.amount.toLocaleString('en-IN')}</div>
                <div class="payment-status ${payment.status}">${payment.status}</div>
            </div>
        `).join('');

        historyElement.innerHTML = `
            <div class="payment-history">
                <h4>${this.translate('recentPayments')}</h4>
                <div class="payments-list">
                    ${paymentsHtml}
                </div>
            </div>
        `;
    }

    getRecentPayments(loans) {
        const payments = [];
        
        loans.forEach(loan => {
            if (loan.payments && loan.payments.length > 0) {
                loan.payments.forEach(payment => {
                    payments.push({
                        loanName: loan.loanName || 'Unnamed Loan',
                        date: new Date(payment.date).toLocaleDateString('en-IN'),
                        amount: payment.amount,
                        status: payment.status || 'paid'
                    });
                });
            }
        });

        // Sort by date (most recent first) and take last 10
        return payments
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
    }

    async updateInterestAnalysis() {
        const loans = await this.storageManager.getAllLoans();
        const analysisElement = document.getElementById('interestAnalysisReport');
        
        if (!loans || loans.length === 0) {
            analysisElement.innerHTML = `<p class="no-data">${this.translate('noData')}</p>`;
            return;
        }

        const analysis = this.calculateInterestAnalysis(loans);
        
        analysisElement.innerHTML = `
            <div class="interest-analysis">
                <div class="analysis-chart">
                    <canvas id="interestChart" width="300" height="200"></canvas>
                </div>
                <div class="analysis-stats">
                    <div class="stat-item">
                        <label>Simple Interest Loans:</label>
                        <span>${analysis.simpleInterestLoans}</span>
                    </div>
                    <div class="stat-item">
                        <label>Compound Interest Loans:</label>
                        <span>${analysis.compoundInterestLoans}</span>
                    </div>
                    <div class="stat-item">
                        <label>Highest Interest Rate:</label>
                        <span>${analysis.highestRate.toFixed(2)}%</span>
                    </div>
                    <div class="stat-item">
                        <label>Lowest Interest Rate:</label>
                        <span>${analysis.lowestRate.toFixed(2)}%</span>
                    </div>
                    <div class="stat-item">
                        <label>Total Interest Paid:</label>
                        <span>₹${analysis.totalInterestPaid.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
        `;

        this.drawInterestChart(analysis);
    }

    calculateInterestAnalysis(loans) {
        const analysis = {
            simpleInterestLoans: 0,
            compoundInterestLoans: 0,
            highestRate: 0,
            lowestRate: Infinity,
            totalInterestPaid: 0,
            interestByType: { simple: 0, compound: 0 }
        };

        loans.forEach(loan => {
            if (loan.interestType === 'simple') {
                analysis.simpleInterestLoans++;
                analysis.interestByType.simple += loan.totalInterest || 0;
            } else {
                analysis.compoundInterestLoans++;
                analysis.interestByType.compound += loan.totalInterest || 0;
            }

            analysis.highestRate = Math.max(analysis.highestRate, loan.interestRate);
            analysis.lowestRate = Math.min(analysis.lowestRate, loan.interestRate);
            analysis.totalInterestPaid += loan.totalInterest || 0;
        });

        if (analysis.lowestRate === Infinity) analysis.lowestRate = 0;

        return analysis;
    }

    drawInterestChart(analysis) {
        const canvas = document.getElementById('interestChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 80;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const total = analysis.interestByType.simple + analysis.interestByType.compound;
        if (total === 0) return;

        const simpleAngle = (analysis.interestByType.simple / total) * 2 * Math.PI;
        const compoundAngle = (analysis.interestByType.compound / total) * 2 * Math.PI;

        // Draw simple interest slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, 0, simpleAngle);
        ctx.closePath();
        ctx.fillStyle = '#4CAF50';
        ctx.fill();

        // Draw compound interest slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, simpleAngle, simpleAngle + compoundAngle);
        ctx.closePath();
        ctx.fillStyle = '#2196F3';
        ctx.fill();

        // Add labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('Simple', centerX - 60, centerY + radius + 20);
        ctx.fillText('Compound', centerX + 20, centerY + radius + 20);
    }

    async exportPDF() {
        try {
            this.showToast(this.translate('generating'));
            
            const loans = await this.storageManager.getAllLoans();
            const summary = this.calculateLoanSummary(loans);
            
            // Create PDF content
            const pdfContent = this.generatePDFContent(loans, summary);
            
            // Create and download PDF (simplified version)
            const blob = new Blob([pdfContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `loan-report-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast(this.translate('exportSuccess'));
        } catch (error) {
            console.error('PDF export error:', error);
            this.showToast(this.translate('exportError'));
        }
    }

    async exportCSV() {
        try {
            this.showToast(this.translate('generating'));
            
            const loans = await this.storageManager.getAllLoans();
            const csvContent = this.generateCSVContent(loans);
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `loans-data-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast(this.translate('exportSuccess'));
        } catch (error) {
            console.error('CSV export error:', error);
            this.showToast(this.translate('exportError'));
        }
    }

    generatePDFContent(loans, summary) {
        let content = `LOAN TRACKER REPORT\n`;
        content += `Generated on: ${new Date().toLocaleDateString('en-IN')}\n\n`;
        
        content += `SUMMARY\n`;
        content += `========\n`;
        content += `Total Loans: ${summary.totalLoans}\n`;
        content += `Active Loans: ${summary.activeLoans}\n`;
        content += `Completed Loans: ${summary.completedLoans}\n`;
        content += `Overdue Loans: ${summary.overdueLoans}\n`;
        content += `Total Amount: ₹${summary.totalAmount.toLocaleString('en-IN')}\n`;
        content += `Total Interest: ₹${summary.totalInterest.toLocaleString('en-IN')}\n`;
        content += `Average Rate: ${summary.averageRate.toFixed(2)}%\n\n`;
        
        content += `LOAN DETAILS\n`;
        content += `============\n`;
        
        loans.forEach((loan, index) => {
            content += `${index + 1}. ${loan.loanName || 'Unnamed Loan'}\n`;
            content += `   Amount: ₹${loan.loanAmount.toLocaleString('en-IN')}\n`;
            content += `   Interest Rate: ${loan.interestRate}%\n`;
            content += `   Duration: ${loan.loanDuration} ${loan.durationUnit}\n`;
            content += `   Type: ${loan.interestType}\n`;
            content += `   Status: ${this.loanManager.getLoanStatus(loan)}\n`;
            if (loan.nextDueDate) {
                content += `   Next Due: ${new Date(loan.nextDueDate).toLocaleDateString('en-IN')}\n`;
            }
            content += `\n`;
        });
        
        return content;
    }

    generateCSVContent(loans) {
        let csv = 'Loan Name,Amount,Interest Rate,Duration,Duration Unit,Interest Type,Total Interest,Status,Start Date,Next Due Date\n';
        
        loans.forEach(loan => {
            const status = this.loanManager.getLoanStatus(loan);
            const startDate = loan.startDate ? new Date(loan.startDate).toLocaleDateString('en-IN') : '';
            const nextDueDate = loan.nextDueDate ? new Date(loan.nextDueDate).toLocaleDateString('en-IN') : '';
            
            csv += `"${loan.loanName || 'Unnamed Loan'}",`;
            csv += `${loan.loanAmount},`;
            csv += `${loan.interestRate},`;
            csv += `${loan.loanDuration},`;
            csv += `"${loan.durationUnit}",`;
            csv += `"${loan.interestType}",`;
            csv += `${loan.totalInterest || 0},`;
            csv += `"${status}",`;
            csv += `"${startDate}",`;
            csv += `"${nextDueDate}"\n`;
        });
        
        return csv;
    }

    async speakSummary() {
        try {
            const loans = await this.storageManager.getAllLoans();
            const summary = this.calculateLoanSummary(loans);
            
            let text = '';
            if (this.currentLanguage === 'te') {
                text = `మీకు మొత్తం ${summary.totalLoans} లోన్లు ఉన్నాయి. `;
                text += `వాటిలో ${summary.activeLoans} చురుకు లోన్లు, `;
                text += `${summary.completedLoans} పూర్తయిన లోన్లు, `;
                text += `మరియు ${summary.overdueLoans} బకాయి లోన్లు ఉన్నాయి. `;
                text += `మొత్తం మొత్తం ${summary.totalAmount} రూపాయలు. `;
                text += `మొత్తం వడ్డీ ${summary.totalInterest} రూపాయలు.`;
            } else {
                text = `You have ${summary.totalLoans} total loans. `;
                text += `${summary.activeLoans} are active, `;
                text += `${summary.completedLoans} are completed, `;
                text += `and ${summary.overdueLoans} are overdue. `;
                text += `Total amount is ${summary.totalAmount} rupees. `;
                text += `Total interest is ${summary.totalInterest} rupees.`;
            }
            
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = this.currentLanguage === 'te' ? 'te-IN' : 'en-IN';
                utterance.rate = 0.8;
                speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error('Speech synthesis error:', error);
            this.showToast('Voice summary not available');
        }
    }

    showToast(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
}