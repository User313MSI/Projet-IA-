"use client";

import { useEffect } from "react";
import type { Theme } from "@ia-app/shared";

export default function ThemeApplier({
  theme,
  fontSize,
}: {
  theme: Theme;
  fontSize: number;
}) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [theme, fontSize]);

  return null;
}
