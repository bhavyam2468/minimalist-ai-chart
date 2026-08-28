import { useApp } from "./lib/store";
import { AppShell } from "./ui/AppShell";

/**
 * Entry point. Its only job is to pick the active chat out of the store and
 * hand it to the shell — no layout, no listeners, no derived state.
 */
export default function App() {
  const activeId = useApp((s) => s.activeId);
  if (!activeId) return null;
  return <AppShell chatId={activeId} />;
}
