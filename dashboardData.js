(function () {
  function seededRandom(seed) {
    let t = seed + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  function monthLabel(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
  }

  function getQuarter(ym) {
    const [y, m] = ym.split('-').map(Number);
    return y + '-Q' + Math.ceil(m / 3);
  }

  function buildMonths(year) {
    const arr = [];
    for (let m = 1; m <= 12; m++) arr.push(`${year}-${String(m).padStart(2, '0')}`);
    return arr;
  }

  const months2024 = buildMonths(2024);
  const months2025 = buildMonths(2025);
  const allMonths = [...months2024, ...months2025];

  const regions = [
    { name: 'East Region', factor: 1.12, provinces: ['Jiangsu', 'Shandong', 'Anhui'] },
    { name: 'South Region', factor: 1.08, provinces: ['Guangdong', 'Guangxi', 'Hunan'] },
    { name: 'Central Region', factor: 1.01, provinces: ['Hubei', 'Jiangxi'] },
    { name: 'West Region', factor: 0.97, provinces: ['Sichuan', 'Yunnan'] }
  ];

  const provinceProfiles = {
    Sichuan: { baseWeight: 1.12, attainmentBias: 0.06, yearTrend: 0.03, currentLift: 1.12, prevLift: 1.03 },
    Shandong: { baseWeight: 1.08, attainmentBias: 0.05, yearTrend: -0.03, currentLift: 1.00, prevLift: 1.09 },
    Guangxi: { baseWeight: 0.88, attainmentBias: -0.12, yearTrend: 0.05, currentLift: 0.98, prevLift: 0.88 },
    Jiangsu: { baseWeight: 1.18, attainmentBias: 0.09, yearTrend: 0.03, currentLift: 1.09, prevLift: 1.03 },
    Hubei: { baseWeight: 1.00, attainmentBias: -0.02, yearTrend: 0.00, currentLift: 0.99, prevLift: 0.98 },
    Jiangxi: { baseWeight: 0.79, attainmentBias: -0.12, yearTrend: -0.04, currentLift: 0.88, prevLift: 0.95 },
    Anhui: { baseWeight: 0.92, attainmentBias: -0.01, yearTrend: 0.00, currentLift: 0.99, prevLift: 0.98 },
    Yunnan: { baseWeight: 0.83, attainmentBias: -0.10, yearTrend: 0.04, currentLift: 0.97, prevLift: 0.86 },
    Hunan: { baseWeight: 0.97, attainmentBias: 0.03, yearTrend: -0.03, currentLift: 0.99, prevLift: 1.05 },
    Guangdong: { baseWeight: 1.24, attainmentBias: -0.08, yearTrend: 0.05, currentLift: 0.99, prevLift: 0.90 }
  };

  const tierConfig = [
    { tier: 'T40', base: 195000 },
    { tier: 'T40-80', base: 132000 },
    { tier: 'T80-100', base: 93000 }
  ];

  const products = ['Product X', 'Product Y', 'Product Z', 'Product Q'];
  const productWeights = {
    'Product X': 1.1,
    'Product Y': 0.94,
    'Product Z': 1.02,
    'Product Q': 0.9
  };

  const dosageForms = ['Injection', 'Capsule'];

  const squads = [
    { name: 'Squad Nova', reps: 8 },
    { name: 'Squad Atlas', reps: 7 },
    { name: 'Squad Horizon', reps: 9 },
    { name: 'Squad Meridian', reps: 8 },
    { name: 'Squad Vertex', reps: 6 },
    { name: 'Squad Zenith', reps: 7 },
    { name: 'Squad Orbit', reps: 8 },
    { name: 'Squad Helix', reps: 6 }
  ];

  const hospitalDescriptors = ['Westlake', 'Harbor', 'Apex', 'Riverside', 'Summit', 'Crestview', 'Evergreen', 'Pioneer'];
  const hospitalSuffixes = ['Medical Center', 'General Hospital', 'Clinical Institute', 'Health Center', 'Specialty Hospital'];
  const seasonality = [0.95, 0.97, 1.01, 1.03, 1.05, 1.06, 1.04, 1.02, 1.00, 1.01, 1.06, 1.10];
  const provinceSquadPools = {
    Jiangsu: ['Squad Nova', 'Squad Nova', 'Squad Atlas', 'Squad Horizon', 'Squad Meridian', 'Squad Nova', 'Squad Atlas', 'Squad Zenith'],
    Shandong: ['Squad Horizon', 'Squad Horizon', 'Squad Meridian', 'Squad Vertex', 'Squad Atlas', 'Squad Horizon', 'Squad Orbit', 'Squad Meridian'],
    Anhui: ['Squad Meridian', 'Squad Meridian', 'Squad Vertex', 'Squad Atlas', 'Squad Zenith', 'Squad Meridian', 'Squad Helix', 'Squad Vertex'],
    Guangdong: ['Squad Nova', 'Squad Horizon', 'Squad Horizon', 'Squad Orbit', 'Squad Orbit', 'Squad Zenith', 'Squad Nova', 'Squad Orbit'],
    Guangxi: ['Squad Vertex', 'Squad Vertex', 'Squad Helix', 'Squad Zenith', 'Squad Atlas', 'Squad Vertex', 'Squad Helix', 'Squad Orbit'],
    Hunan: ['Squad Meridian', 'Squad Zenith', 'Squad Zenith', 'Squad Orbit', 'Squad Atlas', 'Squad Zenith', 'Squad Vertex', 'Squad Helix'],
    Hubei: ['Squad Nova', 'Squad Meridian', 'Squad Meridian', 'Squad Atlas', 'Squad Horizon', 'Squad Meridian', 'Squad Nova', 'Squad Atlas'],
    Jiangxi: ['Squad Helix', 'Squad Helix', 'Squad Vertex', 'Squad Zenith', 'Squad Atlas', 'Squad Helix', 'Squad Vertex', 'Squad Orbit'],
    Sichuan: ['Squad Horizon', 'Squad Horizon', 'Squad Orbit', 'Squad Orbit', 'Squad Nova', 'Squad Horizon', 'Squad Meridian', 'Squad Orbit'],
    Yunnan: ['Squad Helix', 'Squad Vertex', 'Squad Vertex', 'Squad Atlas', 'Squad Zenith', 'Squad Helix', 'Squad Vertex', 'Squad Meridian']
  };

  function getRegionName(province) {
    const region = regions.find((r) => r.provinces.includes(province));
    return region ? region.name : 'Central Region';
  }

  function getRegionFactor(province) {
    const region = regions.find((r) => r.provinces.includes(province));
    return region ? region.factor : 1;
  }

  function getMonthLift(profile, year, monthIdx) {
    if (year === 2025 && monthIdx === 11) return profile.currentLift;
    if (year === 2025 && monthIdx === 10) return profile.prevLift;
    const normalized = (monthIdx - 5.5) / 8;
    const trend = 1 + profile.yearTrend * normalized;
    return year === 2025 ? trend : 1 + profile.yearTrend * normalized * 0.65;
  }

  const hospitals = [];
  let hospitalIndex = 1;

  regions.forEach((region, regionIdx) => {
    region.provinces.forEach((province, provinceIdx) => {
      const profile = provinceProfiles[province];
      for (let i = 0; i < 8; i++) {
        const tier = i < 2 ? tierConfig[0] : i < 5 ? tierConfig[1] : tierConfig[2];
        const squadName = provinceSquadPools[province][i % provinceSquadPools[province].length];
        const squad = squads.find((item) => item.name === squadName) || squads[(regionIdx * 2 + provinceIdx + i) % squads.length];
        const emphasis = i % 2 === 0 ? 'Injection' : 'Capsule';
        const productFocus = emphasis === 'Injection' ? (i % 4 === 0 ? 'Product Z' : 'Product X') : (i % 3 === 0 ? 'Product Q' : 'Product Y');
        const descriptor = hospitalDescriptors[i % hospitalDescriptors.length];
        const suffix = hospitalSuffixes[(i + provinceIdx) % hospitalSuffixes.length];
        const hospitalName = `${province} ${descriptor} ${suffix}`;
        const seed = hashString(`${province}-${hospitalName}-${hospitalIndex}`);
        const variance = 0.9 + seededRandom(seed) * 0.2;

        hospitals.push({
          hospitalId: `H${String(hospitalIndex).padStart(4, '0')}`,
          hospitalName,
          region: region.name,
          province,
          hospitalTier: tier.tier,
          salesSquad: squad.name,
          repCount: squad.reps,
          dosageEmphasis: emphasis,
          productFocus,
          baseTarget: tier.base * getRegionFactor(province) * profile.baseWeight * variance
        });
        hospitalIndex++;
      }
    });
  });

  const records = [];

  allMonths.forEach((ym) => {
    const monthIdx = Number(ym.split('-')[1]) - 1;
    const year = Number(ym.slice(0, 4));
    const quarter = getQuarter(ym);
    const yearShift = year === 2025 ? 1.08 : 1.0;

    hospitals.forEach((h) => {
      const profile = provinceProfiles[h.province];
      const baseSeed = hashString(`${h.hospitalId}-${ym}`);
      const noise = 0.97 + seededRandom(baseSeed) * 0.09;
      const provinceTrend = getMonthLift(profile, year, monthIdx);
      const maturityBoost = 0.97 + monthIdx / 80;

      const combos = h.dosageEmphasis === 'Injection'
        ? [
            { dosageForm: 'Injection', product: h.productFocus, weight: 0.7 },
            { dosageForm: 'Capsule', product: 'Product Y', weight: 0.3 }
          ]
        : [
            { dosageForm: 'Capsule', product: h.productFocus, weight: 0.68 },
            { dosageForm: 'Injection', product: 'Product X', weight: 0.32 }
          ];

      combos.forEach((combo, cIdx) => {
        const comboSeed = hashString(`${h.hospitalId}-${ym}-${combo.product}`);
        const comboNoise = 0.96 + seededRandom(comboSeed) * 0.08;
        const target = h.baseTarget * seasonality[monthIdx] * combo.weight * yearShift * productWeights[combo.product];
        const salesFactor = (0.97 + profile.attainmentBias + (cIdx === 0 ? 0.02 : -0.01)) * provinceTrend * maturityBoost * noise * comboNoise;
        const sales = target * salesFactor;

        records.push({
          month: ym,
          monthLabel: monthLabel(ym),
          monthIndex: monthIdx,
          quarter,
          year,
          region: h.region,
          province: h.province,
          hospitalId: h.hospitalId,
          hospitalName: h.hospitalName,
          hospitalTier: h.hospitalTier,
          product: combo.product,
          dosageForm: combo.dosageForm,
          salesSquad: h.salesSquad,
          repCount: h.repCount,
          target: Math.round(target),
          sales: Math.round(sales)
        });
      });
    });
  });

  const metadata = {
    months2024,
    months2025,
    allMonths,
    quarters2025: ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'],
    regions: regions.map((r) => r.name),
    provinces: ['Sichuan', 'Shandong', 'Guangxi', 'Jiangsu', 'Hubei', 'Jiangxi', 'Anhui', 'Yunnan', 'Hunan', 'Guangdong'],
    tiers: ['T40', 'T40-80', 'T80-100'],
    products,
    dosageForms,
    squads: squads.map((s) => s.name),
    topNOptions: [5, 10, 15, 20],
    metricViews: ['Sales', 'Attainment', 'Growth'],
    currentMonth: '2025-12',
    currentQuarter: '2025-Q4'
  };

  window.dashboardData = {
    metadata,
    hospitals,
    records
  };
})();
