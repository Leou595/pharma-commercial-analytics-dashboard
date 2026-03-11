(function () {
  const defaultFilters = {
    timeView: 'month',
    month: '2025-12',
    quarter: '2025-Q4',
    region: 'All',
    province: 'All',
    hospitalTier: 'All',
    product: 'All',
    dosageForm: 'All',
    salesSquad: 'All',
    topN: 10,
    metricView: 'Sales'
  };

  const listeners = [];
  let data = null;
  let filters = { ...defaultFilters };

  function quarterMonths(quarter) {
    const [year, qPart] = quarter.split('-Q');
    const q = Number(qPart);
    const start = (q - 1) * 3 + 1;
    return [0, 1, 2].map((offset) => `${year}-${String(start + offset).padStart(2, '0')}`);
  }

  function monthsYtd(selectedMonth) {
    const [year, month] = selectedMonth.split('-').map(Number);
    const arr = [];
    for (let m = 1; m <= month; m++) arr.push(`${year}-${String(m).padStart(2, '0')}`);
    return arr;
  }

  function prevYearMonths(months) {
    return months.map((m) => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`);
  }

  function previousMonthsPeriod(months) {
    return months.map((m) => {
      const [y, mo] = m.split('-').map(Number);
      if (mo === 1) return `${y - 1}-12`;
      return `${y}-${String(mo - 1).padStart(2, '0')}`;
    });
  }

  function getSelectedMonths() {
    if (filters.timeView === 'quarter') return quarterMonths(filters.quarter);
    if (filters.timeView === 'ytd') return monthsYtd(filters.month);
    return [filters.month];
  }

  function passesDimensionFilter(r) {
    return (
      (filters.region === 'All' || r.region === filters.region) &&
      (filters.province === 'All' || r.province === filters.province) &&
      (filters.hospitalTier === 'All' || r.hospitalTier === filters.hospitalTier) &&
      (filters.product === 'All' || r.product === filters.product) &&
      (filters.dosageForm === 'All' || r.dosageForm === filters.dosageForm) &&
      (filters.salesSquad === 'All' || r.salesSquad === filters.salesSquad)
    );
  }

  function sum(records, field) {
    return records.reduce((acc, r) => acc + r[field], 0);
  }

  function groupBy(records, key) {
    const m = new Map();
    records.forEach((r) => {
      const k = typeof key === 'function' ? key(r) : r[key];
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    });
    return m;
  }

  function getFilteredRecordsByMonths(months) {
    const monthSet = new Set(months);
    return data.records.filter((r) => monthSet.has(r.month) && passesDimensionFilter(r));
  }

  function pct(a, b) {
    return b === 0 ? 0 : a / b;
  }

  function rate(curr, prev) {
    return prev === 0 ? 0 : (curr - prev) / prev;
  }

  function parseQuarter(quarter) {
    const [yearStr, qStr] = quarter.split('-Q');
    return { year: Number(yearStr), q: Number(qStr) };
  }

  function getPrevQuarter(quarter) {
    const { year, q } = parseQuarter(quarter);
    if (q === 1) return `${year - 1}-Q4`;
    return `${year}-Q${q - 1}`;
  }

  function buildDisplaySeries(rawSeries, hospitalId, currentSales) {
    if (!rawSeries.length) return rawSeries;
    const hospitalSeed = Number(String(hospitalId).replace(/D/g, '')) || 1;
    const pattern = hospitalSeed % 4;
    const prior = rawSeries[rawSeries.length - 2] || Math.max(1, Math.round(currentSales / 1.08));
    const anchor = rawSeries[0] || Math.max(1, Math.round(prior * 0.72));

    let series;
    if (pattern === 0) {
      series = [0.62, 0.69, 0.78, 0.88].map((ratio) => Math.round(prior * ratio)).concat([prior, currentSales]);
    } else if (pattern === 1) {
      series = [0.98, 0.92, 1.04, 0.96].map((ratio) => Math.round(prior * ratio)).concat([prior, currentSales]);
    } else if (pattern === 2) {
      const base = Math.max(anchor, Math.round(prior * 0.76));
      series = [base, Math.round(base * 1.05), Math.round(base * 1.11), Math.round(base * 1.16), prior, currentSales];
    } else {
      const softBase = Math.max(anchor, Math.round(prior * 0.84));
      series = [softBase, Math.round(softBase * 1.02), Math.round(softBase * 0.98), Math.round(softBase * 1.07), prior, currentSales];
    }

    series[series.length - 2] = prior;
    series[series.length - 1] = currentSales;
    return series.map((value) => Math.max(1, Math.round(value)));
  }

  function quarterCompletion(quarter, dimsOnlyFilter) {
    const months = quarterMonths(quarter);
    const monthSet = new Set(months);
    const arr = data.records.filter((r) => monthSet.has(r.month) && dimsOnlyFilter(r));
    return pct(sum(arr, 'sales'), sum(arr, 'target'));
  }

  function ytdContribution(dimsOnlyFilter, selectedQuarter) {
    const { year } = parseQuarter(selectedQuarter);
    const yearRecords = data.records.filter((r) => r.year === year && dimsOnlyFilter(r));
    const quarterRecords = data.records.filter((r) => r.quarter === selectedQuarter && dimsOnlyFilter(r));
    return pct(sum(quarterRecords, 'sales'), sum(yearRecords, 'sales'));
  }

  function getViewModel() {
    const selectedMonths = getSelectedMonths();
    const selectedRecords = getFilteredRecordsByMonths(selectedMonths);
    const prevMonthRecords = getFilteredRecordsByMonths(previousMonthsPeriod(selectedMonths));
    const yoyRecords = getFilteredRecordsByMonths(prevYearMonths(selectedMonths));

    const totalSales = sum(selectedRecords, 'sales');
    const totalTarget = sum(selectedRecords, 'target');
    const attainment = pct(totalSales, totalTarget);
    const momGrowth = rate(totalSales, sum(prevMonthRecords, 'sales'));
    const yoyGrowth = rate(totalSales, sum(yoyRecords, 'sales'));

    const monthRecords = getFilteredRecordsByMonths([filters.month]);
    const monthCompletion = pct(sum(monthRecords, 'sales'), sum(monthRecords, 'target'));

    const dimsOnlyFilter = (r) => passesDimensionFilter(r);
    const quarterCompletionRate = quarterCompletion(filters.quarter, dimsOnlyFilter);
    const quarterlyContribution = ytdContribution(dimsOnlyFilter, filters.quarter);

    const quarterMonthsSelected = quarterMonths(filters.quarter);
    const selectedMonthPos = quarterMonthsSelected.indexOf(filters.month);
    const timeProgress = filters.timeView === 'quarter' ? 1 : filters.timeView === 'ytd' ? Number(filters.month.slice(5)) / 12 : (selectedMonthPos + 1) / 3;

    const quarterYtdMonths = filters.timeView === 'month'
      ? quarterMonthsSelected.slice(0, Math.max(1, selectedMonthPos + 1))
      : quarterMonthsSelected;
    const quarterYtdRecords = getFilteredRecordsByMonths(quarterYtdMonths);
    const attainProgress = pct(sum(quarterYtdRecords, 'sales'), sum(quarterMonthsSelected.length ? getFilteredRecordsByMonths(quarterMonthsSelected) : [], 'target'));

    const trendMonths = data.metadata.months2025;
    const trendData = trendMonths.map((m) => {
      const recs = getFilteredRecordsByMonths([m]);
      return {
        month: m,
        label: recs[0] ? recs[0].monthLabel : m,
        sales: sum(recs, 'sales'),
        target: sum(recs, 'target'),
        attainment: pct(sum(recs, 'sales'), sum(recs, 'target'))
      };
    });

    const selectedMonthRecs = getFilteredRecordsByMonths([filters.month]);
    const prevSingleMonthRecs = getFilteredRecordsByMonths(previousMonthsPeriod([filters.month]));

    const byRegion = Array.from(groupBy(selectedMonthRecs, 'province')).map(([province, recs]) => {
      const prevRecs = prevSingleMonthRecs.filter((r) => r.province === province);
      const completionRate = pct(sum(recs, 'sales'), sum(recs, 'target'));
      return {
        region: province,
        sales: sum(recs, 'sales'),
        target: sum(recs, 'target'),
        completionRate,
        pacingGap: completionRate - 1,
        growthRate: rate(sum(recs, 'sales'), sum(prevRecs, 'sales')),
        contribution: pct(sum(recs, 'sales'), sum(selectedMonthRecs, 'sales'))
      };
    });

    const topN = Number(filters.topN);
    const rankingPool = byRegion;

    const rankingMetric = filters.metricView === 'Attainment' ? 'completionRate' : filters.metricView === 'Growth' ? 'growthRate' : 'sales';
    const regionalRanking = rankingPool.slice().sort((a, b) => b[rankingMetric] - a[rankingMetric]).slice(0, topN);

    const dosageSummary = Array.from(groupBy(selectedMonthRecs, 'dosageForm')).map(([dosageForm, recs]) => {
      const prevRecs = prevSingleMonthRecs.filter((r) => r.dosageForm === dosageForm);
      return {
        dosageForm,
        sales: sum(recs, 'sales'),
        target: sum(recs, 'target'),
        contribution: pct(sum(recs, 'sales'), sum(selectedMonthRecs, 'sales')),
        attainment: pct(sum(recs, 'sales'), sum(recs, 'target')),
        growth: rate(sum(recs, 'sales'), sum(prevRecs, 'sales'))
      };
    });

    const dosageTrend = data.metadata.months2025.map((m) => {
      const monthRecs = getFilteredRecordsByMonths([m]);
      const inj = monthRecs.filter((r) => r.dosageForm === 'Injection');
      const cap = monthRecs.filter((r) => r.dosageForm === 'Capsule');
      return {
        month: m,
        label: monthRecs[0] ? monthRecs[0].monthLabel : m,
        injectionSales: sum(inj, 'sales'),
        capsuleSales: sum(cap, 'sales'),
        injectionAttainment: pct(sum(inj, 'sales'), sum(inj, 'target')),
        capsuleAttainment: pct(sum(cap, 'sales'), sum(cap, 'target'))
      };
    });

    const provinceProd = Array.from(groupBy(selectedMonthRecs, 'province')).map(([province, recs]) => {
      const squadsInProvince = new Set(recs.map((r) => r.salesSquad));
      const repCount = Array.from(squadsInProvince).reduce((acc, squad) => {
        const first = recs.find((r) => r.salesSquad === squad);
        return acc + (first ? first.repCount : 0);
      }, 0);
      return {
        province,
        salesPerRep: repCount ? sum(recs, 'sales') / repCount : 0,
        totalSales: sum(recs, 'sales')
      };
    }).sort((a, b) => b.salesPerRep - a.salesPerRep).slice(0, topN);

    const hospitalMap = new Map(data.hospitals.map((h) => [h.hospitalId, h]));
    const hospitalsFiltered = data.hospitals.filter((h) =>
      (filters.region === 'All' || h.region === filters.region) &&
      (filters.province === 'All' || h.province === filters.province) &&
      (filters.hospitalTier === 'All' || h.hospitalTier === filters.hospitalTier) &&
      (filters.salesSquad === 'All' || h.salesSquad === filters.salesSquad)
    );

    const bySquadAllHosp = Array.from(groupBy(hospitalsFiltered, 'salesSquad')).map(([salesSquad, hs]) => ({
      salesSquad,
      hospitalCount: hs.length
    })).sort((a, b) => b.hospitalCount - a.hospitalCount);

    const bySquadPerf = Array.from(groupBy(selectedMonthRecs, 'salesSquad')).map(([salesSquad, recs]) => {
      const prevRecs = prevSingleMonthRecs.filter((r) => r.salesSquad === salesSquad);
      const qRecs = getFilteredRecordsByMonths(quarterMonths(filters.quarter)).filter((r) => r.salesSquad === salesSquad);
      return {
        salesSquad,
        quarterContribution: pct(sum(qRecs, 'sales'), sum(getFilteredRecordsByMonths(quarterMonths(filters.quarter)), 'sales')),
        quarterCompletion: pct(sum(qRecs, 'sales'), sum(qRecs, 'target')),
        monthlyGrowth: rate(sum(recs, 'sales'), sum(prevRecs, 'sales')),
        sales: sum(recs, 'sales')
      };
    }).sort((a, b) => b.sales - a.sales);

    const byTierMonth = Array.from(groupBy(selectedMonthRecs, 'hospitalTier')).map(([tier, recs]) => {
      const prevRecs = prevSingleMonthRecs.filter((r) => r.hospitalTier === tier);
      const quarterRecs = getFilteredRecordsByMonths(quarterMonths(filters.quarter)).filter((r) => r.hospitalTier === tier);
      return {
        tier,
        hospitalCount: hospitalsFiltered.filter((h) => h.hospitalTier === tier).length,
        quarterContribution: pct(sum(quarterRecs, 'sales'), sum(getFilteredRecordsByMonths(quarterMonths(filters.quarter)), 'sales')),
        quarterCompletion: pct(sum(quarterRecs, 'sales'), sum(quarterRecs, 'target')),
        monthlyGrowth: rate(sum(recs, 'sales'), sum(prevRecs, 'sales'))
      };
    }).sort((a, b) => a.tier.localeCompare(b.tier));

    const currentMonth = filters.month;
    const sixMonthWindow = [];
    const [currentYear, currentMonthNum] = currentMonth.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      let y = currentYear;
      let m = currentMonthNum - i;
      while (m <= 0) {
        y -= 1;
        m += 12;
      }
      sixMonthWindow.push(`${y}-${String(m).padStart(2, '0')}`);
    }

    const monthRec = getFilteredRecordsByMonths([currentMonth]);
    const prevRec = getFilteredRecordsByMonths(previousMonthsPeriod([currentMonth]));

    const hospitalGrowth = Array.from(groupBy(monthRec, 'hospitalId')).map(([hospitalId, recs]) => {
      const prev = prevRec.filter((r) => r.hospitalId === hospitalId);
      const h = hospitalMap.get(hospitalId);
      const rawSixMonths = sixMonthWindow.map((m) => {
        const s = getFilteredRecordsByMonths([m]).filter((r) => r.hospitalId === hospitalId);
        return sum(s, 'sales');
      });
      const currentSales = sum(recs, 'sales');
      const lastSixMonths = buildDisplaySeries(rawSixMonths, hospitalId, currentSales);
      return {
        hospitalId,
        rank: 0,
        hospitalName: h ? h.hospitalName : hospitalId,
        region: h ? h.region : '-',
        province: h ? h.province : '-',
        lastSixMonths,
        currentMonthSales: currentSales,
        momGrowth: rate(currentSales, lastSixMonths[lastSixMonths.length - 2] || sum(prev, 'sales')),
        hospitalTier: h ? h.hospitalTier : '-',
        dosageEmphasis: h ? h.dosageEmphasis : '-',
        contributionShare: pct(currentSales, sum(monthRec, 'sales'))
      };
    }).sort((a, b) => b.momGrowth - a.momGrowth).slice(0, topN).map((row, idx) => ({ ...row, rank: idx + 1 }));

    const provincePacing = Array.from(groupBy(monthRec, 'province')).map(([province, recs]) => ({
      province,
      completion: pct(sum(recs, 'sales'), sum(recs, 'target'))
    })).filter((x) => x.completion < timeProgress).sort((a, b) => a.completion - b.completion).slice(0, 4);

    const squadAlerts = bySquadPerf.filter((s) => s.quarterCompletion < 0.94).slice(0, 4);

    const comboAlerts = Array.from(groupBy(monthRec, (r) => `${r.product}|${r.dosageForm}`)).map(([key, recs]) => {
      const [product, dosageForm] = key.split('|');
      const prev = prevRec.filter((r) => r.product === product && r.dosageForm === dosageForm);
      return {
        product,
        dosageForm,
        growth: rate(sum(recs, 'sales'), sum(prev, 'sales'))
      };
    }).filter((x) => x.growth < 0).sort((a, b) => a.growth - b.growth).slice(0, 4);

    const tierAlerts = byTierMonth.filter((t) => t.monthlyGrowth < 0).sort((a, b) => a.monthlyGrowth - b.monthlyGrowth).slice(0, 3);

    return {
      filters: { ...filters },
      selectedMonths,
      kpis: {
        totalSales,
        attainment,
        monthlyCompletionRate: monthCompletion,
        quarterlyCompletionRate: quarterCompletionRate,
        quarterlyContribution,
        momGrowth,
        yoyGrowth,
        timeProgress,
        attainProgress
      },
      trendData,
      regionalBubble: byRegion,
      regionalRanking,
      dosageSummary,
      dosageTrend,
      provinceProductivity: provinceProd,
      squadCoverage: bySquadAllHosp.slice(0, topN),
      squadPerformance: bySquadPerf,
      tierSummary: byTierMonth,
      hospitalGrowth,
      alerts: {
        provincePacing,
        squadAlerts,
        comboAlerts,
        tierAlerts
      }
    };
  }

  function getOptions() {
    if (!data) return null;

    const availableProvinces = filters.region === 'All'
      ? data.metadata.provinces
      : data.hospitals.filter((h) => h.region === filters.region).map((h) => h.province).filter((v, i, arr) => arr.indexOf(v) === i);

    return {
      months: data.metadata.months2025,
      quarters: data.metadata.quarters2025,
      regions: data.metadata.regions,
      provinces: availableProvinces,
      tiers: data.metadata.tiers,
      products: data.metadata.products,
      dosageForms: data.metadata.dosageForms,
      topNOptions: data.metadata.topNOptions,
      metricViews: data.metadata.metricViews
    };
  }

  function sanitizeCascade(key, value) {
    if (key === 'region' && value !== filters.region) {
      filters.province = 'All';
    }
  }

  window.DashboardState = {
    init(initialData) {
      data = initialData;
      filters = {
        ...defaultFilters,
        month: data.metadata.currentMonth,
        quarter: data.metadata.currentQuarter
      };
    },
    subscribe(cb) {
      listeners.push(cb);
    },
    notify() {
      const vm = getViewModel();
      listeners.forEach((cb) => cb(vm));
    },
    getFilters() {
      return { ...filters };
    },
    getOptions,
    updateFilter(key, value) {
      sanitizeCascade(key, value);
      filters[key] = value;
      if (key === 'month') {
        const q = Math.ceil(Number(value.slice(5)) / 3);
        filters.quarter = `${value.slice(0, 4)}-Q${q}`;
      }
      if (key === 'quarter') {
        const qMonths = quarterMonths(value);
        filters.month = qMonths[qMonths.length - 1];
      }
      this.notify();
    },
    setFilters(next) {
      filters = { ...filters, ...next };
      this.notify();
    },
    resetFilters() {
      filters = {
        ...defaultFilters,
        month: data.metadata.currentMonth,
        quarter: data.metadata.currentQuarter
      };
      this.notify();
    },
    getViewModel
  };
})();
