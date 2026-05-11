export const marketplaceTemplates = [
  {
    id: 'cell-culture',
    label: 'Cell Culture QC',
    labels: { zh: '细胞培养质控', en: 'Cell Culture QC' },
    category: { zh: '生物', en: 'Biology' },
    description: {
      zh: '记录细胞传代、污染检查与形态学观察。',
      en: 'Track passages, contamination checks, and morphology notes.'
    },
    fields: [
      { id: 'cc-line', label: 'Cell Line', labels: { zh: '细胞系', en: 'Cell Line' }, type: 'text' },
      {
        id: 'cc-passage',
        label: 'Passage Number',
        labels: { zh: '传代次数', en: 'Passage Number' },
        type: 'number'
      },
      {
        id: 'cc-contam',
        label: 'Contamination',
        labels: { zh: '污染情况', en: 'Contamination' },
        type: 'select',
        options: ['None', 'Mycoplasma', 'Fungal', 'Bacterial']
      },
      {
        id: 'cc-image',
        label: 'Morphology Image',
        labels: { zh: '形态学图像', en: 'Morphology Image' },
        type: 'file'
      }
    ]
  },
  {
    id: 'spectroscopy',
    label: 'Spectroscopy Baseline',
    labels: { zh: '光谱基线模板', en: 'Spectroscopy Baseline' },
    category: { zh: '化学', en: 'Chemistry' },
    description: {
      zh: '用于 UV-Vis / FTIR 基线扫描与校准记录。',
      en: 'UV-Vis / FTIR baseline scans and calibration tracking.'
    },
    fields: [
      {
        id: 'sp-instrument',
        label: 'Instrument ID',
        labels: { zh: '仪器编号', en: 'Instrument ID' },
        type: 'text'
      },
      {
        id: 'sp-range',
        label: 'Wavelength Range',
        labels: { zh: '波长范围', en: 'Wavelength Range' },
        type: 'text'
      },
      {
        id: 'sp-scan',
        label: 'Scan Date',
        labels: { zh: '扫描日期', en: 'Scan Date' },
        type: 'date'
      },
      {
        id: 'sp-operator',
        label: 'Operator',
        labels: { zh: '操作员', en: 'Operator' },
        type: 'text'
      }
    ]
  },
  {
    id: 'thermal-test',
    label: 'Thermal Stress Test',
    labels: { zh: '热应力测试', en: 'Thermal Stress Test' },
    category: { zh: '物理', en: 'Physics' },
    description: {
      zh: '记录温度梯度、持续时间与样本变化。',
      en: 'Track temperature gradients, duration, and sample response.'
    },
    fields: [
      {
        id: 'th-start',
        label: 'Start Temp (°C)',
        labels: { zh: '起始温度 (°C)', en: 'Start Temp (°C)' },
        type: 'number'
      },
      {
        id: 'th-end',
        label: 'End Temp (°C)',
        labels: { zh: '终止温度 (°C)', en: 'End Temp (°C)' },
        type: 'number'
      },
      {
        id: 'th-duration',
        label: 'Duration (min)',
        labels: { zh: '持续时间 (min)', en: 'Duration (min)' },
        type: 'number'
      },
      {
        id: 'th-notes',
        label: 'Sample Change',
        labels: { zh: '样本变化', en: 'Sample Change' },
        type: 'text'
      }
    ]
  }
];
