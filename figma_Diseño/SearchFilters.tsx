import { Search, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useState } from 'react';
import { Badge } from './ui/badge';

interface SearchFiltersProps {
  onFiltersChange?: (filters: any) => void;
}

export function SearchFilters({ onFiltersChange }: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [species, setSpecies] = useState<string>('all');
  const [gender, setGender] = useState<string>('all');
  const [size, setSize] = useState<string>('all');
  const [breed, setBreed] = useState<string>('');

  const clearFilters = () => {
    setSpecies('all');
    setGender('all');
    setSize('all');
    setBreed('');
  };

  const activeFiltersCount = [species !== 'all', gender !== 'all', size !== 'all', breed !== ''].filter(Boolean).length;

  return (
    <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-3xl border-2 border-purple-100 p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
        <Input
          placeholder="¿Buscas a alguien especial? 🔍"
          className="pl-12 pr-4 bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-2xl h-14 shadow-sm hover:shadow-md transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Sparkles className="w-5 h-5 text-[#FDB022] animate-pulse" />
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2 border-2 border-purple-200 hover:border-[#FDB022] hover:bg-[#FDB022]/10 rounded-xl transition-all"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros Mágicos ✨
          {activeFiltersCount > 0 && (
            <Badge className="ml-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 animate-bounce">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="gap-2 text-muted-foreground hover:text-pink-500 hover:bg-pink-50 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
            Limpiar Todo
          </Button>
        )}
      </div>

      {/* Filters with animation */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t-2 border-purple-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <Label className="text-purple-700">🐾 Especie</Label>
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl hover:shadow-md transition-all">
                <SelectValue placeholder="Selecciona especie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">✨ Todos</SelectItem>
                <SelectItem value="dog">🐕 Perritos</SelectItem>
                <SelectItem value="cat">🐱 Gatitos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-purple-700">💝 Género</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl hover:shadow-md transition-all">
                <SelectValue placeholder="Selecciona género" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">✨ Todos</SelectItem>
                <SelectItem value="male">♂️ Macho</SelectItem>
                <SelectItem value="female">♀️ Hembra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-purple-700">📏 Tamaño</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl hover:shadow-md transition-all">
                <SelectValue placeholder="Selecciona tamaño" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">✨ Todos</SelectItem>
                <SelectItem value="small">🐕 Pequeño</SelectItem>
                <SelectItem value="medium">🐕‍🦺 Mediano</SelectItem>
                <SelectItem value="large">🐕 Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-purple-700">🎨 Raza</Label>
            <Input
              placeholder="Escribe la raza..."
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl hover:shadow-md transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}