import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export type FileStatus = 'pending' | 'processing' | 'success' | 'error';

interface ProcessingStatusProps {
  files: {name: string;status: FileStatus;error?: string;}[];
  isProcessing: boolean;
}

export function ProcessingStatus({ files, isProcessing }: ProcessingStatusProps) {
  const completed = files.filter((f) => f.status === 'success').length;
  const errors = files.filter((f) => f.status === 'error').length;
  const total = files.length;

  if (!isProcessing && files.every((f) => f.status === 'pending')) {
    return null;
  }

  return (
    <div data-ev-id="ev_45a20d9853" className="bg-surface rounded-xl border border-border p-6">
      <div data-ev-id="ev_a5878bd2d0" className="flex items-center justify-between mb-4">
        <h3 data-ev-id="ev_4057bffb25" className="font-semibold text-foreground">סטטוס עיבוד</h3>
        <div data-ev-id="ev_6526fe9ba2" className="flex items-center gap-4 text-sm">
          <span data-ev-id="ev_1b6aa0f763" className="flex items-center gap-1 text-success">
            <CheckCircle className="w-4 h-4" />
            {completed} הושלמו
          </span>
          {errors > 0 &&
          <span data-ev-id="ev_a423fff3a7" className="flex items-center gap-1 text-error">
              <XCircle className="w-4 h-4" />
              {errors} שגיאות
            </span>
          }
        </div>
      </div>

      {/* Progress bar */}
      <div data-ev-id="ev_1a2d59f23b" className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div data-ev-id="ev_46df357787"
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${(completed + errors) / total * 100}%` }} />

      </div>

      <div data-ev-id="ev_5072bdf9e3" className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {files.map((file, index) =>
        <div data-ev-id="ev_c086eec9a1"
        key={`status-${index}`}
        className="flex items-center gap-3 p-2 bg-muted rounded-lg text-sm">

            {file.status === 'pending' &&
          <div data-ev-id="ev_c19c408ce0" className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
          }
            {file.status === 'processing' &&
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          }
            {file.status === 'success' &&
          <CheckCircle className="w-4 h-4 text-success" />
          }
            {file.status === 'error' &&
          <XCircle className="w-4 h-4 text-error" />
          }
            <span data-ev-id="ev_16ee1b6638" className="flex-1 truncate text-foreground" dir="auto">{file.name}</span>
            {file.error &&
          <span data-ev-id="ev_d7350bb981" className="text-xs text-error truncate max-w-48" title={file.error}>
                {file.error}
              </span>
          }
          </div>
        )}
      </div>
    </div>);

}
