#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🛡️  Setting up MisinfoGuard development environment...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed:', nodeVersion);

// Create necessary directories
const directories = [
  'dist',
  'src/components/ui',
  'src/hooks',
  'src/services',
  'src/utils',
  'src/types',
  'icons',
  'public/icons'
];

directories.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('📁 Created directory:', dir);
  }
});

// Check if package.json exists
const packageJsonPath = path.join(projectRoot, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Check if essential files exist
const essentialFiles = [
  'src/popup/popup.tsx',
  'src/popup/popup.html',
  'src/background/service-worker.ts',
  'src/content/content-script.ts',
  'manifest.json',
  'vite.config.ts',
  'tsconfig.json'
];

let missingFiles = [];
essentialFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.warn('⚠️  Missing essential files:');
  missingFiles.forEach(file => console.warn('   -', file));
  console.warn('\nThe extension may not work properly without these files.\n');
} else {
  console.log('✅ All essential files are present');
}

// Create a simple environment template
const envTemplatePath = path.join(projectRoot, '.env.example');
const envTemplate = `# MisinfoGuard Environment Variables
# Copy this file to .env.local and fill in your API keys

# OCR.space API Key (get from https://ocr.space/ocrapi)
VITE_OCR_SPACE_API_KEY=your_ocr_space_api_key_here

# SightEngine API Credentials (get from https://sightengine.com)
VITE_SIGHTENGINE_USER=your_sightengine_user_here
VITE_SIGHTENGINE_SECRET=your_sightengine_secret_here

# Development settings
NODE_ENV=development
`;

if (!fs.existsSync(envTemplatePath)) {
  fs.writeFileSync(envTemplatePath, envTemplate);
  console.log('📄 Created .env.example file');
}

// Create development manifest
const manifestPath = path.join(projectRoot, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Add development-specific settings
  const devManifestPath = path.join(projectRoot, 'manifest.dev.json');
  const devManifest = {
    ...manifest,
    name: manifest.name + ' (Development)',
    version: manifest.version + '.dev',
    // Add additional permissions for development
    permissions: [
      ...manifest.permissions,
      'tabs'  // For better debugging
    ]
  };
  
  fs.writeFileSync(devManifestPath, JSON.stringify(devManifest, null, 2));
  console.log('📄 Created development manifest');
}

// Print setup completion message
console.log('\n🎉 Development environment setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Copy .env.example to .env.local and add your API keys');
console.log('3. Start development: npm run dev');
console.log('4. Build for production: npm run build');
console.log('5. Load the extension in Chrome from the dist/ folder');

console.log('\n🔗 Useful links:');
console.log('- OCR.space API: https://ocr.space/ocrapi');
console.log('- SightEngine API: https://sightengine.com');
console.log('- Chrome Extension Documentation: https://developer.chrome.com/docs/extensions/');

console.log('\n🛡️  Happy coding with MisinfoGuard!');
