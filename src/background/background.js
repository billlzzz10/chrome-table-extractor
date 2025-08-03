// Background Script for Table Extractor AI Chrome Extension

// Import utilities as ES modules
import { PromptTemplateManager } from '../utils/promptTemplates.js';
import { AIService } from '../utils/aiService.js';
import { TableExtractor } from '../utils/tableExtractor.js';

class BackgroundService {
  constructor() {
    this.aiService = new AIService();
    this.promptManager = new PromptTemplateManager();
    this.init();
  }

  init() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Listen for tab updates to inject content scripts
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Set up context menus
    this.setupContextMenus();
  }

  async handleInstallation(details) {
    console.log('Extension installed:', details);
    
    // Initialize default settings
    await this.initializeDefaultSettings();
    
    // Default prompt templates are loaded automatically by PromptTemplateManager
    
    // Show welcome notification
    if (details.reason === 'install') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../assets/icons/icon48.png',
        title: 'Table Extractor AI',
        message: 'ส่วนขยายติดตั้งเรียบร้อยแล้ว! คลิกที่ไอคอนเพื่อเริ่มใช้งาน'
      });
    }
  }

  async initializeDefaultSettings() {
    const defaultSettings = {
      theme: 'light',
      defaultTableFormat: 'html',
      showRowNumbers: false,
      enableSorting: true,
      enableFloatingUI: true,
      defaultAiProvider: 'openai',
      autoDetectTables: true,
      enableAiSuggestions: true,
      saveHistory: true,
      maxRows: 1000
    };

    // Only set defaults if no settings exist
    const existingSettings = await this.getStorageData('sync');
    if (Object.keys(existingSettings).length === 0) {
      await chrome.storage.sync.set(defaultSettings);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'testAPI':
          const testResult = await this.testAPIConnection(request);
          sendResponse(testResult);
          break;

        case 'processTableData':
          const processResult = await this.processTableWithAI(request);
          sendResponse(processResult);
          break;

        case 'extractTableData':
          const extractResult = await this.extractTableData(request);
          sendResponse(extractResult);
          break;

        case 'getPromptTemplates':
          const templates = await this.promptManager.loadTemplates();
          sendResponse({ success: true, templates });
          break;

        case 'savePromptTemplate':
          await this.promptManager.saveTemplate(request.template);
          sendResponse({ success: true });
          break;

        case 'deletePromptTemplate':
          await this.promptManager.deleteTemplate(request.templateId);
          sendResponse({ success: true });
          break;

        case 'getSettings':
          const settings = await this.getStorageData('sync');
          sendResponse({ success: true, settings });
          break;

        case 'saveSettings':
          await chrome.storage.sync.set(request.settings);
          sendResponse({ success: true });
          break;

        case 'showFloatingUI':
          await this.showFloatingUI(sender.tab.id, request.data);
          sendResponse({ success: true });
          break;

        case 'hideFloatingUI':
          await this.hideFloatingUI(sender.tab.id);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async testAPIConnection(request) {
    const { provider, apiKey, model } = request;
    
    try {
      const result = await this.aiService.testConnection(provider, apiKey, { model });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processTableWithAI(request) {
    const { tableData, promptTemplate, provider, options } = request;
    
    try {
      const result = await this.aiService.processTableData(
        tableData, 
        promptTemplate, 
        provider, 
        options
      );
      
      // Save to history if enabled
      const settings = await this.getStorageData('sync');
      if (settings.saveHistory) {
        await this.saveToHistory({
          type: 'ai-processing',
          input: tableData,
          output: result,
          promptTemplate: promptTemplate,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractTableData(request) {
    const { source, options } = request;
    
    try {
      // This would be handled by content script in most cases
      // Background script mainly coordinates the process
      return {
        success: true,
        message: 'Table extraction initiated'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleTabUpdate(tabId, tab) {
    // Check if we should auto-detect tables
    const settings = await this.getStorageData('sync');
    
    if (settings.autoDetectTables && this.isValidUrl(tab.url)) {
      try {
        // Inject content script if not already injected
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: [
            'src/utils/tableExtractor.js',
            'src/utils/promptTemplates.js',
            'src/content/content.js'
          ]
        });

        // Inject CSS
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['assets/css/content.css']
        });
      } catch (error) {
        // Script might already be injected or tab might not be ready
        console.log('Content script injection skipped:', error.message);
      }
    }
  }

  isValidUrl(url) {
    if (!url) return false;
    
    const validProtocols = ['http:', 'https:'];
    const invalidPatterns = [
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'edge://',
      'about:'
    ];
    
    try {
      const urlObj = new URL(url);
      return validProtocols.includes(urlObj.protocol) && 
             !invalidPatterns.some(pattern => url.startsWith(pattern));
    } catch {
      return false;
    }
  }

  setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'extract-table',
        title: 'ดึงข้อมูลตาราง',
        contexts: ['selection', 'page']
      });

      chrome.contextMenus.create({
        id: 'process-with-ai',
        title: 'ประมวลผลด้วย AI',
        contexts: ['selection']
      });

      chrome.contextMenus.onClicked.addListener((info, tab) => {
        this.handleContextMenuClick(info, tab);
      });
    });
  }

  async handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'extract-table':
        await this.triggerTableExtraction(tab.id);
        break;
      case 'process-with-ai':
        await this.triggerAIProcessing(tab.id, info.selectionText);
        break;
    }
  }

  async triggerTableExtraction(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'extractTables'
      });
    } catch (error) {
      console.error('Failed to trigger table extraction:', error);
    }
  }

  async triggerAIProcessing(tabId, selectedText) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'processWithAI',
        data: selectedText
      });
    } catch (error) {
      console.error('Failed to trigger AI processing:', error);
    }
  }

  async showFloatingUI(tabId, data) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'showFloatingUI',
        data: data
      });
    } catch (error) {
      console.error('Failed to show floating UI:', error);
    }
  }

  async hideFloatingUI(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'hideFloatingUI'
      });
    } catch (error) {
      console.error('Failed to hide floating UI:', error);
    }
  }

  async saveToHistory(entry) {
    try {
      const result = await chrome.storage.local.get(['processingHistory']);
      const history = result.processingHistory || [];
      
      // Add new entry
      history.unshift(entry);
      
      // Keep only last 100 entries
      const trimmedHistory = history.slice(0, 100);
      
      await chrome.storage.local.set({ processingHistory: trimmedHistory });
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  }

  async getStorageData(storageType = 'sync') {
    return new Promise((resolve) => {
      chrome.storage[storageType].get(null, (result) => {
        resolve(result);
      });
    });
  }

  // Utility method for handling file uploads
  async processUploadedFile(file) {
    try {
      const tableExtractor = new TableExtractor();
      const extractedData = await tableExtractor.extractFromFile(file);
      
      return {
        success: true,
        data: extractedData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Method to handle external API connections (Notion, Airtable)
  async connectExternalAPI(provider, credentials) {
    try {
      // This would implement specific API connections
      // For now, return success
      return {
        success: true,
        message: `Connected to ${provider}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

