"use client";

import { useRef, useState, useTransition } from "react";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveSketchAsAttachment } from "@/app/(dashboard)/tasks/actions";

interface SketchCanvasDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSketchSaved?: () => void;
}

const COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
];

export function SketchCanvasDialog({
  taskId,
  open,
  onOpenChange,
  onSketchSaved,
}: SketchCanvasDialogProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [isPending, startTransition] = useTransition();
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
  };

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const handleEraserToggle = () => {
    setIsEraser(!isEraser);
    if (!isEraser) {
      canvasRef.current?.eraseMode(true);
    } else {
      canvasRef.current?.eraseMode(false);
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    startTransition(async () => {
      try {
        const dataUrl = await canvasRef.current?.exportImage("png");
        if (!dataUrl) {
          toast.error("Failed to export sketch");
          return;
        }

        const result = await saveSketchAsAttachment(
          taskId,
          dataUrl,
          `sketch-${Date.now()}.png`
        );

        if (result.error) {
          toast.error("Failed to save sketch", { description: result.error });
        } else {
          toast.success("Sketch saved as attachment");
          onSketchSaved?.();
          onOpenChange(false);
        }
      } catch {
        toast.error("Failed to save sketch");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sketch</DialogTitle>
          <DialogDescription>
            Draw a quick sketch to attach to this task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Colors */}
            <div className="flex items-center gap-1">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    setStrokeColor(color.value);
                    setIsEraser(false);
                    canvasRef.current?.eraseMode(false);
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all",
                    strokeColor === color.value && !isEraser
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "hover:scale-110"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>

            {/* Stroke width */}
            <div className="flex items-center gap-2 flex-1 max-w-[150px]">
              <Label className="text-xs whitespace-nowrap">Size</Label>
              <Slider
                value={[strokeWidth]}
                onValueChange={(v) => setStrokeWidth(v[0])}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Tools */}
            <div className="flex items-center gap-1">
              <Button
                variant={isEraser ? "default" : "outline"}
                size="icon"
                onClick={handleEraserToggle}
                title="Eraser"
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <Button
                variant={!isEraser ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  setIsEraser(false);
                  canvasRef.current?.eraseMode(false);
                }}
                title="Pen"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleUndo} title="Undo">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleRedo} title="Redo">
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClear}
                title="Clear"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <ReactSketchCanvas
              ref={canvasRef}
              width="100%"
              height="400px"
              strokeWidth={strokeWidth}
              strokeColor={strokeColor}
              canvasColor="#ffffff"
              style={{ borderRadius: "0.5rem" }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Sketch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
