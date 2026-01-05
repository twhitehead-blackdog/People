import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Organization = 'blackdog' | 'naz';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private readonly STORAGE_KEY = 'selected_organization';
  private readonly STORAGE_KEY_COMPANY_ID = 'selected_company_id';

  // Signal reactivo para la organización actual
  private _currentOrganization = signal<Organization>(this.loadFromStorage());

  // Cache para company_id de Naz y Black Dog
  private _nazCompanyId: string | null = null;
  private _blackdogCompanyId: string | null = null;

  // Signal para el company_id actual
  private _currentCompanyId = signal<string | null>(
    this.loadCompanyIdFromStorage()
  );

  // Signal para saber si los company_ids están listos
  private _companyIdsReady = signal<boolean>(false);

  // Computed para verificar si es Naz (basado en company_id)
  public isNaz = computed(() => {
    const currentCompanyId = this._currentCompanyId();
    return currentCompanyId !== null && currentCompanyId === this._nazCompanyId;
  });

  // Computed para verificar si es Black Dog (basado en company_id)
  public isBlackDog = computed(() => {
    const currentCompanyId = this._currentCompanyId();
    return (
      currentCompanyId !== null && currentCompanyId === this._blackdogCompanyId
    );
  });

  // Getter para obtener la organización actual
  public get currentOrganization(): Organization {
    return this._currentOrganization();
  }

  // Getter para obtener el company_id actual
  public getCurrentCompanyId(): string | null {
    const companyId = this._currentCompanyId();
    return companyId;
  }

  // Signal para suscripciones reactivas
  public get currentOrganization$() {
    return this._currentOrganization.asReadonly();
  }

  // Signal para suscripciones reactivas del company_id
  public get currentCompanyId$() {
    return this._currentCompanyId.asReadonly();
  }

  // Getter público para saber si los company_ids están listos
  public get companyIdsReady() {
    return this._companyIdsReady.asReadonly();
  }

  private readonly http = inject(HttpClient);

  constructor() {
    // Cargar desde localStorage al inicializar
    const saved = this.loadFromStorage();
    if (saved) {
      this._currentOrganization.set(saved);
    }

    // Inicializar company_ids de Naz y Black Dog de forma asíncrona no bloqueante
    // Usar setTimeout para diferir la ejecución y no bloquear el constructor
    setTimeout(() => {
      this.initializeCompanyIds().catch((error) => {
        console.error('❌ Error en inicialización asíncrona de company_ids:', error);
      });
    }, 0);

    // Sincronizar company_id cuando cambia la organización
    // Solo sincronizar si los company_ids ya están listos
    effect(() => {
      const org = this._currentOrganization();
      // Solo sincronizar si los company_ids están listos
      if (this._companyIdsReady()) {
        this.syncCompanyIdFromOrganization(org);
      }
    });
  }

  /**
   * Inicializa los company_id de Naz y Black Dog desde la base de datos
   */
  private async initializeCompanyIds(): Promise<void> {
    try {
      const baseUrl = process.env['ENV_SUPABASE_URL'];
      if (!baseUrl) {
        console.warn('⚠️ ENV_SUPABASE_URL no está definido');
        this._companyIdsReady.set(true); // Marcar como listo aunque falle
        return;
      }

      // Obtener company_id de Naz
      // Buscar que contenga "naz" (case-insensitive)
      const nazResponse = await firstValueFrom(
        this.http.get<{ id: string; name: string }[]>(
          `${baseUrl}/rest/v1/companies`,
          {
            params: {
              select: 'id,name',
              name: `ilike.%naz%`,
              limit: '10',
              order: 'created_at.asc',
            },
          }
        )
      );

      if (nazResponse && nazResponse.length > 0) {
        // Priorizar coincidencia exacta "Naz", si no existe usar la primera que contenga "naz"
        const exactMatch = nazResponse.find(
          (c) => c.name.toLowerCase().trim() === 'naz'
        );
        const nazCompany = exactMatch || nazResponse[0];
        if (nazCompany) {
          this._nazCompanyId = nazCompany.id;
          console.log(
            '✅ Company ID de Naz cargado:',
            this._nazCompanyId,
            'nombre:',
            nazCompany.name
          );
        }
      }

      // Obtener company_id de Blackdog
      // Buscar "blackdog" (sin espacio entre black y dog) o "blackdog panamá"
      const bdResponse = await firstValueFrom(
        this.http.get<{ id: string; name: string }[]>(
          `${baseUrl}/rest/v1/companies`,
          {
            params: {
              select: 'id,name',
              name: `ilike.%blackdog%`,
              limit: '10',
              order: 'created_at.asc',
            },
          }
        )
      );

      if (bdResponse && bdResponse.length > 0) {
        // Usar la primera coincidencia (ya está ordenada por created_at)
        const blackdogCompany = bdResponse[0];
        this._blackdogCompanyId = blackdogCompany.id;
        console.log(
          '✅ Company ID de Blackdog cargado:',
          this._blackdogCompanyId,
          'nombre:',
          blackdogCompany.name
        );
      } else {
        // Si no encuentra con "blackdog", intentar con "black" y "dog" separados
        const bdResponse2 = await firstValueFrom(
          this.http.get<{ id: string; name: string }[]>(
            `${baseUrl}/rest/v1/companies`,
            {
              params: {
                select: 'id,name',
                name: `ilike.%black%`,
                limit: '10',
                order: 'created_at.asc',
              },
            }
          )
        );

        if (bdResponse2 && bdResponse2.length > 0) {
          // Buscar la que también contenga "dog"
          const blackdogMatch = bdResponse2.find((c) =>
            c.name.toLowerCase().includes('dog')
          );
          if (blackdogMatch) {
            this._blackdogCompanyId = blackdogMatch.id;
            console.log(
              '✅ Company ID de Blackdog cargado (búsqueda alternativa):',
              this._blackdogCompanyId,
              'nombre:',
              blackdogMatch.name
            );
          }
        }
      }

      // Marcar como listo - el effect se encargará de sincronizar automáticamente
      this._companyIdsReady.set(true);
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✅ Company IDs inicializados correctamente');
      }
    } catch (error) {
      console.error('❌ Error inicializando company_ids:', error);
      // Marcar como listo aunque haya error para no bloquear la app
      this._companyIdsReady.set(true);
    }
  }

  /**
   * Espera a que los company_ids estén listos
   * Útil para asegurar que estén cargados antes de proceder
   */
  public async waitForCompanyIds(): Promise<void> {
    if (this._companyIdsReady()) {
      return Promise.resolve();
    }

    // Esperar hasta que estén listos (máximo 5 segundos)
    return new Promise((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const checkInterval = setInterval(() => {
        if (this._companyIdsReady()) {
          clearInterval(checkInterval);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          console.log('✅ Company IDs listos después de esperar');
          resolve();
        }
      }, 100);

      // Timeout de seguridad
      timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        // Solo mostrar warning si realmente no están listos
        if (!this._companyIdsReady()) {
          console.warn(
            '⚠️ Timeout esperando company_ids, continuando de todas formas'
          );
        }
        resolve();
      }, 5000);
    });
  }

  /**
   * Sincroniza el company_id actual basado en la organización seleccionada
   */
  private syncCompanyIdFromOrganization(org: Organization): void {
    // No sincronizar si los company_ids aún no están listos
    if (!this._companyIdsReady()) {
      return;
    }

    let companyId: string | null = null;

    if (org === 'naz' && this._nazCompanyId) {
      companyId = this._nazCompanyId;
      console.log('🔄 Sincronizando company_id para Naz:', companyId);
    } else if (org === 'blackdog' && this._blackdogCompanyId) {
      companyId = this._blackdogCompanyId;
      console.log('🔄 Sincronizando company_id para Black Dog:', companyId);
    }

    if (companyId) {
      this._currentCompanyId.set(companyId);
      this.saveCompanyIdToStorage(companyId);
      console.log(
        '✅ Company ID actualizado:',
        companyId,
        'para organización:',
        org
      );
    } else {
      // Solo mostrar warning si los company_ids están listos pero no se encontró el ID
      if (this._companyIdsReady()) {
        console.warn(
          '⚠️ No se pudo obtener company_id para organización:',
          org
        );
      }
    }
  }

  /**
   * Carga el company_id desde localStorage
   */
  private loadCompanyIdFromStorage(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      return localStorage.getItem(this.STORAGE_KEY_COMPANY_ID);
    } catch (error) {
      console.error('Error loading company_id from localStorage:', error);
      return null;
    }
  }

  /**
   * Guarda el company_id en localStorage
   */
  private saveCompanyIdToStorage(companyId: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY_COMPANY_ID, companyId);
    } catch (error) {
      console.error('Error saving company_id to localStorage:', error);
    }
  }

  /**
   * Cambia la organización seleccionada
   */
  setOrganization(org: Organization): void {
    console.log('🔄 Cambiando organización a:', org);
    this._currentOrganization.set(org);
    this.saveToStorage(org);
    // syncCompanyIdFromOrganization se ejecutará automáticamente por el effect
  }

  /**
   * Establece el company_id directamente (útil para migración)
   */
  setCompanyId(companyId: string): void {
    this._currentCompanyId.set(companyId);
    this.saveCompanyIdToStorage(companyId);

    // Actualizar organización basada en company_id
    if (companyId === this._nazCompanyId) {
      this._currentOrganization.set('naz');
      this.saveToStorage('naz');
    } else if (companyId === this._blackdogCompanyId) {
      this._currentOrganization.set('blackdog');
      this.saveToStorage('blackdog');
    }
  }

  /**
   * Limpia la selección de organización (útil al cerrar sesión)
   */
  clearOrganization(): void {
    console.log('🧹 Limpiando selección de organización...');
    this._currentOrganization.set('blackdog'); // Resetear a Black Dog por defecto
    this._currentCompanyId.set(null);

    // Limpiar localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.STORAGE_KEY);
        window.localStorage.removeItem(this.STORAGE_KEY_COMPANY_ID);
      }
    } catch (error) {
      console.error('Error clearing organization from localStorage:', error);
    }
  }

  /**
   * Obtiene el company_id de Naz (para uso en migraciones)
   */
  public getNazCompanyId(): string | null {
    return this._nazCompanyId;
  }

  /**
   * Obtiene el company_id de Black Dog (para uso en migraciones)
   */
  public getBlackdogCompanyId(): string | null {
    return this._blackdogCompanyId;
  }

  /**
   * Alterna entre Black Dog y Naz
   */
  toggleOrganization(): void {
    const next =
      this._currentOrganization() === 'blackdog' ? 'naz' : 'blackdog';
    this.setOrganization(next);
  }

  /**
   * Cambia a la siguiente organización
   */
  nextOrganization(): void {
    this.toggleOrganization();
  }

  /**
   * Cambia a la organización anterior
   */
  previousOrganization(): void {
    this.toggleOrganization();
  }

  /**
   * Carga la organización desde localStorage
   */
  private loadFromStorage(): Organization {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'blackdog'; // Default
    }

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'naz' || saved === 'blackdog') {
        return saved as Organization;
      }
    } catch (error) {
      console.error('Error loading organization from localStorage:', error);
    }

    return 'blackdog'; // Default
  }

  /**
   * Guarda la organización en localStorage
   */
  private saveToStorage(org: Organization): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, org);
    } catch (error) {
      console.error('Error saving organization to localStorage:', error);
    }
  }
}
