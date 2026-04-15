import { useState, useEffect, useRef } from 'react';
import { Save, ChevronDown, Trash2, FileText, X, Loader2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Template {
  id: string;
  name: string;
  columns: string[];
  instructions: string;
  created_at: string;
  is_default: boolean;
}

interface TemplateManagerProps {
  columns: string[];
  instructions: string;
  onLoadTemplate: (columns: string[], instructions: string) => void;
  disabled?: boolean;
}

export function TemplateManager({ columns, instructions, onLoadTemplate, disabled = false }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isTogglingDefaultId, setIsTogglingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedDefault = useRef(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Auto-load default template on initial load
  useEffect(() => {
    if (!hasLoadedDefault.current && templates.length > 0) {
      const defaultTemplate = templates.find((t) => t.is_default);
      if (defaultTemplate) {
        onLoadTemplate(defaultTemplate.columns, defaultTemplate.instructions || '');
        hasLoadedDefault.current = true;
      }
    }
  }, [templates, onLoadTemplate]);

  const loadTemplates = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.
      from('templates').
      select('*').
      order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data as Template[] ?? []);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const handleOpenSaveDialog = async () => {
    // Fetch latest templates to ensure accurate duplicate check
    await loadTemplates();
    setIsSaveDialogOpen(true);
  };

  const handleCloseSaveDialog = () => {
    setIsSaveDialogOpen(false);
    setShowReplaceConfirm(false);
    setExistingTemplateId(null);
    setTemplateName('');
    setError(null);
  };

  const saveTemplate = async () => {
    if (!supabase || !templateName.trim()) return;

    // Check if template with same name exists
    const existingTemplate = templates.find(
      (t) => t.name.toLowerCase() === templateName.trim().toLowerCase()
    );

    if (existingTemplate && !showReplaceConfirm) {
      setExistingTemplateId(existingTemplate.id);
      setShowReplaceConfirm(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (existingTemplateId) {
        // Update existing template
        const { error } = await supabase.
        from('templates').
        update({
          columns: columns,
          instructions: instructions
        }).
        eq('id', existingTemplateId);

        if (error) throw error;
      } else {
        // Insert new template
        const { error } = await supabase.
        from('templates').
        insert({
          name: templateName.trim(),
          columns: columns,
          instructions: instructions
        });

        if (error) throw error;
      }

      handleCloseSaveDialog();
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת התבנית');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;

    if (!confirm('האם למחוק תבנית זו?')) return;

    setIsDeletingId(id);

    try {
      const { error } = await supabase.
      from('templates').
      delete().
      eq('id', id);

      if (error) throw error;
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('שגיאה במחיקת התבנית');
    } finally {
      setIsDeletingId(null);
    }
  };

  const selectTemplate = (template: Template) => {
    onLoadTemplate(template.columns, template.instructions || '');
    setIsDropdownOpen(false);
  };

  const toggleDefault = async (id: string, currentIsDefault: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;

    setIsTogglingDefaultId(id);

    try {
      if (!currentIsDefault) {
        // First, clear any existing default
        await supabase.
        from('templates').
        update({ is_default: false }).
        eq('is_default', true);
      }

      // Then toggle this template's default status
      const { error } = await supabase.
      from('templates').
      update({ is_default: !currentIsDefault }).
      eq('id', id);

      if (error) throw error;
      await loadTemplates();
    } catch (err) {
      console.error('Error toggling default template:', err);
    } finally {
      setIsTogglingDefaultId(null);
    }
  };

  const canSave = columns.length > 0;

  return (
    <div data-ev-id="ev_7012a320e3" className="flex flex-row gap-3 items-center flex-wrap">
      {/* Load Template Dropdown */}
      <div data-ev-id="ev_ce35d572f6" className="relative">
        <button data-ev-id="ev_548f454c3c"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={disabled || templates.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">

          <FileText className="w-4 h-4 text-muted-foreground" />
          <span data-ev-id="ev_4bee3f8594" className="text-foreground">בחר תבנית</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && templates.length > 0 &&
        <>
            <div data-ev-id="ev_f6db8134cf"
          className="fixed inset-0 z-10"
          onClick={() => setIsDropdownOpen(false)} />

            <div data-ev-id="ev_3d75e2d8af" className="absolute top-full right-0 mt-1 w-72 bg-surface border border-border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
              {templates.map((template) =>
            <div data-ev-id="ev_7b7ef569d3"
            key={template.id}
            onClick={() => selectTemplate(template)}
            className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover cursor-pointer border-b border-border last:border-b-0 group">

                  <div data-ev-id="ev_174aa9cdd5" className="flex-1 min-w-0">
                    <div data-ev-id="ev_6366520f85" className="flex items-center gap-2">
                      <p data-ev-id="ev_55374b60d1" className="text-sm font-medium text-foreground truncate" dir="auto">
                        {template.name}
                      </p>
                      {template.is_default &&
                  <span data-ev-id="ev_999520acc2" className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">ברירת מחדל</span>
                  }
                    </div>
                    <p data-ev-id="ev_4b9ccbe4d8" className="text-xs text-muted-foreground">
                      {template.columns.length} עמודות
                    </p>
                  </div>
                  <div data-ev-id="ev_e91bb3d091" className="flex items-center gap-1">
                    <button data-ev-id="ev_2002d0e487"
                onClick={(e) => toggleDefault(template.id, template.is_default, e)}
                disabled={isTogglingDefaultId === template.id}
                title={template.is_default ? 'הסר כברירת מחדל' : 'הגדר כברירת מחדל'}
                className={`p-1.5 rounded transition-colors ${
                template.is_default ?
                'text-yellow-500 hover:text-yellow-600' :
                'text-muted-foreground hover:text-yellow-500 opacity-0 group-hover:opacity-100'} disabled:opacity-50`
                }>
                      {isTogglingDefaultId === template.id ?
                  <Loader2 className="w-4 h-4 animate-spin" /> :

                  <Star className={`w-4 h-4 ${template.is_default ? 'fill-current' : ''}`} />
                  }
                    </button>
                    <button data-ev-id="ev_754c8cad21"
                onClick={(e) => deleteTemplate(template.id, e)}
                disabled={isDeletingId === template.id}
                className="p-1.5 text-muted-foreground hover:text-error hover:bg-error-light rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50">
                      {isDeletingId === template.id ?
                  <Loader2 className="w-4 h-4 animate-spin" /> :
                  <Trash2 className="w-4 h-4" />
                  }
                    </button>
                  </div>
                </div>
            )}
            </div>
          </>
        }
      </div>

      {/* Save Template Button */}
      <button data-ev-id="ev_abcdba4e0d"
      onClick={handleOpenSaveDialog}
      disabled={disabled || !canSave}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">

        <Save className="w-4 h-4" />
        <span data-ev-id="ev_78b43e64a4">שמור תבנית</span>
      </button>

      {/* Save Dialog */}
      {isSaveDialogOpen &&
      <>
          <div data-ev-id="ev_85743bc179"
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleCloseSaveDialog} />

          <div data-ev-id="ev_28424dd708" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-border rounded-xl shadow-lg z-50 w-full max-w-md p-6" dir="rtl">
            <div data-ev-id="ev_866b23b91d" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_5c0e9d619c" className="text-lg font-semibold text-foreground">
                {showReplaceConfirm ? 'החלפת תבנית קיימת' : 'שמור תבנית חדשה'}
              </h3>
              <button data-ev-id="ev_02ec790d7f"
            onClick={handleCloseSaveDialog}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_cee3a3072a" className="flex flex-col gap-4">
              {showReplaceConfirm ?
            <div data-ev-id="ev_e03b3df2e0" className="text-sm text-foreground">
                  <p data-ev-id="ev_6f84521ad5">קיימת כבר תבנית בשם "<strong data-ev-id="ev_6fd04a0364">{templateName}</strong>".</p>
                  <p data-ev-id="ev_47590ab81e" className="mt-2">האם ברצונך להחליף אותה?</p>
                </div> :

            <>
                  <div data-ev-id="ev_3d8bf80822">
                    <label data-ev-id="ev_8ddcbc8363" className="block text-sm font-medium text-foreground mb-2">
                      שם התבנית
                    </label>
                    <input data-ev-id="ev_426c44edca"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="לדוגמה: חשבוניות ספקים"
                className="w-full px-4 py-2 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                dir="auto"
                autoFocus />
                  </div>

                  <div data-ev-id="ev_acd85b0a4e" className="text-sm text-muted-foreground">
                    <p data-ev-id="ev_99423399fa">התבנית תכלול:</p>
                    <ul data-ev-id="ev_036884a2b0" className="list-disc list-inside mt-1">
                      <li data-ev-id="ev_e14b782803">{columns.length} עמודות</li>
                      {instructions && <li data-ev-id="ev_c43d3db219">הנחיות AI</li>}
                    </ul>
                  </div>
                </>
            }

              {error &&
            <p data-ev-id="ev_998e1766b7" className="text-sm text-error">{error}</p>
            }

              <div data-ev-id="ev_e5097c3dff" className="flex gap-3 justify-end">
                {showReplaceConfirm ?
              <>
                    <button data-ev-id="ev_01e4bf3d95"
                onClick={() => {
                  setShowReplaceConfirm(false);
                  setExistingTemplateId(null);
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      שנה שם
                    </button>
                    <button data-ev-id="ev_d27b2b5d1e"
                onClick={saveTemplate}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      החלף תבנית
                    </button>
                  </> :

              <>
                    <button data-ev-id="ev_cc0ea36370"
                onClick={handleCloseSaveDialog}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      ביטול
                    </button>
                    <button data-ev-id="ev_9fc38dc8d5"
                onClick={saveTemplate}
                disabled={!templateName.trim() || isLoading}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {isLoading ? 'שומר...' : 'שמור'}
                    </button>
                  </>
              }
              </div>
            </div>
          </div>
        </>
      }
    </div>);

}
