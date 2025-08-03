// AI Service for handling different AI providers
class AIService {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        endpoint: 'https://api.openai.com/v1/chat/completions'
      },
      claude: {
        name: 'Claude',
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        endpoint: 'https://api.anthropic.com/v1/messages'
      },
      google: {
        name: 'Google AI',
        models: ['gemini-pro', 'gemini-pro-vision'],
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
      }
    };
  }

  async processTableData(tableData, promptTemplate, provider = 'openai', options = {}) {
    try {
      // Input validation
      if (!this.validateInputs(tableData, promptTemplate, provider)) {
        throw new Error('ข้อมูลป้อนเข้าไม่ถูกต้อง');
      }

      const settings = await this.getSettings();
      const apiKey = this.getApiKey(provider, settings);
      
      if (!apiKey) {
        throw new Error(`ไม่พบ API Key สำหรับ ${this.providers[provider].name}`);
      }

      const prompt = this.buildPrompt(tableData, promptTemplate);
      const response = await this.callAI(provider, apiKey, prompt, options);
      
      // Update usage statistics
      await this.updateUsageStats(promptTemplate.id);
      
      return {
        success: true,
        result: response,
        provider: provider,
        model: options.model || this.getDefaultModel(provider),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI processing error:', error);
      return {
        success: false,
        error: error.message,
        provider: provider,
        timestamp: new Date().toISOString()
      };
    }
  }

  validateInputs(tableData, promptTemplate, provider) {
    // Validate table data
    if (!tableData || typeof tableData !== 'object') {
      return false;
    }

    // Validate prompt template
    if (!promptTemplate || !promptTemplate.prompt || typeof promptTemplate.prompt !== 'string') {
      return false;
    }

    // Check prompt length (prevent excessive API costs)
    if (promptTemplate.prompt.length > 10000) {
      return false;
    }

    // Validate provider
    if (!provider || !this.providers[provider]) {
      return false;
    }

    // Check table data size (prevent excessive API costs)
    const tableDataString = JSON.stringify(tableData);
    if (tableDataString.length > 100000) { // 100KB limit
      return false;
    }

    return true;
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    // Remove potential XSS patterns
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  buildPrompt(tableData, promptTemplate) {
    let prompt = this.sanitizeInput(promptTemplate.prompt);
    
    // Replace placeholders with actual data
    const tableJson = JSON.stringify(tableData, null, 2);
    prompt = prompt.replace(/\{tableData\}/g, tableJson);
    
    // Add context about the data
    const dataContext = this.analyzeTableStructure(tableData);
    prompt = prompt.replace(/\{dataContext\}/g, dataContext);
    
    return prompt;
  }

  analyzeTableStructure(tableData) {
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
      return 'ไม่มีข้อมูลในตาราง';
    }

    const rowCount = tableData.length;
    const columns = Object.keys(tableData[0] || {});
    const columnCount = columns.length;
    
    const columnTypes = {};
    columns.forEach(col => {
      const values = tableData.map(row => row[col]).filter(val => val != null);
      if (values.length === 0) {
        columnTypes[col] = 'empty';
      } else if (values.every(val => !isNaN(val) && !isNaN(parseFloat(val)))) {
        columnTypes[col] = 'number';
      } else if (values.every(val => /^\d{4}-\d{2}-\d{2}/.test(val))) {
        columnTypes[col] = 'date';
      } else {
        columnTypes[col] = 'text';
      }
    });

    return `ตารางมี ${rowCount} แถว และ ${columnCount} คอลัมน์
คอลัมน์: ${columns.join(', ')}
ประเภทข้อมูล: ${Object.entries(columnTypes).map(([col, type]) => `${col}(${type})`).join(', ')}`;
  }

  async callAI(provider, apiKey, prompt, options = {}) {
    switch (provider) {
      case 'openai':
        return await this.callOpenAI(apiKey, prompt, options);
      case 'claude':
        return await this.callClaude(apiKey, prompt, options);
      case 'google':
        return await this.callGoogle(apiKey, prompt, options);
      default:
        throw new Error(`ไม่รองรับ AI provider: ${provider}`);
    }
  }

  async callOpenAI(apiKey, prompt, options = {}) {
    const model = options.model || 'gpt-4';
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature || 0.7;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'คุณเป็นผู้ช่วยที่เชี่ยวชาญในการวิเคราะห์และประมวลผลข้อมูลในตาราง ตอบเป็นภาษาไทยที่เข้าใจง่าย'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callClaude(apiKey, prompt, options = {}) {
    const model = options.model || 'claude-3-sonnet-20240229';
    const maxTokens = options.maxTokens || 2000;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: `คุณเป็นผู้ช่วยที่เชี่ยวชาญในการวิเคราะห์และประมวลผลข้อมูลในตาราง ตอบเป็นภาษาไทยที่เข้าใจง่าย\n\n${prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async callGoogle(apiKey, prompt, options = {}) {
    const model = options.model || 'gemini-pro';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `คุณเป็นผู้ช่วยที่เชี่ยวชาญในการวิเคราะห์และประมวลผลข้อมูลในตาราง ตอบเป็นภาษาไทยที่เข้าใจง่าย\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google AI API error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async testConnection(provider, apiKey, options = {}) {
    try {
      const testPrompt = 'ทดสอบการเชื่อมต่อ กรุณาตอบว่า "การเชื่อมต่อสำเร็จ"';
      const result = await this.callAI(provider, apiKey, testPrompt, options);
      
      return {
        success: true,
        message: 'การเชื่อมต่อสำเร็จ',
        details: `ทดสอบ ${this.providers[provider].name} เรียบร้อย`,
        response: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'การเชื่อมต่อล้มเหลว',
        error: error.message
      };
    }
  }

  async enhanceTableData(tableData, options = {}) {
    const enhancementPrompts = {
      fillMissing: {
        name: 'เติมข้อมูลที่ขาดหายไป',
        prompt: `วิเคราะห์ตารางข้อมูลต่อไปนี้และเติมข้อมูลที่ขาดหายไป (null, undefined, หรือช่องว่าง) โดยใช้ลอจิกและรูปแบบที่เหมาะสม:

{tableData}

กรุณา:
1. วิเคราะห์รูปแบบและความสัมพันธ์ของข้อมูล
2. เติมข้อมูลที่ขาดหายไปด้วยค่าที่สมเหตุสมผล
3. ส่งคืนตารางที่สมบูรณ์ในรูปแบบ JSON
4. อธิบายเหตุผลในการเติมข้อมูล`
      },
      standardizeFormat: {
        name: 'มาตรฐานรูปแบบข้อมูล',
        prompt: `ปรับปรุงและมาตรฐานรูปแบบข้อมูลในตารางต่อไปนี้:

{tableData}

กรุณา:
1. ปรับรูปแบบวันที่ให้เป็นมาตรฐาน (YYYY-MM-DD)
2. ปรับรูปแบบตัวเลขให้สม่ำเสมอ
3. ปรับรูปแบบข้อความให้เป็นมาตรฐาน (capitalize, trim spaces)
4. ลบข้อมูลที่ซ้ำกัน
5. ส่งคืนตารางที่ปรับปรุงแล้วในรูปแบบ JSON`
      },
      detectPatterns: {
        name: 'ตรวจจับรูปแบบและแนวโน้ม',
        prompt: `วิเคราะห์รูปแบบและแนวโน้มในตารางข้อมูลต่อไปนี้:

{tableData}

กรุณา:
1. ระบุรูปแบบที่น่าสนใจในข้อมูล
2. วิเคราะห์แนวโน้มและความสัมพันธ์
3. ชี้ให้เห็นข้อมูลที่ผิดปกติ (outliers)
4. เสนอแนะการปรับปรุงหรือข้อมูลเพิ่มเติมที่ควรมี
5. สรุปผลการวิเคราะห์เป็นข้อความที่เข้าใจง่าย`
      }
    };

    const enhancementType = options.type || 'fillMissing';
    const promptTemplate = enhancementPrompts[enhancementType];
    
    if (!promptTemplate) {
      throw new Error(`ไม่รองรับการปรับปรุงประเภท: ${enhancementType}`);
    }

    return await this.processTableData(tableData, promptTemplate, options.provider, options);
  }

  getApiKey(provider, settings) {
    const keyMap = {
      openai: 'openaiKey',
      claude: 'claudeKey',
      google: 'googleKey'
    };
    return settings[keyMap[provider]];
  }

  getDefaultModel(provider) {
    return this.providers[provider].models[0];
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (result) => {
        resolve(result);
      });
    });
  }

  async updateUsageStats(templateId) {
    try {
      const result = await chrome.storage.local.get(['promptUsageStats']);
      const stats = result.promptUsageStats || {};
      
      stats[templateId] = (stats[templateId] || 0) + 1;
      
      await chrome.storage.local.set({ promptUsageStats: stats });
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }

  async getUsageStats() {
    try {
      const result = await chrome.storage.local.get(['promptUsageStats']);
      return result.promptUsageStats || {};
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {};
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
} else if (typeof window !== 'undefined') {
  window.AIService = AIService;
}

