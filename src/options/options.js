// Options Page JavaScript
class OptionsManager {
  constructor() {
    this.promptManager = new PromptTemplateManager();
    this.currentEditingPrompt = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSettings();
    this.loadPromptTemplates();
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // API testing buttons
    document.getElementById('test-openai').addEventListener('click', () => this.testAPI('openai'));
    document.getElementById('test-claude').addEventListener('click', () => this.testAPI('claude'));
    document.getElementById('test-google').addEventListener('click', () => this.testAPI('google'));
    document.getElementById('test-notion').addEventListener('click', () => this.testAPI('notion'));
    document.getElementById('test-airtable').addEventListener('click', () => this.testAPI('airtable'));

    // Settings buttons
    document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());
    document.getElementById('clear-all-data').addEventListener('click', () => this.clearAllData());

    // Prompt management
    document.getElementById('create-prompt').addEventListener('click', () => this.openPromptModal());
    document.getElementById('import-prompts').addEventListener('click', () => this.importPrompts());
    document.getElementById('export-prompts').addEventListener('click', () => this.exportPrompts());
    document.getElementById('prompt-search').addEventListener('input', (e) => this.searchPrompts(e.target.value));

    // Category filters
    document.querySelectorAll('.category-filter').forEach(filter => {
      filter.addEventListener('click', (e) => {
        this.filterPromptsByCategory(e.target.dataset.category);
      });
    });

    // Modal events
    document.querySelector('.modal-close').addEventListener('click', () => this.closePromptModal());
    document.getElementById('cancel-prompt').addEventListener('click', () => this.closePromptModal());
    document.getElementById('save-prompt').addEventListener('click', () => this.savePromptTemplate());

    // File import
    document.getElementById('import-file-input').addEventListener('change', (e) => this.handleFileImport(e));

