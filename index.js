document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('arb-form');
    const container = document.getElementById('outcomes-container');
    const addOutcomeBtn = document.getElementById('add-outcome-btn');
    const historyBody = document.getElementById('history-body');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const cumulativeProfitDisplay = document.getElementById('cumulative-profit-display');
    
    // Select dropdown matrices and their value fields
    const weeklyFilterSelect = document.getElementById('weekly-filter-select');
    const monthlyFilterSelect = document.getElementById('monthly-filter-select');
    const annualFilterSelect = document.getElementById('annual-filter-select');
    const weeklyProfitDisplay = document.getElementById('weekly-profit-display');
    const monthlyProfitDisplay = document.getElementById('monthly-profit-display');
    const annualProfitDisplay = document.getElementById('annual-profit-display');

    let memoryHistory = [];

    // Inject dynamic CSV Export option programmatically into the DOM
    const historyHeader = document.querySelector('.history-header');
    if (historyHeader) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'export-csv-btn';
        exportBtn.className = 'btn-secondary';
        exportBtn.style.marginRight = '8px';
        exportBtn.style.backgroundColor = '#059669'; // Forest Green
        exportBtn.style.color = '#ffffff';
        exportBtn.textContent = 'Export CSV';
        historyHeader.insertBefore(exportBtn, clearHistoryBtn);
        
        exportBtn.addEventListener('click', exportToCSV);
    }

    // Attach listeners to drop down menus to recalculate timelines instantly when changed
    if (weeklyFilterSelect) weeklyFilterSelect.addEventListener('change', renderHistory);
    if (monthlyFilterSelect) monthlyFilterSelect.addEventListener('change', renderHistory);
    if (annualFilterSelect) annualFilterSelect.addEventListener('change', renderHistory);

    // PWA Mobile App Support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Mobile Service Worker Registered!'))
            .catch((err) => console.log('Worker registration failed:', err));
    }

    // LocalStorage Data Safe Fetching
    function getHistory() {
        try {
            let stored = localStorage.getItem('arb_multi_logs');
            return stored ? JSON.parse(stored) : memoryHistory;
        } catch (e) {
            console.warn("Storage restriction found. Running safely in active page memory.", e);
            return memoryHistory;
        }
    }

    // LocalStorage Data Saving
    function saveHistory(data) {
        memoryHistory = data;
        try {
            localStorage.setItem('arb_multi_logs', JSON.stringify(data));
        } catch (e) {
            console.warn("Writing to local memory storage failed.", e);
        }
        renderHistory();
    }

    // Appends a new input row dynamically
    addOutcomeBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'outcome-row';
        row.innerHTML = `
            <div class="outcome-inputs">
                <div class="input-group" style="margin:0;">
                    <label class="row-label">Odds</label>
                    <input type="number" class="outcome-odds" value="3.00" step="0.01" min="1.01" required>
                </div>
                <div class="input-group" style="margin:0;">
                    <label style="display:flex; justify-content:space-between; align-items:center;">
                        Stake (₦)
                        <button type="button" class="btn-delete-row" title="Delete Option">✕</button>
                    </label>
                    <input type="text" class="outcome-stake" placeholder="--" readonly>
                </div>
            </div>
            <div class="payout-display">Expected Payout: <span class="outcome-payout">₦0</span></div>
        `;

        row.querySelector('.btn-delete-row').addEventListener('click', () => {
            row.remove();
            reindexLabels();
        });

        container.appendChild(row);
        reindexLabels();
    });

    function reindexLabels() {
        const labels = container.getElementsByClassName('row-label');
        for (let i = 0; i < labels.length; i++) {
            labels[i].textContent = `Odds #${i + 1}`;
        }
    }

    // Main Arbitrage Mathematical Engine
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const totalInvestment = Math.round(parseFloat(document.getElementById('total-investment').value));
        const oddInputs = container.getElementsByClassName('outcome-odds');
        const stakeInputs = container.getElementsByClassName('outcome-stake');
        const payoutDisplays = container.getElementsByClassName('outcome-payout');

        let totalInverseOdds = 0;
        let oddsValues = [];

        for (let i = 0; i < oddInputs.length; i++) {
            const val = parseFloat(oddInputs[i].value);
            oddsValues.push(val);
            totalInverseOdds += (1 / val);
        }

        let balancedPayout = 0;
        for (let i = 0; i < oddInputs.length; i++) {
            const currentInverse = 1 / oddsValues[i];
            const rawStake = (totalInvestment * currentInverse) / totalInverseOdds;
            const optimalStake = Math.round(rawStake);
            const expectedPayout = Math.round(optimalStake * oddsValues[i]);

            if (i === 0) balancedPayout = expectedPayout;

            stakeInputs[i].value = `₦${optimalStake.toFixed(0)}`;
            payoutDisplays[i].textContent = `₦${expectedPayout.toFixed(0)}`;
        }

        const netProfit = Math.round(balancedPayout - totalInvestment);
        const roi = (netProfit / totalInvestment) * 100;
        const isProfitable = netProfit > 0;

        document.getElementById('results-box').classList.remove('hidden');
        const statusBadge = document.getElementById('arb-status');
        statusBadge.textContent = isProfitable ? 'Arbitrage Opportunity Found!' : 'No Arbitrage Profit Available';
        statusBadge.className = `status-badge ${isProfitable ? 'profitable' : 'negative'}`;

        document.getElementById('res-payout').textContent = `₦${balancedPayout.toFixed(0)}`;
        
        const profitEl = document.getElementById('res-profit');
        profitEl.textContent = `₦${netProfit.toFixed(0)}`;
        profitEl.className = isProfitable ? 'text-green' : 'text-red';

        const roiEl = document.getElementById('res-roi');
        roiEl.textContent = `${roi.toFixed(2)}%`; 
        roiEl.className = isProfitable ? 'text-green' : 'text-red';

        // Automatically fetch local date tracking values securely
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        // Clean uniform logging timestamp string
        const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}`;

        const logEntry = {
            id: Date.now().toString() + Math.random().toString(16).slice(2, 6),
            timestamp: formattedTimestamp,
            totalStake: totalInvestment.toFixed(0),
            oddsSignature: oddsValues.map(o => o.toFixed(2)).join(' / '),
            profit: netProfit.toFixed(0),
            isProfitable: isProfitable
        };

        let activeLogs = getHistory();
        activeLogs.unshift(logEntry);
        saveHistory(activeLogs);
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to permanently clear ALL logged calculations?")) {
            saveHistory([]);
        }
    });
    // Safely parses timestamp strings "DD/MM/YYYY HH:MM" into valid local Date objects
    function parseCustomTimestamp(tsString) {
        try {
            const cleanStr = tsString.replace(',', '');
            const parts = cleanStr.split(' '); // ["18/10/2026", "10:08"]
            const dateParts = parts[0].split('/'); // ["18", "10", "2026"]
            
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // Months index from 0-11
            const year = parseInt(dateParts[2], 10);
            
            return new Date(year, month, day);
        } catch(e) {
            console.error("Timestamp parse failure, fallback triggered", e);
            return new Date();
        }
    }

    // Helper Utility: Checks if a date falls within the current calendar week (Monday to Sunday)
    function isCurrentWeek(date) {
        const today = new Date();
        const currentDayOfWeek = today.getDay(); 
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1));
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        
        return date >= startOfWeek && date <= endOfWeek;
    }

    // Helper Utility: Determines the calendar week number of the month (1st-7th = w1, etc.)
    function getWeekOfMonth(date) {
        const dayOfMonth = date.getDate();
        if (dayOfMonth <= 7) return 'w1';
        if (dayOfMonth <= 14) return 'w2';
        if (dayOfMonth <= 21) return 'w3';
        return 'w4';
    }

    // Master Render Pipeline & Timeline Matrix Accumulator Calculation
    function renderHistory() {
        let currentLogs = getHistory();
        historyBody.innerHTML = '';

        let runningWalletBalance = 0;
        let weeklyProfit = 0;
        let monthlyProfit = 0;
        let annualProfit = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Retrieve current active dropdown filter selection states
        const selectedWeekday = weeklyFilterSelect ? weeklyFilterSelect.value : 'all-week';
        const selectedMonthWeek = monthlyFilterSelect ? monthlyFilterSelect.value : 'all-month';
        const selectedAnnualMonth = annualFilterSelect ? annualFilterSelect.value : 'all-year';

        if (currentLogs.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#9ca3af; padding:25px;">No historical calculations saved yet. Execute formulas above to compile logs.</td></tr>`;
            cumulativeProfitDisplay.textContent = "₦0";
            cumulativeProfitDisplay.className = "stats-val";
            
            if(weeklyProfitDisplay) weeklyProfitDisplay.textContent = "₦0";
            if(monthlyProfitDisplay) monthlyProfitDisplay.textContent = "₦0";
            if(annualProfitDisplay) annualProfitDisplay.textContent = "₦0";
            return;
        }

        currentLogs.forEach(entry => {
            const entryProfit = parseInt(entry.profit, 10);
            runningWalletBalance += entryProfit;

            const entryDate = parseCustomTimestamp(entry.timestamp);
            
            // 1. FILTER LOOP FOR THE WEEKLY SELECTOR MATRIX
            if (isCurrentWeek(entryDate)) {
                if (selectedWeekday === 'all-week') {
                    weeklyProfit += entryProfit;
                } else if (entryDate.getDay().toString() === selectedWeekday) {
                    weeklyProfit += entryProfit;
                }
            }
            
            // 2. FILTER LOOP FOR THE MONTHLY ROLLING WEEKS MATRIX
            if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
                if (selectedMonthWeek === 'all-month') {
                    monthlyProfit += entryProfit;
                } else if (getWeekOfMonth(entryDate) === selectedMonthWeek) {
                    monthlyProfit += entryProfit;
                }
            }
            
            // 3. FILTER LOOP FOR THE ANNUAL MONTHS MATRIX
            if (entryDate.getFullYear() === currentYear) {
                if (selectedAnnualMonth === 'all-year') {
                    annualProfit += entryProfit;
                } else if (entryDate.getMonth().toString() === selectedAnnualMonth) {
                    annualProfit += entryProfit;
                }
            }

            // Populate calculations table rows
            const tr = document.createElement('tr');
            const colorClass = entry.isProfitable ? 'text-green' : 'text-red';
            
            tr.innerHTML = `
                <td>${entry.timestamp}</td>
                <td>₦${parseInt(entry.totalStake, 10).toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                <td style="word-break: break-all; max-width:200px;">${entry.oddsSignature}</td>
                <td class="${colorClass}">₦${entryProfit.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                <td class="action-cell">
                    <button class="btn-secondary item-delete-trigger" data-id="${entry.id}" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button>
                </td>
            `;

            tr.querySelector('.item-delete-trigger').addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('data-id');
                let historyDataset = getHistory();
                let filteredDataset = historyDataset.filter(item => item.id !== targetId);
                saveHistory(filteredDataset);
            });

            historyBody.appendChild(tr);
        });

        // Round final calculations smoothly
        runningWalletBalance = Math.round(runningWalletBalance);
        
        cumulativeProfitDisplay.textContent = (runningWalletBalance >= 0 ? '+' : '') + '₦' + runningWalletBalance.toLocaleString('en-US', {
            maximumFractionDigits: 0
        });
        
        cumulativeProfitDisplay.className = runningWalletBalance >= 0 ? "stats-val" : "stats-val negative";

        // Assign formatted variables to your interactive UI slots
        if(weeklyProfitDisplay) {
            weeklyProfitDisplay.textContent = (weeklyProfit >= 0 ? '+' : '') + '₦' + Math.round(weeklyProfit).toLocaleString('en-US');
            weeklyProfitDisplay.style.color = weeklyProfit >= 0 ? '#10B981' : '#EF4444';
        }
        if(monthlyProfitDisplay) {
            monthlyProfitDisplay.textContent = (monthlyProfit >= 0 ? '+' : '') + '₦' + Math.round(monthlyProfit).toLocaleString('en-US');
            monthlyProfitDisplay.style.color = monthlyProfit >= 0 ? '#10B981' : '#EF4444';
        }
        if(annualProfitDisplay) {
            annualProfitDisplay.textContent = (annualProfit >= 0 ? '+' : '') + '₦' + Math.round(annualProfit).toLocaleString('en-US');
            annualProfitDisplay.style.color = annualProfit >= 0 ? '#10B981' : '#EF4444';
        }
    }

    // CSV Document Conversion & Safe Exporter Download Engine
    function exportToCSV() {
        const logs = getHistory();
        if (logs.length === 0) {
            alert("There are no logged entries available to export.");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date & Time,Total Stake (NGN),Allocated Odds,Net Profit (NGN)\n";

        logs.forEach(log => {
            const safeOdds = log.oddsSignature.replace(/ \/ /g, " | ");
            csvContent += `"${log.timestamp}","${log.totalStake}","${safeOdds}","${log.profit}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `arb_calculator_backup_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        
        link.click();
        document.body.removeChild(link);
    }

    // Initialize layout indices and values on screen load context
    reindexLabels();
    renderHistory();
});
