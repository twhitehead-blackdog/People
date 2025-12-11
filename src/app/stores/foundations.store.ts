import { signalStore, withHooks, withMethods } from '@ngrx/signals';
import { Foundation } from '../models';
import { withCustomEntities } from './entities.feature';
import { PetsStore } from './pets.store';
import { AdoptionApplicationsStore } from './adoption-applications.store';
import { inject } from '@angular/core';

export const FoundationsStore = signalStore(
  withCustomEntities<Foundation>({ 
    name: 'foundations',
    order: 'name'
  }),
  withMethods((store, petsStore = inject(PetsStore), applicationsStore = inject(AdoptionApplicationsStore)) => ({
    /**
     * Obtiene estadísticas por fundación
     */
    getStatistics() {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'foundations.store.ts:17',message:'getStatistics - entrada',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const foundations = store.entities();
      const pets = petsStore.entities();
      const applications = applicationsStore.entities();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'foundations.store.ts:21',message:'getStatistics - datos obtenidos',data:{foundationsCount:foundations.length,petsCount:pets.length,applicationsCount:applications.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      return foundations.map((foundation) => {
        const foundationPets = pets.filter((pet) => pet.foundation_id === foundation.id);
        const foundationApplications = applications.filter((app) => 
          app.pet?.foundation_id === foundation.id
        );

        return {
          foundation,
          pets: {
            total: foundationPets.length,
            available: foundationPets.filter((p) => p.is_available).length,
            adopted: foundationPets.filter((p) => !p.is_available).length,
          },
          applications: {
            total: foundationApplications.length,
            pending: foundationApplications.filter((app) => app.status === 'pending').length,
            approved: foundationApplications.filter((app) => app.status === 'approved').length,
            rejected: foundationApplications.filter((app) => app.status === 'rejected').length,
            completed: foundationApplications.filter((app) => app.status === 'completed').length,
          },
          adoptionRate: foundationPets.length > 0 
            ? (foundationPets.filter((p) => !p.is_available).length / foundationPets.length) * 100 
            : 0,
        };
      });
    },
  })),
  withHooks({ 
    onInit: ({ fetchItems }) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'foundations.store.ts:49',message:'FoundationsStore onInit',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      fetchItems();
    }
  })
);

