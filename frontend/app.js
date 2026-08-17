document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const btnUploadTrigger = document.getElementById('btnUploadTrigger');
    const sampleSelect = document.getElementById('sampleSelect');
    const samplePills = document.querySelectorAll('.sample-pill');
    
    const uploadSection = document.getElementById('uploadSection');
    const loadingState = document.getElementById('loadingState');
    const analysisDashboard = document.getElementById('analysisDashboard');
    const btnReset = document.getElementById('btnReset');
    
    const activeDatasetName = document.getElementById('activeDatasetName');
    
    // KPI elements
    const kpiRows = document.getElementById('kpiRows');
    const kpiCols = document.getElementById('kpiCols');
    const kpiMemory = document.getElementById('kpiMemory');
    const kpiNulls = document.getElementById('kpiNulls');
    const kpiDuplicates = document.getElementById('kpiDuplicates');
    
    // Tabs & Univariate controls
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const columnSelect = document.getElementById('columnSelect');
    const colTypeBadge = document.getElementById('colTypeBadge');
    const statsContainer = document.getElementById('statsContainer');
    
    // Data Table controls
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const tableSearch = document.getElementById('tableSearch');
    const tableShowingCount = document.getElementById('tableShowingCount');
    
    let activeAnalysisData = null;
    let chartInstance = null;

    // --- EVENT LISTENERS FOR FILE UPLOAD & SAMPLES ---
    btnUploadTrigger.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('click', (e) => {
        if (e.target.classList.contains('sample-pill')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // Sample Selectors
    sampleSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            fetchSampleData(e.target.value);
        }
    });

    samplePills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const sampleId = pill.dataset.sample;
            sampleSelect.value = sampleId;
            fetchSampleData(sampleId);
        });
    });

    btnReset.addEventListener('click', () => {
        analysisDashboard.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        sampleSelect.value = '';
        fileInput.value = '';
    });

    // Tab Navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = document.getElementById(btn.dataset.tab);
            if (targetTab) targetTab.classList.add('active');
        });
    });

    // --- API CALLS ---
    function showLoading(text = "Analyzing CSV with Pandas...") {
        uploadSection.classList.add('hidden');
        analysisDashboard.classList.add('hidden');
        loadingState.classList.remove('hidden');
        document.getElementById('loadingText').textContent = text;
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
    }

    async function handleFileUpload(file) {
        showLoading(`Parsing and analyzing ${file.name}...`);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload-csv', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to analyze file');
            }

            const data = await response.json();
            renderDashboard(data);
        } catch (error) {
            alert(`Error: ${error.message}`);
            hideLoading();
            uploadSection.classList.remove('hidden');
        }
    }

    async function fetchSampleData(sampleId) {
        showLoading(`Loading sample dataset...`);
        try {
            const response = await fetch(`/api/sample-csv/${sampleId}`);
            if (!response.ok) {
                throw new Error('Failed to load sample dataset');
            }
            const data = await response.json();
            renderDashboard(data);
        } catch (error) {
            alert(`Error: ${error.message}`);
            hideLoading();
            uploadSection.classList.remove('hidden');
        }
    }

    // --- DASHBOARD RENDERER ---
    function renderDashboard(data) {
        activeAnalysisData = data;
        hideLoading();
        analysisDashboard.classList.remove('hidden');

        // Meta Banner & KPI
        activeDatasetName.textContent = data.dataset_name || 'dataset.csv';
        const ov = data.overview;
        kpiRows.textContent = ov.total_rows.toLocaleString();
        kpiCols.textContent = ov.total_columns.toLocaleString();
        kpiMemory.textContent = ov.memory_formatted;
        kpiNulls.textContent = `${ov.null_percentage}%`;
        kpiDuplicates.textContent = ov.duplicate_rows.toLocaleString();

        // Populate Column Selector for Univariate Tab
        populateColumnSelector(data);

        // Render Correlation Matrix
        renderCorrelationHeatmap(data.correlation_matrix);

        // Render Outlier Diagnostics
        renderOutliersDiagnostics(data);

        // Render Table Explorer
        renderTablePreview(data.preview_rows, data.columns_list);
    }

    // --- TAB 1: UNIVARIATE ANALYSIS ---
    function populateColumnSelector(data) {
        columnSelect.innerHTML = '';
        const cols = data.columns_list;

        cols.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col;
            const colMeta = data.column_stats[col];
            const typeLabel = colMeta ? colMeta.type.toUpperCase() : 'UNKNOWN';
            opt.textContent = `${col} (${typeLabel})`;
            columnSelect.appendChild(opt);
        });

        columnSelect.onchange = () => {
            renderUnivariateChart(columnSelect.value);
        };

        if (cols.length > 0) {
            columnSelect.value = cols[0];
            renderUnivariateChart(cols[0]);
        }
    }

    function renderUnivariateChart(colName) {
        if (!activeAnalysisData || !activeAnalysisData.column_stats[colName]) return;

        const stats = activeAnalysisData.column_stats[colName];
        colTypeBadge.textContent = stats.type.toUpperCase();

        // Update Side Panel Stats
        updateSideStatsPanel(colName, stats);

        const ctx = document.getElementById('univariateChart').getContext('2d');
        if (chartInstance) {
            chartInstance.destroy();
        }

        if (stats.type === 'numeric') {
            // Histogram
            const hist = stats.histogram;
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: hist.bin_labels,
                    datasets: [{
                        label: `Frequency Distribution (${colName})`,
                        data: hist.frequencies,
                        backgroundColor: 'rgba(99, 102, 241, 0.65)',
                        borderColor: '#6366F1',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#9CA3AF' } }
                    },
                    scales: {
                        x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                    }
                }
            });
        } else {
            // Categorical Top Values Bar Chart
            const topVals = stats.top_values || [];
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: topVals.map(v => v.label),
                    datasets: [{
                        label: `Frequency Count (${colName})`,
                        data: topVals.map(v => v.count),
                        backgroundColor: 'rgba(6, 182, 212, 0.65)',
                        borderColor: '#06B6D4',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { labels: { color: '#9CA3AF' } }
                    },
                    scales: {
                        x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                    }
                }
            });
        }
    }

    function updateSideStatsPanel(colName, stats) {
        statsContainer.innerHTML = '';

        if (stats.type === 'numeric') {
            const items = [
                { label: 'Data Type', value: 'Numeric (Float/Int)' },
                { label: 'Missing Values', value: `${stats.null_count} (${stats.null_pct}%)` },
                { label: 'Unique Values', value: stats.unique_count.toLocaleString() },
                { label: 'Minimum', value: stats.min },
                { label: 'Maximum', value: stats.max },
                { label: 'Mean (Average)', value: stats.mean },
                { label: 'Median (Q50)', value: stats.median },
                { label: 'Std Deviation', value: stats.std },
                { label: 'Skewness', value: stats.skewness },
                { label: 'IQR Outliers', value: `${stats.outliers.count} (${stats.outliers.pct}%)` }
            ];
            items.forEach(it => {
                statsContainer.appendChild(createStatRow(it.label, it.value));
            });
        } else {
            const items = [
                { label: 'Data Type', value: stats.type.toUpperCase() },
                { label: 'Missing Values', value: `${stats.null_count} (${stats.null_pct}%)` },
                { label: 'Unique Categories', value: stats.unique_count.toLocaleString() },
                { label: 'Top Category', value: stats.top_values[0] ? `${stats.top_values[0].label} (${stats.top_values[0].count})` : 'N/A' }
            ];
            items.forEach(it => {
                statsContainer.appendChild(createStatRow(it.label, it.value));
            });
        }
    }

    function createStatRow(label, val) {
        const div = document.createElement('div');
        div.className = 'stat-item';
        div.innerHTML = `<span class="label">${label}</span><span class="value">${val}</span>`;
        return div;
    }

    // --- TAB 2: CORRELATION HEATMAP ---
    function renderCorrelationHeatmap(corrData) {
        const container = document.getElementById('correlationGridContainer');
        container.innerHTML = '';

        if (!corrData || !corrData.columns || corrData.columns.length < 2) {
            container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-secondary);">
                Need at least 2 numerical columns to calculate correlation matrix.
            </div>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'heatmap-table';

        // Header Row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.appendChild(document.createElement('th')); // Empty top-left cell
        corrData.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body Rows
        const tbody = document.createElement('tbody');
        corrData.columns.forEach((rowCol, rIdx) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = rowCol;
            tr.appendChild(th);

            corrData.columns.forEach((colCol, cIdx) => {
                const val = corrData.matrix[rIdx][cIdx];
                const td = document.createElement('td');
                td.className = 'heatmap-cell';
                td.textContent = val.toFixed(2);
                td.style.backgroundColor = getCorrelationColor(val);
                td.style.color = Math.abs(val) > 0.4 ? '#FFF' : '#E5E7EB';
                td.title = `Correlation (${rowCol} vs ${colCol}): ${val}`;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);
    }

    function getCorrelationColor(val) {
        if (val === 1.0) return 'rgba(99, 102, 241, 0.4)';
        if (val > 0) {
            const alpha = 0.15 + (val * 0.7);
            return `rgba(16, 185, 129, ${alpha})`;
        } else if (val < 0) {
            const alpha = 0.15 + (Math.abs(val) * 0.7);
            return `rgba(244, 63, 94, ${alpha})`;
        } else {
            return 'rgba(255, 255, 255, 0.03)';
        }
    }

    // --- TAB 3: OUTLIER & HEALTH DIAGNOSTICS ---
    function renderOutliersDiagnostics(data) {
        const listContainer = document.getElementById('outliersList');
        const boxplotMetricsContainer = document.getElementById('boxplotMetricsContainer');
        listContainer.innerHTML = '';
        boxplotMetricsContainer.innerHTML = '';

        const numericCols = data.columns_classification.numeric;

        if (numericCols.length === 0) {
            listContainer.innerHTML = `<p style="color:var(--text-secondary);">No numeric columns detected.</p>`;
            return;
        }

        numericCols.forEach(col => {
            const stats = data.column_stats[col];
            const outCount = stats.outliers.count;
            const hasOutliers = outCount > 0;

            // Outlier Summary Card Item
            const div = document.createElement('div');
            div.className = `outlier-card-item ${hasOutliers ? 'has-outliers' : ''}`;
            div.innerHTML = `
                <div>
                    <div class="outlier-col-name">${col}</div>
                    <div style="font-size:0.78rem; color:var(--text-secondary);">Bounds: [${stats.outliers.lower_bound} to ${stats.outliers.upper_bound}]</div>
                </div>
                <span class="outlier-count-tag ${hasOutliers ? 'high' : 'none'}">
                    ${outCount} Outliers (${stats.outliers.pct}%)
                </span>
            `;
            listContainer.appendChild(div);
        });

        // First Numeric Column Boxplot Stat Breakdown
        const firstNumCol = numericCols[0];
        const fStats = data.column_stats[firstNumCol];
        const boxStats = [
            { title: `${firstNumCol} - Minimum`, num: fStats.min },
            { title: `${firstNumCol} - Q25 (25th %)`, num: fStats.q25 },
            { title: `${firstNumCol} - Median (Q50)`, num: fStats.median },
            { title: `${firstNumCol} - Q75 (75th %)`, num: fStats.q75 },
            { title: `${firstNumCol} - Maximum`, num: fStats.max },
            { title: `${firstNumCol} - IQR`, num: (fStats.q75 - fStats.q25).toFixed(2) }
        ];

        boxStats.forEach(st => {
            const card = document.createElement('div');
            card.className = 'boxplot-stat-box';
            card.innerHTML = `<span class="title">${st.title}</span><span class="num">${st.num}</span>`;
            boxplotMetricsContainer.appendChild(card);
        });
    }

    // --- TAB 4: DATA TABLE EXPLORER ---
    function renderTablePreview(rows, columns) {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        if (!rows || rows.length === 0) return;

        // Head
        const trH = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            trH.appendChild(th);
        });
        tableHead.appendChild(trH);

        // Render rows
        renderTableRows(rows, columns);

        // Table Search Filter
        tableSearch.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = rows.filter(r => {
                return Object.values(r).some(val => val !== null && String(val).toLowerCase().includes(query));
            });
            renderTableRows(filtered, columns);
        };
    }

    function renderTableRows(rows, columns) {
        tableBody.innerHTML = '';
        tableShowingCount.textContent = rows.length;

        rows.forEach(row => {
            const tr = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                const val = row[col];
                if (val === null || val === undefined) {
                    td.className = 'null-cell';
                    td.textContent = 'null';
                } else {
                    td.textContent = val;
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }
});
