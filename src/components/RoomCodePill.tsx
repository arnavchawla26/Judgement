import React from 'react';

export default function RoomCodePill({ code }: { code?: string }) {
  if (!code) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch {}
  };
  return (
    <div className="fixed right-3 top-3 z-40">
      <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur px-3 py-1.5 text-white shadow-lg">
        <span className="font-mono tracking-wider">{code}</span>
        <button onClick={copy} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">Copy</button>
      </div>
    </div>
  );
}

