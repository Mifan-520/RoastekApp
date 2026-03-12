import { Outlet } from "react-router";

export function MobileLayout() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center sm:p-4">
      <div className="w-full h-full min-h-[100dvh] sm:min-h-0 sm:h-[812px] sm:w-[375px] sm:max-w-md bg-neutral-50 sm:rounded-[3rem] sm:shadow-2xl sm:border-8 sm:border-neutral-800 overflow-hidden relative flex flex-col">
        {/* Mock Notch for desktop preview */}
        <div className="hidden sm:block absolute top-0 inset-x-0 h-6 bg-transparent z-50 pointer-events-none">
          <div className="w-32 h-6 bg-neutral-800 mx-auto rounded-b-3xl"></div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto w-full h-full relative scrollbar-hide">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
