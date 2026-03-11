(function () {
  const chartRefs = {};

  function ensureChart(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (!chartRefs[id]) chartRefs[id] = echarts.init(el);
    return chartRefs[id];
  }

  function pct(v) {
    return `${(v * 100).toFixed(1)}%`;
  }

  function money(v) {
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }

  function palette(theme) {
    return theme === 'dark'
      ? {
          text: '#d5e1f8',
          axis: '#7f95b8',
          split: 'rgba(120,146,198,0.25)',
          blues: ['#5f8cff', '#4ab0ff', '#8ab5ff', '#7dd3fc', '#38bdf8'],
          green: '#2dd4bf',
          amber: '#fbbf24',
          red: '#fb7185'
        }
      : {
          text: '#0f1f45',
          axis: '#5b6f94',
          split: 'rgba(38,75,145,0.14)',
          blues: ['#1f5eff', '#2f7eff', '#4e97ff', '#2ba5f7', '#5bc0eb'],
          green: '#0ea5a4',
          amber: '#f59e0b',
          red: '#ef4444'
        };
  }

  function bindClick(chart, handler) {
    if (!chart) return;
    chart.off('click');
    chart.on('click', handler);
  }

  function renderTrend(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('trendChart');
    if (!chart) return;

    chart.setOption({
      animationDuration: 500,
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
      tooltip: { trigger: 'axis', transitionDuration: 0.2 },
      legend: { data: ['Sales', 'Target', 'Attainment'], textStyle: { color: colors.axis }, top: 2 },
      xAxis: {
        type: 'category',
        data: vm.trendData.map((d) => d.label),
        axisLabel: { color: colors.axis },
        axisLine: { lineStyle: { color: colors.split } }
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { color: colors.axis, formatter: (v) => money(v) },
          splitLine: { lineStyle: { color: colors.split } }
        },
        {
          type: 'value',
          axisLabel: { color: colors.axis, formatter: (v) => `${(v * 100).toFixed(0)}%` },
          min: 0.7,
          max: 1.25,
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Sales',
          type: 'line',
          smooth: 0.28,
          areaStyle: { opacity: 0.18 },
          data: vm.trendData.map((d) => d.sales),
          lineStyle: { width: 2.5, color: colors.blues[0] },
          itemStyle: { color: colors.blues[0] }
        },
        {
          name: 'Target',
          type: 'bar',
          yAxisIndex: 0,
          barMaxWidth: 18,
          itemStyle: { color: colors.blues[2], opacity: 0.4 },
          data: vm.trendData.map((d) => d.target)
        },
        {
          name: 'Attainment',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: vm.trendData.map((d) => Number(d.attainment.toFixed(3))),
          lineStyle: { color: colors.green, width: 2 },
          itemStyle: { color: colors.green }
        }
      ]
    });

    bindClick(chart, (params) => {
      if (params.componentType === 'series') {
        const target = vm.trendData[params.dataIndex];
        if (target) window.DashboardState.updateFilter('month', target.month);
      }
    });
  }

  function renderRegionalBubble(vm, theme) {
    const chart = ensureChart('regionalBubbleChart');
    if (!chart) return;

    const bubblePalette = ['#4f7cff', '#4aa4ff', '#34c6d3', '#2d8fff', '#5bb8ff'];
    const labelName = (name) => name.replace(' Region', '').replace(' Province', '');
    const rangeWithZero = (values, minSpan) => {
      const rawMin = Math.min(...values, 0);
      const rawMax = Math.max(...values, 0);
      const span = Math.max(rawMax - rawMin, minSpan);
      const center = (rawMax + rawMin) / 2;
      const half = span / 2;
      const pad = span * 0.16;
      return [Number((center - half - pad).toFixed(3)), Number((center + half + pad).toFixed(3))];
    };

    const xRange = rangeWithZero(vm.regionalBubble.map((d) => d.pacingGap), 0.14);
    const yRange = rangeWithZero(vm.regionalBubble.map((d) => d.growthRate), 0.12);

    chart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 450,
      grid: { left: 58, right: 18, top: 42, bottom: 42 },
      tooltip: {
        backgroundColor: 'rgba(8, 18, 40, 0.94)',
        borderColor: 'rgba(164, 191, 235, 0.24)',
        textStyle: { color: '#edf4ff' },
        formatter: (p) => {
          const d = p.data.meta;
          return `<strong>${d.region}</strong><br/>Province: ${d.region}<br/>Pacing Gap: ${pct(d.pacingGap)}<br/>Monthly Growth: ${pct(d.growthRate)}<br/>Contribution: ${pct(d.contribution)}<br/>Sales: ${money(d.sales)}`;
        }
      },
      xAxis: {
        type: 'value',
        name: 'Pacing Gap vs Target',
        nameLocation: 'middle',
        nameGap: 30,
        min: xRange[0],
        max: xRange[1],
        splitNumber: 5,
        axisLabel: { color: 'rgba(216, 229, 252, 0.78)', formatter: (v) => `${Math.round(v * 100)}%` },
        axisLine: { onZero: true, lineStyle: { color: 'rgba(226, 236, 255, 0.58)', width: 1.2 } },
        axisTick: { show: true, lineStyle: { color: 'rgba(226, 236, 255, 0.42)' } },
        splitLine: { lineStyle: { color: 'rgba(206, 223, 255, 0.10)', type: 'dashed' } },
        nameTextStyle: { color: 'rgba(236, 243, 255, 0.88)', fontWeight: 600, fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        name: 'Monthly Growth',
        nameLocation: 'middle',
        nameGap: 42,
        min: yRange[0],
        max: yRange[1],
        splitNumber: 5,
        axisLabel: { color: 'rgba(216, 229, 252, 0.78)', formatter: (v) => `${Math.round(v * 100)}%` },
        axisLine: { onZero: true, lineStyle: { color: 'rgba(226, 236, 255, 0.58)', width: 1.2 } },
        axisTick: { show: true, lineStyle: { color: 'rgba(226, 236, 255, 0.42)' } },
        splitLine: { lineStyle: { color: 'rgba(206, 223, 255, 0.10)', type: 'dashed' } },
        nameTextStyle: { color: 'rgba(236, 243, 255, 0.88)', fontWeight: 600, fontSize: 12 }
      },
      series: [
        {
          type: 'scatter',
          data: vm.regionalBubble.map((d, idx) => ({
            name: d.region,
            value: [d.pacingGap, d.growthRate, d.contribution, d.sales],
            symbolSize: Math.max(46, Math.min(96, 30 + d.contribution * 260)),
            itemStyle: {
              color: bubblePalette[idx % bubblePalette.length],
              opacity: 0.86,
              borderColor: 'rgba(232, 242, 255, 0.34)',
              borderWidth: 1.5,
              shadowBlur: 22,
              shadowColor: 'rgba(18, 57, 122, 0.34)',
              shadowOffsetY: 8
            },
            label: {
              show: true,
              position: 'inside',
              formatter: labelName(d.region),
              color: '#f8fbff',
              fontWeight: 700,
              fontSize: 12,
              textBorderColor: 'rgba(7, 17, 39, 0.35)',
              textBorderWidth: 2
            },
            meta: d
          })),
          emphasis: {
            scale: true,
            focus: 'series',
            label: { color: '#ffffff', fontWeight: 800 },
            itemStyle: { borderWidth: 2, shadowBlur: 28, shadowColor: 'rgba(75, 132, 255, 0.42)' }
          }
        }
      ]
    });

    bindClick(chart, (params) => {
      if (params.data && params.data.name) {
        window.DashboardState.updateFilter('province', params.data.name);
      }
    });
  }

  function renderRegionalRanking(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('regionalRankChart');
    if (!chart) return;

    chart.setOption({
      grid: { left: 90, right: 18, top: 16, bottom: 24 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0];
          const row = vm.regionalRanking[p.dataIndex];
          return `${row.region}<br/>Sales: ${money(row.sales)}<br/>Attainment: ${pct(row.completionRate)}<br/>Growth: ${pct(row.growthRate)}`;
        }
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: colors.axis, formatter: (v) => money(v) },
        splitLine: { lineStyle: { color: colors.split } }
      },
      yAxis: {
        type: 'category',
        inverse: true,
        axisLabel: { color: colors.axis },
        data: vm.regionalRanking.map((d) => d.region)
      },
      series: [
        {
          type: 'bar',
          data: vm.regionalRanking.map((d) => d.sales),
          itemStyle: { color: colors.blues[1], borderRadius: [0, 8, 8, 0] },
          barWidth: 16
        }
      ]
    });

    bindClick(chart, (params) => {
      const row = vm.regionalRanking[params.dataIndex];
      if (!row) return;
      window.DashboardState.updateFilter('province', row.region);
    });
  }

  function renderDosageMix(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('dosageMixChart');
    if (!chart) return;

    chart.setOption({
      tooltip: {
        formatter: (p) => `${p.name}<br/>Sales: ${money(p.value)}<br/>Share: ${pct(p.percent / 100)}`
      },
      legend: { bottom: 0, textStyle: { color: colors.axis } },
      series: [
        {
          type: 'pie',
          radius: ['48%', '74%'],
          center: ['50%', '45%'],
          label: { color: colors.text, formatter: (p) => `${p.name}\n${pct(p.value / vm.dosageSummary.reduce((acc, x) => acc + x.sales, 0))}` },
          data: vm.dosageSummary.map((d, idx) => ({ name: d.dosageForm, value: d.sales, itemStyle: { color: colors.blues[idx + 1] } }))
        }
      ]
    });

    bindClick(chart, (params) => {
      if (params.name) window.DashboardState.updateFilter('dosageForm', params.name);
    });
  }

  function renderDosageTrend(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('dosageTrendChart');
    if (!chart) return;

    chart.setOption({
      grid: { left: 48, right: 22, top: 30, bottom: 28 },
      tooltip: { trigger: 'axis' },
      legend: { data: ['Injection Sales', 'Capsule Sales', 'Injection Attainment', 'Capsule Attainment'], textStyle: { color: colors.axis }, top: 0 },
      xAxis: {
        type: 'category',
        data: vm.dosageTrend.map((d) => d.label),
        axisLabel: { color: colors.axis }
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { color: colors.axis, formatter: (v) => money(v) },
          splitLine: { lineStyle: { color: colors.split } }
        },
        {
          type: 'value',
          min: 0.7,
          max: 1.2,
          axisLabel: { color: colors.axis, formatter: (v) => `${Math.round(v * 100)}%` },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Injection Sales',
          type: 'bar',
          data: vm.dosageTrend.map((d) => d.injectionSales),
          itemStyle: { color: colors.blues[0], opacity: 0.7 },
          barMaxWidth: 16
        },
        {
          name: 'Capsule Sales',
          type: 'bar',
          data: vm.dosageTrend.map((d) => d.capsuleSales),
          itemStyle: { color: colors.blues[3], opacity: 0.65 },
          barMaxWidth: 16
        },
        {
          name: 'Injection Attainment',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: vm.dosageTrend.map((d) => d.injectionAttainment),
          lineStyle: { color: colors.green, width: 2 },
          itemStyle: { color: colors.green }
        },
        {
          name: 'Capsule Attainment',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: vm.dosageTrend.map((d) => d.capsuleAttainment),
          lineStyle: { color: colors.amber, width: 2 },
          itemStyle: { color: colors.amber }
        }
      ]
    });
  }

  function renderSquadProd(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('squadProdChart');
    if (!chart) return;

    chart.setOption({
      grid: { left: 96, right: 18, top: 16, bottom: 25 },
      tooltip: {
        formatter: (p) => `${vm.provinceProductivity[p.dataIndex].province}<br/>Sales/Rep: ${money(vm.provinceProductivity[p.dataIndex].salesPerRep)}<br/>Total Sales: ${money(vm.provinceProductivity[p.dataIndex].totalSales)}`
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: colors.axis, formatter: (v) => money(v) },
        splitLine: { lineStyle: { color: colors.split } }
      },
      yAxis: {
        type: 'category',
        inverse: true,
        axisLabel: { color: colors.axis },
        data: vm.provinceProductivity.map((p) => p.province)
      },
      series: [
        {
          type: 'bar',
          data: vm.provinceProductivity.map((p) => p.salesPerRep),
          barWidth: 15,
          itemStyle: { color: colors.blues[2], borderRadius: [0, 8, 8, 0] }
        }
      ]
    });

    bindClick(chart, (params) => {
      const row = vm.provinceProductivity[params.dataIndex];
      if (row) window.DashboardState.updateFilter('province', row.province);
    });
  }

  function renderSquadCoverage(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('squadCoverageChart');
    if (!chart) return;

    chart.setOption({
      grid: { left: 96, right: 12, top: 16, bottom: 18 },
      tooltip: { formatter: (p) => `${p.name}: ${p.value} hospitals` },
      xAxis: {
        type: 'value',
        axisLabel: { color: colors.axis },
        splitLine: { lineStyle: { color: colors.split } }
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: vm.squadCoverage.map((d) => d.salesSquad),
        axisLabel: { color: colors.axis }
      },
      series: [
        {
          type: 'bar',
          data: vm.squadCoverage.map((d) => d.hospitalCount),
          barWidth: 14,
          itemStyle: { color: colors.blues[4], borderRadius: [0, 8, 8, 0] }
        }
      ]
    });

    bindClick(chart, (params) => {
      const row = vm.squadCoverage[params.dataIndex];
      if (row) window.DashboardState.updateFilter('salesSquad', row.salesSquad);
    });
  }

  function renderTierContribution(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('tierContributionChart');
    if (!chart) return;

    chart.setOption({
      grid: { left: 48, right: 18, top: 20, bottom: 26 },
      tooltip: { formatter: (p) => `${p.name}: ${pct(vm.tierSummary[p.dataIndex].quarterContribution)}` },
      xAxis: {
        type: 'category',
        data: vm.tierSummary.map((d) => d.tier),
        axisLabel: { color: colors.axis }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.axis, formatter: (v) => `${Math.round(v * 100)}%` },
        splitLine: { lineStyle: { color: colors.split } }
      },
      series: [
        {
          type: 'bar',
          data: vm.tierSummary.map((d) => d.quarterContribution),
          barWidth: 20,
          itemStyle: { color: colors.blues[1], borderRadius: [8, 8, 0, 0] }
        }
      ]
    });

    bindClick(chart, (params) => {
      const row = vm.tierSummary[params.dataIndex];
      if (row) window.DashboardState.updateFilter('hospitalTier', row.tier);
    });
  }

  function renderTierCompletion(vm, theme) {
    const colors = palette(theme);
    const chart = ensureChart('tierCompletionChart');
    if (!chart) return;

    chart.setOption({
      grid: { left: 42, right: 52, top: 24, bottom: 24, containLabel: true },
      tooltip: { trigger: 'axis' },
      legend: { data: ['Quarter Completion', 'Monthly Growth'], textStyle: { color: colors.axis }, top: 0 },
      xAxis: {
        type: 'category',
        data: vm.tierSummary.map((d) => d.tier),
        axisLabel: { color: colors.axis }
      },
      yAxis: [
        {
          type: 'value',
          min: 0.75,
          max: 1.2,
          axisLabel: { color: colors.axis, formatter: (v) => `${Math.round(v * 100)}%` },
          splitLine: { lineStyle: { color: colors.split } }
        },
        {
          type: 'value',
          min: -0.15,
          max: 0.2,
          axisLabel: { color: colors.axis, formatter: (v) => `${Math.round(v * 100)}%` },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Quarter Completion',
          type: 'line',
          smooth: true,
          data: vm.tierSummary.map((d) => d.quarterCompletion),
          lineStyle: { color: colors.green, width: 2.4 },
          itemStyle: { color: colors.green }
        },
        {
          name: 'Monthly Growth',
          type: 'bar',
          yAxisIndex: 1,
          data: vm.tierSummary.map((d) => d.monthlyGrowth),
          barWidth: 20,
          itemStyle: {
            color: (p) => (p.value >= 0 ? colors.blues[2] : colors.red),
            borderRadius: [6, 6, 0, 0]
          }
        }
      ]
    });
  }

  window.DashboardCharts = {
    renderAll(vm, theme) {
      renderTrend(vm, theme);
      renderRegionalBubble(vm, theme);
      renderRegionalRanking(vm, theme);
      renderDosageMix(vm, theme);
      renderDosageTrend(vm, theme);
      renderSquadProd(vm, theme);
      renderSquadCoverage(vm, theme);
      renderTierContribution(vm, theme);
      renderTierCompletion(vm, theme);
    },
    resizeAll() {
      Object.values(chartRefs).forEach((c) => c && c.resize());
    },
    disposeAll() {
      Object.values(chartRefs).forEach((c) => c && c.dispose());
    }
  };
})();
