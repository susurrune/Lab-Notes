import { createColumn, createTable } from './tables.js';

const defaultAnalysisConfig = {
  title: '',
  xLabel: '',
  yLabel: '',
  xUnit: '',
  yUnit: '',
  caption: '',
  showTrendline: true,
  showGrid: true,
  showLegend: false,
  lineWidth: 2,
  pointSize: 4,
  palette: 'classic',
  showLine: true,
  showBar: true,
  showScatter: true,
  showPie: true
};

const buildCoreBlocks = (tableId) => [
  {
    id: crypto.randomUUID(),
    type: 'summary',
    title: 'Experiment Summary',
    locked: true,
    collapsed: false,
    createdAt: new Date().toISOString(),
    layout: {},
    data: {}
  },
  {
    id: crypto.randomUUID(),
    type: 'table',
    title: 'Data Table',
    locked: false,
    collapsed: false,
    createdAt: new Date().toISOString(),
    layout: {},
    data: { tableId }
  }
];

const buildSampleTable = () => {
  const tableId = crypto.randomUUID();
  return {
    id: tableId,
    name: 'Kinetics Data',
    columns: [
      createColumn({ name: 'Index', type: 'index', width: 90 }),
      createColumn({ name: 'Time (min)', type: 'numeric' }),
      createColumn({ name: 'Absorbance', type: 'numeric' }),
      createColumn({ name: 'Temperature (C)', type: 'numeric' })
    ],
    rows: [
      ['1', '0', '0.12', '37'],
      ['2', '2', '0.18', '37'],
      ['3', '4', '0.27', '37']
    ]
  };
};

export const blankRecord = (t) => {
  const baseTable = createTable({
    name: t ? `${t('tableDefaultName')} 1` : 'Raw Data 1'
  });
  return {
    id: crypto.randomUUID(),
    name: '',
    date: new Date().toISOString().slice(0, 10),
    person: '',
    purpose: '',
    steps: [''],
    remarks: '',
    tags: [],
    priority: 'medium',
    history: [],
    collaborators: [
      { id: crypto.randomUUID(), name: 'Student Zhang', role: 'Research Assistant', status: 'online' }
    ],
    permissions: {
      visibility: 'team',
      allowEdit: true,
      allowShareLink: false
    },
    templateType: 'general',
    templateFields: [],
    templateValues: {},
    analysisConfig: { ...defaultAnalysisConfig },
    tables: [baseTable],
    blocks: buildCoreBlocks(baseTable.id),
    video: {
      url: '',
      name: '',
      description: ''
    }
  };
};

const sampleTable = buildSampleTable();

export const sampleRecords = [
  {
    id: crypto.randomUUID(),
    name: 'Enzyme Kinetics Study',
    date: '2026-01-11',
    person: 'Dr. Lin',
    purpose: 'Measure catalytic rates under varying substrate concentrations.',
    steps: [
      'Prepare buffer and aliquot samples.',
      'Add enzyme and log absorbance every 2 minutes.',
      'Repeat three runs and average the results.'
    ],
    remarks: 'Maintain incubation at 37 C. Record instrument IDs in the template.',
    tags: ['Enzyme kinetics', 'Rate'],
    priority: 'high',
    history: [
      {
        id: crypto.randomUUID(),
        time: '2026-01-11 09:20',
        action: 'Created',
        summary: 'Initial record setup'
      },
      {
        id: crypto.randomUUID(),
        time: '2026-01-11 10:15',
        action: 'Saved',
        summary: 'Updated raw data'
      }
    ],
    collaborators: [
      { id: crypto.randomUUID(), name: 'Dr. Lin', role: 'Lead Scientist', status: 'online' },
      { id: crypto.randomUUID(), name: 'A. Wang', role: 'Data Analysis', status: 'offline' }
    ],
    permissions: {
      visibility: 'team',
      allowEdit: true,
      allowShareLink: true
    },
    templateType: 'biology',
    templateFields: [],
    templateValues: {},
    analysisConfig: {
      ...defaultAnalysisConfig,
      xUnit: 'min',
      yUnit: 'A.U.',
      title: 'Enzyme Kinetics Curve'
    },
    tables: [sampleTable],
    blocks: buildCoreBlocks(sampleTable.id),
    video: {
      url: '',
      name: '',
      description: ''
    }
  }
];
