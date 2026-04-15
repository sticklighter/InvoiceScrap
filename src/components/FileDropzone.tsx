import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, FileText, Image } from 'lucide-react';

interface FileWithPreview extends File {
  preview?: string;
}

interface FileDropzoneProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function FileDropzone({ files, onFilesChange, maxFiles = 250, disabled = false }: FileDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxFiles - files.length);
    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'],
      'application/pdf': ['.pdf']
    },
    maxFiles: maxFiles - files.length,
    disabled: disabled || files.length >= maxFiles
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-primary" />;
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4 text-primary" />;
    return <File className="w-4 h-4 text-secondary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div data-ev-id="ev_c7c18e2532" className="flex flex-col gap-4">
      <div data-ev-id="ev_8b7e778cd2"
      {...getRootProps()}
      className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-primary bg-dropzone-active' : 'border-dropzone-border bg-dropzone hover:bg-dropzone-active'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}>

        <input data-ev-id="ev_fc2f9bec4e" {...getInputProps()} />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        <p data-ev-id="ev_03791884ac" className="text-lg font-medium text-foreground mb-2">
          {isDragActive ? 'שחרר קבצים כאן' : 'גרור ושחרר קבצים כאן'}
        </p>
        <p data-ev-id="ev_a887cf174b" className="text-sm text-muted-foreground mb-2">
          או לחץ לבחירת קבצים
        </p>
        <p data-ev-id="ev_a887cf174b" className="text-xs text-muted-foreground">
          תמונות ו-PDF (PNG, JPG, WEBP, PDF) • עד {maxFiles} קבצים
        </p>
      </div>

      {files.length > 0 &&
      <div data-ev-id="ev_ceb2cef381" className="bg-surface rounded-xl border border-border p-4">
          <div data-ev-id="ev_80fdd62fd7" className="flex items-center justify-between mb-3">
            <h3 data-ev-id="ev_a9848160c9" className="font-medium text-foreground">קבצים שנבחרו ({files.length}/{maxFiles})</h3>
            <button data-ev-id="ev_e04350f351"
          onClick={() => onFilesChange([])}
          className="text-sm text-error hover:text-error/80 transition-colors"
          disabled={disabled}>

              נקה הכל
            </button>
          </div>
          <div data-ev-id="ev_ea91eb6ecd" className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {files.map((file, index) =>
          <div data-ev-id="ev_9e0d2364f5"
          key={`${file.name}-${index}`}
          className="flex items-center gap-3 p-2 bg-muted rounded-lg group">

                {getFileIcon(file)}
                <span data-ev-id="ev_66c09e0378" className="flex-1 text-sm text-foreground truncate" dir="auto">{file.name}</span>
                <span data-ev-id="ev_f07aa29b53" className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                <button data-ev-id="ev_2b1b51fb7d"
            onClick={() => removeFile(index)}
            className="p-1 text-muted-foreground hover:text-error transition-colors opacity-0 group-hover:opacity-100"
            disabled={disabled}>

                  <X className="w-4 h-4" />
                </button>
              </div>
          )}
          </div>
        </div>
      }
    </div>);

}
