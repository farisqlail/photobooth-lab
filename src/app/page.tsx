import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cloud, Mountain } from "lucide-react";

export default function Home() {
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
        <div className="relative flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-xl bg-white p-8 shadow-2xl">
          
          {/* Checkered Frame */}
          <div className="relative mb-8 flex aspect-[4/3] w-full max-w-md items-center justify-center overflow-hidden border-[12px] border-[#333] bg-sky-200 p-1 shadow-inner">
             {/* Decorative Dots Pattern on Border (Simulated with dashed border) */}
             <div className="absolute inset-0 border-[4px] border-dashed border-white/30 pointer-events-none"></div>
             
             {/* Illustration */}
             <div className="relative h-full w-full overflow-hidden bg-[#87CEEB]">
               {/* Clouds */}
               <Cloud className="absolute left-10 top-10 h-16 w-16 text-white opacity-90" fill="white" />
               <Cloud className="absolute right-20 top-16 h-12 w-12 text-white opacity-80" fill="white" />
               <Cloud className="absolute left-1/2 top-8 h-20 w-20 -translate-x-1/2 text-white" fill="white" />
               
               {/* Hills */}
               <div className="absolute bottom-0 h-1/2 w-full">
                 <div className="absolute bottom-0 left-0 h-full w-[120%] -translate-x-10 rounded-tr-[100%] bg-[#7CB342]" />
                 <div className="absolute bottom-0 right-0 h-[80%] w-[120%] translate-x-10 rounded-tl-[100%] bg-[#558B2F]" />
               </div>
             </div>
          </div>

          {/* Retro Logo */}
          <h1 className="mb-8 text-6xl font-black tracking-tighter text-white sm:text-7xl"
              style={{
                textShadow: `
                  4px 4px 0px #00AEEF,
                  8px 8px 0px #FFF200,
                  12px 12px 0px #F7941D,
                  16px 16px 0px #EC008C
                `,
                WebkitTextStroke: "2px black"
              }}>
            BOOTHLAB
          </h1>

          {/* Start Button */}
          <Button 
            asChild 
            className="h-14 w-48 rounded-2xl bg-black text-xl font-bold text-white shadow-xl transition-transform hover:scale-105 hover:bg-gray-900"
          >
            <Link href="/booth?autoStart=true">
              Start
            </Link>
          </Button>

        </div>
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
