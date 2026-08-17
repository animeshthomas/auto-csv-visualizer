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

    // Chatbot controls
    const chatLog = document.getElementById('chatLog');
    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const btnSaveApiKey = document.getElementById('btnSaveApiKey');
    const chatPromptPills = document.querySelectorAll('.chat-prompt-pill');

    // Geo Map controls
    const geoMapSubtitle = document.getElementById('geoMapSubtitle');
    const mapMetricSelect = document.getElementById('mapMetricSelect');
    
    let activeAnalysisData = null;
    let activeRawRows = [];
    let chartInstance = null;
    let leafletMap = null;
    let mapMarkersLayer = null;
    let currentSampleId = "sales_data";

    if (localStorage.getItem('gemini_api_key')) {
        geminiApiKeyInput.value = localStorage.getItem('gemini_api_key');
    }

    if (btnSaveApiKey) {
        btnSaveApiKey.addEventListener('click', () => {
            const key = geminiApiKeyInput.value.trim();
            if (key) {
                localStorage.setItem('gemini_api_key', key);
                alert("Gemini API Key saved locally!");
            } else {
                localStorage.removeItem('gemini_api_key');
                alert("API Key cleared.");
            }
        });
    }

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

    sampleSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            currentSampleId = e.target.value;
            loadSampleDataset(e.target.value);
        }
    });

    samplePills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const sampleId = pill.dataset.sample;
            sampleSelect.value = sampleId;
            currentSampleId = sampleId;
            loadSampleDataset(sampleId);
        });
    });

    btnReset.addEventListener('click', () => {
        analysisDashboard.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        sampleSelect.value = '';
        fileInput.value = '';
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = document.getElementById(btn.dataset.tab);
            if (targetTab) targetTab.classList.add('active');

            if (btn.dataset.tab === 'tabGeoMap' && leafletMap) {
                setTimeout(() => leafletMap.invalidateSize(), 200);
            }
        });
    });

    if (btnSendChat && chatInput) {
        btnSendChat.addEventListener('click', handleChatSubmit);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleChatSubmit();
        });
    }

    chatPromptPills.forEach(pill => {
        pill.addEventListener('click', () => {
            chatInput.value = pill.textContent.trim();
            handleChatSubmit();
        });
    });

    function handleChatSubmit() {
        const q = chatInput.value.trim();
        if (!q) return;
        chatInput.value = '';
        sendChatMessage(q);
    }

    function showLoading(text = "Analyzing CSV dataset...") {
        if (uploadSection) uploadSection.classList.add('hidden');
        if (analysisDashboard) analysisDashboard.classList.add('hidden');
        if (loadingState) loadingState.classList.remove('hidden');
        const loadingText = document.getElementById('loadingText');
        if (loadingText) loadingText.textContent = text;
    }

    function hideLoading() {
        if (loadingState) loadingState.classList.add('hidden');
    }

    async function processCSVFile(file) {
        showLoading(`Parsing and analyzing ${file.name}...`);

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

        const text = await file.text();
        const analysis = clientSideProfileCSV(text, file.name);
        renderDashboard(analysis);
    }

    async function loadSampleDataset(sampleId) {
        showLoading(`Loading sample dataset...`);

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

        try {
            const res = await fetch(`data/${sampleId}.csv`);
            if (!res.ok) throw new Error("Sample file missing");
            const text = await res.text();
            const analysis = clientSideProfileCSV(text, `${sampleId}.csv`);
            renderDashboard(analysis);
        } catch (err) {
            alert(`Could not load sample: ${err.message}`);
            hideLoading();
            if (uploadSection) uploadSection.classList.remove('hidden');
        }
    }

    // --- AI CHATBOT ENGINE ---
    async function sendChatMessage(userQuery) {
        appendMessage('user', userQuery);
        const loadingMsgId = appendMessage('assistant', '🤖 *Thinking and analyzing dataset...*');
        const apiKey = localStorage.getItem('gemini_api_key') || '';

        try {
            const response = await fetch('/api/chat-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sample_id: currentSampleId,
                    query: userQuery,
                    api_key: apiKey
                })
            });

            if (response.ok) {
                const result = await response.json();
                removeMessage(loadingMsgId);
                renderAssistantResponse(result);
                return;
            }
        } catch (err) {
            console.log("Backend API offline, fallback to client-side smart chat parser.");
        }

        removeMessage(loadingMsgId);
        const localResult = clientSideSmartQuery(userQuery);
        renderAssistantResponse(localResult);
    }

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        const id = 'msg-' + Date.now();
        msgDiv.id = id;
        msgDiv.className = `chat-message ${role}`;
        msgDiv.innerHTML = `
            <div class="msg-avatar">${role === 'user' ? '👤' : '🤖'}</div>
            <div class="msg-content"><p>${text}</p></div>
        `;
        chatLog.appendChild(msgDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function parseSimpleMarkdown(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/`(.*?)`/g, "<code>$1</code>")
            .replace(/\n/g, "<br>");
    }

    function renderAssistantResponse(result) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message assistant';

        const formattedAnswer = parseSimpleMarkdown(result.answer);
        let html = `<div class="msg-avatar">🤖</div><div class="msg-content"><p>${formattedAnswer}</p>`;

        if (result.result_type === 'table' && result.table_data && result.table_data.length > 0) {
            const cols = Object.keys(result.table_data[0]);
            html += `<div class="table-responsive" style="margin-top:10px;"><table class="preview-table"><thead><tr>`;
            cols.forEach(c => html += `<th>${c}</th>`);
            html += `</tr></thead><tbody>`;
            result.table_data.forEach(row => {
                html += `<tr>`;
                cols.forEach(c => html += `<td>${row[c] !== null ? row[c] : 'null'}</td>`);
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;
        }

        if (result.code_used) {
            html += `<div class="code-used-box"><code>${result.code_used}</code></div>`;
        }

        html += `</div>`;
        msgDiv.innerHTML = html;
        chatLog.appendChild(msgDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function clientSideSmartQuery(query) {
        if (!activeRawRows || activeRawRows.length === 0) {
            return { answer: "Please upload or select a dataset first!", result_type: "text" };
        }

        const q = query.toLowerCase().trim();
        const cols = activeAnalysisData ? activeAnalysisData.columns_list : Object.keys(activeRawRows[0]);
        const colsLower = cols.map(c => c.toLowerCase());

        const topMatch = q.match(/top\s+(\d+)\s*(.*)/);
        if (topMatch) {
            const n = parseInt(topMatch[1]);
            const remainder = topMatch[2];

            let sortCol = cols.find((c, idx) => remainder.includes(colsLower[idx]) && typeof activeRawRows[0][c] === 'number');
            let groupCol = cols.find((c, idx) => remainder.includes(colsLower[idx]) && typeof activeRawRows[0][c] !== 'number');

            if (!sortCol) sortCol = cols.filter(c => typeof activeRawRows[0][c] === 'number').pop();
            if (!groupCol) groupCol = cols.filter(c => typeof activeRawRows[0][c] !== 'number')[0];

            if (groupCol && sortCol) {
                const map = {};
                activeRawRows.forEach(r => {
                    const k = String(r[groupCol]);
                    const v = Number(r[sortCol]) || 0;
                    map[k] = (map[k] || 0) + v;
                });
                const sorted = Object.keys(map).sort((a, b) => map[b] - map[a]).slice(0, n);
                const tableData = sorted.map(k => ({ [groupCol]: k, [`Total ${sortCol}`]: Number(map[k].toFixed(2)) }));

                return {
                    answer: `Here are the top ${n} \`${groupCol}\` entries by \`${sortCol}\`:`,
                    result_type: "table",
                    table_data: tableData,
                    code_used: `activeRawRows.groupBy('${groupCol}').sum('${sortCol}').slice(0, ${n})`
                };
            }
        }

        if (q.includes('average') || q.includes('mean') || q.includes('avg')) {
            const numCol = cols.find((c, idx) => q.includes(colsLower[idx]) && typeof activeRawRows[0][c] === 'number');
            if (numCol) {
                const vals = activeRawRows.map(r => r[numCol]).filter(v => typeof v === 'number');
                const avg = (vals.reduce((a, b) => a + b, 0) / (vals.length || 1)).toFixed(2);
                return {
                    answer: `The average \`${numCol}\` is **${avg}**.`,
                    result_type: "text",
                    code_used: `activeRawRows.mean('${numCol}')`
                };
            }
        }

        if (q.includes('missing') || q.includes('null')) {
            const ov = activeAnalysisData ? activeAnalysisData.overview : {};
            return {
                answer: `Dataset has **${ov.total_null_cells || 0} missing cells** (${ov.null_percentage || 0}% overall missing rate).`,
                result_type: "text"
            };
        }

        return {
            answer: `I analyzed your dataset of **${activeRawRows.length} rows**. Available attributes: \`${cols.slice(0, 5).join(', ')}\`. Ask me for top values, averages, or missing stats!`,
            result_type: "text"
        };
    }

    // --- LEAFLET.JS GEO MAP ENGINE ---
    function renderGeoMap(data, rows) {
        if (!rows || rows.length === 0) return;

        const cols = data.columns_list || Object.keys(rows[0]);
        const colsLower = cols.map(c => c.toLowerCase());

        const latCol = cols.find((c, idx) => ['latitude', 'lat', 'lat_deg', 'y'].includes(colsLower[idx]));
        const lngCol = cols.find((c, idx) => ['longitude', 'lng', 'lon', 'x'].includes(colsLower[idx]));

        if (!latCol || !lngCol) {
            geoMapSubtitle.textContent = "No latitude/longitude coordinate columns detected in this dataset.";
            return;
        }

        geoMapSubtitle.textContent = `Plotting coordinate points using '${latCol}' and '${lngCol}'...`;

        // Populate metric selector
        mapMetricSelect.innerHTML = '';
        const numCols = data.columns_classification.numeric || cols.filter(c => typeof rows[0][c] === 'number');
        numCols.forEach(nc => {
            const opt = document.createElement('option');
            opt.value = nc;
            opt.textContent = nc;
            mapMetricSelect.appendChild(opt);
        });

        // Initialize Map
        if (!leafletMap) {
            leafletMap = L.map('geoMap').setView([20, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '© OpenStreetMap'
            }).addTo(leafletMap);
            mapMarkersLayer = L.layerGroup().addTo(leafletMap);
        }

        drawMapMarkers(latCol, lngCol, mapMetricSelect.value, rows);

        mapMetricSelect.onchange = () => {
            drawMapMarkers(latCol, lngCol, mapMetricSelect.value, rows);
        };
    }

    function drawMapMarkers(latCol, lngCol, metricCol, rows) {
        if (!mapMarkersLayer) return;
        mapMarkersLayer.clearLayers();

        const bounds = [];
        let plotCount = 0;

        rows.forEach(r => {
            const lat = parseFloat(r[latCol]);
            const lng = parseFloat(r[lngCol]);

            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                bounds.push([lat, lng]);
                plotCount++;

                const val = r[metricCol] !== undefined ? r[metricCol] : 'N/A';
                let popupHtml = `<b>Geo Point Details</b><br>Latitude: ${lat}<br>Longitude: ${lng}`;
                if (metricCol) popupHtml += `<br><b>${metricCol}:</b> ${val}`;

                const marker = L.circleMarker([lat, lng], {
                    radius: 7,
                    fillColor: '#10B981',
                    color: '#059669',
                    weight: 1.5,
                    fillOpacity: 0.75
                }).bindPopup(popupHtml);

                mapMarkersLayer.addLayer(marker);
            }
        });

        geoMapSubtitle.textContent = `Plotted ${plotCount.toLocaleString()} map points (${latCol}, ${lngCol})`;

        if (bounds.length > 0 && leafletMap) {
            leafletMap.fitBounds(bounds, { padding: [30, 30] });
            setTimeout(() => leafletMap.invalidateSize(), 250);
        }
    }

    // --- CLIENT-SIDE PROFILING ENGINE ---
    function clientSideProfileCSV(csvText, filename) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return null;

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

        activeRawRows = rows;
        const totalRows = rows.length;
        const totalCols = headers.length;
        const totalCells = totalRows * totalCols;
        const nullPct = totalCells > 0 ? Number((totalNulls / totalCells * 100).toFixed(2)) : 0;

        const numericCols = [];
        const categoricalCols = [];

        headers.forEach(h => {
            const sampleVals = rows.map(r => r[h]).filter(v => v !== null);
            const isNum = sampleVals.length > 0 && sampleVals.every(v => typeof v === 'number');
            if (isNum) numericCols.push(h);
            else categoricalCols.push(h);
        });

        const columnStats = {};

        numericCols.forEach(col => {
            const vals = rows.map(r => r[col]).filter(v => typeof v === 'number').sort((a, b) => a - b);
            const n = vals.length;
            const nullCnt = totalRows - n;
            const nullRatio = Number((nullCnt / totalRows * 100).toFixed(2));

            let min = 0, max = 0, mean = 0, median = 0, std = 0, q25 = 0, q75 = 0;
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
        if (data.preview_rows) activeRawRows = data.preview_rows;
        hideLoading();
        if (analysisDashboard) analysisDashboard.classList.remove('hidden');

        activeDatasetName.textContent = data.dataset_name || 'dataset.csv';
        const ov = data.overview;
        kpiRows.textContent = ov.total_rows.toLocaleString();
        kpiCols.textContent = ov.total_columns.toLocaleString();
        kpiMemory.textContent = ov.memory_formatted;
        kpiNulls.textContent = `${ov.null_percentage}%`;
        kpiDuplicates.textContent = ov.duplicate_rows.toLocaleString();

        populateColumnSelector(data);
        renderCorrelationHeatmap(data.correlation_matrix);
        renderOutliersDiagnostics(data);
        renderTablePreview(data.preview_rows, data.columns_list);
        renderGeoMap(data, activeRawRows);
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
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (tableShowingCount) tableShowingCount.textContent = `${rows.length} rows`;

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
