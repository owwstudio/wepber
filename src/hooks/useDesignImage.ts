"use client";

import { useState, useCallback } from "react";

/**
 * Custom hook for design image upload handling.
 *
 * Manages the uploaded design mockup data URL used in Compare mode.
 */
export function useDesignImage() {
  const [designImage, setDesignImage] = useState<string | null>(null);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDesignImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setDesignImage(null);
      }
    },
    []
  );

  const clearImage = useCallback(() => {
    setDesignImage(null);
    // Reset file input value
    const fileInput = document.getElementById(
      "design-file"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  }, []);

  return { designImage, handleImageUpload, clearImage };
}
