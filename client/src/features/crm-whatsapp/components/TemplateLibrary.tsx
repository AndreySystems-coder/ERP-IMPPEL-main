import { Info, Library, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CATEGORIES, VARIABLES_HELP } from "@/features/crm-whatsapp/constants";
import { TemplateCard } from "@/features/crm-whatsapp/components/TemplateCard";
import type { WhatsappTemplate } from "@/features/crm-whatsapp/types";

type TemplateLibraryProps = {
  templates: WhatsappTemplate[];
  isLoading?: boolean;
  categoryFilter: string;
  copiedId: number | null;
  onCategoryChange: (category: string) => void;
  onCreate: () => void;
  onEdit: (template: WhatsappTemplate) => void;
  onDelete: (template: WhatsappTemplate) => void;
  onCopy: (template: WhatsappTemplate) => void;
  onSend: (template: WhatsappTemplate) => void;
};

export function TemplateLibrary({
  templates,
  isLoading = false,
  categoryFilter,
  copiedId,
  onCategoryChange,
  onCreate,
  onEdit,
  onDelete,
  onCopy,
  onSend,
}: TemplateLibraryProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange("all")}
          className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${categoryFilter === "all" ? "border-gray-800 bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900" : "border-gray-300 text-gray-600 hover:border-gray-500 dark:border-gray-600 dark:text-gray-400"}`}
          data-testid="filter-all"
        >
          Todos
        </button>
        {CATEGORIES.map(category => (
          <button
            key={category.value}
            onClick={() => onCategoryChange(category.value)}
            className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${categoryFilter === category.value ? "border-gray-800 bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900" : "border-gray-300 text-gray-600 hover:border-gray-500 dark:border-gray-600 dark:text-gray-400"}`}
            data-testid={`filter-${category.value}`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <Info className="h-3.5 w-3.5" />
          Variáveis suportadas nas mensagens:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES_HELP.map(variable => (
            <span
              key={variable.var}
              className="rounded border border-amber-200 bg-white px-2 py-0.5 font-mono text-xs text-amber-700 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-400"
              title={variable.desc}
            >
              {variable.var}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(item => (
            <div key={item} className="h-44 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-gray-400 dark:border-slate-800 dark:bg-slate-950">
          <Library className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="font-medium text-slate-500 dark:text-slate-300">Nenhum template ainda{categoryFilter !== "all" ? " nesta categoria" : ""}.</p>
          <p className="mb-4 mt-1 text-sm">Crie templates para reutilizar em orçamentos, OS e muito mais.</p>
          <Button onClick={onCreate} className="min-h-10 gap-2">
            <Plus className="h-4 w-4" />
            Criar Primeiro Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              copied={copiedId === template.id}
              onEdit={() => onEdit(template)}
              onDelete={() => onDelete(template)}
              onCopy={() => onCopy(template)}
              onSend={() => onSend(template)}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-2 text-xs font-medium text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando biblioteca de templates...
        </div>
      )}
    </section>
  );
}
