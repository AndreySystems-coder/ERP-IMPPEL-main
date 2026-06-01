import React from "react";
import { Card, CardContent } from "@/components/Card";
import { CheckCircle2, AlertCircle, XCircle, Lightbulb } from "lucide-react";

interface RecommendationBannerProps {
  recommendation: "ACEITAR" | "ORGANIZAR" | "RECUSAR";
  reason: string;
}

export function RecommendationBanner({ recommendation, reason }: RecommendationBannerProps) {
  const styles = {
    ACEITAR: {
      bg: "bg-emerald-50 border-emerald-200",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      text: "text-emerald-800",
      title: "✅ Recomendação: ACEITAR",
    },
    ORGANIZAR: {
      bg: "bg-blue-50 border-blue-200",
      icon: <Lightbulb className="w-5 h-5 text-blue-600" />,
      text: "text-blue-800",
      title: "💡 Recomendação: REORGANIZAR",
    },
    RECUSAR: {
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      text: "text-red-800",
      title: "❌ Recomendação: RECUSAR",
    },
  };

  const config = styles[recommendation];

  return (
    <Card className={`border-2 ${config.bg}`}>
      <CardContent className="p-4 flex gap-3">
        {config.icon}
        <div>
          <p className={`font-semibold ${config.text}`}>{config.title}</p>
          <p className={`text-sm ${config.text} opacity-90 mt-1`}>{reason}</p>
        </div>
      </CardContent>
    </Card>
  );
}
