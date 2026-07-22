import { useEffect, useRef, useState } from "react";
import { X, Video, VideoOff, Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoChatPanelProps {
  roomUrl: string;
  displayName: string;
  onClose: () => void;
}

export function VideoChatPanel({ roomUrl, displayName, onClose }: VideoChatPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build the Daily.co iframe URL with display name pre-filled
  const iframeUrl = `${roomUrl}?userName=${encodeURIComponent(displayName)}&showLeaveButton=false&showFullscreenButton=false`;

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-sm font-semibold">Live Video Chat</span>
          <span className="text-gray-400 text-xs">— powered by Daily.co</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={onClose}
          title="End call and close"
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
          style={{ minHeight: "400px" }}
          onLoad={() => setIsLoading(false)}
          title="Video Chat"
        />
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 bg-gray-900 border-t border-gray-700">
        <p className="text-gray-500 text-xs text-center">
          Use the controls inside the video window to mute, toggle camera, or end your call. Click ✕ above to close this panel.
        </p>
      </div>
    </div>
  );
}
