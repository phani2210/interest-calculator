# 🧮 Interest Calculator & Loan Tracker

A comprehensive web application for calculating interest and managing loans, designed specifically for rural communities with support for Telugu and English languages.

## ✨ Features

### 🔢 Interest Calculator
- **Simple Interest** calculation
- **Compound Interest** calculation
- Real-time calculations with instant results
- Support for different time periods and rates

### 💰 Loan Management
- Create and manage multiple loans
- Track loan status and payments
- Calculate EMIs and payment schedules
- Loan history and analytics

### 🎤 Voice Integration
- Voice commands for accessibility
- Audio feedback for calculations
- Hands-free operation support

### 📊 Reports & Analytics
- Detailed loan reports
- Interest calculation history
- Export data functionality
- Visual charts and graphs

### 🔐 User Authentication
- Secure user accounts
- Data privacy and protection
- Personal loan tracking

### 🌐 Multi-language Support
- **Telugu** (తెలుగు) - Primary language
- **English** - Secondary language
- Easy language switching

### 📱 Progressive Web App (PWA)
- Offline functionality
- Install on mobile devices
- Fast loading and caching
- Responsive design

## 🚀 Getting Started

### Prerequisites
- Python 3.x (for local development)
- Modern web browser
- Internet connection (for initial setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd trade
   ```

2. **Start the development server**
   ```bash
   python -m http.server 8080
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

### Alternative Simple Setup
For testing, you can also access:
- Simple Calculator: `http://localhost:8080/simple.html`
- Test Page: `http://localhost:8080/test.html`

## 📁 Project Structure

```
trade/
├── index.html          # Main application entry point
├── styles.css          # Application styles
├── manifest.json       # PWA manifest
├── js/
│   ├── app.js          # Main application logic
│   ├── calculator.js   # Interest calculation engine
│   ├── loan-manager.js # Loan management system
│   ├── storage.js      # Data storage and persistence
│   ├── voice.js        # Voice integration
│   ├── auth.js         # Authentication system
│   └── reports.js      # Reports and analytics
├── simple.html         # Simple calculator version
└── test.html          # Server test page
```

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: IndexedDB for offline data persistence
- **PWA**: Service Workers, Web App Manifest
- **Voice**: Web Speech API
- **Charts**: Chart.js for data visualization
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Noto Sans Telugu, Inter)

## 🌟 Key Features Explained

### Interest Calculations
- **Simple Interest**: I = P × R × T / 100
- **Compound Interest**: A = P(1 + R/100)^T

### Loan Management
- Track multiple loans simultaneously
- Calculate EMIs and payment schedules
- Monitor loan status and progress
- Generate detailed reports

### Offline Support
- Works without internet connection
- Data stored locally using IndexedDB
- Automatic sync when online

## 🔧 Configuration

The application uses local storage and IndexedDB for data persistence. No external database setup required.

### Language Configuration
- Default language: Telugu
- Fallback language: English
- Language preference stored locally

## 📱 Mobile Support

The application is fully responsive and works on:
- Desktop browsers
- Mobile phones
- Tablets
- Can be installed as a PWA on mobile devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues:
1. Check the browser console for errors
2. Try hard refresh (Ctrl+F5)
3. Clear browser cache
4. Ensure JavaScript is enabled

## 🎯 Future Enhancements

- [ ] Cloud data synchronization
- [ ] Advanced reporting features
- [ ] Multi-currency support
- [ ] Loan comparison tools
- [ ] Integration with banking APIs
- [ ] Advanced voice commands

---

**Built with ❤️ for rural communities**