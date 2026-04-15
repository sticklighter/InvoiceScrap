import { useState, useEffect } from 'react';
import { Save, FolderOpen, X, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';

type Template = Tables<'templates'>;

interface TemplateSelectorProps {
  columns: string[];
  instructions: string;
  onLoadTemplate: (columns: string[], instructions: string) => void;
  disabled?: boolean;
}

export function TemplateSelector({ columns, instructions, onLoadTemplate, disabled = false }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    if (!supabase) return;

    setIsLoading(true);
    const { data, error } = await supabase.
    from('templates').
    select('*').
    order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenSaveModal = async () => {
    // Fetch latest templates before opening save modal to ensure accurate duplicate check
    await fetchTemplates();
    setShowSaveModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!supabase || !templateName.trim()) return;

    if (columns.length === 0) {
      setError('יש להוסיף לפחות עמודה אחת לפני שמירת התבנית');
      return;
    }

    console.log('Templates in state:', templates.map(t => t.name));
    console.log('Looking for:', templateName.trim().toLowerCase());

    // Check if template with same name exists
    const existingTemplate = templates.find(
      (t) => t.name.toLowerCase() === templateName.trim().toLowerCase()
    );

    console.log('Found existing template:', existingTemplate);
    console.log('showReplaceConfirm:', showReplaceConfirm);

    if (existingTemplate && !showReplaceConfirm) {
      console.log('Setting showReplaceConfirm to true');
      setExistingTemplateId(existingTemplate.id);
      setShowReplaceConfirm(true);
      return;
    }

    setIsSaving(true);
    setError(null);

    // If replacing, update existing template
    if (existingTemplateId) {
      const { error } = await supabase.
      from('templates').
      update({
        columns: columns,
        instructions: instructions
      }).
      eq('id', existingTemplateId);

      if (error) {
        setError('שגיאה בעדכון התבנית');
        console.error('Error updating template:', error);
      } else {
        setShowSaveModal(false);
        setShowReplaceConfirm(false);
        setExistingTemplateId(null);
        setTemplateName('');
        fetchTemplates();
      }
    } else {
      // Create new template
      const { error } = await supabase.
      from('templates').
      insert({
        name: templateName.trim(),
        columns: columns,
        instructions: instructions
      });

      if (error) {
        setError('שגיאה בשמירת התבנית');
        console.error('Error saving template:', error);
      } else {
        setShowSaveModal(false);
        setTemplateName('');
        fetchTemplates();
      }
    }
    setIsSaving(false);
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the load action

    if (!supabase) return;

    if (!confirm('האם אתה בטוח שברצונך למחוק תבנית זו?')) {
      return;
    }

    setIsDeleting(templateId);

    const { error } = await supabase.
    from('templates').
    delete().
    eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      alert('שגיאה במחיקת התבנית');
    } else {
      fetchTemplates();
    }

    setIsDeleting(null);
  };

  const handleLoadTemplate = (template: Template) => {
    onLoadTemplate(template.columns, template.instructions || '');
    setShowLoadModal(false);
  };

  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    setShowReplaceConfirm(false);
    setExistingTemplateId(null);
    setTemplateName('');
    setError(null);
  };

  return (
    <>
      <div data-ev-id="ev_9a7f37938d" className="flex gap-2">
        <button data-ev-id="ev_e72f7bcaf0"
        onClick={() => setShowLoadModal(true)}
        disabled={disabled || isLoading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface border border-border rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

          <FolderOpen className="w-4 h-4" />
          <span data-ev-id="ev_0a81cf57de">טען תבנית</span>
        </button>
        <button data-ev-id="ev_7f7ffd9813"
        onClick={handleOpenSaveModal}
        disabled={disabled || columns.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

          <Save className="w-4 h-4" />
          <span data-ev-id="ev_fcf5139987">שמור תבנית</span>
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal &&
      <div data-ev-id="ev_1c899c0924" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_39c696f4a0" className="bg-surface rounded-xl border border-border p-6 w-full max-w-md" dir="rtl">
            <div data-ev-id="ev_9c5d026668" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_24574d277e" className="text-lg font-semibold text-foreground">
                {showReplaceConfirm ? 'החלפת תבנית קיימת' : 'שמירת תבנית'}
              </h3>
              <button data-ev-id="ev_7e3c0918be"
            onClick={handleCloseSaveModal}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div data-ev-id="ev_9b2b101515" className="flex flex-col gap-4">
              {showReplaceConfirm ?
            <div data-ev-id="ev_1088587170" className="text-sm text-foreground">
                  <p data-ev-id="ev_6fa4e795ab">קיימת כבר תבנית בשם "<strong data-ev-id="ev_dfbe02b8e2">{templateName}</strong>".</p>
                  <p data-ev-id="ev_de658d20cd" className="mt-2">האם ברצונך להחליף אותה?</p>
                </div> :

            <>
                  <div data-ev-id="ev_ddf25b170e">
                    <label data-ev-id="ev_306dc75c82" className="block text-sm font-medium text-foreground mb-2">שם התבנית</label>
                    <input data-ev-id="ev_d267df4073"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="לדוגמה: חשבוניות ספקים"
                className="w-full px-4 py-2 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                dir="auto" />
                  </div>

                  <div data-ev-id="ev_7cd65ae6f4" className="text-sm text-muted-foreground">
                    <p data-ev-id="ev_8a76d0bcee"><strong data-ev-id="ev_9fd4dd557d">עמודות:</strong> {columns.length > 0 ? columns.join(', ') : 'אין עמודות'}</p>
                    <p data-ev-id="ev_6e8da31bda" className="mt-1"><strong data-ev-id="ev_34b27533e7">הנחיות:</strong> {instructions ? 'כן' : 'לא'}</p>
                  </div>
                </>
            }

              {error &&
            <p data-ev-id="ev_2f8981bef9" className="text-sm text-error">{error}</p>
            }

              <div data-ev-id="ev_69915609e7" className="flex gap-2 justify-end">
                {showReplaceConfirm ?
              <>
                    <button data-ev-id="ev_e648973f6b"
                onClick={() => {
                  setShowReplaceConfirm(false);
                  setExistingTemplateId(null);
                }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover transition-colors">
                      שנה שם
                    </button>
                    <button data-ev-id="ev_ffd7f69cc8"
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span data-ev-id="ev_2fc6e2e3ea">החלף תבנית</span>
                    </button>
                  </> :

              <>
                    <button data-ev-id="ev_84852a71ec"
                onClick={handleCloseSaveModal}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover transition-colors">
                      ביטול
                    </button>
                    <button data-ev-id="ev_407e34e8a2"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || isSaving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span data-ev-id="ev_ad3aa66490">שמור</span>
                    </button>
                  </>
              }
              </div>
            </div>
          </div>
        </div>
      }

      {/* Load Modal */}
      {showLoadModal &&
      <div data-ev-id="ev_fa8f20815d" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_714d3273ff" className="bg-surface rounded-xl border border-border p-6 w-full max-w-md max-h-[80vh] flex flex-col" dir="rtl">
            <div data-ev-id="ev_98b5e941d4" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_a37f342f50" className="text-lg font-semibold text-foreground">טעינת תבנית</h3>
              <button data-ev-id="ev_36376b6ab7"
            onClick={() => setShowLoadModal(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div data-ev-id="ev_e8f9dddd34" className="flex-1 overflow-y-auto">
              {isLoading ?
            <div data-ev-id="ev_faa8e206b7" className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div> :
            templates.length === 0 ?
            <p data-ev-id="ev_8a3385fc64" className="text-center text-muted-foreground py-8">אין תבניות שמורות</p> :

            <div data-ev-id="ev_36201386f0" className="flex flex-col gap-2">
                  {templates.map((template) =>
              <div data-ev-id="ev_05b22f4a32"
              key={template.id}
              className="w-full p-4 bg-muted rounded-lg hover:bg-surface-hover transition-colors flex items-start justify-between gap-2">
                      <button data-ev-id="ev_5552e43260"
                onClick={() => handleLoadTemplate(template)}
                className="flex-1 text-right">
                        <p data-ev-id="ev_3dc4878d6d" className="font-medium text-foreground">{template.name}</p>
                        <p data-ev-id="ev_5a24df35d9" className="text-sm text-muted-foreground mt-1">
                          {template.columns.length} עמודות
                          {template.instructions && ' • כולל הנחיות'}
                        </p>
                      </button>
                      <button data-ev-id="ev_593c298d20"
                onClick={(e) => handleDeleteTemplate(template.id, e)}
                disabled={isDeleting === template.id}
                className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
                title="מחק תבנית">
                        {isDeleting === template.id ?
                  <Loader2 className="w-4 h-4 animate-spin" /> :

                  <Trash2 className="w-4 h-4" />
                  }
                      </button>
                    </div>
              )}
                </div>
            }
            </div>

            <div data-ev-id="ev_ece03f8bde" className="mt-4 pt-4 border-t border-border">
              <button data-ev-id="ev_b51fa59eca"
            onClick={() => setShowLoadModal(false)}
            className="w-full px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover transition-colors">

                סגור
              </button>
            </div>
          </div>
        </div>
      }
    </>);

}
