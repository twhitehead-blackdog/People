import { Header } from './components/Header';
import { SearchFilters } from './components/SearchFilters';
import { PetCard } from './components/PetCard';
import { EmptyState } from './components/EmptyState';
import { PetProfile } from './components/PetProfile';
import { CreatePetForm } from './components/CreatePetForm';
import { Heart, Plus, Sparkles, TrendingUp, Users, Star } from 'lucide-react';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { useState } from 'react';

// Mock data
const mockPets = [
  {
    id: '1',
    name: 'Luna',
    breed: 'Golden Retriever',
    age: '2 años',
    gender: 'Hembra' as const,
    size: 'Grande' as const,
    location: 'Ciudad de Panamá',
    image: 'https://images.unsplash.com/photo-1734966213753-1b361564bab4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjByZXRyaWV2ZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjU2Mjg2NjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    type: 'dog' as const,
  },
  {
    id: '2',
    name: 'Milo',
    breed: 'Gato Naranja',
    age: '3 años',
    gender: 'Macho' as const,
    size: 'Mediano' as const,
    location: 'San Francisco',
    image: 'https://images.unsplash.com/photo-1663247296111-19e4d11440d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXQlMjBwb3J0cmFpdCUyMG9yYW5nZXxlbnwxfHx8fDE3NjU2Mzc4Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    type: 'cat' as const,
  },
  {
    id: '3',
    name: 'Rocky',
    breed: 'Beagle',
    age: '4 años',
    gender: 'Macho' as const,
    size: 'Mediano' as const,
    location: 'Plaza Huatí',
    image: 'https://images.unsplash.com/photo-1685387714439-edef4bd70ef5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFnbGUlMjBkb2clMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjU2Mzc4Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    type: 'dog' as const,
  },
  {
    id: '4',
    name: 'Bella',
    breed: 'Siamés',
    age: '1 año',
    gender: 'Hembra' as const,
    size: 'Pequeño' as const,
    location: 'Ciudad de Panamá',
    image: 'https://images.unsplash.com/photo-1608574592993-774ffa9a218e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaWFtZXNlJTIwY2F0JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY1NTUwNjA4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    type: 'cat' as const,
  },
  {
    id: '5',
    name: 'Max',
    breed: 'Labrador',
    age: '3 años',
    gender: 'Macho' as const,
    size: 'Grande' as const,
    location: 'San Francisco',
    image: 'https://images.unsplash.com/photo-1667516837506-c13f487e58bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWJyYWRvciUyMGRvZyUyMGhhcHB5fGVufDF8fHx8MTc2NTYzNzgyOHww&ixlib=rb-4.1.0&q=80&w=1080',
    type: 'dog' as const,
  },
  {
    id: '6',
    name: 'Nala',
    breed: 'Persa',
    age: '2 años',
    gender: 'Hembra' as const,
    size: 'Mediano' as const,
    location: 'Plaza Huatí',
    image: 'https://images.unsplash.com/photo-1724286014482-ca026cf24420?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzaWFuJTIwY2F0JTIwY3V0ZXxlbnwxfHx8fDE3NjU2Mzc4Mjl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    type: 'cat' as const,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPet, setSelectedPet] = useState<typeof mockPets[0] | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const filteredPets = activeTab === 'all' 
    ? mockPets 
    : mockPets.filter(pet => pet.type === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <Header />
      
      {/* Hero Section with animations */}
      <div className="relative bg-gradient-to-br from-pink-100 via-purple-100 to-yellow-100 py-16 border-b-4 border-[#FDB022] overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-10 left-10 text-6xl animate-bounce" style={{ animationDelay: '0s' }}>🐕</div>
          <div className="absolute top-20 right-20 text-5xl animate-bounce" style={{ animationDelay: '0.5s' }}>💕</div>
          <div className="absolute bottom-20 left-1/4 text-5xl animate-bounce" style={{ animationDelay: '1s' }}>🐱</div>
          <div className="absolute bottom-10 right-1/3 text-4xl animate-bounce" style={{ animationDelay: '1.5s' }}>✨</div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <Heart className="w-16 h-16 text-pink-500 fill-pink-500 animate-pulse" />
                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-[#FDB022] animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <h1 className="text-5xl sm:text-6xl bg-gradient-to-r from-pink-600 via-purple-600 to-[#FDB022] bg-clip-text text-transparent">
                BUSCO PAREJA
              </h1>
              <div className="relative">
                <Heart className="w-16 h-16 text-purple-500 fill-purple-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <Sparkles className="absolute -bottom-2 -left-2 w-8 h-8 text-pink-500 animate-spin" style={{ animationDuration: '3s', animationDelay: '1s' }} />
              </div>
            </div>
            
            <p className="text-xl text-gray-700 mb-8">
              💝 ¡El Tinder de las mascotas! Encuentra la pareja perfecta para tu peludo amigo 🐾
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0 px-4 py-2 text-base shadow-lg hover:scale-105 transition-transform">
                <Users className="w-4 h-4 mr-2" />
                {mockPets.length} mascotas disponibles
              </Badge>
              <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 px-4 py-2 text-base shadow-lg hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4 mr-2" />
                ¡En tendencia!
              </Badge>
              <Badge className="bg-gradient-to-r from-[#FDB022] to-yellow-400 text-black border-0 px-4 py-2 text-base shadow-lg hover:scale-105 transition-transform">
                <Star className="w-4 h-4 mr-2" />
                100% Gratis
              </Badge>
            </div>
            
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-[#FDB022] text-white hover:from-pink-600 hover:via-purple-600 hover:to-[#FDB022]/90 gap-2 px-8 py-6 text-xl rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 animate-pulse"
            >
              <Plus className="w-6 h-6" />
              ¡Publicar Mi Mascota Ahora! 🚀
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search and Filters */}
        <div className="mb-10">
          <SearchFilters />
        </div>

        {/* Tabs with modern design */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border-2 border-purple-200">
            <TabsTrigger 
              value="all" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-lg py-3 transition-all duration-300"
            >
              ✨ Todos
            </TabsTrigger>
            <TabsTrigger 
              value="dog"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FDB022] data-[state=active]:to-yellow-300 data-[state=active]:text-black text-lg py-3 transition-all duration-300"
            >
              🐕 Perritos
            </TabsTrigger>
            <TabsTrigger 
              value="cat"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-lg py-3 transition-all duration-300"
            >
              🐱 Gatitos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Results count with badge */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-2 border-purple-300 px-6 py-3 text-lg shadow-md">
            <Sparkles className="w-5 h-5 mr-2" />
            Mostrando <span className="font-bold mx-1">{filteredPets.length}</span> 
            {filteredPets.length === 1 ? 'mascota disponible' : 'mascotas disponibles'} 💕
          </Badge>
        </div>

        {/* Pet Grid */}
        {filteredPets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {filteredPets.map((pet) => (
              <PetCard 
                key={pet.id} 
                {...pet} 
                onViewProfile={() => setSelectedPet(pet)}
              />
            ))}
          </div>
        ) : (
          <EmptyState onCreateClick={() => setShowCreateForm(true)} />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-t-4 border-[#FDB022] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="mb-4 text-[#FDB022]">¿NECESITAS AYUDA?</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <p className="text-white">BLACK DOG</p>
                <p>Calle 50, San Francisco, Ciudad de Panamá</p>
                <p>(A un lado del KFC, antiguo local de Pizza Hut)</p>
                <p className="mt-4 text-[#FDB022]">TEL: 507-6473436</p>
                <p className="text-xs mt-4">
                  Nuestro horario de atención en:<br />
                  Lun - Sáb: 7:00 a.m. - 8:00 p.m.<br />
                  Dom: 8:00 a.m. - 6:00 p.m.
                </p>
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-[#FDB022]">CATEGORÍAS</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Inicio</a></li>
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Perros</a></li>
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Gatos</a></li>
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Farmacia</a></li>
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Compra por marcas</a></li>
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Servicios</a></li>
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Sucursales</a></li>
                <li><a href="#" className="hover:text-[#FDB022] transition-colors">Políticas</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-[#FDB022]">RECIBE NOVEDADES</h4>
              <p className="text-sm text-gray-300 mb-4">
                ¡Suscríbete a nuestro correo y sé el primero en enterarte de nuestras ofertas especiales!
              </p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Correo electrónico"
                  className="flex-1 px-4 py-2 border-2 border-[#FDB022]/30 bg-gray-800 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FDB022] focus:border-transparent transition-all"
                />
                <Button className="bg-gradient-to-r from-[#FDB022] to-yellow-300 text-black hover:from-[#FDB022]/90 hover:to-yellow-300/90 shadow-lg">
                  Suscribirse
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
            <p>© 2025, Black Dog Panamá 🐕 Hecho con 💝 para las mascotas</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedPet && (
        <PetProfile 
          pet={selectedPet} 
          isOpen={!!selectedPet} 
          onClose={() => setSelectedPet(null)} 
        />
      )}
      
      <CreatePetForm 
        isOpen={showCreateForm} 
        onClose={() => setShowCreateForm(false)} 
      />
    </div>
  );
}