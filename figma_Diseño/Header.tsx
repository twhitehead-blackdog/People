import { Dog, User, Menu, Heart } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FDB022] to-yellow-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Dog className="w-6 h-6 text-black" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent">BLACK DOG</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-foreground hover:text-[#FDB022] transition-colors relative group">
              Tienda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FDB022] group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#" className="text-foreground hover:text-[#FDB022] transition-colors relative group">
              Servicios
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FDB022] group-hover:w-full transition-all duration-300"></span>
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm bg-green-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-700">Online</span>
            </div>
            
            <Button 
              variant="default" 
              className="bg-gradient-to-r from-[#FDB022] to-yellow-300 text-black hover:from-[#FDB022]/90 hover:to-yellow-300/90 hidden sm:flex shadow-md hover:shadow-lg transition-all"
            >
              Panel Admin
            </Button>
            
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#FDB022] to-yellow-300 text-black px-3 py-2 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer">
              <div className="w-8 h-8 bg-black text-[#FDB022] rounded-full flex items-center justify-center text-xs">
                <span>DA</span>
              </div>
              <span className="hidden sm:inline">Diego Arnaz</span>
            </div>

            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}