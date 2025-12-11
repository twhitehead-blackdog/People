import { signalStore, withHooks, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, tap, Observable, of } from 'rxjs';
import { updateEntity } from '@ngrx/signals/entities';
import { AdoptionApplication } from '../models';
import { withCustomEntities } from './entities.feature';
import { PetsStore } from './pets.store';

/**
 * Agrupa solicitudes por mes
 */
function groupApplicationsByMonth(applications: AdoptionApplication[]): { month: string; count: number }[] {
  const monthMap = new Map<string, number>();
  
  applications.forEach((app) => {
    if (app.created_at) {
      const date = new Date(app.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
      // Ordenar por fecha (más reciente primero)
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB.getTime() - dateA.getTime();
    });
}

/**
 * Calcula el tiempo promedio hasta adopción (en días)
 */
function calculateAverageTimeToAdoption(applications: AdoptionApplication[]): number {
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

  if (timesToAdoption.length === 0) {
    return 0;
  }

  const sum = timesToAdoption.reduce((acc, days) => acc + days, 0);
  return Math.round(sum / timesToAdoption.length);
}

export const AdoptionApplicationsStore = signalStore(
  withCustomEntities<AdoptionApplication>({ 
    name: 'adoption_applications',
    query: '*,pet:pets!pet_id(*,foundation:foundations!foundation_id(*))',
    detailsQuery: '*,pet:pets!pet_id(*,foundation:foundations!foundation_id(*))',
    order: 'created_at.desc'
  }),
  withMethods((store, petsStore = inject(PetsStore), http = inject(HttpClient)) => ({
    updateApplicationStatus(request: AdoptionApplication) {
      // Si el status cambia a 'completed', marcar la mascota como no disponible
      if (request.status === 'completed' && request.pet_id) {
        // Primero actualizar la adopción usando el método base
        return store.editItem(request).pipe(
          switchMap(() => {
            // Luego actualizar la mascota como no disponible
            return http.patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/pets`,
              { is_available: false },
              { params: { id: `eq.${request.pet_id}` } }
            ).pipe(
              tap(() => {
                // Refrescar las mascotas para actualizar el estado
                petsStore.fetchItems();
              })
            );
          })
        );
      }
      // Si no es completed, usar el método por defecto del feature
      return store.editItem(request);
    },
    /**
     * Agrega una nota a una solicitud de adopción
     */
    addNote(applicationId: string, note: string): Observable<AdoptionApplication> {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:101',message:'addNote - entrada',data:{applicationId,noteLength:note.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const application = store.entityMap()[applicationId] as AdoptionApplication | undefined;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:103',message:'addNote - aplicación encontrada',data:{found:!!application},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!application) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:105',message:'addNote - error aplicación no encontrada',data:{applicationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        throw new Error(`Solicitud con ID ${applicationId} no encontrada`);
      }

      const currentNotes = application.notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = currentNotes 
        ? `${currentNotes}\n${newNote}` 
        : newNote;

      const updatedApplication: AdoptionApplication = {
        ...application,
        notes: updatedNotes,
      };

      return store.editItem(updatedApplication).pipe(
        switchMap(() => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:123',message:'addNote - actualización exitosa',data:{applicationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // Retornar la aplicación actualizada
          return of(updatedApplication);
        })
      );
    },
    /**
     * Obtiene estadísticas de solicitudes de adopción
     */
    getStatistics() {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:129',message:'getStatistics - entrada',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const applications = store.entities();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:131',message:'getStatistics - aplicaciones obtenidas',data:{count:applications.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      try {
        const stats = {
          total: applications.length,
          pending: applications.filter(app => app.status === 'pending').length,
          approved: applications.filter(app => app.status === 'approved').length,
          rejected: applications.filter(app => app.status === 'rejected').length,
          completed: applications.filter(app => app.status === 'completed').length,
          byMonth: groupApplicationsByMonth(applications),
          averageTimeToAdoption: calculateAverageTimeToAdoption(applications),
        };
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:141',message:'getStatistics - cálculo exitoso',data:{total:stats.total,pending:stats.pending},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return stats;
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:145',message:'getStatistics - error en cálculo',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw error;
      }
    },
  })),
  withHooks({ 
    onInit: ({ fetchItems }) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adoption-applications.store.ts:143',message:'AdoptionApplicationsStore onInit',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      fetchItems();
    }
  })
);

