import { AppTopBar } from '@/components/app-top-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppTopBar />
      {children}
    </div>
  );
}
