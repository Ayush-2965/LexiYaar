# LexiYaar - AI-Powered Legal Document Scanner PWA

🏛️ **An advanced Progressive Web App for scanning, analyzing, and understanding legal documents with AI**

LexiYaar uses cutting-edge AI technology to analyze rental agreements and other legal documents, identifying risky clauses and providing multilingual explanations. Built with Google ML Kit integration and supports 12+ Indian languages with DLSA legal aid integration.

## ✨ Features

- 📱 **Cross-Platform PWA** - Install on Android, iOS, or desktop; works offline
- 📸 **Advanced Document Scanning** - Native camera capture with Google ML Kit document scanner
- 🤖 **AI-Powered Analysis** - Gemini AI for comprehensive legal document analysis
- 🔍 **ML Kit OCR** - High-accuracy text extraction with native performance
- 🎯 **Smart Risk Assessment** - Color-coded clause analysis (Red/Yellow/Green system)
- 🔊 **Multilingual TTS** - Text-to-speech in 12+ Indian languages
- 🗺️ **Legal Aid Integration** - Geolocation-based DLSA contact finder
- 🌐 **12+ Language Support** - Full interface in Hindi, Tamil, Telugu, Gujarati, and more
- 📄 **Multi-Page Support** - Handle complex multi-page legal documents
- 🔒 **Privacy-First** - Client-side processing with optional cloud storage
- ⚡ **Offline Capable** - Core functionality works without internet

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI/ML**: Google Gemini AI, ML Kit (Document Scanner, Text Recognition, Translation)
- **OCR**: @pantrist/capacitor-plugin-ml-kit-text-recognition (native), Tesseract.js (web fallback)
- **Mobile**: Capacitor with native plugins
- **PWA**: next-pwa with Workbox service worker
- **Audio**: @capacitor-community/text-to-speech, Web Speech API
- **Translation**: @capacitor-mlkit/translation for dynamic content
- **Backend**: Supabase (optional, for data storage)
- **Deployment**: Vercel/Netlify ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- For mobile development: Android Studio (for Android APK)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ayush-2965/LexiYaar.git
   cd lexiyaar-pwa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

   Configure your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## 📱 PWA Installation

### On Mobile Devices

1. Open the app in your mobile browser (Chrome/Safari)
2. Look for the "Add to Home Screen" prompt
3. Or use the browser menu → "Add to Home Screen"
4. The app will install with native app-like experience

### On Desktop

1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Or go to Menu → "Install LexiYaar..."

## 📦 Mobile App Development

### Capacitor Setup (Recommended for Native Features)

1. **Install Capacitor CLI**
   ```bash
   npm install -g @capacitor/cli
   ```

2. **Add Android Platform**
   ```bash
   npx cap add android
   ```

3. **Sync and Build**
   ```bash
   npm run build
   npx cap sync android
   ```

4. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

5. **Build APK**
   - In Android Studio: Build → Generate Signed Bundle/APK
   - Choose APK option and follow the signing wizard

### PWABuilder Alternative

For simpler APK generation without Android Studio:

