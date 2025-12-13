import { X, Upload, Sparkles, Camera, Plus, Trash2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { useState } from 'react';

interface CreatePetFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePetForm({ isOpen, onClose }: CreatePetFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [personality, setPersonality] = useState<string[]>([]);

  const personalityTraits = [
    '😊 Amigable',
    '⚡ Energético', 
    '🎮 Juguetón',
    '💤 Tranquilo',
    '🎓 Inteligente',
    '❤️ Cariñoso',
    '🛡️ Protector',
    '🎪 Sociable',
  ];

  const togglePersonality = (trait: string) => {
    if (personality.includes(trait)) {
      setPersonality(personality.filter(t => t !== trait));
    } else {
      setPersonality([...personality, trait]);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Aquí iría la lógica para guardar la mascota
    console.log('Mascota publicada!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-[#FDB022] p-6 text-white sticky top-0 z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8" />
            <h2 className="text-3xl">¡Publica a tu Mascota! 🐾</h2>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  currentStep >= step 
                    ? 'bg-white text-pink-600 scale-110' 
                    : 'bg-white/30 text-white'
                }`}>
                  {currentStep > step ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step}</span>
                  )}
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    currentStep > step ? 'bg-white' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-sm text-white/90">
            {currentStep === 1 && 'Paso 1: Información Básica'}
            {currentStep === 2 && 'Paso 2: Fotos y Personalidad'}
            {currentStep === 3 && 'Paso 3: Preferencias de Pareja'}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-purple-700">🐾 Nombre de la mascota *</Label>
                  <Input 
                    placeholder="Ej: Luna, Max, Milo..." 
                    className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">🎨 Tipo de mascota *</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dog">🐕 Perro</SelectItem>
                      <SelectItem value="cat">🐱 Gato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">🏷️ Raza *</Label>
                  <Input 
                    placeholder="Ej: Golden Retriever, Siamés..." 
                    className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">🎂 Edad *</Label>
                  <Input 
                    placeholder="Ej: 2 años, 6 meses..." 
                    className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">💝 Género *</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12">
                      <SelectValue placeholder="Selecciona el género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">♂️ Macho</SelectItem>
                      <SelectItem value="female">♀️ Hembra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">📏 Tamaño *</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12">
                      <SelectValue placeholder="Selecciona el tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">🐕 Pequeño</SelectItem>
                      <SelectItem value="medium">🐕‍🦺 Mediano</SelectItem>
                      <SelectItem value="large">🐕 Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">⚖️ Peso</Label>
                  <Input 
                    placeholder="Ej: 15 kg" 
                    className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">📍 Ubicación *</Label>
                  <Input 
                    placeholder="Ej: Ciudad de Panamá" 
                    className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12"
                  />
                </div>
              </div>

              {/* Health Status */}
              <div className="bg-white rounded-2xl p-6 border-2 border-green-200">
                <h3 className="text-lg mb-4 text-green-700">🏥 Estado de Salud</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="vaccinated" />
                    <label htmlFor="vaccinated" className="text-sm cursor-pointer">
                      ✅ Vacunado
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sterilized" />
                    <label htmlFor="sterilized" className="text-sm cursor-pointer">
                      ✅ Esterilizado/Castrado
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="healthy" />
                    <label htmlFor="healthy" className="text-sm cursor-pointer">
                      ✅ Saludable
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Photos and Personality */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Photo Upload */}
              <div className="space-y-4">
                <Label className="text-purple-700 text-lg">📸 Fotos de tu mascota *</Label>
                <p className="text-sm text-muted-foreground">
                  Sube al menos 3 fotos hermosas de tu mascota (máximo 6)
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-purple-200 group">
                      <img src={image} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {uploadedImages.length < 6 && (
                    <button className="aspect-square rounded-xl border-2 border-dashed border-purple-300 bg-white hover:bg-purple-50 transition-colors flex flex-col items-center justify-center gap-2 group">
                      <div className="w-16 h-16 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-purple-600" />
                      </div>
                      <span className="text-sm text-muted-foreground">Subir Foto</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-purple-700">📝 Descripción *</Label>
                <Textarea 
                  placeholder="Cuéntanos sobre tu mascota... ¿Qué le gusta hacer? ¿Cuál es su personalidad? ¿Qué la hace especial? 💕"
                  className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl min-h-32 resize-none"
                />
              </div>

              {/* Personality */}
              <div className="space-y-4">
                <Label className="text-purple-700 text-lg">✨ Personalidad</Label>
                <p className="text-sm text-muted-foreground">
                  Selecciona las características que mejor describen a tu mascota
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {personalityTraits.map((trait) => (
                    <button
                      key={trait}
                      onClick={() => togglePersonality(trait)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        personality.includes(trait)
                          ? 'border-purple-500 bg-gradient-to-r from-purple-100 to-pink-100 scale-105'
                          : 'border-purple-200 bg-white hover:bg-purple-50'
                      }`}
                    >
                      <span className="text-sm">{trait}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Partner Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-yellow-100 rounded-2xl p-6 border-2 border-purple-300 mb-6">
                <h3 className="text-xl mb-2 flex items-center gap-2">
                  💕 ¿Qué tipo de pareja buscas?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ayúdanos a encontrar la mejor pareja para tu mascota
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-purple-700">💝 Género buscado *</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12">
                      <SelectValue placeholder="Selecciona el género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">♂️ Macho</SelectItem>
                      <SelectItem value="female">♀️ Hembra</SelectItem>
                      <SelectItem value="any">✨ Cualquiera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">🎂 Rango de edad</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12">
                      <SelectValue placeholder="Selecciona rango" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 año</SelectItem>
                      <SelectItem value="1-3">1-3 años</SelectItem>
                      <SelectItem value="3-5">3-5 años</SelectItem>
                      <SelectItem value="5+">5+ años</SelectItem>
                      <SelectItem value="any">✨ Cualquier edad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">📏 Tamaño preferido</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12">
                      <SelectValue placeholder="Selecciona tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">🐕 Pequeño</SelectItem>
                      <SelectItem value="medium">🐕‍🦺 Mediano</SelectItem>
                      <SelectItem value="large">🐕 Grande</SelectItem>
                      <SelectItem value="any">✨ Cualquier tamaño</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700">🏷️ Raza específica</Label>
                  <Input 
                    placeholder="Opcional: Ej: Golden Retriever" 
                    className="bg-white border-2 border-purple-200 focus:border-[#FDB022] rounded-xl h-12"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 mt-6">
                <h3 className="text-lg mb-4 text-blue-700">📞 Información de Contacto</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono *</Label>
                    <Input 
                      placeholder="+507 6473-4436" 
                      className="bg-input-background rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      placeholder="correo@ejemplo.com" 
                      className="bg-input-background rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" className="mt-1" />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    Acepto los términos y condiciones. Confirmo que la información proporcionada es verdadera y que soy el dueño responsable de esta mascota. 📋
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-purple-200">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="border-2 border-purple-300 hover:bg-purple-50 rounded-xl px-6"
            >
              ← Anterior
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-[#FDB022] text-white hover:from-pink-600 hover:via-purple-600 hover:to-[#FDB022]/90 rounded-xl px-8"
              >
                Siguiente →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 rounded-xl px-8 gap-2"
              >
                <Sparkles className="w-5 h-5" />
                ¡Publicar Ahora! 🚀
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