    // Close modal when clicking outside
    document.getElementById('prompt-modal').addEventListener('click', (e) => {
      if (e.target.id === 'prompt-modal') {
        this.closePromptModal();
      }
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load specific tab data
    if (tabName === 'prompts') {
      this.loadPromptTemplates();
    }
  }

  async testAPI(provider) {
    const statusElement = document.getElementById(`${provider}-status`);
    const button = document.getElementById(`test-${provider}`);
    
    statusElement.className = 'status-indicator loading';
    button.disabled = true;
    button.textContent = 'กำลังทดสอบ...';

    try {
      let apiKey;
      switch (provider) {
        case 'openai':
          apiKey = document.getElementById('openai-key').value;
          break;
        case 'claude':
          apiKey = document.getElementById('claude-key').value;
          break;
        case 'google':
          apiKey = document.getElementById('google-key').value;
          break;
        case 'notion':
          apiKey = document.getElementById('notion-token').value;
          break;
        case 'airtable':
          apiKey = document.getElementById('airtable-key').value;
          break;
      }

      if (!apiKey) {
        throw new Error('กรุณาใส่ API Key');
      }

      // Send test request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'testAPI',
        provider: provider,
        apiKey: apiKey
      });

      if (response.success) {
        statusElement.className = 'status-indicator success';
        this.showNotification('การเชื่อมต่อสำเร็จ!', 'success');
      } else {
        throw new Error(response.error || 'การเชื่อมต่อล้มเหลว');
      }
    } catch (error) {
      statusElement.className = 'status-indicator error';
      this.showNotification(`การทดสอบล้มเหลว: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'ทดสอบ';
    }
  }

  async loadSettings() {
    const settings = await this.getStoredSettings();
    
    // Load API keys
    document.getElementById('openai-key').value = settings.openaiKey || '';
    document.getElementById('claude-key').value = settings.claudeKey || '';
    document.getElementById('google-key').value = settings.googleKey || '';
    document.getElementById('notion-token').value = settings.notionToken || '';
    document.getElementById('airtable-key').value = settings.airtableKey || '';

    // Load display settings
    document.querySelector(`input[name="theme"][value="${settings.theme || 'light'}"]`).checked = true;
    document.getElementById('default-table-format').value = settings.defaultTableFormat || 'html';
    document.getElementById('show-row-numbers').checked = settings.showRowNumbers || false;
    document.getElementById('enable-sorting').checked = settings.enableSorting || false;
    document.getElementById('enable-floating-ui').checked = settings.enableFloatingUI !== false;
  }

  async saveSettings() {
    const settings = {
      openaiKey: document.getElementById('openai-key').value,
      claudeKey: document.getElementById('claude-key').value,
      googleKey: document.getElementById('google-key').value,
      notionToken: document.getElementById('notion-token').value,
      airtableKey: document.getElementById('airtable-key').value,
      theme: document.querySelector('input[name="theme"]:checked').value,
      defaultTableFormat: document.getElementById('default-table-format').value,
      showRowNumbers: document.getElementById('show-row-numbers').checked,
      enableSorting: document.getElementById('enable-sorting').checked,
      enableFloatingUI: document.getElementById('enable-floating-ui').checked
    };

    await this.storeSettings(settings);
    this.showNotification('บันทึกการตั้งค่าเรียบร้อย!', 'success');
  }

  async resetSettings() {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดหรือไม่?')) {
      await chrome.storage.sync.clear();
      location.reload();
    }
  }

  async clearAllData() {
    if (confirm('คุณต้องการลบข้อมูลทั้งหมดหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้!')) {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      this.showNotification('ลบข้อมูลทั้งหมดเรียบร้อย!', 'success');
      setTimeout(() => location.reload(), 1000);
    }
  }

  async loadPromptTemplates() {
    const templates = await this.promptManager.loadTemplates();
    this.renderPromptTemplates(templates);
  }

  renderPromptTemplates(templates) {
    const container = document.getElementById('prompt-list');
    container.innerHTML = '';

    if (templates.length === 0) {
      container.innerHTML = '<div class="empty-state">ไม่พบเทมเพลต Prompt</div>';
      return;
    }

    templates.forEach(template => {
      const item = this.createPromptItem(template);
      container.appendChild(item);
    });
  }

  createPromptItem(template) {
    const item = document.createElement('div');
    item.className = `prompt-item ${this.promptManager.isDefaultTemplate(template.id) ? 'default' : ''}`;
    
    item.innerHTML = `
      <div class="prompt-header">
        <span class="prompt-icon">${template.icon || '🤖'}</span>
        <span class="prompt-name">${template.name}</span>
        <div class="prompt-actions">
          ${!this.promptManager.isDefaultTemplate(template.id) ? 
            '<button class="prompt-action edit-prompt" title="แก้ไข">✏️</button>' +
            '<button class="prompt-action delete-prompt" title="ลบ">🗑️</button>' : 
            '<span class="prompt-action" title="เทมเพลตเริ่มต้น">🔒</span>'
          }
        </div>
      </div>
      <div class="prompt-description">${template.description}</div>
      <div class="prompt-meta">
        <span class="prompt-category">${this.getCategoryName(template.category)}</span>
        <span class="prompt-usage">ใช้งาน: ${template.usage || 0} ครั้ง</span>
      </div>
    `;

    // Add event listeners
    if (!this.promptManager.isDefaultTemplate(template.id)) {
      const editBtn = item.querySelector('.edit-prompt');
      const deleteBtn = item.querySelector('.delete-prompt');
      
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.editPromptTemplate(template);
        });
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deletePromptTemplate(template.id);
        });
      }
    }

    return item;
  }

  getCategoryName(category) {
    const categoryNames = {
      basic: 'พื้นฐาน',
      creative: 'สร้างสรรค์',
      analysis: 'วิเคราะห์',
      enhancement: 'ปรับปรุง',
      format: 'จัดรูปแบบ',
      visual: 'ภาพ',
      custom: 'กำหนดเอง'
    };
    return categoryNames[category] || category;
  }

  async searchPrompts(query) {
    if (!query.trim()) {
      await this.loadPromptTemplates();
      return;
    }

    const templates = await this.promptManager.searchTemplates(query);
    this.renderPromptTemplates(templates);
  }

  async filterPromptsByCategory(category) {
    // Update active filter
    document.querySelectorAll('.category-filter').forEach(filter => {
      filter.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    // Load filtered templates
    let templates;
    if (category === 'all') {
      templates = await this.promptManager.loadTemplates();
    } else {
      templates = await this.promptManager.getTemplatesByCategory(category);
    }
    
    this.renderPromptTemplates(templates);
  }

  openPromptModal(template = null) {
    this.currentEditingPrompt = template;
    const modal = document.getElementById('prompt-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('prompt-form');
    
    if (template) {
      title.textContent = 'แก้ไข Prompt Template';
      document.getElementById('prompt-name').value = template.name;
      document.getElementById('prompt-description').value = template.description;
      document.getElementById('prompt-category').value = template.category;
      document.getElementById('prompt-icon').value = template.icon || '';
      document.getElementById('prompt-content').value = template.prompt;
    } else {
      title.textContent = 'สร้าง Prompt Template ใหม่';
      form.reset();
    }
    
    modal.classList.add('show');
  }

  closePromptModal() {
    const modal = document.getElementById('prompt-modal');
    modal.classList.remove('show');
    this.currentEditingPrompt = null;
  }

  async savePromptTemplate() {
    const form = document.getElementById('prompt-form');
    const formData = new FormData(form);
    
    const template = {
      name: document.getElementById('prompt-name').value.trim(),
      description: document.getElementById('prompt-description').value.trim(),
      category: document.getElementById('prompt-category').value,
      icon: document.getElementById('prompt-icon').value.trim() || '🤖',
      prompt: document.getElementById('prompt-content').value.trim()
    };

    // Validate template
    const errors = this.promptManager.validateTemplate(template);
    if (errors.length > 0) {
      this.showNotification(errors.join('\n'), 'error');
      return;
    }

    try {
      if (this.currentEditingPrompt) {
        template.id = this.currentEditingPrompt.id;
      }
      
      await this.promptManager.saveTemplate(template);
      this.closePromptModal();
      await this.loadPromptTemplates();
      this.showNotification('บันทึกเทมเพลตเรียบร้อย!', 'success');
    } catch (error) {
      this.showNotification(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    }
  }

  editPromptTemplate(template) {
    this.openPromptModal(template);
  }

  async deletePromptTemplate(templateId) {
    if (confirm('คุณต้องการลบเทมเพลตนี้หรือไม่?')) {
      try {
        await this.promptManager.deleteTemplate(templateId);
        await this.loadPromptTemplates();
        this.showNotification('ลบเทมเพลตเรียบร้อย!', 'success');
      } catch (error) {
        this.showNotification(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
    }
  }

  async exportPrompts() {
    try {
      const jsonData = await this.promptManager.exportTemplates();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-templates-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showNotification('ส่งออกเทมเพลตเรียบร้อย!', 'success');
    } catch (error) {
      this.showNotification(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    }
  }

  importPrompts() {
    document.getElementById('import-file-input').click();
  }

  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await this.promptManager.importTemplates(text);
      await this.loadPromptTemplates();
      this.showNotification(`นำเข้าเทมเพลต ${count} รายการเรียบร้อย!`, 'success');
    } catch (error) {
      this.showNotification(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    }
    
    // Reset file input
    event.target.value = '';
  }

  async getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (result) => {
        resolve(result);
      });
    });
  }

  async storeSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, () => {
        resolve();
      });
    });
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      maxWidth: '300px',
      wordWrap: 'break-word'
    });
    
    // Set background color based on type
    const colors = {
      success: '#48bb78',
      error: '#f56565',
      info: '#4299e1',
      warning: '#ed8936'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});

