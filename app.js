(function () {
  const state = window.DashboardState;

  const fieldDefs = [
    { key: 'timeView', label: 'View', type: 'segmented', options: ['month', 'quarter', 'ytd'] },
    { key: 'month', label: 'Month', type: 'select' },
    { key: 'quarter', label: 'Quarter', type: 'select' },
    { key: 'region', label: 'Region', type: 'select' },
    { key: 'province', label: 'Province', type: 'select' },
    { key: 'hospitalTier', label: 'Hospital Tier', type: 'select' },
    { key: 'product', label: 'Product', type: 'select' },
    { key: 'dosageForm', label: 'Dosage Form', type: 'select' },
    { key: 'topN', label: 'Top N', type: 'select' },
    { key: 'metricView', label: 'Metric', type: 'select' }
  ];

  const tableColumns = [
    { key: 'rank', label: 'Rank', sortable: true },
    { key: 'hospitalName', label: 'Hospital', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    { key: 'province', label: 'Province', sortable: true },
    { key: 'currentMonthSales', label: 'Current Sales', sortable: true, fmt: money },
    { key: 'momGrowth', label: 'MoM Growth', sortable: true, fmt: pct },
    { key: 'hospitalTier', label: 'Tier', sortable: true },
    { key: 'dosageEmphasis', label: 'Form Emphasis', sortable: true },
    { key: 'contributionShare', label: 'Contribution', sortable: true, fmt: pct },
    { key: 'lastSixMonths', label: 'Last 6 Months', sortable: false, fmt: sixMonthFmt }
  ];

  let currentTheme = 'light';
  let tableSort = { key: 'momGrowth', dir: 'desc' };
  let currentVm = null;

  function money(v) {
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }

  function pct(v) {
    return `${(v * 100).toFixed(1)}%`;
  }

  function sixMonthFmt(values) {
    return values.map((v) => money(v)).join(' / ');
  }

  function trailingMonthLabels(currentMonth, count) {
    const [year, month] = currentMonth.split('-').map(Number);
    const labels = [];
    for (let i = count - 1; i >= 0; i--) {
      let y = year;
      let m = month - i;
      while (m <= 0) {
        y -= 1;
        m += 12;
      }
      labels.push(new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' }));
    }
    return labels;
  }

  function renderSparkBars(values, labels) {
    const max = Math.max(...values, 1);
    const bars = values.map((value, index) => {
      const height = Math.max(12, Math.round((value / max) * 44));
      const tone = index === values.length - 1 ? 'spark-bar current' : index === values.length - 2 ? 'spark-bar recent' : 'spark-bar';
      return `<div class="spark-slot" title="${labels[index]}: ${money(value)}"><div class="${tone}" style="height:${height}px"></div><div class="spark-label">${labels[index]}</div></div>`;
    }).join('');
    return `<div class="spark-wrap"><div class="spark-bars">${bars}</div></div>`;
  }

  function determineTheme() {
    const saved = localStorage.getItem('dashboard-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dashboard-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }

  function renderFilters(vm) {
    const options = state.getOptions();
    const container = document.getElementById('filterBar');
    const filters = vm.filters;

    container.innerHTML = '';
    fieldDefs.forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'flex flex-col gap-1';

      const label = document.createElement('label');
      label.className = 'text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400';
      label.textContent = f.label;
      wrap.appendChild(label);

      if (f.type === 'segmented') {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-3 rounded-lg overflow-hidden border border-slate-300/70 dark:border-slate-700/70';

        f.options.forEach((opt) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = opt.toUpperCase();
          b.className = `text-xs py-2 transition ${filters[f.key] === opt ? 'bg-blue-600 text-white' : 'bg-white/70 dark:bg-slate-900/30 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`;
          b.addEventListener('click', () => state.updateFilter(f.key, opt));
          row.appendChild(b);
        });
        wrap.appendChild(row);
      } else {
        const sel = document.createElement('select');
        sel.className = 'rounded-lg border border-slate-300/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/35 px-3 py-2 text-sm';

        const list = getOptionList(f.key, options);
        list.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (String(filters[f.key]) === String(opt)) o.selected = true;
          sel.appendChild(o);
        });

        sel.addEventListener('change', (e) => {
          const value = f.key === 'topN' ? Number(e.target.value) : e.target.value;
          state.updateFilter(f.key, value);
        });
        wrap.appendChild(sel);
      }

      container.appendChild(wrap);
    });
  }

  function getOptionList(key, options) {
    const withAll = (arr) => ['All', ...arr];
    if (key === 'month') return options.months;
    if (key === 'quarter') return options.quarters;
    if (key === 'region') return withAll(options.regions);
    if (key === 'province') return withAll(options.provinces);
    if (key === 'hospitalTier') return withAll(options.tiers);
    if (key === 'product') return withAll(options.products);
    if (key === 'dosageForm') return withAll(options.dosageForms);
    if (key === 'topN') return options.topNOptions;
    if (key === 'metricView') return options.metricViews;
    return [];
  }

  function renderActiveChips(filters) {
    const container = document.getElementById('activeChips');
    container.innerHTML = '';

    Object.entries(filters).forEach(([key, value]) => {
      if (['month', 'quarter', 'timeView', 'topN', 'metricView'].includes(key)) return;
      if (value === 'All') return;
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = `${key}: ${value} ×`;
      chip.addEventListener('click', () => state.updateFilter(key, 'All'));
      container.appendChild(chip);
    });
  }

  function renderKpis(kpis) {
    const cards = [
      { label: 'Total Sales', value: money(kpis.totalSales), note: 'Current period aggregate' },
      { label: 'Target Attainment', value: pct(kpis.attainment), note: 'Sales vs target in scope' },
      { label: 'Monthly Completion Rate', value: pct(kpis.monthlyCompletionRate), note: 'Selected month performance' },
      { label: 'Quarterly Completion Rate', value: pct(kpis.quarterlyCompletionRate), note: 'Selected quarter completion' },
      { label: 'Quarterly Contribution', value: pct(kpis.quarterlyContribution), note: 'Quarter share of annual sales' },
      { label: 'MoM Growth', value: pct(kpis.momGrowth), note: 'Period vs immediate prior' },
      { label: 'YoY Growth', value: pct(kpis.yoyGrowth), note: 'Period vs same period last year' }
    ];

    const container = document.getElementById('kpiCards');
    container.innerHTML = '';
    cards.forEach((c) => {
      const el = document.createElement('div');
      el.className = 'card p-4';
      el.innerHTML = `<div class="kpi-label">${c.label}</div><div class="kpi-value mt-2">${c.value}</div><div class="mt-2 text-xs text-slate-500 dark:text-slate-400">${c.note}</div>`;
      container.appendChild(el);
    });

    const timePct = Math.max(0, Math.min(1, kpis.timeProgress));
    const attainPct = Math.max(0, Math.min(1.2, kpis.attainProgress));
    document.getElementById('timeProgressBar').style.width = `${timePct * 100}%`;
    const attainBar = document.getElementById('attainProgressBar');
    attainBar.style.width = `${Math.min(100, attainPct * 100)}%`;

    const diff = attainPct - timePct;
    const traffic = document.getElementById('trafficLight');
    const narrative = document.getElementById('pacingNarrative');
    if (diff > 0.03) {
      traffic.textContent = 'Ahead';
      traffic.style.background = 'rgba(16, 185, 129, 0.16)';
      traffic.style.color = '#10b981';
      attainBar.style.background = '#10b981';
      narrative.textContent = 'Portfolio performance is tracking ahead of quarterly pacing in multiple regions.';
    } else if (diff < -0.03) {
      traffic.textContent = 'Behind';
      traffic.style.background = 'rgba(239, 68, 68, 0.16)';
      traffic.style.color = '#ef4444';
      attainBar.style.background = '#ef4444';
      narrative.textContent = 'Selected scope is behind pacing and requires targeted intervention to close the gap.';
    } else {
      traffic.textContent = 'Watch';
      traffic.style.background = 'rgba(245, 158, 11, 0.16)';
      traffic.style.color = '#f59e0b';
      attainBar.style.background = '#f59e0b';
      narrative.textContent = 'Performance remains close to pacing; priority should be on consistency in execution.';
    }
  }

  function renderRegionalInsights(vm) {
    const container = document.getElementById('regionalInsights');
    const byContribution = vm.regionalBubble.slice().sort((a, b) => b.contribution - a.contribution);
    const byGrowth = vm.regionalBubble.slice().sort((a, b) => b.growthRate - a.growthRate);
    const top = byContribution[0];
    const aheadButSlowing = vm.regionalBubble
      .filter((d) => d.pacingGap > 0.02 && d.growthRate < 0)
      .sort((a, b) => b.contribution - a.contribution)[0];
    const behindButImproving = byGrowth.find((d) => d.pacingGap < 0 && d.growthRate > 0.02);
    const watch = vm.regionalBubble
      .slice()
      .sort((a, b) => (Math.abs(a.pacingGap) + Math.abs(a.growthRate)) - (Math.abs(b.pacingGap) + Math.abs(b.growthRate)))[0];

    const lines = [
      `Largest contribution sits in <strong>${top ? top.region : 'N/A'}</strong> at ${top ? pct(top.contribution) : '-'} share, making that province the primary volume anchor.`,
      aheadButSlowing
        ? `<strong>${aheadButSlowing.region}</strong> remains ahead of pacing but has moved into slower month-on-month growth, which makes execution quality the priority.`
        : `Leading provinces are still holding positive pacing, with no major deceleration signal in the current month.`,
      behindButImproving
        ? `<strong>${behindButImproving.region}</strong> is still behind target pacing but is improving month on month, indicating recovery potential.`
        : `Under-pacing provinces are not yet showing enough recovery to change the near-term outlook.`,
      `<strong>${watch ? watch.region : 'N/A'}</strong> sits closest to the center line as a watchlist market, while bubble size signals how much each province matters to portfolio delivery.`
    ];

    container.innerHTML = lines.map((t) => `<li class="leading-6">${t}</li>`).join('');
  }

  function renderSquadCards(squadPerformance) {
    const container = document.getElementById('squadKpiCards');
    container.innerHTML = '';
    squadPerformance.slice(0, 3).forEach((row) => {
      const card = document.createElement('div');
      card.className = 'card p-4';
      card.innerHTML = `
        <div class="kpi-label">${row.salesSquad}</div>
        <div class="mt-2 text-sm text-slate-600 dark:text-slate-300">Quarter contribution ${pct(row.quarterContribution)}</div>
        <div class="mt-1 text-sm text-slate-600 dark:text-slate-300">Quarter completion ${pct(row.quarterCompletion)}</div>
        <div class="mt-1 text-sm ${row.monthlyGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}">Monthly growth ${pct(row.monthlyGrowth)}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderTierCounts(tierSummary) {
    const container = document.getElementById('tierCountCards');
    container.innerHTML = '';
    tierSummary.forEach((t) => {
      const el = document.createElement('div');
      el.className = 'rounded-lg border border-slate-300/70 dark:border-slate-700/70 p-3';
      el.innerHTML = `<div class="kpi-label">${t.tier} Hospitals</div><div class="kpi-value mt-1">${t.hospitalCount}</div>`;
      container.appendChild(el);
    });
  }

  function renderHospitalTable(vm) {
    const head = document.getElementById('hospitalTableHead');
    const body = document.getElementById('hospitalTableBody');

    head.innerHTML = '';
    tableColumns.forEach((col) => {
      const th = document.createElement('th');
      th.className = `text-left border-b border-slate-300/60 dark:border-slate-700/70 px-3 py-2 text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 ${col.sortable ? 'table-sortable' : ''}`;
      th.textContent = `${col.label}${col.sortable && tableSort.key === col.key ? (tableSort.dir === 'asc' ? ' ↑' : ' ↓') : ''}`;
      if (col.sortable) {
        th.addEventListener('click', () => {
          if (tableSort.key === col.key) {
            tableSort.dir = tableSort.dir === 'asc' ? 'desc' : 'asc';
          } else {
            tableSort = { key: col.key, dir: 'desc' };
          }
          renderHospitalTable(currentVm);
        });
      }
      head.appendChild(th);
    });

    const sorted = vm.hospitalGrowth.slice().sort((a, b) => {
      const va = a[tableSort.key];
      const vb = b[tableSort.key];
      const dir = tableSort.dir === 'asc' ? 1 : -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });

    const sparkLabels = trailingMonthLabels(currentVm.filters.month, 6);
    body.innerHTML = '';
    sorted.forEach((row) => {
      const tr = document.createElement('tr');
      tr.className = 'hospital-table-row hover:bg-blue-50/70 dark:hover:bg-blue-900/20 cursor-pointer transition';
      tr.addEventListener('click', () => renderHospitalDrawer(row));

      tableColumns.forEach((col) => {
        const td = document.createElement('td');
        td.className = col.key === 'lastSixMonths'
          ? 'hospital-table-cell spark-cell border-b border-slate-200/60 dark:border-slate-800/70'
          : 'hospital-table-cell border-b border-slate-200/60 dark:border-slate-800/70';
        const val = row[col.key];
        if (col.key === 'lastSixMonths') {
          td.innerHTML = renderSparkBars(val, sparkLabels);
        } else {
          td.textContent = col.fmt ? col.fmt(val) : String(val);
        }
        tr.appendChild(td);
      });

      body.appendChild(tr);
    });
  }

  function renderHospitalDrawer(row) {
    const drawer = document.getElementById('hospitalDrawer');
    drawer.className = 'mt-4 rounded-lg border border-slate-300/70 dark:border-slate-700/70 p-4 block';

    const bars = row.lastSixMonths.map((value) => {
      const h = Math.max(8, (value / Math.max(...row.lastSixMonths)) * 80);
      return `<div class="flex-1"><div class="bg-blue-500/80 rounded-t" style="height:${h}px"></div></div>`;
    }).join('');

    drawer.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div class="kpi-label">Hospital Drill-down</div>
          <div class="kpi-value mt-1">${row.hospitalName}</div>
          <div class="text-sm text-slate-600 dark:text-slate-300 mt-1">${row.region} | ${row.province} | ${row.hospitalTier} | ${row.dosageEmphasis}</div>
        </div>
        <div class="text-sm text-slate-600 dark:text-slate-300">
          Current: ${money(row.currentMonthSales)}<br/>
          MoM Growth: ${pct(row.momGrowth)}<br/>
          Contribution: ${pct(row.contributionShare)}
        </div>
      </div>
      <div class="mt-4">
        <div class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">Last 6 months sales trend</div>
        <div class="h-24 flex items-end gap-2">${bars}</div>
      </div>
    `;
  }

  function renderAlerts(alerts) {
    const container = document.getElementById('alertCards');
    const cards = [
      {
        title: 'Provinces Below Pacing',
        text: alerts.provincePacing.length
          ? alerts.provincePacing.map((x) => `${x.province} (${pct(x.completion)})`).join(', ')
          : 'No province currently below pacing threshold.'
      },
      {
        title: 'Squads Below Quarter Benchmark',
        text: alerts.squadAlerts.length
          ? alerts.squadAlerts.map((x) => `${x.salesSquad} (${pct(x.quarterCompletion)})`).join(', ')
          : 'All tracked squads are above the quarter benchmark.'
      },
      {
        title: 'Slowing Product-Form Combinations',
        text: alerts.comboAlerts.length
          ? alerts.comboAlerts.map((x) => `${x.product} ${x.dosageForm} (${pct(x.growth)})`).join(', ')
          : 'No major product-form deceleration in selected scope.'
      },
      {
        title: 'Tier Growth Warning',
        text: alerts.tierAlerts.length
          ? alerts.tierAlerts.map((x) => `${x.tier} (${pct(x.monthlyGrowth)})`).join(', ')
          : 'Tier growth is stable across segments.'
      }
    ];

    container.innerHTML = cards.map((card) => `
      <div class="rounded-lg border border-slate-300/70 dark:border-slate-700/70 p-3 hover:border-blue-400/60 transition">
        <div class="kpi-label">${card.title}</div>
        <div class="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-6">${card.text}</div>
      </div>
    `).join('');
  }

  function render(vm) {
    currentVm = vm;
    renderFilters(vm);
    renderActiveChips(vm.filters);
    renderKpis(vm.kpis);
    renderRegionalInsights(vm);
    renderSquadCards(vm.squadPerformance);
    renderTierCounts(vm.tierSummary);
    renderHospitalTable(vm);
    renderAlerts(vm.alerts);
    window.DashboardCharts.renderAll(vm, currentTheme);
  }

  function bindStaticEvents() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
      state.notify();
    });

    document.getElementById('resetFilters').addEventListener('click', () => state.resetFilters());

    window.addEventListener('resize', () => window.DashboardCharts.resizeAll());

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('in');
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  function init() {
    state.init(window.dashboardData);
    applyTheme(determineTheme());
    bindStaticEvents();
    state.subscribe(render);
    state.notify();
    document.getElementById('copyright').textContent = `© ${new Date().getFullYear()} Leou Jia. All rights reserved.`;
  }

  init();
})();
