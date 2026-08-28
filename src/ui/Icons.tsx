const s = (d: React.ReactNode, size = 15) => (p: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg
    width={p.size ?? size}
    height={p.size ?? size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
    style={p.style}
  >
    {d}
  </svg>
);

export const I = {
  plus: s(<><path d="M12 5v14M5 12h14" /></>),
  tools: s(<><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>),
  knowledge: s(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>),
  send: s(<><path d="M12 19V5M6 11l6-6 6 6" /></>),
  stop: s(<><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" /></>),
  copy: s(<><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>),
  check: s(<><path d="M4 12.5l5.5 5.5L20 6" /></>),
  refresh: s(<><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>),
  edit: s(<><path d="M4 20h4L20 8l-4-4L4 16z" /></>),
  branch: s(<><circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="9" r="2.4" /><path d="M6 8.5v7M8.4 6H13a3 3 0 0 1 3 3" /></>),
  quote: s(<><path d="M9 7H5v5h4c0 3-1.5 4-3 4.5M19 7h-4v5h4c0 3-1.5 4-3 4.5" /></>),
  left: s(<><path d="M15 5l-7 7 7 7" /></>),
  right: s(<><path d="M9 5l7 7-7 7" /></>),
  down: s(<><path d="M5 9l7 7 7-7" /></>),
  up: s(<><path d="M19 15l-7-7-7 7" /></>),
  alert: s(<><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>),
  x: s(<><path d="M6 6l12 12M18 6L6 18" /></>),
  canvas: s(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 10h18M10 10v10" /></>),
  file: s(<><path d="M14 3v5h5" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" /></>),
  globe: s(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" /></>),
  trash: s(<><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></>),
  settings: s(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  sun: s(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>),
  moon: s(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></>),
  sidebar: s(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16" /></>),
  panel: s(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M15 4v16" /></>),
  compact: s(<><path d="M4 8h16M4 16h16M9 12h6" /></>),
  book: s(<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 17.5V5.5" /></>),
  plug: s(<><path d="M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0z" /><path d="M12 18v3" /></>),
  spark: s(<><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /></>),
  thread: s(<><path d="M4 6h16M4 11h10M8 16h12M8 16l-3 3M8 16l-3-3" /></>),
  video: s(<><rect x="2" y="4" width="14" height="16" rx="2" /><path d="M16 8l5-3v14l-5-3" /></>),
  play: s(<><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" /></>),
  pause: s(<><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /></>),
  skip: s(<><polygon points="5 4 15 12 5 20 5 4" fill="currentColor" /><line x1="19" y1="5" x2="19" y2="19" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" /></>),
  forward: s(<><polygon points="5 4 15 12 5 20 5 4" fill="currentColor" /><line x1="19" y1="5" x2="19" y2="19" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" /></>),
  backward: s(<><polygon points="19 20 9 12 19 4 19 20" fill="currentColor" /><line x1="5" y1="5" x2="5" y2="19" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" /></>),
  rotateCcw: s(<><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>),
  minus: s(<><line x1="5" y1="12" x2="19" y2="12" /></>),
  wrap: s(<><path d="M4 6h16M4 12h10a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H10" /><path d="M13 15l-3 3 3 3" /></>),
  save: s(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>),
  pin: s(<><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-2l-2-2V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8l-2 2v2z" /></>),
  grid: s(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>),
  sliders: s(<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>),
  volume: s(<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>),
  calendar: s(<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
  clock: s(<><circle cx="12" cy="12" r="9" /><polyline points="12 6 12 12 16 14" /></>),
  cloud: s(<><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></>),
  search: s(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
  palette: s(<><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C21.999 6.098 17.5 2 12 2z" /></>),
  tag: s(<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>),
};
