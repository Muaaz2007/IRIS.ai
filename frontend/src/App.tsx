import { useState } from 'react';
import { useChat } from './hooks/useChat';
import { ChatWindow } from './components/ChatWindow';
import { Sidebar } from './components/Sidebar';
import { Landing } from './components/Landing';

/**
 * IRIS.ai — opening page first, then the Claude-style chat shell.
 * Layout: left sidebar (conversations + pipeline status) | main chat pane.
 * All backend integration lives in hooks/useChat.ts -> lib/api.ts.
 */
export default function App() {
  const {
    conversations,
    active,
    activeId,
    setActiveId,
    isStreaming,
    health,
    demoMode,
    sendMessage,
    stop,
    newConversation,
    deleteConversation,
    refreshHealth,
  } = useChat();

  const [entered, setEntered] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!entered) {
    return <Landing onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="flex h-full overflow-hidden bg-canvas text-ink">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Desktop sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        health={health}
        demoMode={demoMode}
        onSelect={setActiveId}
        onNew={() => {
          newConversation();
          setSidebarOpen(false);
        }}
        onDelete={deleteConversation}
        onRefresh={refreshHealth}
        className="hidden md:flex"
      />

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          health={health}
          demoMode={demoMode}
          onSelect={(id) => {
            setActiveId(id);
            setSidebarOpen(false);
          }}
          onNew={() => {
            newConversation();
            setSidebarOpen(false);
          }}
          onDelete={deleteConversation}
          onRefresh={refreshHealth}
          className="shadow-pop"
        />
      </div>

      <ChatWindow
        conversation={active}
        isStreaming={isStreaming}
        health={health}
        demoMode={demoMode}
        onSend={sendMessage}
        onStop={stop}
        onMenu={() => setSidebarOpen(true)}
      />
    </div>
  );
}
