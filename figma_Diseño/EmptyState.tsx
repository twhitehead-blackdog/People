import { Heart, Plus, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  onCreateClick?: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-8 animate-bounce">
        <div className="w-32 h-32 bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-200 rounded-full flex items-center justify-center shadow-2xl">
          <Heart className="w-16 h-16 text-pink-500 fill-pink-500" />
        </div>
        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-pink-300 to-pink-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
          <Heart className="w-6 h-6 text-white fill-white" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      </div>
      
      <h3 className="mb-3 text-center text-2xl">¡Ups! No hay mascotas aquí 🐾</h3>
      <p className="text-center text-muted-foreground mb-8 max-w-md text-lg">
        Parece que no encontramos ninguna mascota buscando amor. ¡Sé el primero en publicar y ayuda a tu peludo a encontrar su media naranja! 💕
      </p>
      
      <Button 
        onClick={onCreateClick}
        className="bg-gradient-to-r from-[#FDB022] via-yellow-300 to-pink-400 text-black hover:from-[#FDB022]/90 hover:via-yellow-300/90 hover:to-pink-400/90 gap-2 px-8 py-6 text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        ¡Publicar Mi Mascota Ahora! ✨
      </Button>

      {/* Decorative elements */}
      <div className="mt-12 flex gap-4 opacity-50">
        <span className="text-4xl animate-bounce" style={{ animationDelay: '0ms' }}>🐕</span>
        <span className="text-4xl animate-bounce" style={{ animationDelay: '150ms' }}>💝</span>
        <span className="text-4xl animate-bounce" style={{ animationDelay: '300ms' }}>🐱</span>
      </div>
    </div>
  );
}