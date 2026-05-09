import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r: SR = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-IN";
    r.onresult = (ev: any) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript + " ";
      setTranscript(text.trim());
    };
    r.onend = () => setListening(false);
    recRef.current = r;
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setTranscript("");
    try { recRef.current.start(); setListening(true); } catch {}
  }, []);
  const stop = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch {}
    setListening(false);
  }, []);
  const reset = useCallback(() => setTranscript(""), []);

  return { transcript, listening, supported, start, stop, reset, setTranscript };
}
