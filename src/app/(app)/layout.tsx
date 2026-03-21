import { AppSidebar } from '@/components/nav/app-sidebar';
import { BottomTabBar } from '@/components/nav/bottom-tab-bar';
import { MobileHeader } from '@/components/nav/mobile-header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-iv-bg text-iv-text flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col pb-14 md:pb-0">
        <MobileHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
      <BottomTabBar />
    </div>
  );
}
