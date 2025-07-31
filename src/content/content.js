// Content Script for Table Extractor AI Chrome Extension

class ContentScriptManager {
  constructor() {
    this.tableExtractor = new TableExtractor();
    this.floatingUI = null;
    this.isFloatingUIVisible = false;
    this.extractedTables = [];
    this.currentTableData = null;
    this.init();
  }

  init() {
    // Listen for messages from background script and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Auto-detect tables when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.autoDetectTables();
      });
    } else {
      this.autoDetectTables();
    }

    // Set up observers for dynamic content
    this.setupObservers();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'extractTables':
          const tables = await this.extractTablesFromPage();
          sendResponse({ success: true, tables });
          break;

        case 'showFloatingUI':
          await this.showFloatingUI(request.data);
          sendResponse({ success: true });
          break;

        case 'hideFloatingUI':
          this.hideFloatingUI();
          sendResponse({ success: true });
          break;

        case 'processWithAI':
          await this.processSelectedDataWithAI(request.data);
          sendResponse({ success: true });
          break;

        case 'getPageTables':
          const pageTables = await this.getAvailableTables();
          sendResponse({ success: true, tables: pageTables });
          break;

        case 'selectTable':
          await this.selectAndHighlightTable(request.tableId);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async autoDetectTables() {
    try {
      const settings = await this.getSettings();
      if (!settings.autoDetectTables) return;

      const tables = await this.extractTablesFromPage();
      this.extractedTables = tables;

      if (tables.length > 0) {
        this.showTableDetectionNotification(tables.length);
      }
    } catch (error) {
      console.error('Auto table detection failed:', error);
    }
  }

  async extractTablesFromPage() {
    try {
      const tables = await this.tableExtractor.extractFromCurrentPage();
      
      // Add visual indicators to detected tables
      this.addTableIndicators(tables);
      
      return tables;
    } catch (error) {
      console.error('Table extraction failed:', error);
      return [];
    }
  }

  addTableIndicators(tables) {
    // Remove existing indicators
    document.querySelectorAll('.table-extractor-indicator').forEach(el => el.remove());

    tables.forEach((table, index) => {
      if (table.type === 'html-table') {
        const tableElement = document.querySelectorAll('table')[index];
        if (tableElement) {
          this.addIndicatorToElement(tableElement, table, index);
        }
      }
    });
  }

  addIndicatorToElement(element, tableData, index) {
    const indicator = document.createElement('div');
    indicator.className = 'table-extractor-indicator';
    indicator.innerHTML = `
      <div class="indicator-badge">
        <span class="indicator-icon">📊</span>
        <span class="indicator-text">ตาราง ${index + 1}</span>
        <button class="indicator-extract" data-table-index="${index}">ดึงข้อมูล</button>
      </div>
    `;

    // Position indicator
    const rect = element.getBoundingClientRect();
    indicator.style.cssText = `
      position: fixed;
      top: ${rect.top - 35}px;
      left: ${rect.left}px;
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      pointer-events: auto;
    `;

    // Add event listener
    const extractBtn = indicator.querySelector('.indicator-extract');
    extractBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectTable(index);
    });

    document.body.appendChild(indicator);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 5000);
  }

  async selectTable(tableIndex) {
    if (tableIndex >= 0 && tableIndex < this.extractedTables.length) {
      const table = this.extractedTables[tableIndex];
      this.currentTableData = table;
      
      // Show floating UI with table data
      await this.showFloatingUI({
        type: 'table-selected',
        table: table
      });

      // Highlight selected table
      this.highlightSelectedTable(tableIndex);
    }
  }

  highlightSelectedTable(tableIndex) {
    // Remove existing highlights
    document.querySelectorAll('.table-extractor-highlight').forEach(el => {
      el.classList.remove('table-extractor-highlight');
    });

    // Add highlight to selected table
    const tables = document.querySelectorAll('table');
    if (tables[tableIndex]) {
      tables[tableIndex].classList.add('table-extractor-highlight');
    }
  }

  async showFloatingUI(data) {
    if (this.floatingUI) {
      this.hideFloatingUI();
    }

    this.floatingUI = this.createFloatingUI(data);
    document.body.appendChild(this.floatingUI);
    this.isFloatingUIVisible = true;

    // Position near mouse or center
    this.positionFloatingUI();

    // Set up mouse following if enabled
    const settings = await this.getSettings();
    if (settings.enableFloatingUI && !this.floatingUI.classList.contains('pinned')) {
      this.setupMouseFollowing();
    }
  }

  createFloatingUI(data) {
    const ui = document.createElement('div');
    ui.className = 'table-extractor-floating-ui';
    ui.innerHTML = this.getFloatingUIContent(data);

    // Apply styles
    ui.style.cssText = `
      position: fixed;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 10001;
      max-width: 400px;
      max-height: 600px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 1px solid #e2e8f0;
      backdrop-filter: blur(10px);
    `;

    // Set up event listeners
    this.setupFloatingUIEvents(ui);

    return ui;
  }

  getFloatingUIContent(data) {
    switch (data.type) {
      case 'table-selected':
        return this.getTableSelectedContent(data.table);
      case 'ai-processing':
        return this.getAIProcessingContent(data);
      case 'ai-result':
        return this.getAIResultContent(data);
      default:
        return this.getDefaultContent();
    }
  }

  getTableSelectedContent(table) {
    const rowCount = table.data.length;
    const columnCount = table.data.length > 0 ? Object.keys(table.data[0]).length : 0;

    return `
      <div class="floating-ui-header">
        <div class="header-content">
          <h3>📊 ${table.name}</h3>
          <div class="header-actions">
            <button class="pin-btn" title="ปักหมุด">📌</button>
            <button class="close-btn" title="ปิด">✕</button>
          </div>
        </div>
      </div>
      <div class="floating-ui-body">
        <div class="table-info">
          <div class="info-item">
            <span class="info-label">แถว:</span>
            <span class="info-value">${rowCount}</span>
          </div>
          <div class="info-item">
            <span class="info-label">คอลัมน์:</span>
            <span class="info-value">${columnCount}</span>
          </div>
          <div class="info-item">
            <span class="info-label">ประเภท:</span>
            <span class="info-value">${this.getTableTypeLabel(table.type)}</span>
          </div>
        </div>
        
        <div class="action-section">
          <h4>🤖 ประมวลผลด้วย AI</h4>
          <div class="prompt-selector">
            <select id="prompt-template-select">
              <option value="">เลือกเทมเพลต...</option>
            </select>
            <button id="load-prompts-btn">โหลดเทมเพลต</button>
          </div>
          <div class="custom-prompt">
            <textarea id="custom-prompt" placeholder="หรือใส่คำสั่งที่ต้องการ..." rows="3"></textarea>
            <button id="process-btn" class="primary-btn">ประมวลผล</button>
          </div>
        </div>

        <div class="export-section">
          <h4>📤 ส่งออกข้อมูล</h4>
          <div class="export-buttons">
            <button id="export-csv">CSV</button>
            <button id="export-json">JSON</button>
            <button id="export-markdown">Markdown</button>
            <button id="copy-clipboard">คัดลอก</button>
          </div>
        </div>

        <div class="preview-section">
          <h4>👁️ ตัวอย่างข้อมูล</h4>
          <div class="table-preview">
            ${this.generateTablePreview(table.data)}
          </div>
        </div>
      </div>
    `;
  }

  getAIProcessingContent(data) {
    return `
      <div class="floating-ui-header">
        <div class="header-content">
          <h3>🤖 กำลังประมวลผล...</h3>
          <div class="header-actions">
            <button class="close-btn" title="ปิด">✕</button>
          </div>
        </div>
      </div>
      <div class="floating-ui-body">
        <div class="processing-indicator">
          <div class="spinner"></div>
          <p>AI กำลังวิเคราะห์ข้อมูลของคุณ...</p>
          <div class="thinking-process">
            <div class="thinking-step active">🔍 วิเคราะห์โครงสร้างข้อมูล</div>
            <div class="thinking-step">🧠 ประมวลผลตาม Prompt</div>
            <div class="thinking-step">✨ สร้างผลลัพธ์</div>
          </div>
        </div>
      </div>
    `;
  }

  getAIResultContent(data) {
    return `
      <div class="floating-ui-header">
        <div class="header-content">
          <h3>✨ ผลลัพธ์จาก AI</h3>
          <div class="header-actions">
            <button class="pin-btn" title="ปักหมุด">📌</button>
            <button class="close-btn" title="ปิด">✕</button>
          </div>
        </div>
      </div>
      <div class="floating-ui-body">
        <div class="result-content">
          <div class="result-meta">
            <span class="provider-badge">${data.provider}</span>
            <span class="timestamp">${new Date(data.timestamp).toLocaleString('th-TH')}</span>
          </div>
          <div class="result-text">
            ${this.formatAIResult(data.result)}
          </div>
          <div class="result-actions">
            <button id="copy-result">คัดลอกผลลัพธ์</button>
            <button id="save-result">บันทึก</button>
            <button id="process-again">ประมวลผลใหม่</button>
          </div>
        </div>
      </div>
    `;
  }

  getDefaultContent() {
    return `
      <div class="floating-ui-header">
        <div class="header-content">
          <h3>📊 Table Extractor AI</h3>
          <div class="header-actions">
            <button class="close-btn" title="ปิด">✕</button>
          </div>
        </div>
      </div>
      <div class="floating-ui-body">
        <p>เลือกตารางเพื่อเริ่มการประมวลผล</p>
        <button id="scan-tables">สแกนหาตาราง</button>
      </div>
    `;
  }

  setupFloatingUIEvents(ui) {
    // Close button
    const closeBtn = ui.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideFloatingUI());
    }

    // Pin button
    const pinBtn = ui.querySelector('.pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => this.togglePin());
    }

    // Load prompts
    const loadPromptsBtn = ui.querySelector('#load-prompts-btn');
    if (loadPromptsBtn) {
      loadPromptsBtn.addEventListener('click', () => this.loadPromptTemplates());
    }

    // Process button
    const processBtn = ui.querySelector('#process-btn');
    if (processBtn) {
      processBtn.addEventListener('click', () => this.processWithAI());
    }

    // Export buttons
    ['csv', 'json', 'markdown'].forEach(format => {
      const btn = ui.querySelector(`#export-${format}`);
      if (btn) {
        btn.addEventListener('click', () => this.exportData(format));
      }
    });

    // Copy button
    const copyBtn = ui.querySelector('#copy-clipboard');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    // Scan tables button
    const scanBtn = ui.querySelector('#scan-tables');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => this.autoDetectTables());
    }
  }

  generateTablePreview(data) {
    if (!data || data.length === 0) {
      return '<p>ไม่มีข้อมูล</p>';
    }

    const headers = Object.keys(data[0]);
    const previewRows = data.slice(0, 3); // Show first 3 rows

    let html = '<table class="preview-table"><thead><tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';

    previewRows.forEach(row => {
      html += '<tr>';
      headers.forEach(header => {
        const value = row[header] || '';
        const truncated = value.length > 20 ? value.substring(0, 20) + '...' : value;
        html += `<td>${truncated}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';

    if (data.length > 3) {
      html += `<p class="preview-note">แสดง 3 จาก ${data.length} แถว</p>`;
    }

    return html;
  }

  getTableTypeLabel(type) {
    const labels = {
      'html-table': 'ตาราง HTML',
      'notion-database': 'Notion Database',
      'airtable-base': 'Airtable Base',
      'grid-view': 'Grid View',
      'list-view': 'List View',
      'csv-file': 'ไฟล์ CSV',
      'json-data': 'ข้อมูล JSON'
    };
    return labels[type] || type;
  }

  positionFloatingUI() {
    if (!this.floatingUI) return;

    const rect = this.floatingUI.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position in center initially
    let left = (viewportWidth - rect.width) / 2;
    let top = (viewportHeight - rect.height) / 2;

    // Ensure it's within viewport
    left = Math.max(20, Math.min(left, viewportWidth - rect.width - 20));
    top = Math.max(20, Math.min(top, viewportHeight - rect.height - 20));

    this.floatingUI.style.left = left + 'px';
    this.floatingUI.style.top = top + 'px';
  }

  setupMouseFollowing() {
    if (this.floatingUI && !this.floatingUI.classList.contains('pinned')) {
      let mouseX = 0, mouseY = 0;
      let uiX = 0, uiY = 0;
      let isFollowing = true;

      const followMouse = (e) => {
        if (!isFollowing || !this.floatingUI) return;

        mouseX = e.clientX;
        mouseY = e.clientY;

        // Offset to avoid covering cursor
        const offsetX = 20;
        const offsetY = 20;

        uiX = mouseX + offsetX;
        uiY = mouseY + offsetY;

        // Keep within viewport
        const rect = this.floatingUI.getBoundingClientRect();
        if (uiX + rect.width > window.innerWidth) {
          uiX = mouseX - rect.width - offsetX;
        }
        if (uiY + rect.height > window.innerHeight) {
          uiY = mouseY - rect.height - offsetY;
        }

        this.floatingUI.style.left = Math.max(0, uiX) + 'px';
        this.floatingUI.style.top = Math.max(0, uiY) + 'px';
      };

      // Pause following when hovering over UI
      this.floatingUI.addEventListener('mouseenter', () => {
        isFollowing = false;
      });

      this.floatingUI.addEventListener('mouseleave', () => {
        isFollowing = true;
      });

      document.addEventListener('mousemove', followMouse);

      // Store reference to remove later
      this.mouseFollowHandler = followMouse;
    }
  }

  togglePin() {
    if (!this.floatingUI) return;

    const pinBtn = this.floatingUI.querySelector('.pin-btn');
    
    if (this.floatingUI.classList.contains('pinned')) {
      // Unpin
      this.floatingUI.classList.remove('pinned');
      pinBtn.textContent = '📌';
      pinBtn.title = 'ปักหมุด';
      this.setupMouseFollowing();
    } else {
      // Pin
      this.floatingUI.classList.add('pinned');
      pinBtn.textContent = '📍';
      pinBtn.title = 'ยกเลิกปักหมุด';
      if (this.mouseFollowHandler) {
        document.removeEventListener('mousemove', this.mouseFollowHandler);
      }
    }
  }

  hideFloatingUI() {
    if (this.floatingUI) {
      if (this.mouseFollowHandler) {
        document.removeEventListener('mousemove', this.mouseFollowHandler);
      }
      this.floatingUI.remove();
      this.floatingUI = null;
      this.isFloatingUIVisible = false;
    }
  }

  async loadPromptTemplates() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getPromptTemplates'
      });

      if (response.success) {
        const select = this.floatingUI.querySelector('#prompt-template-select');
        if (select) {
          select.innerHTML = '<option value="">เลือกเทมเพลต...</option>';
          response.templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.icon || '🤖'} ${template.name}`;
            select.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load prompt templates:', error);
    }
  }

  async processWithAI() {
    if (!this.currentTableData) {
      alert('กรุณาเลือกตารางก่อน');
      return;
    }

    const select = this.floatingUI.querySelector('#prompt-template-select');
    const customPrompt = this.floatingUI.querySelector('#custom-prompt');
    
    let promptTemplate = null;
    let customPromptText = customPrompt.value.trim();

    if (select.value) {
      // Get template from background
      const response = await chrome.runtime.sendMessage({
        action: 'getPromptTemplates'
      });
      
      if (response.success) {
        promptTemplate = response.templates.find(t => t.id === select.value);
      }
    } else if (customPromptText) {
      // Create temporary template from custom prompt
      promptTemplate = {
        id: 'custom',
        name: 'คำสั่งกำหนดเอง',
        prompt: customPromptText
      };
    } else {
      alert('กรุณาเลือกเทมเพลตหรือใส่คำสั่งกำหนดเอง');
      return;
    }

    // Show processing UI
    this.showFloatingUI({
      type: 'ai-processing'
    });

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'processTableData',
        tableData: this.currentTableData.data,
        promptTemplate: promptTemplate,
        provider: 'openai' // Default provider
      });

      if (result.success) {
        // Show result
        this.showFloatingUI({
          type: 'ai-result',
          ...result
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert(`การประมวลผลล้มเหลว: ${error.message}`);
      this.hideFloatingUI();
    }
  }

  formatAIResult(result) {
    if (typeof result === 'string') {
      // Convert markdown-like formatting to HTML
      return result
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }
    return JSON.stringify(result, null, 2);
  }

  async exportData(format) {
    if (!this.currentTableData) return;

    const data = this.currentTableData.data;
    let content = '';
    let filename = `table-data.${format}`;
    let mimeType = 'text/plain';

    switch (format) {
      case 'csv':
        content = this.convertToCSV(data);
        mimeType = 'text/csv';
        break;
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        break;
      case 'markdown':
        content = this.convertToMarkdown(data);
        mimeType = 'text/markdown';
        break;
    }

    this.downloadFile(content, filename, mimeType);
  }

  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  convertToMarkdown(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    let markdown = '| ' + headers.join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    data.forEach(row => {
      const values = headers.map(header => row[header] || '');
      markdown += '| ' + values.join(' | ') + ' |\n';
    });

    return markdown;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async copyToClipboard() {
    if (!this.currentTableData) return;

    try {
      const text = this.convertToMarkdown(this.currentTableData.data);
      await navigator.clipboard.writeText(text);
      
      // Show feedback
      const btn = this.floatingUI.querySelector('#copy-clipboard');
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ คัดลอกแล้ว';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  setupObservers() {
    // Observe DOM changes for dynamic content
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'TABLE' || node.querySelector('table')) {
                shouldRecheck = true;
              }
            }
          });
        }
      });

      if (shouldRecheck) {
        // Debounce the recheck
        clearTimeout(this.recheckTimeout);
        this.recheckTimeout = setTimeout(() => {
          this.autoDetectTables();
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + E: Extract tables
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.autoDetectTables();
      }

      // Escape: Hide floating UI
      if (e.key === 'Escape' && this.isFloatingUIVisible) {
        e.preventDefault();
        this.hideFloatingUI();
      }
    });
  }

  showTableDetectionNotification(count) {
    const notification = document.createElement('div');
    notification.className = 'table-detection-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">📊</span>
        <span class="notification-text">พบตาราง ${count} ตาราง</span>
        <button class="notification-action">ดูรายละเอียด</button>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      padding: 12px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-left: 4px solid #667eea;
    `;

    const actionBtn = notification.querySelector('.notification-action');
    actionBtn.addEventListener('click', () => {
      this.showFloatingUI({ type: 'default' });
      notification.remove();
    });

    document.body.appendChild(notification);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  async getSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSettings'
      });
      return response.success ? response.settings : {};
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  async getAvailableTables() {
    return this.extractedTables;
  }

  async selectAndHighlightTable(tableId) {
    const tableIndex = this.extractedTables.findIndex(t => t.id === tableId);
    if (tableIndex !== -1) {
      await this.selectTable(tableIndex);
    }
  }

  async processSelectedDataWithAI(selectedText) {
    // Process selected text as if it's table data
    const fakeTableData = [{ content: selectedText }];
    
    this.currentTableData = {
      id: 'selected-text',
      name: 'ข้อความที่เลือก',
      type: 'selected-text',
      data: fakeTableData
    };

    await this.showFloatingUI({
      type: 'table-selected',
      table: this.currentTableData
    });
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScriptManager();
  });
} else {
  new ContentScriptManager();
}

