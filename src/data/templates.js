export const baseTemplates = {
  chemistry: {
    label: 'Chemistry',
    labels: { zh: '化学', en: 'Chemistry' },
    fields: [
      { id: 'chem-reagent', label: 'Reagent', labels: { zh: '试剂', en: 'Reagent' }, type: 'text' },
      {
        id: 'chem-concentration',
        label: 'Concentration (mol/L)',
        labels: { zh: '浓度 (mol/L)', en: 'Concentration (mol/L)' },
        type: 'number'
      },
      {
        id: 'chem-temperature',
        label: 'Temperature (°C)',
        labels: { zh: '温度 (°C)', en: 'Temperature (°C)' },
        type: 'number'
      },
      { id: 'chem-ph', label: 'pH', labels: { zh: 'pH', en: 'pH' }, type: 'number' },
      {
        id: 'chem-instrument',
        label: 'Instrument',
        labels: { zh: '仪器', en: 'Instrument' },
        type: 'select',
        options: ['NMR', 'FTIR', 'UV-Vis']
      }
    ]
  },
  biology: {
    label: 'Biology',
    labels: { zh: '生物', en: 'Biology' },
    fields: [
      {
        id: 'bio-sample',
        label: 'Sample Source',
        labels: { zh: '样本来源', en: 'Sample Source' },
        type: 'text'
      },
      {
        id: 'bio-incubation',
        label: 'Incubation (hours)',
        labels: { zh: '孵育时间 (小时)', en: 'Incubation (hours)' },
        type: 'number'
      },
      {
        id: 'bio-medium',
        label: 'Medium',
        labels: { zh: '培养基', en: 'Medium' },
        type: 'select',
        options: ['LB', 'DMEM', 'RPMI']
      },
      {
        id: 'bio-date',
        label: 'Culture Date',
        labels: { zh: '培养日期', en: 'Culture Date' },
        type: 'date'
      },
      {
        id: 'bio-attachment',
        label: 'Microscope Image',
        labels: { zh: '显微图像', en: 'Microscope Image' },
        type: 'file'
      }
    ]
  },
  physics: {
    label: 'Physics',
    labels: { zh: '物理', en: 'Physics' },
    fields: [
      {
        id: 'phy-apparatus',
        label: 'Apparatus',
        labels: { zh: '实验装置', en: 'Apparatus' },
        type: 'text'
      },
      {
        id: 'phy-voltage',
        label: 'Voltage (V)',
        labels: { zh: '电压 (V)', en: 'Voltage (V)' },
        type: 'number'
      },
      {
        id: 'phy-current',
        label: 'Current (A)',
        labels: { zh: '电流 (A)', en: 'Current (A)' },
        type: 'number'
      },
      {
        id: 'phy-date',
        label: 'Calibration Date',
        labels: { zh: '校准日期', en: 'Calibration Date' },
        type: 'date'
      },
      {
        id: 'phy-mode',
        label: 'Mode',
        labels: { zh: '模式', en: 'Mode' },
        type: 'select',
        options: ['DC', 'AC', 'Pulse']
      }
    ]
  },
  general: {
    label: 'General',
    labels: { zh: '通用', en: 'General' },
    fields: [
      {
        id: 'gen-sample',
        label: 'Sample ID',
        labels: { zh: '样本编号', en: 'Sample ID' },
        type: 'text'
      },
      { id: 'gen-batch', label: 'Batch', labels: { zh: '批次', en: 'Batch' }, type: 'text' },
      {
        id: 'gen-operator',
        label: 'Operator',
        labels: { zh: '操作员', en: 'Operator' },
        type: 'text'
      },
      {
        id: 'gen-date',
        label: 'Run Date',
        labels: { zh: '执行日期', en: 'Run Date' },
        type: 'date'
      },
      {
        id: 'gen-file',
        label: 'Attachment',
        labels: { zh: '附件', en: 'Attachment' },
        type: 'file'
      }
    ]
  }
};
