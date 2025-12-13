import { Heart, MapPin, Calendar, Sparkles, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState } from 'react';

interface PetCardProps {
  id: string;
  name: string;
  breed: string;
  age: string;
  gender: 'Macho' | 'Hembra';
  size: 'Pequeño' | 'Mediano' | 'Grande';
  location: string;
  image: string;
  type: 'dog' | 'cat';
  onViewProfile?: () => void;
}

export function PetCard({ name, breed, age, gender, size, location, image, type, onViewProfile }: PetCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="bg-white rounded-2xl border-2 border-transparent overflow-hidden hover:border-[#FDB022] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-pink-100 via-purple-50 to-yellow-100">
        <img 
          src={image} 
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Like button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={`absolute top-4 right-4 w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 ${
            isLiked 
              ? 'bg-pink-500 scale-110' 
              : 'bg-white/90 hover:bg-white hover:scale-110'
          }`}
        >
          <Heart 
            className={`w-6 h-6 transition-all duration-300 ${
              isLiked 
                ? 'fill-white text-white scale-110' 
                : 'text-pink-500 hover:fill-pink-200'
            }`}
          />
        </button>
        
        {/* Type badge with animation */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-gradient-to-r from-[#FDB022] to-yellow-300 text-black hover:from-[#FDB022]/90 hover:to-yellow-300/90 border-0 shadow-lg text-base px-4 py-1.5">
            {type === 'dog' ? '🐕 Perrito' : '🐱 Gatito'}
          </Badge>
        </div>

        {/* Sparkle effect on hover */}
        {isHovered && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Sparkles className="w-16 h-16 text-[#FDB022] animate-pulse" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl group-hover:text-[#FDB022] transition-colors">{name}</h3>
            <p className="text-sm text-muted-foreground">{breed}</p>
          </div>
          <Badge 
            variant="outline" 
            className={`ml-2 ${
              gender === 'Macho' 
                ? 'border-blue-300 bg-blue-50 text-blue-700' 
                : 'border-pink-300 bg-pink-50 text-pink-700'
            }`}
          >
            {gender === 'Macho' ? '♂️ Macho' : '♀️ Hembra'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#FDB022] transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <span>{age}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#FDB022] transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-pink-600" />
            </div>
            <span>{location}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge 
            variant="secondary" 
            className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0"
          >
            {size}
          </Badge>
          <Badge 
            variant="secondary" 
            className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0"
          >
            ✨ Disponible
          </Badge>
        </div>

        <Button 
          onClick={onViewProfile}
          className="w-full bg-gradient-to-r from-[#FDB022] to-yellow-300 text-black hover:from-[#FDB022]/90 hover:to-yellow-300/90 shadow-md hover:shadow-xl transition-all duration-300 group-hover:scale-105"
        >
          <Info className="w-4 h-4 mr-2" />
          Ver Perfil Completo
        </Button>
      </div>
    </div>
  );
}