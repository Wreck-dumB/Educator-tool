"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";

// Fabric is loaded dynamically inside useEffect to avoid SSR issues.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

export interface PosterCanvasHandle {
  getJSON: () => object;
  downloadPNG: () => void;
  addClipArt: (src: string) => void;
  addPhoto: (src: string) => void;
  applyAICopy: (title: string, subtitle: string, body: string, footer: string, photoUrl?: string | null) => void;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTextObj = (o: any) => o?.type === "i-text" || o?.type === "text" || o?.type === "textbox";

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
        const heading = new fabric.Textbox("Your Headline Here", {
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
    if (isTextObj(obj)) {
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
    (title: string, subtitle: string, body: string, footer: string, photoUrl?: string | null) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      import("fabric").then(({ fabric }) => {
        // Remove existing text objects and any previously auto-added AI photo
        // (both legacy i-text and current textbox) — but leave clip art /
        // manually uploaded photos alone.
        const toRemove = canvas
          .getObjects()
          .filter((o: FabricCanvas) => isTextObj(o) || o.data?.source === "ai-photo");
        toRemove.forEach((o: FabricCanvas) => canvas.remove(o));

        const footerReserve = footer ? 60 : 20;
        const safeBottom = CANVAS_H - footerReserve;
        const imageGap = 20;

        // Shrink font sizes (and the reserved photo band) together, in a few
        // steps, until title/subtitle/photo/body actually fit above the
        // footer instead of running off the bottom of the poster.
        let scale = 1;
        let blocks: FabricCanvas[] = [];
        let y = 0;
        let imageRect: { top: number; height: number } | null = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          blocks.forEach((b) => canvas.remove(b));
          blocks = [];
          y = 60;
          imageRect = null;

          if (title) {
            const t = new fabric.Textbox(title, {
              left: 50, top: y, width: 460,
              fontSize: Math.round(52 * scale), fontFamily: "Georgia, serif", fontWeight: "bold",
              fill: "#e8430a",
            });
            canvas.add(t);
            blocks.push(t);
            y += (t.height ?? 60) + 20 * scale;
          }
          if (subtitle) {
            const t = new fabric.Textbox(subtitle, {
              left: 50, top: y, width: 460,
              fontSize: Math.round(28 * scale), fontFamily: "Georgia, serif",
              fill: "#444444",
            });
            canvas.add(t);
            blocks.push(t);
            y += (t.height ?? 36) + 20 * scale;
          }
          if (photoUrl) {
            const bandHeight = Math.round(220 * scale);
            imageRect = { top: y, height: bandHeight };
            y += bandHeight + imageGap * scale;
          }
          if (body) {
            const t = new fabric.Textbox(body, {
              left: 50, top: y, width: 460,
              fontSize: Math.round(22 * scale), fontFamily: "Arial, sans-serif",
              fill: "#333333",
            });
            canvas.add(t);
            blocks.push(t);
            y += (t.height ?? 80) + 20 * scale;
          }

          if (y <= safeBottom || scale <= 0.5) break;
          scale -= 0.1;
        }

        if (footer) {
          const t = new fabric.Textbox(footer, {
            left: 50, top: CANVAS_H - 50, width: 460,
            fontSize: 16, fontFamily: "Arial, sans-serif", fontStyle: "italic",
            fill: "#666666",
          });
          canvas.add(t);
        }
        canvas.renderAll();

        // Load the photo into its reserved band, cropped to cover it neatly
        // instead of distorting or overflowing into the text above/below.
        if (photoUrl && imageRect) {
          const rect = imageRect;
          fabric.Image.fromURL(
            photoUrl,
            (img: FabricCanvas) => {
              if (!img.width || !img.height || !fabricRef.current) return;
              const rectX = 50, rectW = 460;
              const coverScale = Math.max(rectW / img.width, rect.height / img.height);
              img.scale(coverScale);
              img.set({
                left: rectX + (rectW - img.width * coverScale) / 2,
                top: rect.top + (rect.height - img.height * coverScale) / 2,
                clipPath: new fabric.Rect({
                  left: rectX, top: rect.top, width: rectW, height: rect.height,
                  absolutePositioned: true,
                }),
                data: { source: "ai-photo" },
              });
              fabricRef.current.add(img);
              fabricRef.current.sendToBack(img);
              fabricRef.current.renderAll();
            },
            { crossOrigin: "anonymous" }
          );
        }
      });
    },
    []
  );

  const addPhoto = useCallback((src: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    import("fabric").then(({ fabric }) => {
      fabric.Image.fromURL(
        src,
        (img: FabricCanvas) => {
          if (!img.width || !img.height) return;
          const scale = Math.min((CANVAS_W - 40) / img.width, (CANVAS_H - 40) / img.height, 1);
          img.scale(scale);
          img.set({
            left: (CANVAS_W - img.width * scale) / 2,
            top: (CANVAS_H - img.height * scale) / 2,
          });
          canvas.add(img);
          canvas.sendToBack(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        },
        { crossOrigin: "anonymous" }
      );
    });
  }, []);

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
      const t = new fabric.Textbox(cfg.text, {
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
    if (!isTextObj(obj)) return;
    obj.set("fontWeight", obj.fontWeight === "bold" ? "normal" : "bold");
    fabricRef.current.renderAll();
    notifySelection(fabricRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const italicSelected = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!isTextObj(obj)) return;
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
    if (!isTextObj(obj)) return;
    obj.set("fontSize", size);
    fabricRef.current.renderAll();
    notifySelection(fabricRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSelectedInfo = useCallback((): SelectedInfo | null => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return null;
    if (isTextObj(obj)) {
      return { type: "text", fontSize: obj.fontSize, bold: obj.fontWeight === "bold", italic: obj.fontStyle === "italic", fill: obj.fill };
    }
    return { type: obj.type === "image" || obj.type === "group" ? "image" : "other" };
  }, []);

  useImperativeHandle(ref, () => ({
    getJSON, downloadPNG, addClipArt, addPhoto, applyAICopy, setBackground,
    addText, deleteSelected, bringForward, sendBackward,
    boldSelected, italicSelected, setSelectedColor, setSelectedFontSize, getSelectedInfo,
  }), [getJSON, downloadPNG, addClipArt, addPhoto, applyAICopy, setBackground, addText, deleteSelected, bringForward, sendBackward, boldSelected, italicSelected, setSelectedColor, setSelectedFontSize, getSelectedInfo]);

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
