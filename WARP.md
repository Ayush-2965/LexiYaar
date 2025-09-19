# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

LexiYaar is a Progressive Web App (PWA) for scanning and analyzing legal documents, specifically Indian rental agreements. It uses AI-powered clause classification to identify risky terms and provides explanations in both Hindi and English.

**Tech Stack**: Next.js 15, TypeScript, Tailwind CSS, Tesseract.js, Supabase (optional), next-pwa

## Development Commands

### Core Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm start           # Start production server
npm run lint        # Run ESLint
```

### Environment Setup
1. Copy environment template: `cp .env.example .env.local`
2. Configure Supabase (optional): Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### PWA Testing
- Development: PWA features disabled (`next-pwa` config)
- Production: Build and serve locally to test PWA functionality
- Android APK: Use PWABuilder.com or Capacitor for mobile app packaging

## Architecture

### Core System Components

**1. OCR Pipeline (`src/lib/ocr.ts`)**
- Uses Tesseract.js for client-side text extraction
- Supports English + Hindi (Devanagari) characters
- Image preprocessing and optimization for better accuracy
- Progress tracking and error handling

**2. AI Clause Classifier (`src/lib/classifier.ts`)**
- Rule-based pattern matching system (not ML-based)
- Identifies 3 main risk categories: security deposit, rent hike, lock-in penalties
- Uses regex patterns + keyword matching with weighted scoring
- Returns confidence scores and risk levels (high/medium/low)
- Includes bilingual audio explanations

**3. Language System (`src/lib/language-context.tsx`)**
- React context for Hindi/English switching
- Persistent language preference in localStorage
- Translation keys for UI text
- Separate audio explanations in classifier

**4. PWA Infrastructure**
- next-pwa with Workbox integration
- Service worker for offline functionality
- Manifest.json with proper mobile app configuration
- Installable on mobile and desktop

### Page Structure (App Router)
- `/` - Home page with scan/upload options
- `/scan` - Camera capture and document scanning
- `/document` - Document analysis with visual highlighting
- `/help` - DLSA legal aid contact finder with geolocation
- `/settings` - Language toggle and privacy controls

### Data Flow
1. **Document Input**: Camera capture or file upload → Image optimization
2. **OCR Processing**: Tesseract.js extracts text → Paragraph segmentation
3. **AI Analysis**: Rule-based classifier → Risk assessment with positions
4. **Visual Output**: Color-coded highlighting (red/yellow/green) + Audio explanations
5. **Legal Aid**: Geolocation-based DLSA contact suggestions

## Key Implementation Details

### OCR Optimization
- Supports both File objects and data URLs
- Image resizing (max 1200px) for performance
- Character whitelist includes Devanagari range (\u0900-\u097F)
- Progress callbacks for UI feedback

### Classifier Logic
- Pattern matching with 70% weight, keywords with 30% weight
- Minimum score threshold of 0.2 for relevance
- Deduplication by text similarity and confidence ranking
- Risk color mapping: high=#ef4444, medium=#f59e0b, low=#10b981

### Mobile-First Design
- Tailwind CSS for responsive UI
- Touch-optimized large buttons
- Bottom sheet UI patterns for mobile UX
- Camera integration with file input fallback

### Privacy-First Approach
- Client-side OCR processing (no server uploads)
- Optional Supabase cloud storage
- Local storage for settings and preferences
- Geolocation for legal aid finder (user permission)

## Testing Strategy

### Component Testing
- Focus on OCR service initialization and text extraction
- Classifier rule accuracy with sample legal text
- Language context switching and persistence
- Camera/file upload handling

### PWA Testing
- Offline functionality after build
- Install prompts on mobile/desktop
- Service worker caching behavior
- Manifest.json validation

### Legal Domain Testing
- Test with actual rental agreement clauses
- Validate Hindi/English text recognition
- Verify risk level accuracy for known clauses
- Audio pronunciation quality in both languages

## Domain-Specific Notes

### Indian Legal Context
- Focuses on rental agreement analysis
- DLSA (District Legal Services Authority) integration
- State-specific legal aid contact database
- Hindi/English bilingual requirements for accessibility

### Clause Categories
- **Security Deposit**: Forfeiture, deduction terms, wear-and-tear
- **Rent Hike**: Arbitrary increases, discretionary clauses, notice requirements
- **Lock-in Penalty**: Early termination, notice periods, deposit forfeiture

### Regulatory Compliance
- Not legal advice disclaimer required
- Data privacy (client-side processing preferred)
- Accessibility (audio explanations, large UI elements)