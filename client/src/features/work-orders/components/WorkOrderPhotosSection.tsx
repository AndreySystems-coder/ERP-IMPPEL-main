import type { ChangeEvent } from "react";
import { Camera } from "lucide-react";

type WorkOrderPhotosSectionProps = {
  allPhotos: any[];
  obraObservations: string;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>, category: string) => void;
  onObraObservationsChange: (value: string) => void;
};

export function WorkOrderPhotosSection({ allPhotos, obraObservations, onFileUpload, onObraObservationsChange }: WorkOrderPhotosSectionProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Camera className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Fotos da execução</h3>
          {allPhotos.length > 0 && <span className="text-xs text-slate-400">({allPhotos.length} já registradas)</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {["antes", "durante", "depois"].map(category => {
            const photos = allPhotos.filter((photo: any) => photo.category === category);
            return (
              <div key={category} className="text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{category} ({photos.length})</p>
                <label className="block min-h-20 w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 py-3 text-xs text-slate-500 transition-colors hover:border-primary hover:text-primary">
                  <Camera className="mx-auto mb-1 h-5 w-5" /> Adicionar foto
                  <input type="file" accept="image/*" className="hidden" onChange={event => onFileUpload(event, category)} data-testid={`input-photo-${category}`} />
                </label>
                {photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {photos.slice(0, 3).map((photo: any, index: number) => <img key={index} src={photo.data} alt={photo.category} className="h-14 w-14 rounded-lg border object-cover" />)}
                    {photos.length > 3 && <span className="self-center text-xs text-slate-400">+{photos.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Observações gerais da OS</label>
        <textarea value={obraObservations} onChange={event => onObraObservationsChange(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:border-primary focus:outline-none" placeholder="Anotações gerais sobre a obra..." data-testid="input-obra-observations" />
      </div>
    </section>
  );
}
