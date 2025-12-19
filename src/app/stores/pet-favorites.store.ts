import { signalStore, withHooks, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PetFavorite } from '../models';
import { withCustomEntities } from './entities.feature';
import { PetsStore } from './pets.store';

export const PetFavoritesStore = signalStore(
  withCustomEntities<PetFavorite>({
    name: 'pet_favorites',
    query: '*,pet:pets!pet_id(*,foundation:foundations!foundation_id(*))',
    detailsQuery: '*,pet:pets!pet_id(*,foundation:foundations!foundation_id(*))',
    order: 'created_at.desc',
  }),
  withMethods((store, petsStore = inject(PetsStore)) => ({
    /**
     * Obtiene los favoritos del usuario actual
     */
    getUserFavorites(userEmail: string) {
      return store.entities().filter(
        (fav) => fav.user_email.toLowerCase() === userEmail.toLowerCase()
      );
    },
    /**
     * Verifica si una mascota está en favoritos del usuario
     */
    isFavorite(userEmail: string, petId: string): boolean {
      return store.entities().some(
        (fav) =>
          fav.user_email.toLowerCase() === userEmail.toLowerCase() &&
          fav.pet_id === petId
      );
    },
    /**
     * Agrega una mascota a favoritos
     */
    addFavorite(userEmail: string, petId: string): Observable<PetFavorite | null> {
      // Verificar si ya existe
      const existing = store.entities().find(
        (fav) =>
          fav.user_email.toLowerCase() === userEmail.toLowerCase() &&
          fav.pet_id === petId
      );
      
      if (existing) {
        return of(existing);
      }

      const newFavorite: Partial<PetFavorite> = {
        user_email: userEmail,
        pet_id: petId,
      };

      return store.createItem(newFavorite as PetFavorite).pipe(
        switchMap((items) => {
          // createItem retorna un array, tomar el primer elemento
          return of(items && items.length > 0 ? items[0] : null);
        })
      );
    },
    /**
     * Elimina una mascota de favoritos
     */
    removeFavorite(userEmail: string, petId: string): Observable<void> {
      const favorite = store.entities().find(
        (fav) =>
          fav.user_email.toLowerCase() === userEmail.toLowerCase() &&
          fav.pet_id === petId
      );

      if (!favorite) {
        return of(void 0);
      }

      store.deleteItem(favorite.id);
      // Refrescar la lista después de eliminar
      store.fetchItems();
      return of(void 0);
    },
    /**
     * Toggle de favorito (agregar si no existe, eliminar si existe)
     */
    toggleFavorite(userEmail: string, petId: string): Observable<PetFavorite | void | null> {
      const isFav = this.isFavorite(userEmail, petId);
      if (isFav) {
        return this.removeFavorite(userEmail, petId).pipe(
          switchMap(() => of(void 0))
        );
      } else {
        return this.addFavorite(userEmail, petId);
      }
    },
  })),
  withHooks({
    onInit: ({ fetchItems }) => {
      fetchItems();
    },
  })
);

