import { DragDropContext, Draggable } from 'react-beautiful-dnd';
import StrictModeDroppable from './StrictModeDroppable.jsx';

export default function Sidebar({
  records,
  selectedId,
  onSelect,
  filterText,
  onFilterChange,
  onNew,
  onReorder,
  onEdit,
  dragDisabled,
  sectionId,
  t
}) {
  const handleDragEnd = (result) => {
    if (!result.destination || dragDisabled) return;
    if (result.source.index === result.destination.index) return;
    onReorder?.(result.source.index, result.destination.index);
  };

  return (
    <aside className="sidebar" id={sectionId}>
      <div className="sidebar-header">
        <h2>{t('recordsTitle')}</h2>
        <p>{t('recordsSubtitle')}</p>
      </div>
      <label className="field sidebar-search">
        <span>{t('searchPlaceholder')}</span>
        <input
          type="search"
          value={filterText}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder={t('searchPlaceholder')}
        />
      </label>
      <div className="sidebar-actions">
        <button className="btn primary sidebar-btn" type="button" onClick={onNew}>
          {t('addRecord')}
        </button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <StrictModeDroppable droppableId="record-list">
          {(provided) => (
            <div
              className={`record-list ${dragDisabled ? 'drag-disabled' : ''}`}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {records.length === 0 ? (
                <div className="empty-hint">{t('noRecords')}</div>
              ) : (
                records.map((record, index) => (
                  <Draggable
                    key={record.id}
                    draggableId={record.id}
                    index={index}
                    isDragDisabled={dragDisabled}
                  >
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={`record-card ${selectedId === record.id ? 'active' : ''} ${
                          snapshot.isDragging ? 'dragging' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="record-card-body"
                          onClick={() => onSelect(record.id)}
                        >
                          <div className="record-title">{record.name || t('untitled')}</div>
                          <div className="record-meta">
                            <span>{record.date}</span>
                            <span>{record.person || t('unassigned')}</span>
                          </div>
                        </button>
                        <div className="record-card-actions">
                          <button
                            className="icon-btn ghost small"
                            type="button"
                            onClick={() => onEdit?.(record.id)}
                          >
                            {t('editRecord')}
                          </button>
                          <span
                            className="drag-handle"
                            title={t('dragHandle')}
                            {...draggableProvided.dragHandleProps}
                          >
                            ⋮⋮
                          </span>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>
      <div className="drag-hint">{t('dragHint')}</div>
    </aside>
  );
}
