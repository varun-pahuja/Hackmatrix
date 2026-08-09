import { useState, type ReactNode } from 'react';
import type { AppView } from '@/App';
import type { ChatSession } from '@/types/research';
import Sidebar from '@/components/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: AppView;
  onNavigateHome: () => void;
  onNewSession?: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export default function DashboardLayout({
  children,
  currentView,
  onNavigateHome,
  onNewSession,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (currentView === 'chat') {
    return (
      <div className="flex h-screen bg-black overflow-hidden text-[#fafafa] font-sans w-full relative">
        {/* Mobile Sidebar Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:static inset-y-0 left-0 z-50
          transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          transition-transform duration-300 ease-in-out
        `}>
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onNavigateHome={onNavigateHome}
            onNewSession={onNewSession}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden flex flex-col bg-black h-full w-full max-w-full">
           {/* Mobile Header */}
           <div className="md:hidden flex items-center justify-between p-3 border-b border-white/10 bg-black/90 backdrop-blur-md">
             <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-white/10 text-[#a1a1aa]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
             <span className="font-semibold text-sm tracking-wider">BIOSPACE</span>
             <div className="w-8" />
           </div>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      {children}
    </div>
  );
}
