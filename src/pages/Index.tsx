import { useState, useCallback, useRef } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ColumnConfig } from '@/components/ColumnConfig';
import { ResultsTable } from '@/components/ResultsTable';
import { ProcessingStatus, FileStatus } from '@/components/ProcessingStatus';
import { TemplateManager } from '@/components/TemplateManager';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface FileWithStatus {
  file: File;
  status: FileStatus;
  error?: string;
}

export default function Index() {
  const [files, setFiles] = useState<File[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<{name: string;status: FileStatus;error?: string;}[]>([]);
  const [results, setResults] = useState<Record<string, string>[]>([]);
  const [processedFileNames, setProcessedFileNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
    });
  };

  const processFiles = async () => {
    if (!supabase) {
      setError('Cloud Backend לא מופעל');
      return;
    }

    if (files.length === 0) {
      setError('יש להעלות קבצים לעיבוד');
      return;
    }

    if (columns.length === 0) {
      setError('יש להוסיף לפחות עמודה אחת');
      return;
    }

    // Find new files that haven't been processed yet
    const newFiles = files.filter((f) => !processedFileNames.has(f.name));

    if (newFiles.length === 0) {
      setError('כל הקבצים כבר עובדו. הוסף קבצים חדשים לעיבוד.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    // Initialize file statuses for new files only
    const newStatuses = newFiles.map((f) => ({ name: f.name, status: 'pending' as FileStatus }));
    setFileStatuses(newStatuses);

    const newExtractedData: Record<string, string>[] = [];
    const newProcessedNames: string[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];

      // Update status to processing
      setFileStatuses((prev) => prev.map((s, idx) =>
      idx === i ? { ...s, status: 'processing' } : s
      ));

      try {
        const base64Data = await fileToBase64(file);

        const response = await supabase.functions.invoke('extract-invoice', {
          body: {
            fileData: base64Data,
            fileName: file.name,
            fileType: file.type,
            columns,
            instructions
          }
        });

        // Check for Supabase client-level error
        if (response.error) {
          throw new Error(response.error.message || 'שגיאה בעיבוד');
        }

        // Check for application-level error in response data
        if (response.data && response.data.success === false) {
          const errorMsg = response.data.error || 'שגיאה בעיבוד';
          const details = response.data.details ? `\n${response.data.details}` : '';
          console.error('Edge function error:', errorMsg, details);
          throw new Error(errorMsg);
        }

        // Include page count in the extracted data
        const extractedFields = response.data?.data || {};
        const pageCount = response.data?.pageCount || 1;
        newExtractedData.push({
          ...extractedFields,
          'מספר עמודים': String(pageCount)
        });
        newProcessedNames.push(file.name);

        setFileStatuses((prev) => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'success' } : s
        ));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'שגיאה לא ידועה';

        setFileStatuses((prev) => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'error', error: errorMessage } : s
        ));

        // Still add empty result to keep index alignment
        newExtractedData.push({ 'מספר עמודים': '1' });
        // Also add to processed names so file is included in download (with original name)
        newProcessedNames.push(file.name);
      }
    }

    // Append new results to existing results
    setResults((prev) => [...prev, ...newExtractedData]);

    // Update processed file names set
    setProcessedFileNames((prev) => {
      const updated = new Set(prev);
      newProcessedNames.forEach((name) => updated.add(name));
      return updated;
    });

    // Track processed files for download (include all processed files, even failed ones)
    setProcessedFiles((prev) => [...prev, ...newFiles]);

    setIsProcessing(false);
  };

  // Retry processing a single file with specific columns
  const handleRetryFile = async (index: number, columnsToRetry: string[]) => {
    if (!supabase || retryingIndex !== null) return;

    const file = processedFiles[index];
    if (!file) return;

    setRetryingIndex(index);
    setError(null);

    try {
      const base64Data = await fileToBase64(file);

      const response = await supabase.functions.invoke('extract-invoice', {
        body: {
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type,
          columns: columnsToRetry, // Only extract selected columns
          instructions
        }
      });

      // Check for Supabase client-level error
      if (response.error) {
        throw new Error(response.error.message || 'שגיאה בעיבוד');
      }

      // Check for application-level error in response data
      if (response.data && response.data.success === false) {
        const errorMsg = response.data.error || 'שגיאה בעיבוד';
        throw new Error(errorMsg);
      }

      // Get the new extracted fields
      const extractedFields = response.data?.data || {};
      const pageCount = response.data?.pageCount || 1;

      // Update the specific row in results - merge with existing data
      setResults((prev) => {
        const updated = [...prev];
        const existingRow = updated[index] || {};
        
        // Merge: keep existing data, update only the retried columns
        updated[index] = {
          ...existingRow,
          ...extractedFields,
          'מספר עמודים': String(pageCount)
        };
        return updated;
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(`שגיאה בעיבוד מחדש: ${errorMessage}`);
    } finally {
      setRetryingIndex(null);
    }
  };

  // Delete a specific row from results
  const handleDeleteRow = (index: number) => {
    const fileToRemove = processedFiles[index];

    // Remove from results
    setResults((prev) => prev.filter((_, i) => i !== index));

    // Remove from processed files
    setProcessedFiles((prev) => prev.filter((_, i) => i !== index));

    // Remove from processed file names set
    if (fileToRemove) {
      setProcessedFileNames((prev) => {
        const updated = new Set(prev);
        updated.delete(fileToRemove.name);
        return updated;
      });
    }
  };

  // Edit a specific row's data
  const handleEditRow = (index: number, newData: Record<string, string>) => {
    setResults((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...newData };
      return updated;
    });
  };

  // Count new files for the button
  const newFilesCount = files.filter((f) => !processedFileNames.has(f.name)).length;
  const canProcess = newFilesCount > 0 && columns.length > 0 && !isProcessing;

  const handleLoadTemplate = (templateColumns: string[], templateInstructions: string) => {
    setColumns(templateColumns);
    setInstructions(templateInstructions);
  };

  // Get all file names for the results table (processed files in order)
  const processedFileNamesArray = processedFiles.map((f) => f.name);

  return (
    <div data-ev-id="ev_ba65fb01d1" className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header data-ev-id="ev_d4a1779458" className="bg-surface border-b border-border">
        <div data-ev-id="ev_978ff51a4f" className="max-w-6xl mx-auto px-4 py-6">
          <div data-ev-id="ev_975e7b4f90" className="flex items-center gap-3">
            <div data-ev-id="ev_d2ad7b95fc" className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div data-ev-id="ev_97464c21f0">
              <h1 data-ev-id="ev_0de722ab72" className="text-2xl font-bold text-foreground">חילוץ נתוני חשבוניות</h1>
              <p data-ev-id="ev_ac4664f9cd" className="text-muted-foreground">העלה חשבוניות וחלץ נתונים לאקסל באמצעות AI</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main data-ev-id="ev_cf40d2ccbe" className="max-w-6xl mx-auto px-4 py-8">
        <div data-ev-id="ev_51ef002a72" className="flex flex-col gap-8">
          {/* Step 1: File Upload */}
          <section data-ev-id="ev_e3a1928365">
            <div data-ev-id="ev_979144d1f6" className="flex items-center gap-2 mb-4">
              <span data-ev-id="ev_440ece24f9" className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">1</span>
              <h2 data-ev-id="ev_71791e2ae7" className="text-lg font-semibold text-foreground">העלאת קבצים</h2>
              {processedFileNames.size > 0 &&
              <span data-ev-id="ev_fb7ca70fb8" className="text-sm text-muted-foreground">
                  ({processedFileNames.size} עובדו, {newFilesCount} חדשים)
                </span>
              }
            </div>
            <FileDropzone
              files={files}
              onFilesChange={setFiles}
              maxFiles={250}
              disabled={isProcessing} />

          </section>

          {/* Template Manager */}
          <section data-ev-id="ev_433988d1c8">
            <div data-ev-id="ev_8c529196cc" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_f15cf59e2f" className="flex items-center gap-2">
                <span data-ev-id="ev_5c541f7969" className="w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-sm font-semibold">⚡</span>
                <h2 data-ev-id="ev_8345a92594" className="text-lg font-semibold text-foreground">תבניות מוכנות</h2>
              </div>
              <TemplateManager
                columns={columns}
                instructions={instructions}
                onLoadTemplate={handleLoadTemplate}
                disabled={isProcessing} />

            </div>
          </section>

          {/* Step 2: Column Configuration */}
          <section data-ev-id="ev_e45cca5bf2">
            <div data-ev-id="ev_b2c3ffbaf5" className="flex items-center gap-2 mb-4">
              <span data-ev-id="ev_8b7bb84c22" className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">2</span>
              <h2 data-ev-id="ev_f0441de3bc" className="text-lg font-semibold text-foreground">הגדרת עמודות</h2>
            </div>
            <ColumnConfig
              columns={columns}
              onColumnsChange={setColumns}
              disabled={isProcessing} />

          </section>

          {/* Step 3: AI Instructions */}
          <section data-ev-id="ev_d2d9873499">
            <div data-ev-id="ev_f8ff3806d6" className="flex items-center gap-2 mb-4">
              <span data-ev-id="ev_d4235d47c8" className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">3</span>
              <h2 data-ev-id="ev_6afb497121" className="text-lg font-semibold text-foreground">הנחיות AI (אופציונלי)</h2>
            </div>
            <div data-ev-id="ev_6310e03b01" className="bg-surface rounded-xl border border-border p-6">
              <textarea data-ev-id="ev_e8b9422477"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="הוסף הנחיות נוספות לחילוץ הנתונים...&#10;&#10;לדוגמה:&#10;- התעלם מחשבוניות זיכוי&#10;- המר תאריכים לפורמט DD/MM/YYYY&#10;- חלץ רק סכומים במטבע שקל"
              className="w-full h-32 px-4 py-3 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              dir="auto"
              disabled={isProcessing} />

            </div>
          </section>

          {/* Error Message */}
          {error &&
          <div data-ev-id="ev_bc5a705b45" className="flex items-center gap-3 p-4 bg-error-light border border-error/20 rounded-xl text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span data-ev-id="ev_e305869e93">{error}</span>
            </div>
          }

          {/* Process Button */}
          <section data-ev-id="ev_00c5bc23cf">
            <button data-ev-id="ev_bfa992387b"
            onClick={processFiles}
            disabled={!canProcess}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg">

              <Sparkles className="w-6 h-6" />
              <span data-ev-id="ev_4d5de2e631">
                {isProcessing ?
                'מעבד...' :
                newFilesCount > 0 ?
                `עבד ${newFilesCount} קבצים חדשים` :
                'עבד קבצים חדשים'}
              </span>
            </button>
          </section>

          {/* Processing Status */}
          <ProcessingStatus
            files={fileStatuses}
            isProcessing={isProcessing} />


          {/* Results Table */}
          <ResultsTable
            data={results}
            columns={columns}
            fileNames={processedFileNamesArray}
            originalFiles={processedFiles}
            onRetryFile={handleRetryFile}
            onEditRow={handleEditRow}
            onDeleteRow={handleDeleteRow}
            retryingIndex={retryingIndex} />

        </div>
      </main>

      {/* Footer */}
      <footer data-ev-id="ev_36ef244161" className="border-t border-border mt-16">
        <div data-ev-id="ev_794f32dc2b" className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          מופעל על ידי Google Cloud Vision + Gemini AI
        </div>
      </footer>
    </div>);

}
