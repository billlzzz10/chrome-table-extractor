// Prompt Templates Management Utility

class PromptTemplateManager {
  constructor() {
    this.defaultTemplates = this.getDefaultTemplates();
  }

  // Generate unique ID for prompt template
  generateId() {
    return 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get default prompt templates
  getDefaultTemplates() {
    return [
      {
        id: 'summarize_content',
        name: 'สรุปความ',
        description: 'สรุปเนื้อหาในตารางให้กระชับและเข้าใจง่าย',
        category: 'basic',
        icon: '📝',
        prompt: `กรุณาสรุปข้อมูลในตารางนี้ให้กระชับและเข้าใจง่าย โดยเน้นประเด็นสำคัญและข้อมูลหลัก:

ข้อมูลตาราง: {tableData}

กรุณาตอบในรูปแบบ:
- ประเด็นหลัก: [สรุปประเด็นสำคัญ]
- จำนวนข้อมูล: [จำนวนแถวและคอลัมน์]
- ข้อสังเกต: [สิ่งที่น่าสนใจหรือผิดปกติ]`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'generate_ideas',
        name: 'คิดไอเดีย',
        description: 'สร้างไอเดียและข้อเสนอแนะจากข้อมูลในตาราง',
        category: 'creative',
        icon: '💡',
        prompt: `จากข้อมูลในตารางนี้ กรุณาคิดไอเดียและข้อเสนอแนะที่น่าสนใจ:

ข้อมูลตาราง: {tableData}

กรุณาให้ไอเดียในหัวข้อต่อไปนี้:
1. การใช้ประโยชน์จากข้อมูล
2. การวิเคราะห์เพิ่มเติม
3. การปรับปรุงหรือพัฒนา
4. แนวทางการนำไปใช้งาน
5. ข้อเสนอแนะอื่นๆ`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'expand_details',
        name: 'ขยายความ',
        description: 'ขยายความและอธิบายรายละเอียดของข้อมูลในตาราง',
        category: 'analysis',
        icon: '🔍',
        prompt: `กรุณาขยายความและอธิบายรายละเอียดของข้อมูลในตารางนี้:

ข้อมูลตาราง: {tableData}

กรุณาอธิบายในประเด็นต่อไปนี้:
- ความหมายของแต่ละคอลัมน์
- ความสัมพันธ์ระหว่างข้อมูล
- บริบทและที่มาของข้อมูล
- การตีความและการวิเคราะห์
- ข้อจำกัดและข้อควรระวัง`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'explain_simple',
        name: 'อธิบายง่ายๆ',
        description: 'อธิบายข้อมูลในตารางให้เข้าใจง่าย เหมาะสำหรับผู้ที่ไม่เชี่ยวชาญ',
        category: 'basic',
        icon: '🎯',
        prompt: `กรุณาอธิบายข้อมูลในตารางนี้ให้เข้าใจง่าย เหมาะสำหรับคนทั่วไป:

ข้อมูลตาราง: {tableData}

กรุณาอธิบายในลักษณะ:
- ใช้ภาษาที่เข้าใจง่าย หลีกเลี่ยงศัพท์เทคนิค
- ยกตัวอย่างประกอบ
- เปรียบเทียบกับสิ่งที่คุ้นเคย
- เน้นประโยชน์และการใช้งาน
- สรุปสั้นๆ ที่จำง่าย`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'make_shorter',
        name: 'ย่อให้สั้น',
        description: 'ย่อข้อมูลในตารางให้กระชับที่สุดแต่ยังคงสาระสำคัญ',
        category: 'basic',
        icon: '✂️',
        prompt: `กรุณาย่อข้อมูลในตารางนี้ให้สั้นและกระชับที่สุด แต่ยังคงสาระสำคัญ:

ข้อมูลตาราง: {tableData}

เงื่อนไข:
- ใช้คำให้น้อยที่สุด
- เก็บข้อมูลสำคัญไว้ครบ
- ใช้ตัวเลขและสัญลักษณ์ช่วย
- จัดรูปแบบให้อ่านง่าย
- ไม่เกิน 3-5 ประโยค`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'create_list',
        name: 'สรุปเป็นลิสต์',
        description: 'จัดข้อมูลในตารางเป็นรายการที่เป็นระเบียบ',
        category: 'format',
        icon: '📋',
        prompt: `กรุณาจัดข้อมูลในตารางนี้เป็นรายการที่เป็นระเบียบ:

ข้อมูลตาราง: {tableData}

กรุณาจัดรูปแบบเป็น:
• หัวข้อหลัก
  - รายการย่อย
  - รายการย่อย
• หัวข้อหลัก
  - รายการย่อย

เงื่อนไข:
- จัดกลุ่มข้อมูลที่เกี่ยวข้อง
- เรียงลำดับตามความสำคัญ
- ใช้สัญลักษณ์ที่เหมาะสม
- เขียนให้กระชับและชัดเจน`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'create_diagram',
        name: 'สรุปเป็นไดอะแกรม',
        description: 'แปลงข้อมูลในตารางเป็นไดอะแกรมหรือแผนภาพ',
        category: 'visual',
        icon: '📊',
        prompt: `กรุณาแปลงข้อมูลในตารางนี้เป็นไดอะแกรมหรือแผนภาพ:

ข้อมูลตาราง: {tableData}

กรุณาเลือกรูปแบบที่เหมาะสม:
- Flow Chart (แผนภูมิการไหล)
- Mind Map (แผนที่ความคิด)
- Hierarchy (โครงสร้างลำดับชั้น)
- Timeline (เส้นเวลา)
- Process (กระบวนการ)

และอธิบาย:
- เหตุผลที่เลือกรูปแบบนี้
- วิธีการอ่านไดอะแกรม
- ประโยชน์ของการแสดงผลแบบนี้`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'fill_missing_data',
        name: 'เติมข้อมูลที่ขาดหายไป',
        description: 'วิเคราะห์และเติมข้อมูลที่ขาดหายไปในตารางอย่างสมเหตุสมผล',
        category: 'enhancement',
        icon: '🔧',
        prompt: `กรุณาวิเคราะห์และเติมข้อมูลที่ขาดหายไปในตารางนี้:

ข้อมูลตาราง: {tableData}

กรุณาดำเนินการ:
1. ระบุข้อมูลที่ขาดหายไป
2. วิเคราะห์รูปแบบและความสัมพันธ์ของข้อมูล
3. เสนอค่าที่เหมาะสมสำหรับข้อมูลที่ขาด
4. อธิบายเหตุผลในการเติมข้อมูล
5. แสดงตารางที่เติมข้อมูลแล้ว

หมายเหตุ: ใช้เครื่องหมาย [เติม] เพื่อระบุข้อมูลที่เติมเพิ่ม`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'standardize_format',
        name: 'มาตรฐานรูปแบบข้อมูล',
        description: 'ปรับปรุงและมาตรฐานรูปแบบข้อมูลในตารางให้สม่ำเสมอ',
        category: 'enhancement',
        icon: '⚡',
        prompt: `กรุณาปรับปรุงและมาตรฐานรูปแบบข้อมูลในตารางนี้:

ข้อมูลตาราง: {tableData}

กรุณาดำเนินการ:
1. ตรวจสอบความสม่ำเสมอของรูปแบบข้อมูล
2. ปรับปรุงการเขียนให้เป็นมาตรฐาน (เช่น วันที่, ตัวเลข, ชื่อ)
3. แก้ไขการสะกดและรูปแบบการเขียน
4. จัดกลุ่มและจัดหมวดหมู่ข้อมูล
5. เพิ่มหน่วยหรือคำอธิบายที่จำเป็น

แสดงผลลัพธ์:
- ตารางที่ปรับปรุงแล้ว
- รายการการเปลี่ยนแปลงที่ทำ`,
        createdAt: new Date().toISOString(),
        usage: 0
      },
      {
        id: 'detect_patterns',
        name: 'ตรวจจับรูปแบบข้อมูล',
        description: 'วิเคราะห์และค้นหารูปแบบ แนวโน้ม หรือความผิดปกติในข้อมูล',
        category: 'analysis',
        icon: '🔬',
        prompt: `กรุณาวิเคราะห์และค้นหารูปแบบในข้อมูลตารางนี้:

ข้อมูลตาราง: {tableData}

กรุณาวิเคราะห์:
1. รูปแบบและแนวโน้มของข้อมูล
2. ความสัมพันธ์ระหว่างคอลัมน์ต่างๆ
3. ค่าผิดปกติหรือข้อมูลที่น่าสงสัย
4. การกระจายตัวของข้อมูล
5. ข้อสรุปและข้อเสนอแนะ

แสดงผลลัพธ์:
- รูปแบบที่พบ
- สถิติพื้นฐาน (ถ้าเหมาะสม)
- ข้อสังเกตที่น่าสนใจ
- คำแนะนำสำหรับการใช้งานต่อ`,
        createdAt: new Date().toISOString(),
        usage: 0
      }
    ];
  }

  // Load all templates (default + custom)
  async loadTemplates() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['promptTemplates'], (result) => {
        const customTemplates = result.promptTemplates || [];
        const allTemplates = [...this.defaultTemplates, ...customTemplates];
        resolve(allTemplates);
      });
    });
  }

  // Save custom template
  async saveTemplate(template) {
    const templates = await this.loadCustomTemplates();
    
    if (!template.id) {
      template.id = this.generateId();
      template.createdAt = new Date().toISOString();
      template.usage = 0;
    }
    
    template.updatedAt = new Date().toISOString();
    
    const existingIndex = templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    
    return new Promise((resolve) => {
      chrome.storage.sync.set({ promptTemplates: templates }, () => {
        resolve(template);
      });
    });
  }

  // Load custom templates only
  async loadCustomTemplates() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['promptTemplates'], (result) => {
        resolve(result.promptTemplates || []);
      });
    });
  }

  // Delete template
  async deleteTemplate(templateId) {
    const templates = await this.loadCustomTemplates();
    const filteredTemplates = templates.filter(t => t.id !== templateId);
    
    return new Promise((resolve) => {
      chrome.storage.sync.set({ promptTemplates: filteredTemplates }, () => {
        resolve(true);
      });
    });
  }

  // Get template by ID
  async getTemplate(templateId) {
    const allTemplates = await this.loadTemplates();
    return allTemplates.find(t => t.id === templateId);
  }

  // Update template usage count
  async incrementUsage(templateId) {
    const template = await this.getTemplate(templateId);
    if (template && !this.isDefaultTemplate(templateId)) {
      template.usage = (template.usage || 0) + 1;
      template.lastUsed = new Date().toISOString();
      await this.saveTemplate(template);
    }
  }

  // Check if template is default
  isDefaultTemplate(templateId) {
    return this.defaultTemplates.some(t => t.id === templateId);
  }

  // Export templates to JSON
  async exportTemplates() {
    const customTemplates = await this.loadCustomTemplates();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: customTemplates
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Import templates from JSON
  async importTemplates(jsonData) {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.templates || !Array.isArray(importData.templates)) {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
      }
      
      const existingTemplates = await this.loadCustomTemplates();
      const importedTemplates = importData.templates.map(template => ({
        ...template,
        id: this.generateId(), // Generate new ID to avoid conflicts
        importedAt: new Date().toISOString()
      }));
      
      const allTemplates = [...existingTemplates, ...importedTemplates];
      
      return new Promise((resolve) => {
        chrome.storage.sync.set({ promptTemplates: allTemplates }, () => {
          resolve(importedTemplates.length);
        });
      });
    } catch (error) {
      throw new Error('ไม่สามารถนำเข้าไฟล์ได้: ' + error.message);
    }
  }

  // Search templates
  async searchTemplates(query) {
    const allTemplates = await this.loadTemplates();
    const lowercaseQuery = query.toLowerCase();
    
    return allTemplates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get templates by category
  async getTemplatesByCategory(category) {
    const allTemplates = await this.loadTemplates();
    return allTemplates.filter(template => template.category === category);
  }

  // Get popular templates (most used)
  async getPopularTemplates(limit = 5) {
    const allTemplates = await this.loadTemplates();
    return allTemplates
      .sort((a, b) => (b.usage || 0) - (a.usage || 0))
      .slice(0, limit);
  }

  // Process template with data
  processTemplate(template, tableData) {
    let processedPrompt = template.prompt;
    
    // Replace placeholders
    processedPrompt = processedPrompt.replace(/{tableData}/g, JSON.stringify(tableData, null, 2));
    
    // Add metadata
    const metadata = {
      templateId: template.id,
      templateName: template.name,
      processedAt: new Date().toISOString(),
      dataRows: tableData.rows ? tableData.rows.length : 0,
      dataColumns: tableData.headers ? tableData.headers.length : 0
    };
    
    return {
      prompt: processedPrompt,
      metadata: metadata
    };
  }

  // Validate template
  validateTemplate(template) {
    const errors = [];
    
    if (!template.name || template.name.trim().length === 0) {
      errors.push('ชื่อเทมเพลตไม่สามารถว่างได้');
    }
    
    if (!template.description || template.description.trim().length === 0) {
      errors.push('คำอธิบายไม่สามารถว่างได้');
    }
    
    if (!template.prompt || template.prompt.trim().length === 0) {
      errors.push('เนื้อหา Prompt ไม่สามารถว่างได้');
    }
    
    if (!template.category || template.category.trim().length === 0) {
      errors.push('หมวดหมู่ไม่สามารถว่างได้');
    }
    
    if (template.name && template.name.length > 100) {
      errors.push('ชื่อเทมเพลตยาวเกินไป (สูงสุด 100 ตัวอักษร)');
    }
    
    if (template.description && template.description.length > 500) {
      errors.push('คำอธิบายยาวเกินไป (สูงสุด 500 ตัวอักษร)');
    }
    
    return errors;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptTemplateManager;
} else if (typeof window !== 'undefined') {
  window.PromptTemplateManager = PromptTemplateManager;
}

