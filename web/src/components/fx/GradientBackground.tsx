"use client";

// One deliberate use of @shadergradient/react (which pulls in three.js +
// @react-three/fiber) for the auth pages' background -- the heaviest
// dependency in the "make it fluid" pass, so it's scoped to a single
// instance rather than reused across the app. See Notion "Mushy" doc.

import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

export function GradientBackground() {
  return (
    <ShaderGradientCanvas
      style={{ position: "absolute", inset: 0, zIndex: -1 }}
      pixelDensity={1}
      fov={45}
    >
      <ShaderGradient
        type="waterPlane"
        animate="on"
        uSpeed={0.15}
        uStrength={3}
        uDensity={1.3}
        uFrequency={5.5}
        uAmplitude={3.2}
        color1="#f5d0e8"
        color2="#c7bff0"
        color3="#a9d8f7"
        cDistance={3.6}
        cPolarAngle={90}
        cAzimuthAngle={180}
        reflection={0.1}
        grain="off"
      />
    </ShaderGradientCanvas>
  );
}
