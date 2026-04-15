import { useState } from 'react';
import { FileSpreadsheet, FolderDown, Loader2, X, RefreshCw, Trash2, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

interface ResultsTableProps {
  data: Record<string, string>[];
  columns: string[];
  fileNames: string[];
  originalFiles?: File[];
  onRetryFile?: (index: number, columnsToRetry: string[]) => Promise<void>;
  onDeleteRow?: (index: number) => void;
  onEditRow?: (index: number, newData: Record<string, string>) => void;
  retryingIndex?: number | null;
}

export function ResultsTable({
  data,
  columns,
  fileNames,
  originalFiles = [],
  onRetryFile,
  onDeleteRow,
  onEditRow,
  retryingIndex = null
}: ResultsTableProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Retry modal state
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [retryRowIndex, setRetryRowIndex] = useState<number | null>(null);
  const [retryColumns, setRetryColumns] = useState<string[]>([]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editRowData, setEditRowData] = useState<Record<string, string>>({});

  const exportToExcel = () => {
    const exportData = data.map((row, index) => {
      const rowData: Record<string, string> = {
        'שם קובץ': fileNames[index] || `קובץ ${index + 1}`,
        'מספר עמודים': row['מספר עמודים'] || '1'
      };
      columns.filter((c) => c !== 'מספר עמודים').forEach((col) => {
        rowData[col] = row[col] || '';
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'נתוני חשבוניות');
    XLSX.writeFile(workbook, 'invoice_data.xlsx');
  };

  const sanitizeFilename = (name: string): string => {
    return name.
    replace(/[/\\:*?"<>|]/g, '-').
    replace(/\s+/g, '_').
    trim();
  };

  const generateFilename = (rowData: Record<string, string>, originalName: string, columnsToUse: string[]): string => {
    const hasData = columnsToUse.some((col) => rowData[col] && rowData[col].trim() !== '');

    if (!hasData || columnsToUse.length === 0) {
      const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
      return sanitizeFilename(nameWithoutExt) + '.pdf';
    }

    const parts = columnsToUse.
    map((col) => rowData[col] || '').
    filter((val) => val.trim() !== '');

    if (parts.length === 0) {
      const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
      return sanitizeFilename(nameWithoutExt) + '.pdf';
    }

    return sanitizeFilename(parts.join('_')) + '.pdf';
  };

  const convertImageToPdf = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [img.width, img.height]
          });
          pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
          const pdfBlob = pdf.output('blob');
          resolve(pdfBlob);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleOpenColumnSelector = () => {
    const selectableCols = ['מספר עמודים', ...columns.filter((c) => c !== 'מספר עמודים')];
    setSelectedColumns([...selectableCols]);
    setShowColumnSelector(true);
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
    prev.includes(column) ?
    prev.filter((c) => c !== column) :
    [...prev, column]
    );
  };

  // Open retry modal for a specific row
  const handleOpenRetryModal = (rowIndex: number) => {
    const rowData = data[rowIndex] || {};
    const emptyColumns = columns.filter((col) => {
      const value = rowData[col];
      return !value || value === '-' || value.trim() === '';
    });

    setRetryRowIndex(rowIndex);
    setRetryColumns(emptyColumns.length > 0 ? emptyColumns : [...columns]);
    setShowRetryModal(true);
  };

  const toggleRetryColumn = (column: string) => {
    setRetryColumns((prev) =>
    prev.includes(column) ?
    prev.filter((c) => c !== column) :
    [...prev, column]
    );
  };

  const selectAllRetryColumns = () => {
    if (retryColumns.length === columns.length) {
      setRetryColumns([]);
    } else {
      setRetryColumns([...columns]);
    }
  };

  const handleRetrySubmit = async () => {
    if (retryRowIndex === null || retryColumns.length === 0 || !onRetryFile) return;

    setShowRetryModal(false);
    await onRetryFile(retryRowIndex, retryColumns);
    setRetryRowIndex(null);
    setRetryColumns([]);
  };

  // Open edit modal for a specific row
  const handleOpenEditModal = (rowIndex: number) => {
    const rowData = data[rowIndex] || {};
    setEditRowIndex(rowIndex);
    setEditRowData({ ...rowData });
    setShowEditModal(true);
  };

  const handleEditFieldChange = (column: string, value: string) => {
    setEditRowData((prev) => ({
      ...prev,
      [column]: value
    }));
  };

  const handleEditSubmit = () => {
    if (editRowIndex === null || !onEditRow) return;

    onEditRow(editRowIndex, editRowData);
    setShowEditModal(false);
    setEditRowIndex(null);
    setEditRowData({});
  };

  const downloadTaggedFiles = async () => {
    if (originalFiles.length === 0) {
      alert('אין קבצים להורדה');
      return;
    }

    setShowColumnSelector(false);
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (let i = 0; i < originalFiles.length; i++) {
        const file = originalFiles[i];
        const rowData = data[i] || {};

        let newName = generateFilename(rowData, file.name, selectedColumns);

        let finalName = newName;
        let counter = 1;
        while (usedNames.has(finalName.toLowerCase())) {
          const nameWithoutExt = newName.replace(/\.pdf$/, '');
          finalName = `${nameWithoutExt}_${counter}.pdf`;
          counter++;
        }
        usedNames.add(finalName.toLowerCase());

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        let pdfBlob: Blob;
        if (isPdf) {
          pdfBlob = file;
        } else {
          try {
            pdfBlob = await convertImageToPdf(file);
          } catch (err) {
            console.error(`Failed to convert ${file.name} to PDF:`, err);
            continue;
          }
        }

        zip.file(finalName, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'invoices_tagged.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error creating ZIP:', err);
      alert('שגיאה ביצירת קובץ ZIP');
    } finally {
      setIsDownloading(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  const allColumns = ['שם קובץ', 'מספר עמודים', ...columns.filter((c) => c !== 'מספר עמודים')];
  const selectableColumns = ['מספר עמודים', ...columns.filter((c) => c !== 'מספר עמודים')];
  const editableColumns = ['מספר עמודים', ...columns.filter((c) => c !== 'מספר עמודים')];
  const hasOriginalFiles = originalFiles.length > 0;

  return (
    <div data-ev-id="ev_f3569acc0a" className="bg-surface rounded-xl border border-border overflow-hidden">
      <div data-ev-id="ev_df8c401b31" className="flex items-center justify-between p-4 border-b border-border bg-muted">
        <h3 data-ev-id="ev_7b591cba93" className="font-semibold text-foreground">תוצאות ({data.length} רשומות)</h3>
        <div data-ev-id="ev_bd494bf830" className="flex gap-2">
          {hasOriginalFiles &&
          <button data-ev-id="ev_5340e2f39c"
          onClick={handleOpenColumnSelector}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isDownloading ?
            <Loader2 className="w-4 h-4 animate-spin" /> :

            <FolderDown className="w-4 h-4" />
            }
              <span data-ev-id="ev_dae2755b21">{isDownloading ? 'מכין קבצים...' : 'הורד קבצים מתוייגים'}</span>
            </button>
          }
          <button data-ev-id="ev_2cd78150fd"
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-success text-white rounded-lg hover:bg-success/90 transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            <span data-ev-id="ev_5703c0dc45">ייצוא Excel</span>
          </button>
        </div>
      </div>

      <div data-ev-id="ev_b910bc5d2f" className="overflow-x-auto">
        <table data-ev-id="ev_bc1c7eee07" className="w-full text-sm table-fixed" dir="rtl">
          <thead data-ev-id="ev_8da70c5760">
            <tr data-ev-id="ev_1bf003e19a" className="bg-muted">
              <th data-ev-id="ev_17c23098f1" className="px-3 py-3 text-right font-semibold text-foreground border-b border-border w-32 min-w-[8rem]">
                שם קובץ
              </th>
              <th data-ev-id="ev_4117a2dd8f" className="px-3 py-3 text-right font-semibold text-foreground border-b border-border whitespace-nowrap w-20">
                מספר עמודים
              </th>
              {columns.filter((c) => c !== 'מספר עמודים').map((column, index) =>
              <th data-ev-id="ev_9b7e8eb295"
              key={`header-${index}`}
              className="px-3 py-3 text-right font-semibold text-foreground border-b border-border whitespace-nowrap">
                  {column}
                </th>
              )}
              <th data-ev-id="ev_c12e73b0ea" className="px-3 py-3 text-right font-semibold text-foreground border-b border-border whitespace-nowrap w-28">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody data-ev-id="ev_11c9dd69ce">
            {data.map((row, rowIndex) => {
              const isRetrying = retryingIndex === rowIndex;
              return (
                <tr data-ev-id="ev_e04c236207"
                key={`row-${rowIndex}`}
                className={`transition-colors ${isRetrying ? 'bg-primary/10' : 'hover:bg-surface-hover'}`}>
                  <td data-ev-id="ev_befb14207a" className="px-3 py-3 border-b border-border text-foreground w-32 min-w-[8rem]">
                    <div data-ev-id="ev_e58b062558" className="break-words text-xs leading-tight">
                      {fileNames[rowIndex] || `קובץ ${rowIndex + 1}`}
                    </div>
                  </td>
                  <td data-ev-id="ev_c4c74833f1" className="px-3 py-3 border-b border-border text-foreground whitespace-nowrap w-20">
                    {row['מספר עמודים'] || '1'}
                  </td>
                  {columns.filter((c) => c !== 'מספר עמודים').map((column, colIndex) =>
                  <td data-ev-id="ev_5bbe0c75ad"
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="px-3 py-3 border-b border-border text-foreground"
                  dir="auto">
                      {row[column] || '-'}
                    </td>
                  )}
                  <td data-ev-id="ev_ec1084959f" className="px-3 py-3 border-b border-border whitespace-nowrap w-28">
                    <div data-ev-id="ev_54518920cf" className="flex flex-col gap-1">
                      {onRetryFile &&
                      <button data-ev-id="ev_9de584fe54"
                      onClick={() => handleOpenRetryModal(rowIndex)}
                      disabled={isRetrying || retryingIndex !== null}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs bg-muted text-foreground rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="נסה שוב">
                          {isRetrying ?
                        <Loader2 className="w-3 h-3 animate-spin" /> :

                        <RefreshCw className="w-3 h-3" />
                        }
                          <span data-ev-id="ev_508a0ef932">{isRetrying ? 'מעבד...' : 'נסה שוב'}</span>
                        </button>
                      }
                      {onEditRow &&
                      <button data-ev-id="ev_463762ba2d"
                      onClick={() => handleOpenEditModal(rowIndex)}
                      disabled={retryingIndex !== null}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs bg-muted text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="עריכה">
                          <Pencil className="w-3 h-3" />
                          <span data-ev-id="ev_b42d63ed1c">עריכה</span>
                        </button>
                      }
                      {onDeleteRow &&
                      <button data-ev-id="ev_69585ba98c"
                      onClick={() => {
                        if (confirm('האם למחוק שורה זו?')) {
                          onDeleteRow(rowIndex);
                        }
                      }}
                      disabled={retryingIndex !== null}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs bg-muted text-error rounded-lg hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="מחק שורה">
                          <Trash2 className="w-3 h-3" />
                          <span data-ev-id="ev_dbf9005415">מחק</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>);

            })}
          </tbody>
        </table>
      </div>

      {/* Column Selector Modal for Download */}
      {showColumnSelector &&
      <>
          <div data-ev-id="ev_7cfe55b5cc"
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setShowColumnSelector(false)} />

          <div data-ev-id="ev_c3273f521b" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-border rounded-xl shadow-lg z-50 w-full max-w-md p-6" dir="rtl">
            <div data-ev-id="ev_9761d71a55" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_177069f2dc" className="text-lg font-semibold text-foreground">בחר עמודות לשם הקובץ</h3>
              <button data-ev-id="ev_1f4f324451"
            onClick={() => setShowColumnSelector(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p data-ev-id="ev_3bd1dbb542" className="text-sm text-muted-foreground mb-4">
              בחר אילו עמודות ישמשו לשם הקובץ החדש. הערכים יחוברו עם קו תחתון.
            </p>

            <div data-ev-id="ev_7f533778d2" className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
              {selectableColumns.map((column) =>
            <label data-ev-id="ev_42709ea002"
            key={column}
            className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-surface-hover cursor-pointer transition-colors">
                  <input data-ev-id="ev_ee48ef59cf"
              type="checkbox"
              checked={selectedColumns.includes(column)}
              onChange={() => toggleColumn(column)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />

                  <span data-ev-id="ev_30d1768e0b" className="text-foreground">{column}</span>
                </label>
            )}
            </div>

            {selectedColumns.length > 0 &&
          <div data-ev-id="ev_85f87b4b1c" className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-lg">
                <span data-ev-id="ev_af4dd914fc" className="font-medium">תצוגה מקדימה: </span>
                <span data-ev-id="ev_745615e454" dir="ltr" className="text-foreground">
                  {selectedColumns.join('_')}.pdf
                </span>
              </div>
          }

            <div data-ev-id="ev_2bf40d89a2" className="flex gap-3 justify-end">
              <button data-ev-id="ev_ab4fe7ef6c"
            onClick={() => setShowColumnSelector(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ביטול
              </button>
              <button data-ev-id="ev_6a3d2d0754"
            onClick={downloadTaggedFiles}
            disabled={selectedColumns.length === 0}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                הורד קבצים
              </button>
            </div>
          </div>
        </>
      }

      {/* Retry Column Selector Modal */}
      {showRetryModal && retryRowIndex !== null &&
      <>
          <div data-ev-id="ev_4bb0cd592f"
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setShowRetryModal(false)} />

          <div data-ev-id="ev_c2e92d5fc3" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-border rounded-xl shadow-lg z-50 w-full max-w-md p-6" dir="rtl">
            <div data-ev-id="ev_bc51c3bbb4" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_107abc0cd3" className="text-lg font-semibold text-foreground">בחר עמודות לעיבוד מחדש</h3>
              <button data-ev-id="ev_eec8d7e0f8"
            onClick={() => setShowRetryModal(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p data-ev-id="ev_65bce031b3" className="text-sm text-muted-foreground mb-2">
              קובץ: <span data-ev-id="ev_be5abb33f2" className="font-medium text-foreground">{fileNames[retryRowIndex] || `קובץ ${retryRowIndex + 1}`}</span>
            </p>
            <p data-ev-id="ev_b09dddef5b" className="text-sm text-muted-foreground mb-4">
              בחר אילו עמודות לחלץ מחדש. עמודות ריקות מסומנות אוטומטית.
            </p>

            {/* Select All */}
            <label data-ev-id="ev_ec34636a0e" className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg hover:bg-primary/20 cursor-pointer transition-colors mb-2">
              <input data-ev-id="ev_c20bdc405b"
            type="checkbox"
            checked={retryColumns.length === columns.length}
            onChange={selectAllRetryColumns}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />

              <span data-ev-id="ev_eb6c7602a0" className="text-foreground font-medium">בחר הכל</span>
            </label>

            <div data-ev-id="ev_f3b955ae64" className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
              {columns.map((column) => {
              const currentValue = data[retryRowIndex]?.[column];
              const isEmpty = !currentValue || currentValue === '-' || currentValue.trim() === '';

              return (
                <label data-ev-id="ev_25ed460fb9"
                key={column}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                isEmpty ? 'bg-error/10 hover:bg-error/20' : 'bg-muted hover:bg-surface-hover'}`
                }>
                    <input data-ev-id="ev_9995916816"
                  type="checkbox"
                  checked={retryColumns.includes(column)}
                  onChange={() => toggleRetryColumn(column)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />

                    <div data-ev-id="ev_cffef93dfb" className="flex-1 min-w-0">
                      <span data-ev-id="ev_1a41ecd21e" className="text-foreground">{column}</span>
                      <p data-ev-id="ev_b27140ee46" className={`text-xs truncate ${isEmpty ? 'text-error' : 'text-muted-foreground'}`}>
                        ערך נוכחי: {isEmpty ? '(ריק)' : currentValue}
                      </p>
                    </div>
                  </label>);

            })}
            </div>

            <div data-ev-id="ev_ed1c7ac1dd" className="flex gap-3 justify-end">
              <button data-ev-id="ev_bda868ec2f"
            onClick={() => setShowRetryModal(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ביטול
              </button>
              <button data-ev-id="ev_7ab1d1f653"
            onClick={handleRetrySubmit}
            disabled={retryColumns.length === 0}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                עבד מחדש
              </button>
            </div>
          </div>
        </>
      }

      {/* Edit Row Modal */}
      {showEditModal && editRowIndex !== null &&
      <>
          <div data-ev-id="ev_5c65775755"
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setShowEditModal(false)} />

          <div data-ev-id="ev_22c2dccf85" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-border rounded-xl shadow-lg z-50 w-full max-w-lg p-6" dir="rtl">
            <div data-ev-id="ev_6fd7a0c036" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_4c2071c45c" className="text-lg font-semibold text-foreground">עריכת נתונים</h3>
              <button data-ev-id="ev_28f4bd46f6"
            onClick={() => setShowEditModal(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p data-ev-id="ev_6f96eb877f" className="text-sm text-muted-foreground mb-4">
              קובץ: <span data-ev-id="ev_a76df4d1d3" className="font-medium text-foreground">{fileNames[editRowIndex] || `קובץ ${editRowIndex + 1}`}</span>
            </p>

            <div data-ev-id="ev_4a10f4cbe9" className="flex flex-col gap-3 max-h-80 overflow-y-auto mb-4">
              {editableColumns.map((column) =>
            <div data-ev-id="ev_2acc218d3c" key={column} className="flex flex-col gap-1">
                  <label data-ev-id="ev_79029a7a5f" className="text-sm font-medium text-foreground">{column}</label>
                  <input data-ev-id="ev_c44607c83b"
              type="text"
              value={editRowData[column] || ''}
              onChange={(e) => handleEditFieldChange(column, e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              dir="auto" />

                </div>
            )}
            </div>

            <div data-ev-id="ev_65b909fd7d" className="flex gap-3 justify-end">
              <button data-ev-id="ev_c7ad22c3d4"
            onClick={() => setShowEditModal(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                ביטול
              </button>
              <button data-ev-id="ev_f8babf8cfd"
            onClick={handleEditSubmit}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors">
                שמור שינויים
              </button>
            </div>
          </div>
        </>
      }
    </div>);

}