1. Deploy your app to a public URL
2. Visit [pwabuilder.com](https://www.pwabuilder.com)
3. Enter your app URL and generate Android package
4. Download and sign the APK

## 🏗️ Project Structure

```
lexiyaar-pwa/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── layout.tsx       # Root layout with i18n
│   │   ├── page.tsx         # Home page
│   │   ├── scan/            # Document scanning
│   │   ├── document/        # Document analysis viewer
│   │   ├── help/            # Legal aid finder
│   │   └── settings/        # App settings
│   ├── components/          # React components
│   │   ├── ScanPage.tsx     # Camera/file upload interface
│   │   ├── DocumentViewer.tsx # Analysis results display
│   │   ├── Button.tsx       # Reusable UI components
│   │   └── ...
│   ├── lib/                 # Core utilities
│   │   ├── ocr.ts          # ML Kit OCR integration
│   │   ├── classifier.ts   # Rule-based risk analysis
│   │   ├── gemini.ts       # AI analysis service
│   │   ├── translation.ts  # ML Kit translation
│   │   ├── tts.ts          # Text-to-speech service
│   │   ├── pdf.ts          # PDF processing
│   │   └── supabase.ts     # Database client
│   ├── types/              # TypeScript definitions
│   └── data/               # Static data (DLSA contacts)
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icons/             # App icons and logo
│   └── sw.js              # Service worker
├── android/               # Capacitor Android project
├── capacitor.config.ts    # Capacitor configuration
├── next.config.ts        # Next.js configuration
└── package.json          # Dependencies and scripts
```

## 🎯 Core Features

### Document Scanner (`/scan`)

- **Native Camera**: ML Kit document scanner for automatic edge detection
- **File Upload**: Support for JPG, PNG, PDF files
- **Multi-Page**: Handle complex legal documents with multiple pages
- **Real-time OCR**: Progress indicators during text extraction
- **Image Optimization**: Automatic preprocessing for better OCR accuracy

### AI Document Analyzer (`/document`)

- **Gemini AI Integration**: Advanced legal document analysis
- **Visual Highlighting**: Interactive clause risk assessment
- **Multi-Page Navigation**: Browse through all document pages
- **Dynamic Translation**: AI explanations in user's preferred language
- **Audio Playback**: Listen to analysis results
- **Compliance Checking**: Government regulation verification

## 📱 PWA Installation

### On Mobile Devices
1. Open the app in your mobile browser (Chrome/Safari)
2. Look for the "Add to Home Screen" prompt
3. Or use the browser menu → "Add to Home Screen"
4. The app will install with native app-like experience

### On Desktop
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Or go to Menu → "Install LexiYaar..."

## 📦 Mobile App Development

### Capacitor Setup (Recommended for Native Features)

1. **Install Capacitor CLI**
   ```bash
   npm install -g @capacitor/cli
   ```

2. **Add Android Platform**
   ```bash
   npx cap add android
   ```

3. **Sync and Build**
   ```bash
   npm run build
   npx cap sync android
   ```

4. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

5. **Build APK**
   - In Android Studio: Build → Generate Signed Bundle/APK
   - Choose APK option and follow the signing wizard

### PWABuilder Alternative

For simpler APK generation without Android Studio:

1. Deploy your app to a public URL
2. Visit [pwabuilder.com](https://www.pwabuilder.com)
3. Enter your app URL and generate Android package
4. Download and sign the APK

## 🏗️ Project Structure

```
lexiyaar-pwa/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── layout.tsx       # Root layout with i18n
│   │   ├── page.tsx         # Home page
│   │   ├── scan/            # Document scanning
│   │   ├── document/        # Document analysis viewer
│   │   ├── help/            # Legal aid finder
│   │   └── settings/        # App settings
│   ├── components/          # React components
│   │   ├── ScanPage.tsx     # Camera/file upload interface
│   │   ├── DocumentViewer.tsx # Analysis results display
│   │   ├── Button.tsx       # Reusable UI components
│   │   └── ...
│   ├── lib/                 # Core utilities
│   │   ├── ocr.ts          # ML Kit OCR integration
│   │   ├── classifier.ts   # Rule-based risk analysis
│   │   ├── gemini.ts       # AI analysis service
│   │   ├── translation.ts  # ML Kit translation
│   │   ├── tts.ts          # Text-to-speech service
│   │   ├── pdf.ts          # PDF processing
│   │   └── supabase.ts     # Database client
│   ├── types/              # TypeScript definitions
│   └── data/               # Static data (DLSA contacts)
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icons/             # App icons and logo
│   └── sw.js              # Service worker
├── android/               # Capacitor Android project
├── capacitor.config.ts    # Capacitor configuration
├── next.config.ts        # Next.js configuration
└── package.json          # Dependencies and scripts
```

## 🎯 Core Features

### Document Scanner (`/scan`)
- **Native Camera**: ML Kit document scanner for automatic edge detection
- **File Upload**: Support for JPG, PNG, PDF files
- **Multi-Page**: Handle complex legal documents with multiple pages
- **Real-time OCR**: Progress indicators during text extraction
- **Image Optimization**: Automatic preprocessing for better OCR accuracy

### AI Document Analyzer (`/document`)
- **Gemini AI Integration**: Advanced legal document analysis
- **Visual Highlighting**: Interactive clause risk assessment
- **Multi-Page Navigation**: Browse through all document pages
- **Dynamic Translation**: AI explanations in user's preferred language
- **Audio Playback**: Listen to analysis results
- **Compliance Checking**: Government regulation verification

### Legal Aid Finder (`/help`)
- **Geolocation**: Find nearest DLSA offices
- **Contact Integration**: Direct calling and directions
- **Offline Storage**: Save important contacts locally
- **Emergency Helplines**: Quick access to legal aid numbers

### Settings (`/settings`)
- **12+ Languages**: Hindi, English, Tamil, Telugu, Gujarati, Marathi, etc.
- **Audio Testing**: Verify text-to-speech functionality
- **Privacy Controls**: Data management and permissions
- **Theme Settings**: Light/dark mode support

## 🤖 AI & ML Integration

### Google ML Kit Plugins
- **Document Scanner**: Native document capture with edge detection
- **Text Recognition**: High-accuracy OCR with multiple language support
- **Translation**: Real-time translation for dynamic AI content

### Gemini AI Analysis
- **Legal Compliance**: Automatic identification of legal violations
- **Risk Assessment**: Comprehensive clause analysis
- **Recommendations**: AI-generated improvement suggestions
- **Multilingual Output**: Analysis results in user's language

### Rule-Based Classifier
- **Security Deposits**: Identifies unfair deposit clauses
- **Rent Increases**: Detects arbitrary rent hike provisions
- **Lock-in Periods**: Flags unreasonable penalty clauses
- **Legal Compliance**: Government regulation verification

## 🌐 Supported Languages

LexiYaar supports 12+ Indian languages:
- Hindi (हिंदी)
- English
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Gujarati (ગુજરાતી)
- Marathi (मराठी)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Bengali (বাংলা)
- Punjabi (ਪੰਜਾਬੀ)
- Odia (ଓଡ଼ିଆ)
- Assamese (অসমীয়া)

## 🚨 Legal Disclaimer

⚠️ **Important Notice**

LexiYaar is provided for educational and informational purposes only. It is not intended to provide legal advice and should not be used as a substitute for consultation with a qualified attorney.

- This tool provides automated analysis that may not be 100% accurate
- Laws vary by jurisdiction and change frequently
- AI analysis is supplementary, not a replacement for professional legal review
- For important legal matters, always consult with a licensed attorney
- The developers assume no liability for decisions made based on this tool's output

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Fork and clone
git clone https://github.com/yourusername/LexiYaar.git
cd lexiyaar-pwa

# Install dependencies
npm install

# Start development server
npm run dev

# For mobile development
npm run build
npx cap sync android
npx cap open android
```

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Ayush-2965/LexiYaar/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Ayush-2965/LexiYaar/discussions)
- **Documentation**: [Wiki](https://github.com/Ayush-2965/LexiYaar/wiki)

---

**Built with ❤️ for the Indian legal community**

*Making legal documents accessible to everyone, one scan at a time.*
