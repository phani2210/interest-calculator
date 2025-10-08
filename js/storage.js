// Storage Manager for Offline Functionality
class StorageManager {
    static dbName = 'LoanTrackerDB';
    static dbVersion = 1;
    static db = null;
    static isInitialized = false;

    static stores = {
        loans: 'loans',
        calculations: 'calculations',
        userPreferences: 'userPreferences',
        syncQueue: 'syncQueue',
        backups: 'backups'
    };

    static async init() {
        if (this.isInitialized) return this.db;

        try {
            this.db = await this.openDatabase();
            this.isInitialized = true;
            console.log('Storage Manager initialized successfully');
            
            // Setup periodic backup
            this.setupPeriodicBackup();
            
            return this.db;
        } catch (error) {
            console.error('Failed to initialize Storage Manager:', error);
            throw error;
        }
    }

    static openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
        });
    }

    static createStores(db) {
        // Loans store
        if (!db.objectStoreNames.contains(this.stores.loans)) {
            const loansStore = db.createObjectStore(this.stores.loans, { keyPath: 'id' });
            loansStore.createIndex('status', 'status', { unique: false });
            loansStore.createIndex('createdAt', 'createdAt', { unique: false });
            loansStore.createIndex('nextDueDate', 'nextDueDate', { unique: false });
        }

        // Calculations store
        if (!db.objectStoreNames.contains(this.stores.calculations)) {
            const calculationsStore = db.createObjectStore(this.stores.calculations, { keyPath: 'id' });
            calculationsStore.createIndex('calculatedAt', 'calculatedAt', { unique: false });
        }

        // User preferences store
        if (!db.objectStoreNames.contains(this.stores.userPreferences)) {
            db.createObjectStore(this.stores.userPreferences, { keyPath: 'key' });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
            const syncStore = db.createObjectStore(this.stores.syncQueue, { keyPath: 'id' });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
            syncStore.createIndex('action', 'action', { unique: false });
        }

        // Backups store
        if (!db.objectStoreNames.contains(this.stores.backups)) {
            const backupsStore = db.createObjectStore(this.stores.backups, { keyPath: 'id' });
            backupsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
    }

    // Generic CRUD operations
    static async setItem(storeName, data) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Encrypt sensitive data
            const encryptedData = this.encryptData(data);
            
            const request = store.put(encryptedData);

            request.onsuccess = () => {
                // Add to sync queue if online sync is enabled
                this.addToSyncQueue('update', storeName, data);
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to save data to ${storeName}`));
            };
        });
    }

    static async getItem(storeName, key = null) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (key) {
                request = store.get(key);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    // Decrypt data
                    const decryptedData = Array.isArray(result) 
                        ? result.map(item => this.decryptData(item))
                        : this.decryptData(result);
                    resolve(decryptedData);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                reject(new Error(`Failed to get data from ${storeName}`));
            };
        });
    }

    static async deleteItem(storeName, key) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                // Add to sync queue
                this.addToSyncQueue('delete', storeName, { id: key });
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error(`Failed to delete data from ${storeName}`));
            };
        });
    }

    static async clearStore(storeName) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error(`Failed to clear ${storeName}`));
            };
        });
    }

    // Specialized methods for loans
    static async saveLoans(loans) {
        const loansArray = Array.isArray(loans) ? loans : [loans];
        const promises = loansArray.map(loan => this.setItem(this.stores.loans, loan));
        return Promise.all(promises);
    }

    static async getLoans(filters = {}) {
        const allLoans = await this.getItem(this.stores.loans) || [];
        
        if (Object.keys(filters).length === 0) {
            return allLoans;
        }

        return allLoans.filter(loan => {
            return Object.keys(filters).every(key => {
                if (key === 'status') {
                    return loan.status === filters[key];
                }
                if (key === 'dueSoon') {
                    const dueDate = new Date(loan.nextDueDate);
                    const today = new Date();
                    const daysDiff = (dueDate - today) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 7 && daysDiff >= 0;
                }
                return loan[key] === filters[key];
            });
        });
    }

    static async getAllLoans() {
        return this.getLoans();
    }

    static async getLoanById(id) {
        return this.getItem(this.stores.loans, id);
    }

    static async updateLoan(loan) {
        return this.setItem(this.stores.loans, loan);
    }

    static async deleteLoan(id) {
        return this.deleteItem(this.stores.loans, id);
    }

    // User preferences
    static async saveUserPreference(key, value) {
        return this.setItem(this.stores.userPreferences, { key, value, updatedAt: new Date().toISOString() });
    }

    static async getUserPreference(key) {
        const result = await this.getItem(this.stores.userPreferences, key);
        return result ? result.value : null;
    }

    static async getUserPreferences() {
        const allPrefs = await this.getItem(this.stores.userPreferences) || [];
        const prefsObject = {};
        allPrefs.forEach(pref => {
            prefsObject[pref.key] = pref.value;
        });
        return prefsObject;
    }

    // Backup and restore
    static async createBackup() {
        try {
            const backup = {
                id: 'backup_' + Date.now(),
                createdAt: new Date().toISOString(),
                data: {
                    loans: await this.getItem(this.stores.loans) || [],
                    calculations: await this.getItem(this.stores.calculations) || [],
                    userPreferences: await this.getItem(this.stores.userPreferences) || []
                },
                version: this.dbVersion
            };

            await this.setItem(this.stores.backups, backup);
            
            // Keep only last 5 backups
            await this.cleanupOldBackups();
            
            return backup.id;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    static async restoreBackup(backupId) {
        try {
            const backup = await this.getItem(this.stores.backups, backupId);
            if (!backup) {
                throw new Error('Backup not found');
            }

            // Clear existing data
            await this.clearStore(this.stores.loans);
            await this.clearStore(this.stores.calculations);
            await this.clearStore(this.stores.userPreferences);

            // Restore data
            const { loans, calculations, userPreferences } = backup.data;
            
            if (loans.length > 0) {
                await Promise.all(loans.map(loan => this.setItem(this.stores.loans, loan)));
            }
            
            if (calculations.length > 0) {
                await Promise.all(calculations.map(calc => this.setItem(this.stores.calculations, calc)));
            }
            
            if (userPreferences.length > 0) {
                await Promise.all(userPreferences.map(pref => this.setItem(this.stores.userPreferences, pref)));
            }

            return true;
        } catch (error) {
            console.error('Failed to restore backup:', error);
            throw error;
        }
    }

    static async getBackups() {
        const backups = await this.getItem(this.stores.backups) || [];
        return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    static async cleanupOldBackups() {
        const backups = await this.getBackups();
        if (backups.length > 5) {
            const oldBackups = backups.slice(5);
            await Promise.all(oldBackups.map(backup => this.deleteItem(this.stores.backups, backup.id)));
        }
    }

    // Sync queue management
    static async addToSyncQueue(action, storeName, data) {
        if (!navigator.onLine) return; // Don't add to queue if offline

        const syncItem = {
            id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            action,
            storeName,
            data,
            timestamp: new Date().toISOString(),
            retries: 0
        };

        return this.setItem(this.stores.syncQueue, syncItem);
    }

    static async getSyncQueue() {
        return this.getItem(this.stores.syncQueue) || [];
    }

    static async processSyncQueue() {
        if (!navigator.onLine) return;

        const queue = await this.getSyncQueue();
        const results = [];

        for (const item of queue) {
            try {
                await this.syncItem(item);
                await this.deleteItem(this.stores.syncQueue, item.id);
                results.push({ id: item.id, status: 'success' });
            } catch (error) {
                console.error('Sync failed for item:', item.id, error);
                
                // Increment retry count
                item.retries = (item.retries || 0) + 1;
                
                if (item.retries < 3) {
                    await this.setItem(this.stores.syncQueue, item);
                    results.push({ id: item.id, status: 'retry' });
                } else {
                    await this.deleteItem(this.stores.syncQueue, item.id);
                    results.push({ id: item.id, status: 'failed' });
                }
            }
        }

        return results;
    }

    static async syncItem(item) {
        // This would integrate with your cloud sync service
        // For now, we'll simulate the sync
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Synced item:', item.id);
                resolve();
            }, 100);
        });
    }

    // Data encryption/decryption (basic implementation)
    static encryptData(data) {
        // In a real implementation, use proper encryption
        // For demo purposes, we'll just return the data as-is
        return data;
    }

    static decryptData(data) {
        // In a real implementation, use proper decryption
        // For demo purposes, we'll just return the data as-is
        return data;
    }

    // Export/Import functionality
    static async exportData() {
        try {
            const data = {
                loans: await this.getItem(this.stores.loans) || [],
                calculations: await this.getItem(this.stores.calculations) || [],
                userPreferences: await this.getItem(this.stores.userPreferences) || [],
                exportedAt: new Date().toISOString(),
                version: this.dbVersion
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `loan-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    static async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (!data.loans || !data.calculations || !data.userPreferences) {
                        throw new Error('Invalid data format');
                    }

                    // Import data
                    if (data.loans.length > 0) {
                        await Promise.all(data.loans.map(loan => this.setItem(this.stores.loans, loan)));
                    }
                    
                    if (data.calculations.length > 0) {
                        await Promise.all(data.calculations.map(calc => this.setItem(this.stores.calculations, calc)));
                    }
                    
                    if (data.userPreferences.length > 0) {
                        await Promise.all(data.userPreferences.map(pref => this.setItem(this.stores.userPreferences, pref)));
                    }

                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    // Statistics and analytics
    static async getStatistics() {
        try {
            const loans = await this.getItem(this.stores.loans) || [];
            const calculations = await this.getItem(this.stores.calculations) || [];

            return {
                totalLoans: loans.length,
                activeLoans: loans.filter(loan => loan.status === 'active').length,
                completedLoans: loans.filter(loan => loan.status === 'completed').length,
                overdueLoans: loans.filter(loan => loan.status === 'overdue').length,
                totalAmount: loans.reduce((sum, loan) => sum + loan.loanAmount, 0),
                totalInterest: loans.reduce((sum, loan) => sum + loan.totalInterest, 0),
                averageInterestRate: loans.length > 0 ? loans.reduce((sum, loan) => sum + loan.interestRate, 0) / loans.length : 0,
                totalCalculations: calculations.length,
                lastCalculation: calculations.length > 0 ? calculations[calculations.length - 1].calculatedAt : null,
                storageUsed: await this.getStorageUsage()
            };
        } catch (error) {
            console.error('Failed to get statistics:', error);
            return {};
        }
    }

    static async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage,
                quota: estimate.quota,
                percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
            };
        }
        return null;
    }

    // Periodic backup setup
    static setupPeriodicBackup() {
        // Create backup every 24 hours
        setInterval(async () => {
            try {
                await this.createBackup();
                console.log('Automatic backup created');
            } catch (error) {
                console.error('Automatic backup failed:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24 hours
    }

    // Database maintenance
    static async performMaintenance() {
        try {
            // Clean up old calculations (keep only last 100)
            const calculations = await this.getItem(this.stores.calculations) || [];
            if (calculations.length > 100) {
                const oldCalculations = calculations.slice(0, calculations.length - 100);
                await Promise.all(oldCalculations.map(calc => this.deleteItem(this.stores.calculations, calc.id)));
            }

            // Clean up old backups
            await this.cleanupOldBackups();

            // Process sync queue
            await this.processSyncQueue();

            console.log('Database maintenance completed');
            return true;
        } catch (error) {
            console.error('Database maintenance failed:', error);
            return false;
        }
    }
}

// Initialize storage when script loads
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}