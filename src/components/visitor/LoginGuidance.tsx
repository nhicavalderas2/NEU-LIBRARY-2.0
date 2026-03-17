
"use client";

import { useEffect, useState } from "react";
import { generateLoginGuidance, LoginGuidanceOutput } from "@/ai/flows/ai-visitor-guidance";
import { Lightbulb, CheckCircle2, Loader2 } from "lucide-react";

export function LoginGuidance() {
  const [guidance, setGuidance] = useState<LoginGuidanceOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGuidance() {
      try {
        const result = await generateLoginGuidance();
        setGuidance(result);
      } catch (error) {
        console.error("Failed to load guidance", error);
      } finally {
        setLoading(false);
      }
    }
    loadGuidance();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 space-x-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Generating helpful tips...</span>
      </div>
    );
  }

  if (!guidance || guidance.bulletPoints.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-secondary/20">
      <div className="flex items-center space-x-2 mb-4 text-secondary">
        <Lightbulb className="h-5 w-5" />
        <h3 className="font-semibold text-sm uppercase tracking-wider">Why Log In?</h3>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {guidance.bulletPoints.map((point, index) => (
          <li key={index} className="flex items-start space-x-2 text-sm text-foreground/80">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-secondary flex-shrink-0" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
