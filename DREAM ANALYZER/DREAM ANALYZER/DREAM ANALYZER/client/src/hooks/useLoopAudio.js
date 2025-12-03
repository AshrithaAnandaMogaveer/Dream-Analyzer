import { useRef } from "react";

export default function useLoopAudio(src) {
  const audioRef = useRef(null);

  const start = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.loop = true;
      // Set crossOrigin for potential CORS issues
      audioRef.current.crossOrigin = "anonymous";
    }
    audioRef.current.play().catch(error => {
      console.error('Audio play failed:', error);
    });
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return { start, stop };
}
