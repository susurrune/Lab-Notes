export const blockOrder = {
  summary: 10,
  checklist: 20,
  table: 30,
  analysis: 40,
  chart: 50,
  text: 60,
  attachments: 70,
  references: 80,
  video: 90
};

export const getBlockOrder = (type) => blockOrder[type] ?? 999;

export const sortBlocksByOrder = (blocks = []) =>
  [...blocks].sort((a, b) => {
    const orderA = getBlockOrder(a.type);
    const orderB = getBlockOrder(b.type);
    if (orderA !== orderB) return orderA - orderB;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });

export const insertBlockByOrder = (blocks, newBlock) => {
  const nextBlocks = blocks ? [...blocks] : [];
  const targetOrder = getBlockOrder(newBlock.type);
  const insertAt = nextBlocks.findIndex((block) => getBlockOrder(block.type) > targetOrder);
  if (insertAt === -1) {
    nextBlocks.push(newBlock);
    return nextBlocks;
  }
  nextBlocks.splice(insertAt, 0, newBlock);
  return nextBlocks;
};

export const blockCatalog = [
  {
    type: 'summary',
    titleKey: 'blockSummary',
    core: true,
    locked: true
  },
  {
    type: 'checklist',
    titleKey: 'blockChecklist',
    extensionId: 'checklist'
  },
  {
    type: 'table',
    titleKey: 'blockTable',
    core: true,
    allowMultiple: true
  },
  {
    type: 'analysis',
    titleKey: 'blockAnalysis',
    extensionId: 'analysis'
  },
  {
    type: 'chart',
    titleKey: 'blockChart',
    extensionId: 'dataViz'
  },
  {
    type: 'text',
    titleKey: 'blockText'
  },
  {
    type: 'attachments',
    titleKey: 'blockAttachments',
    extensionId: 'attachments'
  },
  {
    type: 'references',
    titleKey: 'blockReferences',
    extensionId: 'references'
  },
  {
    type: 'video',
    titleKey: 'blockVideo',
    extensionId: 'video'
  }
];

export const buildBlock = ({ type, title, settings }) => {
  const base = {
    id: crypto.randomUUID(),
    type,
    title: title || 'Block',
    collapsed: settings?.defaultCollapsed ?? false,
    createdAt: new Date().toISOString(),
    layout: {},
    data: {}
  };

  switch (type) {
    case 'text':
      base.data = { text: '' };
      break;
    case 'chart':
      base.data = {
        chartType: 'line',
        title: '',
        tableId: '',
        xColumnId: '',
        yColumnIds: [],
        groupByColumnId: ''
      };
      base.layout = {
        width: settings?.chartDefaultWidth || 520,
        height: settings?.chartDefaultHeight || 320
      };
      break;
    case 'attachments':
      base.data = { files: [] };
      break;
    case 'references':
      base.data = { items: [] };
      break;
    case 'analysis':
      base.data = {
        tableId: '',
        xColumnId: '',
        yColumnIds: [],
        groupByColumnId: '',
        includeIndex: false
      };
      break;
    case 'video':
      base.data = {};
      break;
    case 'checklist':
      base.data = { items: [] };
      break;
    case 'table':
      base.data = { tableId: '' };
      break;
    case 'summary':
    default:
      base.data = {};
      break;
  }

  return base;
};
