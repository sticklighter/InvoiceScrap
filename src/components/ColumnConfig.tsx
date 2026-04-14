import { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';

interface ColumnConfigProps {
  columns: string[];
  onColumnsChange: (columns: string[]) => void;
  disabled?: boolean;
}

const DEFAULT_COLUMNS = [
'שם הספק',
'תאריך',
'מספר חשבונית',
'סכום לפני מע"מ',
'מע"מ',
'סכום כולל'];


export function ColumnConfig({ columns, onColumnsChange, disabled = false }: ColumnConfigProps) {
  const [newColumn, setNewColumn] = useState('');

  const addColumn = () => {
    if (newColumn.trim() && !columns.includes(newColumn.trim())) {
      onColumnsChange([...columns, newColumn.trim()]);
      setNewColumn('');
    }
  };

  const removeColumn = (index: number) => {
    const newColumns = [...columns];
    newColumns.splice(index, 1);
    onColumnsChange(newColumns);
  };

  const addDefaultColumns = () => {
    const newColumns = [...columns];
    DEFAULT_COLUMNS.forEach((col) => {
      if (!newColumns.includes(col)) {
        newColumns.push(col);
      }
    });
    onColumnsChange(newColumns);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addColumn();
    }
  };

  return (
    <div data-ev-id="ev_c6571c4c49" className="bg-surface rounded-xl border border-border p-6">
      <div data-ev-id="ev_aae5b4e505" className="flex items-center justify-between mb-4">
        <h3 data-ev-id="ev_c27b7e1414" className="font-semibold text-foreground">שדות לחילוץ</h3>
        <button data-ev-id="ev_0d0e70882b"
        onClick={addDefaultColumns}
        className="text-sm text-primary hover:text-primary-hover transition-colors"
        disabled={disabled}>

          הוסף שדות ברירת מחדל
        </button>
      </div>

      {columns.length > 0 &&
      <div data-ev-id="ev_c051890a69" className="flex flex-wrap gap-2 mb-4">
          {columns.map((column, index) =>
        <div data-ev-id="ev_4e385ec726"
        key={`${column}-${index}`}
        className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm group">

              <span data-ev-id="ev_fc92eaa430" dir="auto">{column}</span>
              <button data-ev-id="ev_86941b6e55"
          onClick={() => removeColumn(index)}
          className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
          disabled={disabled}>

                <X className="w-3.5 h-3.5" />
              </button>
            </div>
        )}
        </div>
      }

      <div data-ev-id="ev_e72f5ea353" className="flex gap-2">
        <input data-ev-id="ev_d2b27eb14d"
        type="text"
        value={newColumn}
        onChange={(e) => setNewColumn(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="שם העמודה החדשה..."
        className="flex-1 px-4 py-2 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        dir="auto"
        disabled={disabled} />

        <button data-ev-id="ev_bdb9b5f0a9"
        onClick={addColumn}
        disabled={!newColumn.trim() || disabled}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">

          <Plus className="w-4 h-4" />
          <span data-ev-id="ev_233bff6abb">הוסף</span>
        </button>
      </div>

      {columns.length === 0 &&
      <p data-ev-id="ev_13fab55bd7" className="text-sm text-muted-foreground mt-4 text-center">
          הוסף עמודות כדי לציין אילו נתונים לחלץ מהחשבוניות
        </p>
      }
    </div>);

}
