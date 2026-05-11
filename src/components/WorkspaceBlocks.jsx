import { useRef } from 'react';
import { DragDropContext, Draggable } from 'react-beautiful-dnd';
import StrictModeDroppable from './StrictModeDroppable.jsx';
import SummaryBlock from './blocks/SummaryBlock.jsx';
import TableBlock from './blocks/TableBlock.jsx';
import TextBlock from './blocks/TextBlock.jsx';
import ChecklistBlock from './blocks/ChecklistBlock.jsx';
import ReferencesBlock from './blocks/ReferencesBlock.jsx';
import AttachmentsBlock from './blocks/AttachmentsBlock.jsx';
import AnalysisBlock from './blocks/AnalysisBlock.jsx';
import ChartBlock from './blocks/ChartBlock.jsx';
import VideoBlock from './blocks/VideoBlock.jsx';

const blockTypeLabel = (t, type) => {
  const map = {
    summary: t('blockSummary'),
    table: t('blockTable'),
    text: t('blockText'),
    checklist: t('blockChecklist'),
    chart: t('blockChart'),
    analysis: t('blockAnalysis'),
    attachments: t('blockAttachments'),
    video: t('blockVideo'),
    references: t('blockReferences')
  };
  return map[type] || type;
};

export default function WorkspaceBlocks({
  blocks,
  draft,
  tables,
  onUpdateTable,
  onUpdateDraft,
  onReorderBlocks,
  onUpdateBlock,
  onRemoveBlock,
  onAddBlock,
  addBlockOptions,
  settings,
  onExportCsv,
  onExportPdf,
  onExportWord,
  onSaveRecord,
  onDeleteRecord,
  canDelete,
  dataMode,
  t
}) {
  const menuRef = useRef(null);
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    onReorderBlocks?.(result.source.index, result.destination.index);
  };

  const handleTitleChange = (block, value) => {
    onUpdateBlock?.(block.id, { title: value });
  };

  const handleToggleCollapse = (block) => {
    onUpdateBlock?.(block.id, { collapsed: !block.collapsed });
  };

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>{t('workspaceTitle')}</h2>
        <p>{t('workspaceDesc')}</p>
      </header>
      <DragDropContext onDragEnd={handleDragEnd}>
        <StrictModeDroppable droppableId="workspace-blocks">
          {(provided) => (
            <div className="workspace-list" ref={provided.innerRef} {...provided.droppableProps}>
              {blocks.length === 0 ? <div className="empty-hint">{t('noBlocks')}</div> : null}
              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`workspace-block ${snapshot.isDragging ? 'dragging' : ''} ${
                        block.collapsed ? 'collapsed' : ''
                      }`}
                    >
                      <div className="block-head">
                        <div className="block-head-main">
                          <input
                            className="block-title-input"
                            value={block.title}
                            onChange={(event) => handleTitleChange(block, event.target.value)}
                          />
                          {settings.showBlockMeta ? (
                            <div className="block-meta">
                              <span>{blockTypeLabel(t, block.type)}</span>
                              {block.createdAt ? (
                                <span>{new Date(block.createdAt).toLocaleString()}</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="block-head-actions">
                          <button
                            className="icon-btn ghost small"
                            type="button"
                            onClick={() => handleToggleCollapse(block)}
                          >
                            {block.collapsed ? t('blockExpand') : t('blockCollapse')}
                          </button>
                          {!block.locked ? (
                            <button
                              className="icon-btn ghost small danger"
                              type="button"
                              onClick={() => onRemoveBlock?.(block.id)}
                            >
                              {t('blockRemove')}
                            </button>
                          ) : null}
                          <span
                            className="drag-handle"
                            title={t('dragHandle')}
                            aria-label={t('dragHandle')}
                            {...dragProvided.dragHandleProps}
                          >
                            ::
                          </span>
                        </div>
                      </div>
                      {block.collapsed ? null : (
                        <div className="block-body">
                          {block.type === 'summary' ? (
                            <SummaryBlock
                              draft={draft}
                              onChange={onUpdateDraft}
                              onSave={onSaveRecord}
                              onDelete={onDeleteRecord}
                              canDelete={canDelete}
                              t={t}
                            />
                          ) : null}
                          {block.type === 'table' ? (
                            <TableBlock
                              table={
                                tables?.find((table) => table.id === block.data?.tableId) ||
                                tables?.[0] ||
                                null
                              }
                              onChange={(nextTable) =>
                                onUpdateTable?.(nextTable.id, nextTable)
                              }
                              onExportCsv={onExportCsv}
                              onExportPdf={onExportPdf}
                              onExportWord={onExportWord}
                              t={t}
                            />
                          ) : null}
                          {block.type === 'text' ? (
                            <TextBlock
                              value={block.data?.text || ''}
                              onChange={(value) =>
                                onUpdateBlock?.(block.id, {
                                  data: { ...block.data, text: value }
                                })
                              }
                              t={t}
                            />
                          ) : null}
                          {block.type === 'checklist' ? (
                            <ChecklistBlock
                              items={block.data?.items || []}
                              onChange={(items) => {
                                onUpdateBlock?.(block.id, {
                                  data: { ...block.data, items }
                                });
                                onUpdateDraft({ steps: items.map((item) => item.text) });
                              }}
                              t={t}
                            />
                          ) : null}
                          {block.type === 'references' ? (
                            <ReferencesBlock
                              items={block.data?.items || []}
                              onChange={(items) =>
                                onUpdateBlock?.(block.id, {
                                  data: { ...block.data, items }
                                })
                              }
                              t={t}
                            />
                          ) : null}
                          {block.type === 'attachments' ? (
                            <AttachmentsBlock
                              files={block.data?.files || []}
                              onChange={(files) =>
                                onUpdateBlock?.(block.id, {
                                  data: { ...block.data, files }
                                })
                              }
                              t={t}
                            />
                          ) : null}
                          {block.type === 'analysis' ? (
                            <AnalysisBlock
                              datasetId={draft?.id}
                              dataMode={dataMode}
                              tables={tables}
                              block={block}
                              onChange={(nextBlock) => onUpdateBlock?.(block.id, nextBlock)}
                              t={t}
                            />
                          ) : null}
                          {block.type === 'chart' ? (
                            <ChartBlock
                              datasetId={draft?.id}
                              dataMode={dataMode}
                              tables={tables}
                              block={block}
                              onChange={(nextBlock) => onUpdateBlock?.(block.id, nextBlock)}
                              t={t}
                            />
                          ) : null}
                          {block.type === 'video' ? (
                            <VideoBlock
                              video={draft.video}
                              onChange={(video) => onUpdateDraft({ video })}
                              t={t}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>
      <div className="workspace-footer">
        <details className="add-block-menu action-menu" ref={menuRef}>
          <summary className="btn ghost add-block-trigger">+ {t('addBlock')}</summary>
          <div className="action-popover add-block-popover">
            {addBlockOptions.map((option) => (
              <button
                key={option.type}
                className="menu-item"
                type="button"
                disabled={!option.enabled}
                onClick={() => {
                  if (!option.enabled) return;
                  onAddBlock?.(option.type);
                  menuRef.current?.removeAttribute('open');
                }}
                >
                  {option.label}
                  {!option.enabled ? ` (${option.disabledReason})` : ''}
                </button>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
