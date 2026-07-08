"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";

// Fabric is loaded dynamically inside useEffect to avoid SSR issues.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

export interface PosterCanvasHandle {
  getJSON: () => object;
  downloadPNG: () => void;
  addClipArt: (src: string) => void;
  applyAICopy: (title: string, subtitle: string, body: string, footer: string) => void;
  setBackground: (color: string) => void;
  addText: (size: "heading" | "subtitle" | "body") => void;
  deleteSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  boldSelected: () => void;
  italicSelected: () => void;
  setSelectedColor: (color: string) => void;
  setSelectedFontSize: (size: number) => void;
  getSelectedInfo: () => SelectedInfo | null;
}

export interface SelectedInfo {
  type: "text" | "image" | "other";
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  fill?: string;
}

const CANVAS_W = 560;
const CANVAS_H = 794; // A4 ratio

const BG_PRESETS = [
  { label: "White", value: "#ffffff" },
  { label: "Cream", value: "#fffbf5" },
  { label: "Coral", value: "#ffece9" },
  { label: "Sage", value: "#edf5ee" },
  { label: "Sky", value: "#e8f4fd" },
  { label: "Lavender", value: "#f0eaff" },
  { label: "Sunshine", value: "#fffbea" },
  { label: "Charcoal", value: "#2c3e50" },
  { label: "Navy", value: "#1a237e" },
  { label: "Forest", value: "#1b5e20" },
];

export { BG_PRESETS };

interface Props {
  initialJson?: object | null;
  onSelectionChange?: (info: SelectedInfo | null) => void;
}

