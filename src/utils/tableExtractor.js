// Table Extractor for various data sources
class TableExtractor {
  constructor() {
    this.supportedFormats = [
      'html-table',
      'notion-database',
      'airtable-base',
      'excel-file',
      'csv-file',
      'pdf-table',
      'markdown-table',
      'yaml-data',
      'json-data'
    ];
  }

  async extractFromCurrentPage() {
    try {
      // Detect table type on current page
      const pageData = await this.detectPageType();
      
      switch (pageData.type) {
        case 'notion':
          return await this.extractFromNotion();
        case 'airtable':
          return await this.extractFromAirtable();
        case 'html':
          return await this.extractFromHTML();
        case 'sheets':
          return await this.extractFromGoogleSheets();
        default:
          return await this.extractFromHTML(); // Fallback to HTML extraction
      }
    } catch (error) {
      console.error('Table extraction error:', error);
      throw new Error(`การดึงข้อมูลล้มเหลว: ${error.message}`);
    }
  }

  async detectPageType() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    if (hostname.includes('notion.so') || hostname.includes('notion.site')) {
      return { type: 'notion', url };
    } else if (hostname.includes('airtable.com')) {
      return { type: 'airtable', url };
    } else if (hostname.includes('docs.google.com') && url.includes('spreadsheets')) {
      return { type: 'sheets', url };
    } else {
      return { type: 'html', url };
    }
  }

  async extractFromHTML() {
    const tables = document.querySelectorAll('table');
    const results = [];

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const data = this.parseHTMLTable(table);
      
      if (data.length > 0) {
        results.push({
          id: `html-table-${i}`,
          name: `ตาราง ${i + 1}`,
          type: 'html-table',
          data: data,
          source: window.location.href,
          extractedAt: new Date().toISOString()
        });
      }
    }

    // Also try to extract from common data structures
    const gridViews = this.extractFromGridViews();
    const listViews = this.extractFromListViews();
    
    return [...results, ...gridViews, ...listViews];
  }

  parseHTMLTable(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return [];

    // Extract headers
    const headerRow = rows[0];
    const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => 
      cell.textContent.trim() || `คอลัมน์ ${cell.cellIndex + 1}`
    );

    // Extract data rows
    const dataRows = rows.slice(1);
    const data = dataRows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const rowData = {};
      
      headers.forEach((header, index) => {
        const cell = cells[index];
        rowData[header] = cell ? this.cleanCellData(cell.textContent) : '';
      });
      
      return rowData;
    }).filter(row => Object.values(row).some(value => value.trim() !== ''));

    return data;
  }

  extractFromGridViews() {
    const results = [];
    
    // Look for common grid/table patterns
    const gridSelectors = [
      '[role="grid"]',
      '[role="table"]',
      '.table-view',
      '.grid-view',
      '.data-grid',
      '.ag-grid',
      '.react-grid'
    ];

    gridSelectors.forEach((selector, index) => {
      const grids = document.querySelectorAll(selector);
      grids.forEach((grid, gridIndex) => {
        const data = this.parseGridView(grid);
        if (data.length > 0) {
          results.push({
            id: `grid-view-${index}-${gridIndex}`,
            name: `Grid View ${index + 1}-${gridIndex + 1}`,
            type: 'grid-view',
            data: data,
            source: window.location.href,
            extractedAt: new Date().toISOString()
          });
        }
      });
    });

    return results;
  }

  parseGridView(grid) {
    // Try different approaches to extract data from grid views
    const data = [];
    
    // Method 1: Look for row/cell structure
    const rows = grid.querySelectorAll('[role="row"], .row, .grid-row');
    if (rows.length > 0) {
      const headers = this.extractGridHeaders(grid);
      
      Array.from(rows).forEach(row => {
        const cells = row.querySelectorAll('[role="cell"], .cell, .grid-cell');
        if (cells.length > 0) {
          const rowData = {};
          Array.from(cells).forEach((cell, index) => {
            const header = headers[index] || `คอลัมน์ ${index + 1}`;
            rowData[header] = this.cleanCellData(cell.textContent);
          });
          
          if (Object.values(rowData).some(value => value.trim() !== '')) {
            data.push(rowData);
          }
        }
      });
    }

    return data;
  }

  extractGridHeaders(grid) {
    // Look for header row
    const headerRow = grid.querySelector('[role="row"]:first-child, .header-row, .grid-header');
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('[role="columnheader"], [role="cell"], .header-cell, .cell');
      return Array.from(headerCells).map(cell => 
        cell.textContent.trim() || `คอลัมน์ ${cell.cellIndex + 1}`
      );
    }

    // Fallback: try to detect headers from first data row
    const firstRow = grid.querySelector('[role="row"], .row, .grid-row');
    if (firstRow) {
      const cells = firstRow.querySelectorAll('[role="cell"], .cell, .grid-cell');
      return Array.from(cells).map((cell, index) => `คอลัมน์ ${index + 1}`);
    }

    return [];
  }

  extractFromListViews() {
    const results = [];
    
    // Look for list-based data structures
    const listSelectors = [
      'ul.data-list',
      'ol.data-list',
      '.list-view',
      '.item-list',
      '[role="list"]'
    ];

    listSelectors.forEach((selector, index) => {
      const lists = document.querySelectorAll(selector);
      lists.forEach((list, listIndex) => {
        const data = this.parseListView(list);
        if (data.length > 0) {
          results.push({
            id: `list-view-${index}-${listIndex}`,
            name: `List View ${index + 1}-${listIndex + 1}`,
            type: 'list-view',
            data: data,
            source: window.location.href,
            extractedAt: new Date().toISOString()
          });
        }
      });
    });

    return results;
  }

  parseListView(list) {
    const items = list.querySelectorAll('li, .list-item, .item');
    const data = [];

    Array.from(items).forEach((item, index) => {
      const itemData = this.extractItemData(item, index);
      if (itemData && Object.keys(itemData).length > 0) {
        data.push(itemData);
      }
    });

    return data;
  }

  extractItemData(item, index) {
    const data = { 'ลำดับ': index + 1 };
    
    // Try to extract structured data from the item
    const title = item.querySelector('.title, .name, h1, h2, h3, h4, h5, h6');
    if (title) {
      data['หัวข้อ'] = this.cleanCellData(title.textContent);
    }

    const description = item.querySelector('.description, .content, .text, p');
    if (description) {
      data['รายละเอียด'] = this.cleanCellData(description.textContent);
    }

    const link = item.querySelector('a[href]');
    if (link) {
      data['ลิงก์'] = link.href;
    }

    const image = item.querySelector('img[src]');
    if (image) {
      data['รูปภาพ'] = image.src;
    }

    // If no structured data found, use the entire text content
    if (Object.keys(data).length === 1) {
      data['เนื้อหา'] = this.cleanCellData(item.textContent);
    }

    return data;
  }

  async extractFromNotion() {
    // Extract data from Notion pages
    const results = [];
    
    // Look for Notion database views
    const databases = document.querySelectorAll('[data-block-id]');
    
    for (const db of databases) {
      const data = await this.parseNotionDatabase(db);
      if (data.length > 0) {
        results.push({
          id: `notion-db-${db.dataset.blockId}`,
          name: 'Notion Database',
          type: 'notion-database',
          data: data,
          source: window.location.href,
          extractedAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  async parseNotionDatabase(database) {
    // This would require more specific Notion DOM parsing
    // For now, fallback to general table extraction
    return this.parseHTMLTable(database);
  }

  async extractFromAirtable() {
    // Extract data from Airtable views
    const results = [];
    
    // Look for Airtable grid views
    const grids = document.querySelectorAll('.grid-view, [data-testid="grid"]');
    
    for (const grid of grids) {
      const data = this.parseAirtableGrid(grid);
      if (data.length > 0) {
        results.push({
          id: `airtable-grid-${Date.now()}`,
          name: 'Airtable Grid',
          type: 'airtable-base',
          data: data,
          source: window.location.href,
          extractedAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  parseAirtableGrid(grid) {
    // This would require specific Airtable DOM parsing
    // For now, fallback to general grid extraction
    return this.parseGridView(grid);
  }

  async extractFromFile(file) {
    const fileType = this.detectFileType(file);
    
    switch (fileType) {
      case 'csv':
        return await this.parseCSV(file);
      case 'excel':
        return await this.parseExcel(file);
      case 'json':
        return await this.parseJSON(file);
      case 'yaml':
        return await this.parseYAML(file);
      case 'markdown':
        return await this.parseMarkdown(file);
      case 'pdf':
        return await this.parsePDF(file);
      default:
        throw new Error(`ไม่รองรับไฟล์ประเภท: ${fileType}`);
    }
  }

  detectFileType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    if (extension === 'csv' || mimeType.includes('csv')) return 'csv';
    if (['xlsx', 'xls'].includes(extension) || mimeType.includes('spreadsheet')) return 'excel';
    if (extension === 'json' || mimeType.includes('json')) return 'json';
    if (['yaml', 'yml'].includes(extension) || mimeType.includes('yaml')) return 'yaml';
    if (extension === 'md' || mimeType.includes('markdown')) return 'markdown';
    if (extension === 'pdf' || mimeType.includes('pdf')) return 'pdf';
    
    return 'unknown';
  }

  async parseCSV(file) {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
    const headers = this.parseCSVLine(lines[0]);
    const data = lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return [{
      id: `csv-${Date.now()}`,
      name: file.name,
      type: 'csv-file',
      data: data,
      source: file.name,
      extractedAt: new Date().toISOString()
    }];
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  async parseJSON(file) {
    const text = await file.text();
    const jsonData = JSON.parse(text);
    
    let data = [];
    if (Array.isArray(jsonData)) {
      data = jsonData;
    } else if (typeof jsonData === 'object') {
      data = [jsonData];
    }

    return [{
      id: `json-${Date.now()}`,
      name: file.name,
      type: 'json-data',
      data: data,
      source: file.name,
      extractedAt: new Date().toISOString()
    }];
  }

  async parseMarkdown(file) {
    const text = await file.text();
    const tables = this.extractMarkdownTables(text);
    
    return tables.map((table, index) => ({
      id: `markdown-table-${index}`,
      name: `${file.name} - ตาราง ${index + 1}`,
      type: 'markdown-table',
      data: table,
      source: file.name,
      extractedAt: new Date().toISOString()
    }));
  }

  extractMarkdownTables(text) {
    const tables = [];
    const lines = text.split('\n');
    let currentTable = null;
    let headers = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line contains table separator
      if (line.match(/^\|.*\|$/)) {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        
        if (!headers) {
          headers = cells;
          currentTable = [];
        } else if (line.match(/^[\|\s\-:]+$/)) {
          // Skip separator line
          continue;
        } else {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = cells[index] || '';
          });
          currentTable.push(row);
        }
      } else if (currentTable) {
        // End of table
        if (currentTable.length > 0) {
          tables.push(currentTable);
        }
        currentTable = null;
        headers = null;
      }
    }
    
    // Add last table if exists
    if (currentTable && currentTable.length > 0) {
      tables.push(currentTable);
    }
    
    return tables;
  }

  cleanCellData(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n/g, ' ')   // Replace newlines with space
      .trim();
  }

  async extractFromURL(url) {
    try {
      // This would require CORS permissions or a proxy
      // For now, return empty result
      console.warn('URL extraction requires additional permissions');
      return [];
    } catch (error) {
      throw new Error(`ไม่สามารถดึงข้อมูลจาก URL: ${error.message}`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TableExtractor;
} else if (typeof window !== 'undefined') {
  window.TableExtractor = TableExtractor;
}

