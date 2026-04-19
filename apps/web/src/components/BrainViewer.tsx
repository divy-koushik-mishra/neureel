"use client";

import { useEffect, useState } from "react";
import type { BrainRegion } from "@/lib/scoring";
import { BrainMesh } from "./BrainMesh";
import { BrainViewerFallback } from "./BrainViewerFallback";

interface Props {
  /** 6-region tracked summary — feeds the fallback + the label pane if present. */
  regions: BrainRegion[];
  /** Per-vertex activation (length ~20484 matching fsaverage5). */
  activationMap?: number[] | null;
  className?: string;
}

function webglAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function BrainViewer({ regions, activationMap, className }: Props) {
  const [use3D, setUse3D] = useState<boolean | null>(null);

  useEffect(() => {
    // Only try 3D when WebGL exists AND we have a real activation vector.
    const hasActivation =
      Array.isArray(activationMap) && activationMap.length > 1000;
    setUse3D(webglAvailable() && hasActivation);
  }, [activationMap]);

  if (use3D === null) {
    return <BrainViewerFallback regions={regions} className={className} />;
  }

  if (!use3D || !activationMap) {
    return <BrainViewerFallback regions={regions} className={className} />;
  }

  return <BrainMesh activation={activationMap} className={className} />;
}
