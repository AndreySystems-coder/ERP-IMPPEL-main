import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ArrowLeft, Camera, X, CheckCircle2, AlertCircle, MapPin, Calendar, Users, LogIn, LogOut, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const apiRequest = async (method: string, path: string, body?: any) => {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(res.statusText);
  }
  return res.json();
};

export default function MobileJobDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/mobile/job/:id");
  const queryClient = useQueryClient();
  const jobId = parseInt(params?.id || "0");

  const { data: workOrders = [] } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => apiRequest("GET", "/api/work-orders"),
  });

  const { data: tracking } = useQuery({
    queryKey: [`/api/job-tracking/${jobId}`],
    queryFn: () => apiRequest("GET", `/api/job-tracking/${jobId}`),
  });

  const wo = workOrders.find((w: any) => w.id === jobId);
  const [status, setStatus] = useState(wo?.status || "Planejada");
  const [photos, setPhotos] = useState<Array<{ category: string; data: string; timestamp: string }>>(
    wo?.photos ? JSON.parse(wo.photos) : []
  );
  const [notes, setNotes] = useState(wo?.notes || "");
  const [isCheckedIn, setIsCheckedIn] = useState(!!tracking?.checkinTime && !tracking?.checkoutTime);
  const [workPhotos, setWorkPhotos] = useState<Array<{ data: string; timestamp: string }>>(
    tracking?.photos ? JSON.parse(tracking.photos) : []
  );

  const updateWO = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("PATCH", `/api/work-orders/${jobId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/job-tracking", {
        workOrderId: jobId,
        checkinTime: new Date().toISOString(),
        photos: null,
        notes: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/job-tracking/${jobId}`] });
      setIsCheckedIn(true);
      setWorkPhotos([]);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!tracking) return Promise.reject("No check-in found");
      return apiRequest("PATCH", `/api/job-tracking/${tracking.id}`, {
        checkoutTime: new Date().toISOString(),
        photos: workPhotos.length > 0 ? JSON.stringify(workPhotos) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/job-tracking/${jobId}`] });
      setIsCheckedIn(false);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const newPhotos = [...photos, { category, data, timestamp: new Date().toISOString() }];
      setPhotos(newPhotos);
    };
    reader.readAsDataURL(file);
  };

  const handleWorkPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const newPhotos = [...workPhotos, { data, timestamp: new Date().toISOString() }];
      setWorkPhotos(newPhotos);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const removeWorkPhoto = (index: number) => {
    setWorkPhotos(workPhotos.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await updateWO.mutateAsync({
      status,
      notes,
      photos: photos.length > 0 ? JSON.stringify(photos) : null,
    });
    setLocation("/mobile/jobs");
  };

  if (!wo) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/mobile/jobs")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-slate-500">Ordem não encontrada</CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    Planejada: "bg-blue-100 text-blue-700",
    Agendada: "bg-amber-100 text-amber-700",
    "Em Andamento": "bg-primary/10 text-primary",
    Concluída: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary text-white sticky top-0 z-10 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/mobile/jobs")}
          className="text-white hover:bg-primary-600 mb-3"
          data-testid="button-back-header"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <h1 className="text-lg font-bold">{wo.clientName}</h1>
        <p className="text-sm text-primary-100">{wo.serviceType}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {wo.address && (
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Endereço</p>
                  <p className="font-semibold text-slate-900">{wo.address}</p>
                </div>
              </div>
            )}

            {wo.scheduledDate && (
              <div className="flex gap-3">
                <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Data Agendada</p>
                  <p className="font-semibold text-slate-900">
                    {format(new Date(wo.scheduledDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {wo.teamAssigned && (
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Equipe</p>
                  <p className="font-semibold text-slate-900">{wo.teamAssigned}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-slate-200 focus:outline-none focus:border-primary transition-all text-base"
            data-testid="select-mobile-status"
          >
            <option value="Planejada">Planejada</option>
            <option value="Agendada">Agendada</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluída">Concluída</option>
          </select>
          <span className={`inline-block mt-2 px-3 py-1 rounded text-xs font-semibold ${statusColors[status] || statusColors["Planejada"]}`}>
            {status}
          </span>
        </div>

        {/* Check-in/Check-out */}
        {!isCheckedIn && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-3">Clique para registrar entrada</p>
                <Button
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                  onClick={() => checkinMutation.mutate()}
                  isLoading={checkinMutation.isPending}
                  data-testid="button-checkin"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Check-in
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isCheckedIn && tracking && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-600">Entrada registrada</p>
                <p className="font-semibold text-emerald-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {format(new Date(tracking.checkinTime), "HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
              <Button
                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
                onClick={() => checkoutMutation.mutate()}
                isLoading={checkoutMutation.isPending}
                data-testid="button-checkout"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Check-out
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Work Photos */}
        {isCheckedIn && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Fotos Durante Trabalho</p>
            <label htmlFor="work-photo" className="flex items-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary transition-colors">
              <Camera className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Adicionar foto</span>
            </label>
            <input
              id="work-photo"
              type="file"
              accept="image/*"
              onChange={handleWorkPhotoUpload}
              className="hidden"
              data-testid="input-work-photo"
            />

            {workPhotos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Fotos: {workPhotos.length}</p>
                <div className="grid grid-cols-3 gap-2">
                  {workPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={photo.data}
                        alt="work-photo"
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeWorkPhoto(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                        data-testid={`button-remove-work-photo-${idx}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial Photos */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Fotos da Obra (Antes/Depois)</p>
          <div className="space-y-2">
            {["antes", "durante", "depois"].map((category) => (
              <div key={category}>
                <label htmlFor={`photo-${category}`} className="flex items-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary transition-colors">
                  <Camera className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 capitalize">{category}</span>
                </label>
                <input
                  id={`photo-${category}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, category)}
                  className="hidden"
                  data-testid={`input-photo-${category}`}
                />
              </div>
            ))}
          </div>

          {photos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">Fotos adicionadas: {photos.length}</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={photo.data}
                      alt={photo.category}
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                    <span className="absolute top-1 left-1 text-xs bg-primary text-white px-1.5 py-0.5 rounded capitalize font-semibold">
                      {photo.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                      data-testid={`button-remove-photo-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-slate-200 focus:outline-none focus:border-primary transition-all resize-none h-24 text-base"
            placeholder="Anotações sobre o serviço..."
            data-testid="input-mobile-notes"
          />
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={() => setLocation("/mobile/jobs")}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-12 text-base"
            isLoading={updateWO.isPending}
            onClick={handleSave}
            data-testid="button-save-job"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
