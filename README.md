# LexiYaar - Legal Document Scanner PWA

🏛️ **A free, open-source Progressive Web App for scanning and analyzing rental agreement documents**

LexiYaar helps identify risky clauses in legal documents with AI-powered analysis and provides explanations in both Hindi and English. Built specifically for Indian rental agreements with DLSA legal aid integration.

## ✨ Features

- 📱 **Mobile-First PWA** - Install on any device, works offline
- 📸 **Document Scanning** - Camera capture with OCR text extraction using Tesseract.js
- 🤖 **AI Analysis** - Rule-based clause classifier identifying security deposit, rent hike, and lock-in risks
- 🎯 **Visual Highlighting** - Color-coded risk overlay (Red/Yellow/Green traffic light system)
- 🔊 **Audio Explanations** - Text-to-speech in Hindi and English
- 🗺️ **Legal Aid Locator** - Geolocation-based DLSA contact finder
- 🌐 **Bilingual Support** - Full Hindi and English interface
- 🔒 **Privacy-First** - Client-side processing, optional cloud storage

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **OCR**: Tesseract.js (client-side)
- **PWA**: next-pwa with Workbox
- **Audio**: Web Speech API (SpeechSynthesis)
- **Backend**: Supabase (optional, for data storage)
- **Deployment**: Vercel/Netlify ready

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lexiyaar-pwa.git
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
   
   Update `.env.local` with your Supabase credentials (optional):
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
1. Open the app in your mobile browser
2. Look for the "Add to Home Screen" prompt
3. Or use the browser menu → "Add to Home Screen"

### On Desktop
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Or go to Menu → "Install LexiYaar..."

## 📦 Converting to Android APK

LexiYaar can be packaged as an Android APK using PWABuilder:

### Method 1: PWABuilder.com (Recommended)

1. **Visit PWABuilder**
   - Go to [pwabuilder.com](https://www.pwabuilder.com)

2. **Enter Your App URL**
   - Enter your deployed app URL (e.g., `https://yourdomain.com`)
   - Click "Start"

3. **Review Manifest**
   - PWABuilder will analyze your manifest.json
   - Make sure all fields are properly filled

4. **Generate Package**
   - Click on "Android" platform
   - Choose "Android App Bundle" for Play Store or "APK" for sideloading
   - Configure app details (name, icons, etc.)
   - Click "Generate Package"

5. **Download & Sign**
   - Download the generated package
   - Follow PWABuilder's signing instructions
   - For Play Store: Upload the .aab file
   - For sideloading: Install the .apk file

### Method 2: Capacitor (Advanced)

1. **Install Capacitor**
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Initialize Capacitor**
   ```bash
   npx cap init LexiYaar com.yourname.lexiyaar
   ```

3. **Build and Add Android Platform**
   ```bash
   npm run build
   npx cap add android
   npx cap sync android
   ```

4. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

5. **Build APK in Android Studio**
   - Build → Generate Signed Bundle/APK
   - Choose APK and follow the wizard

## 🏗️ Project Structure

```
lexiyaar-pwa/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   │   ├── classifier.ts    # Rule-based clause analysis
│   │   ├── ocr.ts          # Tesseract.js integration
│   │   ├── tts.ts          # Text-to-speech service
│   │   ├── supabase.ts     # Database client
│   │   └── language-context.tsx # i18n context
│   ├── types/              # TypeScript definitions
│   └── data/               # Static data (DLSA contacts)
├── public/
│   ├── manifest.json       # PWA manifest
│   └── icons/             # PWA icons
├── .env.example           # Environment variables template
└── next.config.ts        # Next.js + PWA configuration
```

## 🎯 Core Components

### Document Scanner (`/scan`)
- Camera capture with preview
- File upload support (JPG, PNG, PDF)
- Real-time OCR processing with progress
- Image optimization for better OCR

### Document Analyzer (`/document`)
- Visual clause highlighting
- Interactive risk assessment
- Bottom sheet explanations
- Audio playback integration

### Legal Aid Finder (`/help`)
- Geolocation-based DLSA contacts
- Call/directions integration
- Save contacts locally
- Emergency helplines

### Settings (`/settings`)
- Language toggle (Hindi/English)
- Privacy controls
- Audio testing
- Data management

## 🤖 AI Classifier

The rule-based classifier identifies three main risk categories:

### Security Deposit Issues
- **High Risk**: Forfeiture clauses, non-refundable deposits
- **Medium Risk**: Vague wear-and-tear terms
- **Detection**: Regex patterns + keyword matching

### Rent Increase Clauses  
- **High Risk**: Arbitrary increases without notice
- **Medium Risk**: Annual increase provisions
- **Detection**: Pattern matching for discretionary language

### Lock-in Penalties
- **High Risk**: Heavy penalties, deposit forfeiture
- **Medium Risk**: Standard notice periods
- **Detection**: Keyword analysis for penalty terms

## 🚨 Legal Disclaimer

⚠️ **Important Notice**

LexiYaar is provided for educational and informational purposes only. It is not intended to provide legal advice and should not be used as a substitute for consultation with a qualified attorney.

- This tool provides automated analysis that may not be 100% accurate
- Laws vary by jurisdiction and change frequently
- For important legal matters, always consult with a licensed attorney
- The developers assume no liability for decisions made based on this tool's output

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Indian legal community**

*Making legal documents accessible to everyone, one scan at a time.*
