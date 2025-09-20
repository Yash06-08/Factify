# MisinfoGuard Browser Extension

🛡️ **MisinfoGuard** is a powerful Chrome extension that helps detect misinformation in images using advanced AI and OCR technology.

## Features

### 🔍 **Image Analysis**
- **AI-Generated Content Detection** using SightEngine API
- **Text Extraction (OCR)** using OCR.space API
- **QR Code Analysis** with URL safety checking
- **Confidence Scoring** for all analysis results

### 🎨 **Modern UI**
- **Glass Morphism Design** with smooth animations
- **Dark/Light Theme** support with system preference detection
- **Responsive Design** optimized for all screen sizes
- **Touch-Friendly** interface for mobile devices

### 🚀 **User Experience**
- **Drag & Drop Interface** for easy image upload
- **Right-Click Context Menu** for instant analysis
- **Batch Processing** for multiple images
- **Real-time Progress** tracking with visual feedback

### 💾 **Data Management**
- **Analysis History** with local storage
- **Settings Persistence** across browser sessions
- **Export Functionality** for analysis results
- **Privacy-First** - all data stays local

## Installation

### Prerequisites
- Node.js 18+ and npm
- Chrome browser (latest version)
- API keys from:
  - [OCR.space](https://ocr.space/ocrapi) (free tier: 25,000 requests/month)
  - [SightEngine](https://sightengine.com) (free tier: 500 requests/day)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd misinfo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

5. **Configure API Keys**
   - Click the extension icon in Chrome
   - Go to Settings
   - Enter your OCR.space API key
   - Enter your SightEngine User ID and Secret

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── popup/                 # Extension popup UI
│   ├── popup.html
│   └── popup.tsx
├── background/            # Service worker
│   └── service-worker.ts
├── content/              # Content scripts
│   ├── content-script.ts
│   └── content-styles.css
├── components/           # React components
│   ├── ui/              # Base UI components
│   ├── DragDropZone.tsx
│   ├── AnalysisResults.tsx
│   └── Settings.tsx
├── hooks/               # Custom React hooks
│   ├── useSettings.ts
│   ├── useAnalysis.ts
│   └── useDragDrop.ts
├── services/           # API services
│   ├── api.ts         # OCR.space & SightEngine
│   ├── storage.ts     # Chrome storage
│   └── qr.ts         # QR code analysis
├── utils/            # Utility functions
│   ├── index.ts
│   └── errorHandler.ts
├── types/           # TypeScript types
│   └── index.ts
└── styles/         # Global styles
    └── globals.css
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite with Chrome Extension plugin
- **Animation**: Framer Motion
- **State Management**: React hooks + Chrome Storage API
- **APIs**: OCR.space, SightEngine, QR-Scanner
- **Drag & Drop**: React DnD + HTML5 Backend

## API Configuration

### OCR.space API
1. Sign up at [ocr.space](https://ocr.space/ocrapi)
2. Get your free API key (25,000 requests/month)
3. Add to extension settings

### SightEngine API
1. Sign up at [sightengine.com](https://sightengine.com)
2. Get your User ID and Secret (500 requests/day free)
3. Add to extension settings

## Usage

### Right-Click Analysis
1. Right-click any image on a webpage
2. Select "Analyze with MisinfoGuard"
3. View results in the popup

### Drag & Drop Analysis
1. Click the extension icon
2. Drag images into the drop zone
3. Click "Analyze All" or analyze individually
4. View detailed results

### Batch Processing
1. Select multiple images
2. Drop them all at once
3. Monitor progress for each image
4. Review comprehensive results

## Privacy & Security

- **Local Processing**: All data stays on your device
- **No Tracking**: No user analytics or tracking
- **Secure APIs**: HTTPS-only API communications
- **Permission Minimal**: Only requests necessary permissions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OCR.space](https://ocr.space) for text extraction API
- [SightEngine](https://sightengine.com) for AI detection API
- [QR-Scanner](https://github.com/nimiq/qr-scanner) for QR code detection
- [Lucide](https://lucide.dev) for beautiful icons

## Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include browser version and error messages

---

**Made with ❤️ for a safer internet**
