import React from "react";

export default function BoothLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-screen w-full flex-col bg-gradient-to-br from-orange-400 via-gray-200 to-blue-400 font-sans">
      {/* Top Color Strip */}
      <div className="flex h-4 w-full">
        <div className="h-full w-1/4 bg-[#00AEEF]" />
        <div className="h-full w-1/4 bg-[#FFF200]" />
        <div className="h-full w-1/4 bg-[#F7941D]" />
        <div className="h-full w-1/4 bg-[#EC008C]" />
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="flex w-full flex-col items-center pb-4">
        <p className="mb-2 text-sm font-semibold text-gray-800 drop-shadow-sm">
          powered by <span className="font-bold">Boothlab.id</span>
        </p>
        {/* Bottom Color Strip */}
        <div className="flex h-4 w-full">
          <div className="h-full w-1/4 bg-[#00AEEF]" />
          <div className="h-full w-1/4 bg-[#FFF200]" />
          <div className="h-full w-1/4 bg-[#F7941D]" />
          <div className="h-full w-1/4 bg-[#EC008C]" />
        </div>
      </footer>
    </div>
  );
}