const PosterCanvas = forwardRef<PosterCanvasHandle, Props>(function PosterCanvas(
  { initialJson, onSelectionChange },
  ref
) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas>(null);
  const [ready, setReady] = useState(false);

  // Init Fabric
  useEffect(() => {
    if (!canvasElRef.current) return;
    let canvas: FabricCanvas;

    (async () => {
      const { fabric } = await import("fabric");

      canvas = new fabric.Canvas(canvasElRef.current, {
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: "#fffbf5",
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      if (initialJson) {
        canvas.loadFromJSON(initialJson, () => canvas.renderAll());
      } else {
        // Default starter layout
        const heading = new fabric.IText("Your Headline Here", {
          left: 50,
          top: 60,
          width: 460,
          fontSize: 52,
          fontFamily: "Georgia, serif",
          fontWeight: "bold",
          fill: "#e8430a",
        });
        canvas.add(heading);
        canvas.setActiveObject(heading);
      }

      canvas.on("selection:created", () => notifySelection(canvas));
      canvas.on("selection:updated", () => notifySelection(canvas));
      canvas.on("selection:cleared", () => onSelectionChange?.(null));

      setReady(true);
    })();

    return () => {
      canvas?.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function notifySelection(canvas: FabricCanvas) {
    const obj = canvas.getActiveObject();
    if (!obj) { onSelectionChange?.(null); return; }
    if (obj.type === "i-text" || obj.type === "text") {
      onSelectionChange?.({
        type: "text",
        fontSize: obj.fontSize,
        bold: obj.fontWeight === "bold",
        italic: obj.fontStyle === "italic",
        fill: obj.fill,
      });
    } else {
      onSelectionChange?.({ type: obj.type === "image" || obj.type === "group" ? "image" : "other" });
    }
  }

  const getJSON = useCallback((): object => {
    return fabricRef.current?.toJSON() ?? {};
  }, []);

  const downloadPNG = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 4 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "sparkplay-poster.png";
    a.click();
  }, []);

  const addClipArt = useCallback((src: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    import("fabric").then(({ fabric }) => {
      fabric.loadSVGFromURL(src, (objects: object[], options: object) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const group = (fabric.util as any).groupSVGElements(objects, options);
        const scale = Math.min(160 / (group.width ?? 160), 160 / (group.height ?? 160));
        group.scale(scale);
        group.set({ left: CANVAS_W / 2 - (group.width * scale) / 2, top: CANVAS_H / 2 - (group.height * scale) / 2 });
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
      });
    });
  }, []);

  const applyAICopy = useCallback(
    (title: string, subtitle: string, body: string, footer: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      import("fabric").then(({ fabric }) => {
        // Remove existing text objects
        const toRemove = canvas.getObjects().filter(
          (o: FabricCanvas) => o.type === "i-text" || o.type === "text"
        );
        toRemove.forEach((o: FabricCanvas) => canvas.remove(o));

        let y = 60;
        if (title) {
          const t = new fabric.IText(title, {
            left: 50, top: y, width: 460,
            fontSize: 52, fontFamily: "Georgia, serif", fontWeight: "bold",
            fill: "#e8430a",
          });
          canvas.add(t);
          y += (t.height ?? 60) + 20;
        }
        if (subtitle) {
          const t = new fabric.IText(subtitle, {
            left: 50, top: y, width: 460,
            fontSize: 28, fontFamily: "Georgia, serif",
            fill: "#444444",
          });
          canvas.add(t);
          y += (t.height ?? 36) + 20;
        }
        if (body) {
          const t = new fabric.IText(body, {
            left: 50, top: y, width: 460,
            fontSize: 22, fontFamily: "Arial, sans-serif",
            fill: "#333333",
          });
          canvas.add(t);
          y += (t.height ?? 80) + 20;
        }
        if (footer) {
          const t = new fabric.IText(footer, {
            left: 50, top: CANVAS_H - 80, width: 460,
            fontSize: 20, fontFamily: "Arial, sans-serif", fontStyle: "italic",
            fill: "#666666",
          });
          canvas.add(t);
        }
        canvas.renderAll();
      });
    },
    []
  );

  const setBackground = useCallback((color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setBackgroundColor(color, () => canvas.renderAll());
  }, []);

  const addText = useCallback((size: "heading" | "subtitle" | "body") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    import("fabric").then(({ fabric }) => {
      const configs = {
        heading: { text: "Heading", fontSize: 52, fontWeight: "bold", fill: "#e8430a", fontFamily: "Georgia, serif" },
        subtitle: { text: "Subtitle", fontSize: 28, fontWeight: "normal", fill: "#444444", fontFamily: "Georgia, serif" },
        body: { text: "Add your text here", fontSize: 20, fontWeight: "normal", fill: "#333333", fontFamily: "Arial, sans-serif" },
      };
      const cfg = configs[size];
      const t = new fabric.IText(cfg.text, {
        left: 50, top: 100,
        width: 460,
        fontSize: cfg.fontSize,
        fontFamily: cfg.fontFamily,
        fontWeight: cfg.fontWeight,
        fill: cfg.fill,
      });
      canvas.add(t);
      canvas.setActiveObject(t);
      canvas.renderAll();
    });
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, []);

  const bringForward = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (canvas && obj) { canvas.bringForward(obj); canvas.renderAll(); }
  }, []);

  const sendBackward = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (canvas && obj) { canvas.sendBackwards(obj); canvas.renderAll(); }
  }, []);

  const boldSelected = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || (obj.type !== "i-text" && obj.type !== "text")) return;
    obj.set("fontWeight", obj.fontWeight === "bold" ? "normal" : "bold");
    fabricRef.current.renderAll();
    notifySelection(fabricRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const italicSelected = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || (obj.type !== "i-text" && obj.type !== "text")) return;
    obj.set("fontStyle", obj.fontStyle === "italic" ? "normal" : "italic");
    fabricRef.current.renderAll();
    notifySelection(fabricRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedColor = useCallback((color: string) => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    obj.set("fill", color);
    fabricRef.current.renderAll();
    notifySelection(fabricRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedFontSize = useCallback((size: number) => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || (obj.type !== "i-text" && obj.type !== "text")) return;
    obj.set("fontSize", size);
    fabricRef.current.renderAll();
    notifySelection(fabricRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSelectedInfo = useCallback((): SelectedInfo | null => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return null;
    if (obj.type === "i-text" || obj.type === "text") {
      return { type: "text", fontSize: obj.fontSize, bold: obj.fontWeight === "bold", italic: obj.fontStyle === "italic", fill: obj.fill };
    }
    return { type: obj.type === "image" || obj.type === "group" ? "image" : "other" };
  }, []);

  useImperativeHandle(ref, () => ({
    getJSON, downloadPNG, addClipArt, applyAICopy, setBackground,
    addText, deleteSelected, bringForward, sendBackward,
    boldSelected, italicSelected, setSelectedColor, setSelectedFontSize, getSelectedInfo,
  }), [getJSON, downloadPNG, addClipArt, applyAICopy, setBackground, addText, deleteSelected, bringForward, sendBackward, boldSelected, italicSelected, setSelectedColor, setSelectedFontSize, getSelectedInfo]);

  return (
    <div className="relative">
      {!ready && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-ink/50 z-10 rounded-2xl"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          Loading canvas…
        </div>
      )}
      <canvas
        ref={canvasElRef}
        className="rounded-2xl shadow-lg border border-coral-light"
        style={{ display: "block" }}
      />
    </div>
  );
});

export default PosterCanvas;
