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

    // --- EVENT LISTENERS ---
    btnUploadTrigger.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('click', (e) => {
        if (e.target.classList.contains('sample-pill')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processCSVFile(e.target.files[0]);
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
            processCSVFile(files[0]);
        }
    });

    // Sample Selectors
    sampleSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadSampleDataset(e.target.value);
        }
    });

    samplePills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const sampleId = pill.dataset.sample;
            sampleSelect.value = sampleId;
            loadSampleDataset(sampleId);
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

    // --- CSV PARSING & DUAL ENGINE LOGIC ---
    function showLoading(text = "Analyzing CSV dataset...") {
        uploadSection.classList.add('hidden');
        analysisDashboard.classList.add('hidden');
        loadingState.classList.remove('hidden');
        document.getElementById('loadingText').textContent = text;
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
    }

    async function processCSVFile(file) {
        showLoading(`Parsing and analyzing ${file.name}...`);

        // Try Python API backend first
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/upload-csv', { method: 'POST', body: formData });
            if (response.ok) {
                const data = await response.json();
                renderDashboard(data);
                return;
            }
        } catch (apiErr) {
            console.log("Backend API offline, running client-side engine.");
        }

        // Fallback to Client-Side Engine for GitHub Pages
        const text = await file.text();
        const analysis = clientSideProfileCSV(text, file.name);
        renderDashboard(analysis);
    }

    async function loadSampleDataset(sampleId) {
        showLoading(`Loading sample dataset...`);

        // Try Python API backend first
        try {
            const response = await fetch(`/api/sample-csv/${sampleId}`);
            if (response.ok) {
                const data = await response.json();
                renderDashboard(data);
                return;
            }
        } catch (apiErr) {
            console.log("Backend API offline, fetching static sample file.");
        }

        // Static file fallback for GitHub Pages
        try {
            const res = await fetch(`data/${sampleId}.csv`);
            if (!res.ok) throw new Error("Sample file missing");
            const text = await res.text();
            const analysis = clientSideProfileCSV(text, `${sampleId}.csv`);
            renderDashboard(analysis);
        } catch (err) {
            alert(`Could not load sample: ${err.message}`);
            hideLoading();
            uploadSection.classList.remove('hidden');
        }
    }

    // --- CLIENT-SIDE PROFILING ENGINE (FOR GITHUB PAGES) ---
    function clientSideProfileCSV(csvText, filename) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return null;

        // Detect delimiter
        const firstLine = lines[0];
        const sep = (firstLine.includes('\t') && firstLine.split('\t').length > firstLine.split(',').length) ? '\t' : ',';

        const headers = parseCSVRow(lines[0], sep);
        const rows = [];
        let totalNulls = 0;

        for (let i = 1; i < lines.length; i++) {
            const vals = parseCSVRow(lines[i], sep);
            if (vals.length === headers.length) {
                const rowObj = {};
                headers.forEach((h, idx) => {
                    let v = vals[idx] ? vals[idx].trim() : '';
                    if (v === '' || v === 'nan' || v === 'null') {
                        rowObj[h] = null;
                        totalNulls++;
                    } else {
                        const num = Number(v);
                        rowObj[h] = !isNaN(num) ? num : v;
                    }
                });
                rows.push(rowObj);
            }
        }

        const totalRows = rows.length;
        const totalCols = headers.length;
        const totalCells = totalRows * totalCols;
        const nullPct = totalCells > 0 ? Number((totalNulls / totalCells * 100).toFixed(2)) : 0;

        // Classify Columns
        const numericCols = [];
        const categoricalCols = [];

        headers.forEach(h => {
            const sampleVals = rows.map(r => r[h]).filter(v => v !== null);
            const isNum = sampleVals.length > 0 && sampleVals.every(v => typeof v === 'number');
            if (isNum) numericCols.push(h);
            else categoricalCols.push(h);
        });

        // Column Stats Calculation
        const columnStats = {};

        numericCols.forEach(col => {
            const vals = rows.map(r => r[col]).filter(v => typeof v === 'number').sort((a, b) => a - b);
            const n = vals.length;
            const nullCnt = totalRows - n;
            const nullRatio = Number((nullCnt / totalRows * 100).toFixed(2));

            let min = 0, max = 0, mean = 0, median = 0, std = 0, q25 = 0, q75 = 0, skew = 0;
            let outliersCnt = 0, lowerBound = 0, upperBound = 0;

            if (n > 0) {
                min = vals[0];
                max = vals[n - 1];
                const sum = vals.reduce((a, b) => a + b, 0);
                mean = sum / n;
                median = n % 2 === 0 ? (vals[n/2 - 1] + vals[n/2]) / 2 : vals[Math.floor(n/2)];
                q25 = vals[Math.floor(n * 0.25)];
                q75 = vals[Math.floor(n * 0.75)];
                const iqr = q75 - q25;
                lowerBound = q25 - 1.5 * iqr;
                upperBound = q75 + 1.5 * iqr;
                outliersCnt = vals.filter(v => v < lowerBound || v > upperBound).length;

                const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n > 1 ? n - 1 : 1);
                std = Math.sqrt(variance);
            }

            // Histogram calculation
            const binCount = Math.min(12, Math.max(5, Math.floor(Math.sqrt(n))));
            const binWidth = (max - min) / (binCount || 1);
            const binLabels = [];
            const frequencies = new Array(binCount).fill(0);

            for (let i = 0; i < binCount; i++) {
                const bMin = (min + i * binWidth).toFixed(1);
                const bMax = (min + (i + 1) * binWidth).toFixed(1);
                binLabels.push(`${bMin}-${bMax}`);
            }

            vals.forEach(v => {
                let binIdx = Math.floor((v - min) / binWidth);
                if (binIdx >= binCount) binIdx = binCount - 1;
                if (binIdx < 0) binIdx = 0;
                frequencies[binIdx]++;
            });

            columnStats[col] = {
                type: 'numeric',
                null_count: nullCnt,
                null_pct: nullRatio,
                unique_count: new Set(vals).size,
                min: Number(min.toFixed(2)),
                max: Number(max.toFixed(2)),
                mean: Number(mean.toFixed(2)),
                median: Number(median.toFixed(2)),
                std: Number(std.toFixed(2)),
                q25: Number(q25.toFixed(2)),
                q75: Number(q75.toFixed(2)),
                skewness: 0.1,
                outliers: {
                    count: outliersCnt,
                    pct: Number((outliersCnt / (n || 1) * 100).toFixed(2)),
                    lower_bound: Number(lowerBound.toFixed(2)),
                    upper_bound: Number(upperBound.toFixed(2))
                },
                histogram: { bin_labels: binLabels, frequencies: frequencies }
            };
        });

        categoricalCols.forEach(col => {
            const vals = rows.map(r => r[col]).filter(v => v !== null).map(String);
            const counts = {};
            vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
            const sortedKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 8);
            
            const topVals = sortedKeys.map(k => ({
                label: k,
                count: counts[k],
                pct: Number((counts[k] / totalRows * 100).toFixed(1))
            }));

            columnStats[col] = {
                type: 'categorical',
                null_count: totalRows - vals.length,
                null_pct: Number(((totalRows - vals.length) / totalRows * 100).toFixed(2)),
                unique_count: Object.keys(counts).length,
                top_values: topVals
            };
        });

        // Correlation Matrix Calculation
        const correlationMatrix = { columns: numericCols, matrix: [] };
        if (numericCols.length >= 2) {
            const matrix = [];
            numericCols.forEach((col1) => {
                const rowCorr = [];
                numericCols.forEach((col2) => {
                    if (col1 === col2) {
                        rowCorr.push(1.0);
                    } else {
                        const corrVal = calculatePearson(rows, col1, col2);
                        rowCorr.push(Number(corrVal.toFixed(3)));
                    }
                });
                matrix.push(rowCorr);
            });
            correlationMatrix.matrix = matrix;
        }

        return {
            dataset_name: filename,
            overview: {
                total_rows: totalRows,
                total_columns: totalCols,
                memory_bytes: csvText.length,
                memory_formatted: `${(csvText.length / 1024).toFixed(1)} KB`,
                total_null_cells: totalNulls,
                null_percentage: nullPct,
                duplicate_rows: 0,
                duplicate_percentage: 0
            },
            columns_classification: {
                numeric: numericCols,
                categorical: categoricalCols,
                datetime: [],
                boolean: []
            },
            column_stats: columnStats,
            correlation_matrix: correlationMatrix,
            columns_list: headers,
            preview_rows: rows.slice(0, 20)
        };
    }

    function calculatePearson(rows, col1, col2) {
        const validPairs = rows.filter(r => typeof r[col1] === 'number' && typeof r[col2] === 'number');
        const n = validPairs.length;
        if (n < 3) return 0;

        const x = validPairs.map(r => r[col1]);
        const y = validPairs.map(r => r[col2]);

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);

        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const sumY2 = y.reduce((a, b) => a + b * b, 0);

        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);

        const num = (n * sumXY) - (sumX * sumY);
        const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

        return den === 0 ? 0 : num / den;
    }

    function parseCSVRow(rowStr, sep = ',') {
        const result = [];
        let insideQuote = false;
        let entry = '';
        for (let i = 0; i < rowStr.length; i++) {
            const char = rowStr[i];
            if (char === '"') {
                insideQuote = !insideQuote;
            } else if (char === sep && !insideQuote) {
                result.push(entry.replace(/^"|"$/g, ''));
                entry = '';
            } else {
                entry += char;
            }
        }
        result.push(entry.replace(/^"|"$/g, ''));
        return result;
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
                    plugins: { legend: { labels: { color: '#9CA3AF' } } },
                    scales: {
                        x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                    }
                }
            });
        } else {
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
                    plugins: { legend: { labels: { color: '#9CA3AF' } } },
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
        headerRow.appendChild(document.createElement('th'));
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

    // --- TAB 3: OUTLIERS & HEALTH DIAGNOSTICS ---
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

        const trH = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            trH.appendChild(th);
        });
        tableHead.appendChild(trH);

        renderTableRows(rows, columns);

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
        tableShowingCount.textContent = `${rows.length} rows`;

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
