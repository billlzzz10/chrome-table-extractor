#!/usr/bin/env node

// Validation script for Chrome Extension
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Chrome Extension Structure...\n');

// Check if manifest.json exists and is valid
try {
  const manifestPath = './manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✅ Manifest.json is valid');
  console.log(`   - Name: ${manifest.name}`);
  console.log(`   - Version: ${manifest.version}`);
  console.log(`   - Manifest Version: ${manifest.manifest_version}`);
} catch (error) {
  console.log('❌ Manifest.json is invalid:', error.message);
  process.exit(1);
}

// Check required files
const requiredFiles = [
  'src/popup/popup.html',
  'src/popup/popup.js',
  'src/options/options.html',
  'src/options/options.js',
  'src/background/background.js',
  'src/content/content.js'
];

console.log('\n📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// Check CSS files
console.log('\n🎨 Checking CSS files:');
const cssFiles = [
  'assets/css/modern-ui.css',
  'assets/css/popup.css',
  'assets/css/content.css',
  'assets/css/options.css',
  'assets/css/visualization.css'
];

cssFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    // Basic CSS validation
    const css = fs.readFileSync(file, 'utf8');
    if (css.includes('--primary-color') || css.includes('--bg-primary')) {
      console.log(`   📏 Uses CSS variables`);
    }
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// Check icon files
console.log('\n🖼️  Checking icon files:');
const iconSizes = [16, 32, 48, 128];
iconSizes.forEach(size => {
  const iconPath = `assets/icons/icon${size}.png`;
  if (fs.existsSync(iconPath)) {
    const stats = fs.statSync(iconPath);
    console.log(`✅ ${iconPath} (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log(`❌ ${iconPath} - Missing`);
  }
});

// Check for security issues
console.log('\n🔒 Security checks:');
try {
  const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
  
  if (manifest.content_security_policy) {
    console.log('✅ Content Security Policy defined');
  } else {
    console.log('⚠️  No Content Security Policy');
  }
  
  if (manifest.permissions && manifest.permissions.includes('notifications')) {
    console.log('✅ Notifications permission properly declared');
  }
  
  console.log(`✅ Using Manifest V${manifest.manifest_version}`);
} catch (error) {
  console.log('❌ Cannot validate security settings');
}

console.log('\n✨ Validation complete!');

// Additional functionality checks
console.log('\n🔧 Advanced checks:');

// Check for common issues in content script
try {
  const contentScript = fs.readFileSync('./src/content/content.js', 'utf8');
  if (contentScript.includes('TableExtractor') && contentScript.includes('class ContentScriptManager')) {
    console.log('✅ Content script structure looks good');
  }
  if (contentScript.includes('chrome.runtime.onMessage')) {
    console.log('✅ Message handling implemented');
  }
} catch (error) {
  console.log('⚠️  Could not validate content script');
}

// Check CSS variable consistency
try {
  const modernUi = fs.readFileSync('./assets/css/modern-ui.css', 'utf8');
  const popup = fs.readFileSync('./assets/css/popup.css', 'utf8');
  
  const modernUiVars = modernUi.match(/--[\w-]+:/g) || [];
  const popupVars = popup.match(/var\(--[\w-]+\)/g) || [];
  
  console.log(`✅ CSS variables defined: ${modernUiVars.length}`);
  console.log(`✅ CSS variables used: ${popupVars.length}`);
} catch (error) {
  console.log('⚠️  Could not validate CSS variables');
}

console.log('\n📝 To test the extension:');
console.log('   1. Open Chrome and go to chrome://extensions/');
console.log('   2. Enable "Developer mode"');
console.log('   3. Click "Load unpacked" and select this directory');
console.log('   4. Open test-page.html to test table detection');
console.log('   5. Click the extension icon to test the popup');

console.log('\n🚀 Quick test command:');
console.log('   python3 -m http.server 8000');
console.log('   Then visit: http://localhost:8000/test-page.html');