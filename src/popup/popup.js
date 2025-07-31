// Popup Script for Table Extractor AI Chrome Extension

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.extractedTables = [];
    this.promptTemplates = [];
    this.selectedTableData = null;
    this.init();
  }

  async init() {
    // Get current tab
    this.currentTab = await this.getCurrentTab();
    
    // Load initial data
    await this.loadPromptTemplates();
    await this.loadSettings();
    await this.loadExtractedTables();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize UI
    this.initializeUI();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Extract tables button
    const extractBtn = document.getElementById('extract-tables-btn');
    if (extractBtn) {
      extractBtn.addEventListener('click', () => this.extractTables());
    }

    // Scan current page button
    const scanBtn = document.getElementById('scan-page-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => this.scanCurrentPage());
    }

    // File upload
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.executeQuickAction(action);
      });
    });

    // Prompt template selection
    const promptSelect = document.getElementById('prompt-template-select');
    if (promptSelect) {
      promptSelect.addEventListener('change', (e) => {
        this.selectPromptTemplate(e.target.value);
      });
    }

    // Custom prompt processing
    const processBtn = document.getElementById('process-custom-btn');
    if (processBtn) {
      processBtn.addEventListener('click', () => this.processCustomPrompt());
    }

    // Settings toggle
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }

    // Floating UI toggle
    const floatingToggle = document.getElementById('floating-ui-toggle');
    if (floatingToggle) {
      floatingToggle.addEventListener('change', (e) => {
        this.toggleFloatingUI(e.target.checked);
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load tab-specific data
    this.loadTabData(tabName);
  }

  async loadTabData(tabName) {
    switch (tabName) {
      case 'extract':
        await this.refreshTablesList();
        break;
      case 'process':
        await this.loadPromptTemplates();
        break;
      case 'history':
        await this.loadProcessingHistory();
        break;
    }
  }

  async extractTables() {
    try {
      this.showLoading('กำลังดึงข้อมูลตาราง...');

      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractTables'
      });

      if (response.success) {
        this.extractedTables = response.tables;
        this.displayExtractedTables(response.tables);
        this.showSuccess(`พบตาราง ${response.tables.length} ตาราง`);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showError(`การดึงข้อมูลล้มเหลว: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  async scanCurrentPage() {
    try {
      this.showLoading('กำลังสแกนหน้าเว็บ...');

      // Inject content script if needed
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: [
          'src/utils/tableExtractor.js',
          'src/content/content.js'
        ]
      });

      // Wait a moment for injection
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractTables'
      });

      if (response.success) {
        this.extractedTables = response.tables;
        this.displayExtractedTables(response.tables);
        
        if (response.tables.length > 0) {
          this.showSuccess(`พบตาราง ${response.tables.length} ตาราง`);
          this.switchTab('extract');
        } else {
          this.showInfo('ไม่พบตารางในหน้านี้');
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showError(`การสแกนล้มเหลว: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  displayExtractedTables(tables) {
    const container = document.getElementById('tables-list');
    if (!container) return;

    if (tables.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>ไม่พบตาราง</h3>
          <p>ลองสแกนหน้าเว็บหรืออัปโหลดไฟล์</p>
          <button id="scan-again-btn" class="btn btn-primary">สแกนอีกครั้ง</button>
        </div>
      `;
      
      document.getElementById('scan-again-btn').addEventListener('click', () => {
        this.scanCurrentPage();
      });
      return;
    }

    const tablesHTML = tables.map((table, index) => `
      <div class="table-item" data-table-index="${index}">
        <div class="table-header">
          <div class="table-info">
            <h4 class="table-name">${table.name}</h4>
            <div class="table-meta">
              <span class="table-type">${this.getTableTypeLabel(table.type)}</span>
              <span class="table-size">${table.data.length} แถว</span>
              <span class="table-columns">${table.data.length > 0 ? Object.keys(table.data[0]).length : 0} คอลัมน์</span>
            </div>
          </div>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline select-table-btn" data-table-index="${index}">
              เลือก
            </button>
            <button class="btn btn-sm btn-outline preview-table-btn" data-table-index="${index}">
              ดูตัวอย่าง
            </button>
          </div>
        </div>
        <div class="table-preview" id="preview-${index}" style="display: none;">
          ${this.generateTablePreview(table.data)}
        </div>
      </div>
    `).join('');

    container.innerHTML = tablesHTML;

    // Add event listeners
    container.querySelectorAll('.select-table-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.tableIndex);
        this.selectTable(index);
      });
    });

    container.querySelectorAll('.preview-table-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.tableIndex);
        this.toggleTablePreview(index);
      });
    });
  }

  generateTablePreview(data) {
    if (!data || data.length === 0) {
      return '<p class="no-data">ไม่มีข้อมูล</p>';
    }

    const headers = Object.keys(data[0]);
    const previewRows = data.slice(0, 3);

    let html = '<div class="table-preview-container"><table class="preview-table"><thead><tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';

    previewRows.forEach(row => {
      html += '<tr>';
      headers.forEach(header => {
        const value = row[header] || '';
        const truncated = value.length > 30 ? value.substring(0, 30) + '...' : value;
        html += `<td>${truncated}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';

    if (data.length > 3) {
      html += `<p class="preview-note">แสดง 3 จาก ${data.length} แถว</p>`;
    }

    html += '</div>';
    return html;
  }

  toggleTablePreview(index) {
    const preview = document.getElementById(`preview-${index}`);
    const btn = document.querySelector(`[data-table-index="${index}"].preview-table-btn`);
    
    if (preview.style.display === 'none') {
      preview.style.display = 'block';
      btn.textContent = 'ซ่อน';
    } else {
      preview.style.display = 'none';
      btn.textContent = 'ดูตัวอย่าง';
    }
  }

  selectTable(index) {
    if (index >= 0 && index < this.extractedTables.length) {
      this.selectedTableData = this.extractedTables[index];
      
      // Update UI to show selected table
      document.querySelectorAll('.table-item').forEach(item => {
        item.classList.remove('selected');
      });
      document.querySelector(`[data-table-index="${index}"].table-item`).classList.add('selected');
      
      // Switch to process tab
      this.switchTab('process');
      
      // Update process tab with selected table info
      this.updateProcessTab();
      
      this.showSuccess(`เลือกตาราง: ${this.selectedTableData.name}`);
    }
  }

  updateProcessTab() {
    if (!this.selectedTableData) return;

    const selectedInfo = document.getElementById('selected-table-info');
    if (selectedInfo) {
      selectedInfo.innerHTML = `
        <div class="selected-table-card">
          <div class="card-header">
            <h4>📊 ${this.selectedTableData.name}</h4>
            <span class="table-type-badge">${this.getTableTypeLabel(this.selectedTableData.type)}</span>
          </div>
          <div class="card-body">
            <div class="table-stats">
              <div class="stat-item">
                <span class="stat-label">แถว:</span>
                <span class="stat-value">${this.selectedTableData.data.length}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">คอลัมน์:</span>
                <span class="stat-value">${this.selectedTableData.data.length > 0 ? Object.keys(this.selectedTableData.data[0]).length : 0}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Enable process controls
    const processControls = document.getElementById('process-controls');
    if (processControls) {
      processControls.style.display = 'block';
    }
  }

  async loadPromptTemplates() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getPromptTemplates'
      });

      if (response.success) {
        this.promptTemplates = response.templates;
        this.displayPromptTemplates(response.templates);
      }
    } catch (error) {
      console.error('Failed to load prompt templates:', error);
    }
  }

  displayPromptTemplates(templates) {
    const select = document.getElementById('prompt-template-select');
    if (!select) return;

    select.innerHTML = '<option value="">เลือกเทมเพลต...</option>';
    
    // Group templates by category
    const grouped = {};
    templates.forEach(template => {
      const category = template.category || 'อื่นๆ';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    });

    // Add grouped options
    Object.keys(grouped).forEach(category => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      
      grouped[category].forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = `${template.icon || '🤖'} ${template.name}`;
        optgroup.appendChild(option);
      });
      
      select.appendChild(optgroup);
    });

    // Update quick actions
    this.updateQuickActions(templates);
  }

  updateQuickActions(templates) {
    const container = document.getElementById('quick-actions');
    if (!container) return;

    // Show most used templates as quick actions
    const quickTemplates = templates
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 6);

    const actionsHTML = quickTemplates.map(template => `
      <button class="quick-action-btn" data-action="prompt" data-template-id="${template.id}">
        <span class="action-icon">${template.icon || '🤖'}</span>
        <span class="action-label">${template.name}</span>
      </button>
    `).join('');

    container.innerHTML = actionsHTML;

    // Add event listeners
    container.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = e.currentTarget.dataset.templateId;
        if (templateId) {
          this.executePromptTemplate(templateId);
        }
      });
    });
  }

  async executeQuickAction(action) {
    if (!this.selectedTableData) {
      this.showError('กรุณาเลือกตารางก่อน');
      return;
    }

    switch (action) {
      case 'summarize':
        await this.executePromptTemplate('summarize');
        break;
      case 'analyze':
        await this.executePromptTemplate('analyze');
        break;
      case 'export-csv':
        this.exportData('csv');
        break;
      case 'export-json':
        this.exportData('json');
        break;
      case 'show-floating':
        await this.showFloatingUI();
        break;
    }
  }

  async executePromptTemplate(templateId) {
    if (!this.selectedTableData) {
      this.showError('กรุณาเลือกตารางก่อน');
      return;
    }

    const template = this.promptTemplates.find(t => t.id === templateId);
    if (!template) {
      this.showError('ไม่พบเทมเพลตที่เลือก');
      return;
    }

    try {
      this.showLoading(`กำลังประมวลผลด้วย ${template.name}...`);

      const response = await chrome.runtime.sendMessage({
        action: 'processTableData',
        tableData: this.selectedTableData.data,
        promptTemplate: template,
        provider: 'openai' // Default provider
      });

      if (response.success) {
        this.displayAIResult(response.result, template);
        this.switchTab('history'); // Switch to show result
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showError(`การประมวลผลล้มเหลว: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  async processCustomPrompt() {
    if (!this.selectedTableData) {
      this.showError('กรุณาเลือกตารางก่อน');
      return;
    }

    const customPrompt = document.getElementById('custom-prompt-input');
    if (!customPrompt || !customPrompt.value.trim()) {
      this.showError('กรุณาใส่คำสั่งที่ต้องการ');
      return;
    }

    const template = {
      id: 'custom',
      name: 'คำสั่งกำหนดเอง',
      prompt: customPrompt.value.trim()
    };

    try {
      this.showLoading('กำลังประมวลผลด้วย AI...');

      const response = await chrome.runtime.sendMessage({
        action: 'processTableData',
        tableData: this.selectedTableData.data,
        promptTemplate: template,
        provider: 'openai'
      });

      if (response.success) {
        this.displayAIResult(response.result, template);
        customPrompt.value = ''; // Clear input
        this.switchTab('history');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showError(`การประมวลผลล้มเหลว: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  displayAIResult(result, template) {
    const container = document.getElementById('ai-results');
    if (!container) return;

    const resultHTML = `
      <div class="ai-result-item">
        <div class="result-header">
          <div class="result-info">
            <h4>${template.icon || '🤖'} ${template.name}</h4>
            <span class="result-time">${new Date().toLocaleString('th-TH')}</span>
          </div>
          <div class="result-actions">
            <button class="btn btn-sm btn-outline copy-result-btn">คัดลอก</button>
            <button class="btn btn-sm btn-outline save-result-btn">บันทึก</button>
          </div>
        </div>
        <div class="result-content">
          ${this.formatAIResult(result)}
        </div>
      </div>
    `;

    container.insertAdjacentHTML('afterbegin', resultHTML);

    // Add event listeners for new result
    const newResult = container.firstElementChild;
    newResult.querySelector('.copy-result-btn').addEventListener('click', () => {
      this.copyResultToClipboard(result);
    });
    
    newResult.querySelector('.save-result-btn').addEventListener('click', () => {
      this.saveResult(result, template);
    });
  }

  formatAIResult(result) {
    if (typeof result === 'string') {
      return result
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }
    return `<pre>${JSON.stringify(result, null, 2)}</pre>`;
  }

  async copyResultToClipboard(result) {
    try {
      await navigator.clipboard.writeText(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
      this.showSuccess('คัดลอกผลลัพธ์แล้ว');
    } catch (error) {
      this.showError('ไม่สามารถคัดลอกได้');
    }
  }

  saveResult(result, template) {
    const blob = new Blob([typeof result === 'string' ? result : JSON.stringify(result, null, 2)], {
      type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-result-${template.name}-${Date.now()}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showSuccess('บันทึกผลลัพธ์แล้ว');
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.showLoading('กำลังประมวลผลไฟล์...');

      const response = await chrome.runtime.sendMessage({
        action: 'processUploadedFile',
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          content: await this.readFileAsText(file)
        }
      });

      if (response.success) {
        this.extractedTables = response.data;
        this.displayExtractedTables(response.data);
        this.switchTab('extract');
        this.showSuccess(`ประมวลผลไฟล์เสร็จสิ้น พบตาราง ${response.data.length} ตาราง`);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showError(`การประมวลผลไฟล์ล้มเหลว: ${error.message}`);
    } finally {
      this.hideLoading();
      event.target.value = ''; // Reset file input
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  exportData(format) {
    if (!this.selectedTableData) {
      this.showError('กรุณาเลือกตารางก่อน');
      return;
    }

    const data = this.selectedTableData.data;
    let content = '';
    let filename = `${this.selectedTableData.name}.${format}`;
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
    this.showSuccess(`ส่งออกเป็น ${format.toUpperCase()} เรียบร้อย`);
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
    a.click();
    
    URL.revokeObjectURL(url);
  }

  async showFloatingUI() {
    if (!this.selectedTableData) {
      this.showError('กรุณาเลือกตารางก่อน');
      return;
    }

    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'showFloatingUI',
        data: {
          type: 'table-selected',
          table: this.selectedTableData
        }
      });
      
      // Close popup
      window.close();
    } catch (error) {
      this.showError('ไม่สามารถแสดง Floating UI ได้');
    }
  }

  async toggleFloatingUI(enabled) {
    try {
      await chrome.storage.sync.set({ enableFloatingUI: enabled });
      
      if (enabled) {
        this.showSuccess('เปิดใช้งาน Floating UI แล้ว');
      } else {
        this.showSuccess('ปิดใช้งาน Floating UI แล้ว');
        // Hide floating UI if it's currently shown
        await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'hideFloatingUI'
        });
      }
    } catch (error) {
      console.error('Failed to toggle floating UI:', error);
    }
  }

  async toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.body.setAttribute('data-theme', newTheme);
    
    try {
      await chrome.storage.sync.set({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSettings'
      });

      if (response.success) {
        const settings = response.settings;
        
        // Apply theme
        if (settings.theme) {
          document.body.setAttribute('data-theme', settings.theme);
        }
        
        // Update floating UI toggle
        const floatingToggle = document.getElementById('floating-ui-toggle');
        if (floatingToggle) {
          floatingToggle.checked = settings.enableFloatingUI !== false;
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadProcessingHistory() {
    try {
      const result = await chrome.storage.local.get(['processingHistory']);
      const history = result.processingHistory || [];
      
      this.displayProcessingHistory(history);
    } catch (error) {
      console.error('Failed to load processing history:', error);
    }
  }

  displayProcessingHistory(history) {
    const container = document.getElementById('processing-history');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>ไม่มีประวัติการประมวลผล</h3>
          <p>ประมวลผลข้อมูลด้วย AI เพื่อดูประวัติ</p>
        </div>
      `;
      return;
    }

    const historyHTML = history.map((entry, index) => `
      <div class="history-item">
        <div class="history-header">
          <div class="history-info">
            <h4>${entry.promptTemplate?.name || 'การประมวลผล'}</h4>
            <span class="history-time">${new Date(entry.timestamp).toLocaleString('th-TH')}</span>
          </div>
          <div class="history-actions">
            <button class="btn btn-sm btn-outline view-history-btn" data-index="${index}">
              ดูรายละเอียด
            </button>
          </div>
        </div>
        <div class="history-preview">
          ${this.formatAIResult(entry.output?.result || entry.output).substring(0, 100)}...
        </div>
      </div>
    `).join('');

    container.innerHTML = historyHTML;

    // Add event listeners
    container.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.viewHistoryDetails(history[index]);
      });
    });
  }

  viewHistoryDetails(entry) {
    // Create modal or expand view for history details
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>รายละเอียดการประมวลผล</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="history-detail">
            <h4>เทมเพลต: ${entry.promptTemplate?.name || 'ไม่ระบุ'}</h4>
            <p><strong>เวลา:</strong> ${new Date(entry.timestamp).toLocaleString('th-TH')}</p>
            <div class="result-content">
              <h5>ผลลัพธ์:</h5>
              ${this.formatAIResult(entry.output?.result || entry.output)}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline copy-history-btn">คัดลอก</button>
          <button class="btn btn-primary close-modal-btn">ปิด</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.close-modal-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.copy-history-btn').addEventListener('click', () => {
      this.copyResultToClipboard(entry.output?.result || entry.output);
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async refreshTablesList() {
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getPageTables'
      });

      if (response.success) {
        this.extractedTables = response.tables;
        this.displayExtractedTables(response.tables);
      }
    } catch (error) {
      // Content script might not be injected yet
      console.log('Content script not ready, will inject on scan');
    }
  }

  initializeUI() {
    // Set initial tab
    this.switchTab('extract');
    
    // Update page info
    const pageInfo = document.getElementById('current-page-info');
    if (pageInfo && this.currentTab) {
      pageInfo.innerHTML = `
        <div class="page-info">
          <div class="page-title">${this.currentTab.title}</div>
          <div class="page-url">${new URL(this.currentTab.url).hostname}</div>
        </div>
      `;
    }
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

  showLoading(message) {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
      loader.textContent = message;
      loader.style.display = 'block';
    }
  }

  hideLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showInfo(message) {
    this.showNotification(message, 'info');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

