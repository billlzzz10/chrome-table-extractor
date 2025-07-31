// Data Visualization Utilities for Table Extractor AI

class DataVisualization {
  constructor() {
    this.chartLibraryLoaded = false;
    this.loadChartLibrary();
  }

  async loadChartLibrary() {
    if (this.chartLibraryLoaded) return;

    try {
      // Load Chart.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => {
        this.chartLibraryLoaded = true;
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to load Chart.js:', error);
    }
  }

  // Generate enhanced table view with sorting, filtering, and pagination
  generateEnhancedTable(data, containerId, options = {}) {
    if (!data || data.length === 0) {
      return this.showEmptyState(containerId, 'ไม่มีข้อมูลที่จะแสดง');
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    const config = {
      sortable: true,
      filterable: true,
      paginated: true,
      pageSize: 10,
      searchable: true,
      exportable: true,
      ...options
    };

    const headers = Object.keys(data[0]);
    
    // Create table structure
    const tableHTML = `
      <div class="enhanced-table-container">
        ${config.searchable ? this.createSearchBar() : ''}
        ${config.filterable ? this.createFilterBar(headers) : ''}
        <div class="table-wrapper">
          <table class="enhanced-table" id="${containerId}-table">
            <thead>
              <tr>
                ${headers.map(header => `
                  <th class="sortable-header" data-column="${header}">
                    <span class="header-text">${header}</span>
                    ${config.sortable ? '<span class="sort-indicator">↕️</span>' : ''}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody id="${containerId}-tbody">
              <!-- Table rows will be populated here -->
            </tbody>
          </table>
        </div>
        ${config.paginated ? this.createPagination() : ''}
        ${config.exportable ? this.createExportButtons() : ''}
      </div>
    `;

    container.innerHTML = tableHTML;

    // Initialize table functionality
    this.initializeTableFeatures(containerId, data, config);
    this.populateTableData(containerId, data, 1, config.pageSize);
  }

  createSearchBar() {
    return `
      <div class="table-controls">
        <div class="search-container">
          <input type="text" class="search-input" placeholder="ค้นหาข้อมูล..." />
          <span class="search-icon">🔍</span>
        </div>
      </div>
    `;
  }

  createFilterBar(headers) {
    return `
      <div class="filter-container">
        <select class="filter-select">
          <option value="">กรองตามคอลัมน์...</option>
          ${headers.map(header => `<option value="${header}">${header}</option>`).join('')}
        </select>
        <input type="text" class="filter-input" placeholder="ค่าที่ต้องการกรอง..." />
        <button class="filter-apply-btn">กรอง</button>
        <button class="filter-clear-btn">ล้าง</button>
      </div>
    `;
  }

  createPagination() {
    return `
      <div class="pagination-container">
        <div class="pagination-info">
          <span class="page-info">แสดง <span class="current-range">1-10</span> จาก <span class="total-count">0</span> รายการ</span>
        </div>
        <div class="pagination-controls">
          <button class="page-btn" data-action="first">⏮️</button>
          <button class="page-btn" data-action="prev">◀️</button>
          <span class="page-numbers"></span>
          <button class="page-btn" data-action="next">▶️</button>
          <button class="page-btn" data-action="last">⏭️</button>
        </div>
      </div>
    `;
  }

  createExportButtons() {
    return `
      <div class="export-container">
        <button class="export-btn" data-format="csv">📄 CSV</button>
        <button class="export-btn" data-format="json">📋 JSON</button>
        <button class="export-btn" data-format="excel">📊 Excel</button>
      </div>
    `;
  }

  initializeTableFeatures(containerId, data, config) {
    const container = document.getElementById(containerId);
    let filteredData = [...data];
    let currentPage = 1;
    let sortColumn = null;
    let sortDirection = 'asc';

    // Search functionality
    if (config.searchable) {
      const searchInput = container.querySelector('.search-input');
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filteredData = data.filter(row => 
          Object.values(row).some(value => 
            value.toString().toLowerCase().includes(searchTerm)
          )
        );
        currentPage = 1;
        this.populateTableData(containerId, filteredData, currentPage, config.pageSize);
        this.updatePagination(containerId, filteredData, currentPage, config.pageSize);
      });
    }

    // Sorting functionality
    if (config.sortable) {
      const headers = container.querySelectorAll('.sortable-header');
      headers.forEach(header => {
        header.addEventListener('click', () => {
          const column = header.dataset.column;
          
          if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = column;
            sortDirection = 'asc';
          }

          // Update sort indicators
          headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
          header.classList.add(`sort-${sortDirection}`);

          // Sort data
          filteredData.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            const aStr = aVal.toString().toLowerCase();
            const bStr = bVal.toString().toLowerCase();
            
            if (sortDirection === 'asc') {
              return aStr.localeCompare(bStr, 'th');
            } else {
              return bStr.localeCompare(aStr, 'th');
            }
          });

          currentPage = 1;
          this.populateTableData(containerId, filteredData, currentPage, config.pageSize);
          this.updatePagination(containerId, filteredData, currentPage, config.pageSize);
        });
      });
    }

    // Pagination functionality
    if (config.paginated) {
      const paginationContainer = container.querySelector('.pagination-controls');
      paginationContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('page-btn')) {
          const action = e.target.dataset.action;
          const totalPages = Math.ceil(filteredData.length / config.pageSize);

          switch (action) {
            case 'first':
              currentPage = 1;
              break;
            case 'prev':
              currentPage = Math.max(1, currentPage - 1);
              break;
            case 'next':
              currentPage = Math.min(totalPages, currentPage + 1);
              break;
            case 'last':
              currentPage = totalPages;
              break;
          }

          this.populateTableData(containerId, filteredData, currentPage, config.pageSize);
          this.updatePagination(containerId, filteredData, currentPage, config.pageSize);
        }
      });
    }

    // Export functionality
    if (config.exportable) {
      const exportButtons = container.querySelectorAll('.export-btn');
      exportButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const format = btn.dataset.format;
          this.exportTableData(filteredData, format);
        });
      });
    }

    // Initialize pagination
    if (config.paginated) {
      this.updatePagination(containerId, filteredData, currentPage, config.pageSize);
    }
  }

  populateTableData(containerId, data, page, pageSize) {
    const tbody = document.getElementById(`${containerId}-tbody`);
    if (!tbody) return;

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = data.slice(startIndex, endIndex);

    if (pageData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="100%" class="empty-row">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td>
        </tr>
      `;
      return;
    }

    const headers = Object.keys(data[0]);
    tbody.innerHTML = pageData.map((row, index) => `
      <tr class="table-row" data-index="${startIndex + index}">
        ${headers.map(header => `
          <td class="table-cell" data-column="${header}">
            ${this.formatCellValue(row[header])}
          </td>
        `).join('')}
      </tr>
    `).join('');
  }

