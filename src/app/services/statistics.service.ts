import { inject, Injectable } from '@angular/core';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { FoundationsStore } from '../stores/foundations.store';
import { Pet, AdoptionApplication } from '../models';

export interface StatisticsData {
  pets: {
    total: number;
    available: number;
    adopted: number;
    bySpecies: { species: string; count: number }[];
    bySize: { size: string; count: number }[];
    byGender: { gender: string; count: number }[];
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
    byMonth: { month: string; count: number }[];
  };
  adoptionRate: number;
  averageTimeToAdoption: number;
  mostPopularPets: { pet: Pet; applicationsCount: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  private petsStore = inject(PetsStore);
  private applicationsStore = inject(AdoptionApplicationsStore);
  private foundationsStore = inject(FoundationsStore);

  private cache: StatisticsData | null = null;
  private lastUpdate: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  public getStatistics(): StatisticsData {
    const now = new Date();
    const lastUpdateTime = this.lastUpdate;

    // Retornar caché si es válido
    if (
      this.cache &&
      lastUpdateTime &&
      now.getTime() - lastUpdateTime.getTime() < this.CACHE_DURATION
    ) {
      return this.cache;
    }

    // Calcular estadísticas
    const stats = this.calculateStatistics();
    this.cache = stats;
    this.lastUpdate = now;
    return stats;
  }

  public invalidateCache(): void {
    this.cache = null;
    this.lastUpdate = null;
  }

  private calculateStatistics(): StatisticsData {
    const pets = this.petsStore.entities();
    const applications = this.applicationsStore.entities();

    // Estadísticas de mascotas
    const petsBySpecies = this.groupBy(pets, 'species');
    const petsBySize = this.groupBy(pets, 'size');
    const petsByGender = this.groupBy(pets, 'gender');

    // Estadísticas de solicitudes
    const applicationsByMonth = this.groupApplicationsByMonth(applications);

    // Mascotas más populares (por número de solicitudes)
    const petApplicationsMap = new Map<string, number>();
    applications.forEach((app) => {
      if (app.pet_id) {
        const count = petApplicationsMap.get(app.pet_id) || 0;
        petApplicationsMap.set(app.pet_id, count + 1);
      }
    });

    const mostPopularPets = Array.from(petApplicationsMap.entries())
      .map(([petId, count]) => {
        const pet = pets.find((p) => p.id === petId);
        return pet ? { pet, applicationsCount: count } : null;
      })
      .filter((item): item is { pet: Pet; applicationsCount: number } => item !== null)
      .sort((a, b) => b.applicationsCount - a.applicationsCount)
      .slice(0, 10);

    // Tasa de adopción
    const totalPets = pets.length;
    const adoptedPets = pets.filter((p) => !p.is_available).length;
    const adoptionRate = totalPets > 0 ? (adoptedPets / totalPets) * 100 : 0;

    // Tiempo promedio hasta adopción (días desde creación hasta completar adopción)
    const completedApplications = applications.filter((app) => app.status === 'completed');
    const timesToAdoption: number[] = [];

    completedApplications.forEach((app) => {
      if (app.created_at && app.updated_at) {
        const created = new Date(app.created_at);
        const completed = new Date(app.updated_at);
        const days = Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          timesToAdoption.push(days);
        }
      }
    });

    const averageTimeToAdoption =
      timesToAdoption.length > 0
        ? timesToAdoption.reduce((sum, days) => sum + days, 0) / timesToAdoption.length
        : 0;

    return {
      pets: {
        total: pets.length,
        available: pets.filter((p) => p.is_available).length,
        adopted: adoptedPets,
        bySpecies: Array.from(petsBySpecies.entries()).map(([key, value]) => ({
          species: this.getSpeciesLabel(key),
          count: value.length,
        })),
        bySize: Array.from(petsBySize.entries()).map(([key, value]) => ({
          size: this.getSizeLabel(key),
          count: value.length,
        })),
        byGender: Array.from(petsByGender.entries()).map(([key, value]) => ({
          gender: key === 'M' ? 'Macho' : 'Hembra',
          count: value.length,
        })),
      },
      applications: {
        total: applications.length,
        pending: applications.filter((app) => app.status === 'pending').length,
        approved: applications.filter((app) => app.status === 'approved').length,
        rejected: applications.filter((app) => app.status === 'rejected').length,
        completed: completedApplications.length,
        byMonth: applicationsByMonth,
      },
      adoptionRate: Math.round(adoptionRate * 100) / 100,
      averageTimeToAdoption: Math.round(averageTimeToAdoption * 100) / 100,
      mostPopularPets,
    };
  }

  private groupBy<T>(items: T[], key: keyof T): Map<string, T[]> {
    const map = new Map<string, T[]>();
    items.forEach((item) => {
      const value = String(item[key] || '');
      if (!map.has(value)) {
        map.set(value, []);
      }
      map.get(value)!.push(item);
    });
    return map;
  }

  private groupApplicationsByMonth(
    applications: AdoptionApplication[]
  ): { month: string; count: number }[] {
    const monthMap = new Map<string, number>();

    applications.forEach((app) => {
      if (app.created_at) {
        const date = new Date(app.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      }
    });

    return Array.from(monthMap.entries())
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
          count,
        };
      })
      .sort((a, b) => {
        // Ordenar por fecha
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  }

  private getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  private getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      small: 'Pequeño',
      medium: 'Mediano',
      large: 'Grande',
    };
    return labels[size] || size;
  }
}

