import { Heart, MapPin, Calendar, Ruler, Weight, Info, X, Share2, Flag, MessageCircle, Sparkles, CheckCircle, Award } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';

interface PetProfileProps {
  pet: {
    id: string;
    name: string;
    breed: string;
    age: string;
    gender: 'Macho' | 'Hembra';
    size: 'Pequeño' | 'Mediano' | 'Grande';
    location: string;
    image: string;
    type: 'dog' | 'cat';
  };
  isOpen: boolean;
  onClose: () => void;
}

export function PetProfile({ pet, isOpen, onClose }: PetProfileProps) {
  const [isLiked, setIsLiked] = useState(false);

  // Mock extended data
  const petDetails = {
    weight: pet.size === 'Grande' ? '30 kg' : pet.size === 'Mediano' ? '15 kg' : '8 kg',
    height: pet.size === 'Grande' ? '60 cm' : pet.size === 'Mediano' ? '40 cm' : '25 cm',
    vaccinated: true,
    sterilized: true,
    personality: ['Juguetón', 'Amigable', 'Energético', 'Cariñoso'],
    description: `¡Hola! Soy ${pet.name}, un ${pet.breed} súper ${pet.gender === 'Macho' ? 'guapo' : 'hermosa'} en busca de mi media naranja 💕. Me encanta jugar, pasear y hacer nuevos amigos. ¡Conóceme!`,
    ownerName: 'Diego Arnaz',
    ownerPhone: '+507 6473-4436',
    ownerEmail: 'diego@blackdog.com',
    additionalPhotos: [pet.image, pet.image, pet.image], // Aquí irían más fotos
    preferences: {
      lookingFor: pet.gender === 'Macho' ? 'Hembra' : 'Macho',
      ageRange: '1-5 años',
      sizePreference: 'Cualquiera'
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        {/* Header with Image */}
        <div className="relative h-96 overflow-hidden rounded-t-xl">
          <img 
            src={pet.image} 
            alt={pet.name}
            className="w-full h-full object-cover"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Type badge */}
          <div className="absolute top-4 left-4">
            <Badge className="bg-gradient-to-r from-[#FDB022] to-yellow-300 text-black hover:from-[#FDB022]/90 hover:to-yellow-300/90 border-0 shadow-lg text-base px-4 py-2">
              {pet.type === 'dog' ? '🐕 Perrito' : '🐱 Gatito'}
            </Badge>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-4xl text-white mb-2">{pet.name}</h2>
                <p className="text-white/90 text-lg">{pet.breed} • {pet.age}</p>
              </div>
              
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`w-16 h-16 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 ${
                  isLiked 
                    ? 'bg-pink-500 scale-110' 
                    : 'bg-white/90 hover:bg-white hover:scale-110'
                }`}
              >
                <Heart 
                  className={`w-8 h-8 transition-all duration-300 ${
                    isLiked 
                      ? 'fill-white text-white' 
                      : 'text-pink-500'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-4 border-2 border-purple-200 text-center hover:scale-105 transition-transform">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                pet.gender === 'Macho' ? 'bg-blue-100' : 'bg-pink-100'
              }`}>
                <span className="text-2xl">{pet.gender === 'Macho' ? '♂️' : '♀️'}</span>
              </div>
              <p className="text-sm text-muted-foreground">Género</p>
              <p className="font-bold">{pet.gender}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-purple-200 text-center hover:scale-105 transition-transform">
              <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                <Weight className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm text-muted-foreground">Peso</p>
              <p className="font-bold">{petDetails.weight}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-purple-200 text-center hover:scale-105 transition-transform">
              <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                <Ruler className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">Altura</p>
              <p className="font-bold">{petDetails.height}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border-2 border-purple-200 text-center hover:scale-105 transition-transform">
              <div className="w-12 h-12 mx-auto mb-2 bg-yellow-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-sm text-muted-foreground">Ubicación</p>
              <p className="font-bold text-sm">{pet.location}</p>
            </div>
          </div>

          {/* Health Status */}
          <div className="bg-white rounded-2xl p-6 border-2 border-green-200 mb-8">
            <h3 className="text-xl mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-green-600" />
              Estado de Salud
            </h3>
            <div className="flex flex-wrap gap-3">
              {petDetails.vaccinated && (
                <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 px-4 py-2">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Vacunado ✅
                </Badge>
              )}
              {petDetails.sterilized && (
                <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-0 px-4 py-2">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Esterilizado ✅
                </Badge>
              )}
              <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0 px-4 py-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                Saludable ✅
              </Badge>
            </div>
          </div>

          {/* Personality */}
          <div className="bg-white rounded-2xl p-6 border-2 border-pink-200 mb-8">
            <h3 className="text-xl mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-pink-600" />
              Personalidad
            </h3>
            <div className="flex flex-wrap gap-2">
              {petDetails.personality.map((trait, index) => (
                <Badge 
                  key={index}
                  className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 border-0 px-4 py-2"
                >
                  {trait}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-6 border-2 border-yellow-200 mb-8">
            <h3 className="text-xl mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-yellow-600" />
              Sobre {pet.name}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {petDetails.description}
            </p>
          </div>

          {/* What I'm Looking For */}
          <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-yellow-100 rounded-2xl p-6 border-2 border-purple-300 mb-8">
            <h3 className="text-xl mb-4 flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-600 fill-pink-600" />
              Buscando Pareja
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Género buscado</p>
                <p className="font-bold">{petDetails.preferences.lookingFor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Edad preferida</p>
                <p className="font-bold">{petDetails.preferences.ageRange}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tamaño preferido</p>
                <p className="font-bold">{petDetails.preferences.sizePreference}</p>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Owner Info */}
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 mb-8">
            <h3 className="text-xl mb-4">Información del Dueño</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[#FDB022] to-yellow-300 rounded-full flex items-center justify-center">
                <span className="text-2xl">DA</span>
              </div>
              <div>
                <p className="font-bold text-lg">{petDetails.ownerName}</p>
                <p className="text-sm text-muted-foreground">Miembro desde 2023</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button 
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-[#FDB022] text-white hover:from-pink-600 hover:via-purple-600 hover:to-[#FDB022]/90 h-14 text-lg rounded-2xl shadow-xl hover:scale-105 transition-all"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              ¡Quiero Conocer a {pet.name}! 💕
            </Button>
            
            <Button 
              variant="outline"
              className="border-2 border-purple-300 hover:bg-purple-50 h-14 text-lg rounded-2xl"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Compartir Perfil
            </Button>
          </div>

          {/* Report */}
          <div className="text-center mt-6">
            <button className="text-sm text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-2 mx-auto">
              <Flag className="w-4 h-4" />
              Reportar perfil
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
