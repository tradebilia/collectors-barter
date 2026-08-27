import { useRef, useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoChatPanelProps {
  roomUrl: string;
  displayName: string;
  onClose: () => void;
}

export function VideoChatPanel({ roomUrl, displayName, onClose }: VideoChatPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 });

  // Initialize position to bottom-right
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    setPosition({ x: vw - pw - 12, y: vh - ph - 12 });
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panelX: position.x,
      panelY: position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      const panel = panelRef.current;
      if (!panel) return;
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      setPosition({
        x: Math.max(0, Math.min(dragStart.current.panelX + dx, maxX)),
        y: Math.max(0, Math.min(dragStart.current.panelY + dy, maxY)),
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const iframeUrl = `${roomUrl}?userName=${encodeURIComponent(displayName)}&showLeaveButton=false&showFullscreenButton=false`;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col bg-gray-950 rounded-xl overflow-hidden border border-gray-700 shadow-2xl"
      style={{ left: position.x, top: position.y, width: 640, height: 520 }}
    >
      {/* Draggable Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-sm font-semibold">Live Video Chat</span>
          <span className="text-gray-400 text-xs">— drag to move</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={onClose}
          title="End call and close"
          aria-label="End video call and close panel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Video iframe */}
      <div className="relative flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10 gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-gray-400 text-sm">Connecting to video room...</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title="Video Chat"
        />
      </div>
    </div>
  );
}
