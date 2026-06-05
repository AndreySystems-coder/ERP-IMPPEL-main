import { CheckCircle, FileText, ScanLine, Upload, X, Zap } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export function QuickCountPanel({
  text,
  applied,
  canProcess,
  onTextChange,
  onImportFile,
  onClear,
  onProcess,
}: {
  text: string;
  applied: boolean;
  canProcess: boolean;
  onTextChange: (value: string) => void;
  onImportFile: (file: File) => void;
  onClear: () => void;
  onProcess: () => void;
}) {
  const lineCount = text.split("\n").filter(line => line.trim()).length;

  return (
    <div className="space-y-5">
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <Zap className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-orange-800">Contagem Física Rápida</p>
          <p className="text-xs text-orange-700 mt-0.5">
            Cole aqui a lista do celular ou bloco de notas. O sistema identifica cada produto automaticamente,
            compara com o estoque atual e gera as movimentações de entrada/saída.
          </p>
          <p className="text-xs text-orange-600 mt-1 font-semibold">
            Formato aceito: <span className="font-mono bg-orange-100 px-1 rounded">Viaplus 1000 - 45</span> ou <span className="font-mono bg-orange-100 px-1 rounded">Broxa: 12</span>
          </p>
          <p className="text-xs text-orange-600 mt-1">
            TXT estruturado pode ser importado. PDF fica como importação assistida: confira o conteúdo extraído antes de aplicar qualquer ajuste.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { step: "1", title: "Cole a contagem", text: "Use uma linha por produto com nome e quantidade." },
          { step: "2", title: "Confira os matches", text: "Revise produtos não identificados, duplicados e diferenças." },
          { step: "3", title: "Aplique com segurança", text: "Confirme antes de zerar itens ausentes da lista." },
        ].map(item => (
          <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">{item.step}</div>
            <p className="text-sm font-bold text-slate-800">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.text}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-orange-500" />
              Cole a lista de contagem aqui
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700">
                <input
                  type="file"
                  accept=".txt,.pdf"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) onImportFile(file);
                    event.currentTarget.value = "";
                  }}
                  data-testid="input-rapida-file"
                />
                <span className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  TXT/PDF
                </span>
              </label>
              {text && (
                <button type="button" onClick={onClear} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <X className="w-3.5 h-3.5" /> Limpar
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <FileText className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
            Para PDF, use somente como apoio de conferência. A aplicação dos ajustes continua dependendo do preview e da confirmação.
          </div>

          <textarea
            value={text}
            onChange={event => onTextChange(event.target.value)}
            rows={10}
            placeholder={`Cole sua lista aqui. Exemplos:\n\nViaplus 1000 - 45\nBroxa - 12\nP.u. Bisnaga - 8\nManta asfáltica 4mm - 3\nTinta alumínio - 2\nRolo de lã - 6`}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:outline-none focus:border-orange-400 transition-all text-sm font-mono resize-y min-h-[200px]"
            data-testid="textarea-rapida-count"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{lineCount} linha(s) detectada(s)</span>
              {applied && (
                <span className="flex items-center gap-1 text-green-700 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Contagem aplicada com sucesso!
                </span>
              )}
            </div>
            <Button onClick={onProcess} disabled={!canProcess} className="min-h-11 bg-orange-500 hover:bg-orange-600 text-white" data-testid="button-process-rapida">
              <ScanLine className="w-4 h-4 mr-2" /> Processar Contagem
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