  updatePagination(containerId, data, currentPage, pageSize) {
    const container = document.getElementById(containerId);
    const totalPages = Math.ceil(data.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, data.length);

    // Update page info
    const pageInfo = container.querySelector('.current-range');
    const totalCount = container.querySelector('.total-count');
    
    if (pageInfo) pageInfo.textContent = `${startIndex}-${endIndex}`;
    if (totalCount) totalCount.textContent = data.length;

    // Update page numbers
    const pageNumbers = container.querySelector('.page-numbers');
    if (pageNumbers) {
      const maxVisiblePages = 5;
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      let numbersHTML = '';
      for (let i = startPage; i <= endPage; i++) {
        numbersHTML += `
          <button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">
            ${i}
          </button>
        `;
      }
      pageNumbers.innerHTML = numbersHTML;

      // Add click handlers for page numbers
      pageNumbers.querySelectorAll('.page-number').forEach(btn => {
        btn.addEventListener('click', () => {
          const page = parseInt(btn.dataset.page);
          this.populateTableData(containerId, data, page, pageSize);
          this.updatePagination(containerId, data, page, pageSize);
        });
      });
    }

    // Update button states
    const firstBtn = container.querySelector('[data-action="first"]');
    const prevBtn = container.querySelector('[data-action="prev"]');
    const nextBtn = container.querySelector('[data-action="next"]');
    const lastBtn = container.querySelector('[data-action="last"]');

    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages;
  }

  formatCellValue(value) {
    if (value === null || value === undefined) {
      return '<span class="null-value">-</span>';
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString('th-TH');
    }
    
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    
    if (typeof value === 'string' && value.length > 100) {
      return `<span title="${value}">${value.substring(0, 100)}...</span>`;
    }
    
    return value.toString();
  }

  // Generate various chart types
  async generateChart(data, containerId, chartType, options = {}) {
    if (!this.chartLibraryLoaded) {
      await this.waitForChartLibrary();
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Create canvas for chart
    container.innerHTML = `
      <div class="chart-container">
        <canvas id="${containerId}-canvas"></canvas>
      </div>
    `;

    const canvas = document.getElementById(`${containerId}-canvas`);
    const ctx = canvas.getContext('2d');

    const chartConfig = this.createChartConfig(data, chartType, options);
    
    new Chart(ctx, chartConfig);
  }

  createChartConfig(data, chartType, options) {
    const config = {
      type: chartType,
      data: this.prepareChartData(data, chartType, options),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!options.title,
            text: options.title || '',
            font: {
              family: 'Noto Sans Thai, sans-serif',
              size: 16
            }
          },
          legend: {
            display: true,
            labels: {
              font: {
                family: 'Noto Sans Thai, sans-serif'
              }
            }
          }
        },
        scales: this.createScalesConfig(chartType),
        ...options.chartOptions
      }
    };

    return config;
  }

  prepareChartData(data, chartType, options) {
    const xColumn = options.xColumn || Object.keys(data[0])[0];
    const yColumn = options.yColumn || Object.keys(data[0])[1];

    switch (chartType) {
      case 'bar':
      case 'line':
        return {
          labels: data.map(row => row[xColumn]),
          datasets: [{
            label: yColumn,
            data: data.map(row => row[yColumn]),
            backgroundColor: this.generateColors(data.length, 0.6),
            borderColor: this.generateColors(data.length, 1),
            borderWidth: 2
          }]
        };

      case 'pie':
      case 'doughnut':
        return {
          labels: data.map(row => row[xColumn]),
          datasets: [{
            data: data.map(row => row[yColumn]),
            backgroundColor: this.generateColors(data.length, 0.8),
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        };

      case 'scatter':
        return {
          datasets: [{
            label: `${xColumn} vs ${yColumn}`,
            data: data.map(row => ({
              x: row[xColumn],
              y: row[yColumn]
            })),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)'
          }]
        };

      default:
        return { labels: [], datasets: [] };
    }
  }

  createScalesConfig(chartType) {
    if (['pie', 'doughnut'].includes(chartType)) {
      return {};
    }

    return {
      x: {
        ticks: {
          font: {
            family: 'Noto Sans Thai, sans-serif'
          }
        }
      },
      y: {
        ticks: {
          font: {
            family: 'Noto Sans Thai, sans-serif'
          }
        }
      }
    };
  }

  generateColors(count, alpha = 1) {
    const colors = [
      `rgba(54, 162, 235, ${alpha})`,
      `rgba(255, 99, 132, ${alpha})`,
      `rgba(255, 205, 86, ${alpha})`,
      `rgba(75, 192, 192, ${alpha})`,
      `rgba(153, 102, 255, ${alpha})`,
      `rgba(255, 159, 64, ${alpha})`,
      `rgba(199, 199, 199, ${alpha})`,
      `rgba(83, 102, 255, ${alpha})`
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  // Generate statistical summary
  generateStatsSummary(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !data || data.length === 0) return;

    const numericColumns = this.getNumericColumns(data);
    const stats = this.calculateStatistics(data, numericColumns);

    const summaryHTML = `
      <div class="stats-summary">
        <div class="stats-header">
          <h3>📊 สถิติข้อมูล</h3>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-content">
              <div class="stat-value">${data.length}</div>
              <div class="stat-label">จำนวนแถว</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
              <div class="stat-value">${Object.keys(data[0]).length}</div>
              <div class="stat-label">จำนวนคอลัมน์</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔢</div>
            <div class="stat-content">
              <div class="stat-value">${numericColumns.length}</div>
              <div class="stat-label">คอลัมน์ตัวเลข</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-value">${this.calculateCompleteness(data)}%</div>
              <div class="stat-label">ความสมบูรณ์</div>
            </div>
          </div>
        </div>
        ${numericColumns.length > 0 ? this.generateNumericStats(stats) : ''}
      </div>
    `;

    container.innerHTML = summaryHTML;
  }

  getNumericColumns(data) {
    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => {
      const value = firstRow[key];
      return typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value));
    });
  }

  calculateStatistics(data, numericColumns) {
    const stats = {};

    numericColumns.forEach(column => {
      const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
      
      if (values.length === 0) return;

      const sorted = values.sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      
      stats[column] = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: mean,
        median: this.calculateMedian(sorted),
        stdDev: this.calculateStandardDeviation(values, mean),
        count: values.length
      };
    });

    return stats;
  }

  calculateMedian(sortedValues) {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }

  calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  calculateCompleteness(data) {
    const totalCells = data.length * Object.keys(data[0]).length;
    const filledCells = data.reduce((count, row) => {
      return count + Object.values(row).filter(value => 
        value !== null && value !== undefined && value !== ''
      ).length;
    }, 0);
    
    return Math.round((filledCells / totalCells) * 100);
  }

  generateNumericStats(stats) {
    const columns = Object.keys(stats);
    
    return `
      <div class="numeric-stats">
        <h4>📊 สถิติคอลัมน์ตัวเลข</h4>
        <div class="stats-table">
          <table>
            <thead>
              <tr>
                <th>คอลัมน์</th>
                <th>ค่าต่ำสุด</th>
                <th>ค่าสูงสุด</th>
                <th>ค่าเฉลี่ย</th>
                <th>ค่ากลาง</th>
                <th>ส่วนเบี่ยงเบนมาตรฐาน</th>
              </tr>
            </thead>
            <tbody>
              ${columns.map(column => {
                const stat = stats[column];
                return `
                  <tr>
                    <td><strong>${column}</strong></td>
                    <td>${stat.min.toLocaleString('th-TH')}</td>
                    <td>${stat.max.toLocaleString('th-TH')}</td>
                    <td>${stat.mean.toFixed(2)}</td>
                    <td>${stat.median.toFixed(2)}</td>
                    <td>${stat.stdDev.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Grid view for card-based display
  generateGridView(data, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
      return this.showEmptyState(containerId, 'ไม่มีข้อมูลที่จะแสดง');
    }

    const config = {
      columns: 3,
      showImages: true,
      titleField: Object.keys(data[0])[0],
      ...options
    };

    const gridHTML = `
      <div class="grid-view-container">
        <div class="grid-controls">
          <div class="view-options">
            <button class="grid-size-btn active" data-columns="3">⊞</button>
            <button class="grid-size-btn" data-columns="4">⊟</button>
            <button class="grid-size-btn" data-columns="2">⊡</button>
          </div>
        </div>
        <div class="grid-content" style="grid-template-columns: repeat(${config.columns}, 1fr);">
          ${data.map((item, index) => this.createGridCard(item, index, config)).join('')}
        </div>
      </div>
    `;

    container.innerHTML = gridHTML;

    // Add grid size controls
    const gridSizeButtons = container.querySelectorAll('.grid-size-btn');
    const gridContent = container.querySelector('.grid-content');

    gridSizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        gridSizeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const columns = btn.dataset.columns;
        gridContent.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
      });
    });
  }

  createGridCard(item, index, config) {
    const title = item[config.titleField] || `รายการ ${index + 1}`;
    const fields = Object.entries(item).filter(([key]) => key !== config.titleField);

    return `
      <div class="grid-card" data-index="${index}">
        <div class="card-header">
          <h4 class="card-title">${title}</h4>
        </div>
        <div class="card-body">
          ${fields.map(([key, value]) => `
            <div class="card-field">
              <span class="field-label">${key}:</span>
              <span class="field-value">${this.formatCellValue(value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Export functionality
  exportTableData(data, format) {
    switch (format) {
      case 'csv':
        this.exportAsCSV(data);
        break;
      case 'json':
        this.exportAsJSON(data);
        break;
      case 'excel':
        this.exportAsExcel(data);
        break;
    }
  }

  exportAsCSV(data) {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    this.downloadFile(csvContent, 'table-data.csv', 'text/csv');
  }

  exportAsJSON(data) {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, 'table-data.json', 'application/json');
  }

  exportAsExcel(data) {
    // Simple Excel export using HTML table format
    const headers = Object.keys(data[0]);
    const excelContent = `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => 
            `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    `;

    this.downloadFile(excelContent, 'table-data.xls', 'application/vnd.ms-excel');
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

  showEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>ไม่มีข้อมูล</h3>
        <p>${message}</p>
      </div>
    `;
  }

  waitForChartLibrary() {
    return new Promise((resolve) => {
      const checkLibrary = () => {
        if (this.chartLibraryLoaded && window.Chart) {
          resolve();
        } else {
          setTimeout(checkLibrary, 100);
        }
      };
      checkLibrary();
    });
  }

  // Generate insights from data
  generateDataInsights(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !data || data.length === 0) return;

    const insights = this.analyzeDataPatterns(data);
    
    const insightsHTML = `
      <div class="data-insights">
        <div class="insights-header">
          <h3>🔍 ข้อมูลเชิงลึก</h3>
        </div>
        <div class="insights-content">
          ${insights.map(insight => `
            <div class="insight-item">
              <div class="insight-icon">${insight.icon}</div>
              <div class="insight-text">
                <h4>${insight.title}</h4>
                <p>${insight.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = insightsHTML;
  }

  analyzeDataPatterns(data) {
    const insights = [];
    const numericColumns = this.getNumericColumns(data);
    
    // Data completeness insight
    const completeness = this.calculateCompleteness(data);
    if (completeness < 80) {
      insights.push({
        icon: '⚠️',
        title: 'ข้อมูลไม่สมบูรณ์',
        description: `ข้อมูลมีความสมบูรณ์เพียง ${completeness}% ควรตรวจสอบข้อมูลที่ขาดหายไป`
      });
    }

    // Duplicate detection
    const duplicates = this.findDuplicates(data);
    if (duplicates.length > 0) {
      insights.push({
        icon: '🔄',
        title: 'พบข้อมูลซ้ำ',
        description: `มีข้อมูลซ้ำ ${duplicates.length} รายการ ควรพิจารณาลบข้อมูลซ้ำ`
      });
    }

    // Outlier detection
    numericColumns.forEach(column => {
      const outliers = this.detectOutliers(data, column);
      if (outliers.length > 0) {
        insights.push({
          icon: '📈',
          title: `ค่าผิดปกติในคอลัมน์ ${column}`,
          description: `พบค่าผิดปกติ ${outliers.length} ค่า ควรตรวจสอบความถูกต้อง`
        });
      }
    });

    // Data distribution insights
    if (numericColumns.length > 0) {
      const stats = this.calculateStatistics(data, numericColumns);
      Object.entries(stats).forEach(([column, stat]) => {
        if (stat.stdDev / stat.mean > 1) {
          insights.push({
            icon: '📊',
            title: `ข้อมูลกระจายตัวมากในคอลัมน์ ${column}`,
            description: `ค่าเบี่ยงเบนมาตรฐานสูง (${stat.stdDev.toFixed(2)}) แสดงว่าข้อมูลมีความหลากหลายสูง`
          });
        }
      });
    }

    return insights.length > 0 ? insights : [{
      icon: '✅',
      title: 'ข้อมูลมีคุณภาพดี',
      description: 'ไม่พบปัญหาเด่นชัดในข้อมูลชุดนี้'
    }];
  }

  findDuplicates(data) {
    const seen = new Set();
    const duplicates = [];
    
    data.forEach((row, index) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicates.push(index);
      } else {
        seen.add(key);
      }
    });
    
    return duplicates;
  }

  detectOutliers(data, column) {
    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
    if (values.length < 4) return [];

    const sorted = values.sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(value => value < lowerBound || value > upperBound);
  }

  calculatePercentile(sortedValues, percentile) {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    return sortedValues[lower] * (upper - index) + sortedValues[upper] * (index - lower);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataVisualization;
} else {
  window.DataVisualization = DataVisualization;
}

