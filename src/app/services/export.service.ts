import { Injectable, inject } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as XLSX from 'xlsx';
import { StatisticsService, StatisticsData } from './statistics.service';
import { Pet, AdoptionApplication, Foundation } from '../models';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Configurar pdfmake con las fuentes
// Usar una función helper para evitar problemas de asignación a imports
function configurePdfMakeFonts() {
  const pdfMakeInstance: any = pdfMake;
  const pdfFontsInstance: any = pdfFonts;
  
  if (!pdfMakeInstance.vfs && pdfFontsInstance) {
    // Intentar obtener las fuentes de diferentes formas según la versión
    const vfs = pdfFontsInstance.pdfMake?.vfs 
      || pdfFontsInstance.default 
      || (pdfFontsInstance as any);
    
    if (vfs && typeof vfs === 'object') {
      // Usar Object.defineProperty para evitar el error de asignación
      Object.defineProperty(pdfMakeInstance, 'vfs', {
        value: vfs,
        writable: true,
        configurable: true
      });
    }
  }
}

// Configurar las fuentes al cargar el módulo
configurePdfMakeFonts();

export type ExportFormat = 'pdf' | 'excel';
export type ExportType = 'statistics' | 'pets' | 'applications' | 'foundations';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private statisticsService = inject(StatisticsService);

  /**
   * Exporta estadísticas a PDF o Excel
   */
  public exportStatistics(format: ExportFormat): void {
    const stats = this.statisticsService.getStatistics();
    
    if (format === 'pdf') {
      this.exportStatisticsToPDF(stats);
    } else {
      this.exportStatisticsToExcel(stats);
    }
  }

  /**
   * Exporta lista de mascotas a PDF o Excel
   */
  public exportPets(pets: Pet[], format: ExportFormat): void {
    if (format === 'pdf') {
      this.exportPetsToPDF(pets);
    } else {
      this.exportPetsToExcel(pets);
    }
  }

  /**
   * Exporta lista de solicitudes a PDF o Excel
   */
  public exportApplications(applications: AdoptionApplication[], format: ExportFormat): void {
    if (format === 'pdf') {
      this.exportApplicationsToPDF(applications);
    } else {
      this.exportApplicationsToExcel(applications);
    }
  }

  /**
   * Exporta lista de fundaciones a PDF o Excel
   */
  public exportFoundations(foundations: Foundation[], format: ExportFormat): void {
    if (format === 'pdf') {
      this.exportFoundationsToPDF(foundations);
    } else {
      this.exportFoundationsToExcel(foundations);
    }
  }

  // ========== MÉTODOS PRIVADOS PARA PDF ==========

  private exportStatisticsToPDF(stats: StatisticsData): void {
    const docDefinition: any = {
      content: [
        {
          text: 'REPORTE DE ESTADÍSTICAS',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 30],
        },
        {
          text: 'ESTADÍSTICAS DE MASCOTAS',
          style: 'sectionHeader',
          margin: [0, 0, 0, 10],
        },
        {
          columns: [
            { text: `Total: ${stats.pets.total}`, margin: [0, 5, 0, 5] },
            { text: `Disponibles: ${stats.pets.available}`, margin: [0, 5, 0, 5] },
            { text: `Adoptadas: ${stats.pets.adopted}`, margin: [0, 5, 0, 5] },
          ],
        },
        {
          text: 'ESTADÍSTICAS DE SOLICITUDES',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
        },
        {
          columns: [
            { text: `Total: ${stats.applications.total}`, margin: [0, 5, 0, 5] },
            { text: `Pendientes: ${stats.applications.pending}`, margin: [0, 5, 0, 5] },
            { text: `Aprobadas: ${stats.applications.approved}`, margin: [0, 5, 0, 5] },
            { text: `Rechazadas: ${stats.applications.rejected}`, margin: [0, 5, 0, 5] },
            { text: `Completadas: ${stats.applications.completed}`, margin: [0, 5, 0, 5] },
          ],
        },
        {
          text: `Tasa de Adopción: ${(stats.adoptionRate * 100).toFixed(2)}%`,
          style: 'info',
          margin: [0, 20, 0, 10],
        },
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#000000',
        },
        subheader: {
          fontSize: 12,
          color: '#666666',
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: '#fbbf24',
          margin: [0, 10, 0, 10],
        },
        info: {
          fontSize: 14,
          bold: true,
          color: '#10b981',
        },
      },
      defaultStyle: {
        font: 'Helvetica',
      },
    };

    (pdfMake as any).createPdf(docDefinition).download(`reporte-estadisticas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  private exportPetsToPDF(pets: Pet[]): void {
    const tableBody: any[] = [
      [
        { text: 'Nombre', style: 'tableHeader' },
        { text: 'Especie', style: 'tableHeader' },
        { text: 'Género', style: 'tableHeader' },
        { text: 'Tamaño', style: 'tableHeader' },
        { text: 'Edad', style: 'tableHeader' },
        { text: 'Estado', style: 'tableHeader' },
        { text: 'Fundación', style: 'tableHeader' },
      ],
    ];

    pets.forEach((pet) => {
      tableBody.push([
        pet.name,
        this.getSpeciesLabel(pet.species),
        pet.gender === 'M' ? 'Macho' : 'Hembra',
        this.getSizeLabel(pet.size),
        pet.age ? `${pet.age.toFixed(1)} años` : 'N/A',
        pet.is_available ? 'Disponible' : 'Adoptada',
        pet.foundation?.name || 'Sin fundación',
      ]);
    });

    const docDefinition: any = {
      content: [
        {
          text: 'LISTADO DE MASCOTAS',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Total de mascotas: ${pets.length}`,
          style: 'info',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
            body: tableBody,
          },
          layout: 'lightGridLines',
        },
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: '#000000',
        },
        subheader: {
          fontSize: 12,
          color: '#666666',
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: '#000000',
          fillColor: '#fbbf24',
        },
        info: {
          fontSize: 12,
          bold: true,
        },
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
      },
    };

    (pdfMake as any).createPdf(docDefinition).download(`listado-mascotas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  private exportApplicationsToPDF(applications: AdoptionApplication[]): void {
    const tableBody: any[] = [
      [
        { text: 'Solicitante', style: 'tableHeader' },
        { text: 'Email', style: 'tableHeader' },
        { text: 'Mascota', style: 'tableHeader' },
        { text: 'Estado', style: 'tableHeader' },
        { text: 'Fecha', style: 'tableHeader' },
      ],
    ];

    applications.forEach((app) => {
      tableBody.push([
        app.applicant_name,
        app.applicant_email,
        app.pet?.name || 'N/A',
        this.getStatusLabel(app.status),
        format(new Date(app.created_at || ''), 'dd/MM/yyyy', { locale: es }),
      ]);
    });

    const docDefinition: any = {
      content: [
        {
          text: 'LISTADO DE SOLICITUDES DE ADOPCIÓN',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Total de solicitudes: ${applications.length}`,
          style: 'info',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', 'auto', 'auto'],
            body: tableBody,
          },
          layout: 'lightGridLines',
        },
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: '#000000',
        },
        subheader: {
          fontSize: 12,
          color: '#666666',
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: '#000000',
          fillColor: '#fbbf24',
        },
        info: {
          fontSize: 12,
          bold: true,
        },
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
      },
    };

    (pdfMake as any).createPdf(docDefinition).download(`listado-solicitudes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  private exportFoundationsToPDF(foundations: Foundation[]): void {
    const tableBody: any[] = [
      [
        { text: 'Nombre', style: 'tableHeader' },
        { text: 'Dirección', style: 'tableHeader' },
        { text: 'Teléfono', style: 'tableHeader' },
        { text: 'Email', style: 'tableHeader' },
        { text: 'Estado', style: 'tableHeader' },
      ],
    ];

    foundations.forEach((foundation) => {
      tableBody.push([
        foundation.name,
        foundation.address,
        foundation.phone_number,
        foundation.email,
        foundation.is_active ? 'Activa' : 'Inactiva',
      ]);
    });

    const docDefinition: any = {
      content: [
        {
          text: 'LISTADO DE FUNDACIONES',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Total de fundaciones: ${foundations.length}`,
          style: 'info',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 'auto', '*', 'auto'],
            body: tableBody,
          },
          layout: 'lightGridLines',
        },
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: '#000000',
        },
        subheader: {
          fontSize: 12,
          color: '#666666',
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: '#000000',
          fillColor: '#fbbf24',
        },
        info: {
          fontSize: 12,
          bold: true,
        },
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
      },
    };

    (pdfMake as any).createPdf(docDefinition).download(`listado-fundaciones-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  // ========== MÉTODOS PRIVADOS PARA EXCEL ==========

  private exportStatisticsToExcel(stats: StatisticsData): void {
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const summaryData = [
      ['REPORTE DE ESTADÍSTICAS'],
      [`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`],
      [],
      ['ESTADÍSTICAS DE MASCOTAS'],
      ['Total', stats.pets.total],
      ['Disponibles', stats.pets.available],
      ['Adoptadas', stats.pets.adopted],
      [],
      ['ESTADÍSTICAS DE SOLICITUDES'],
      ['Total', stats.applications.total],
      ['Pendientes', stats.applications.pending],
      ['Aprobadas', stats.applications.approved],
      ['Rechazadas', stats.applications.rejected],
      ['Completadas', stats.applications.completed],
      [],
      ['Tasa de Adopción', `${(stats.adoptionRate * 100).toFixed(2)}%`],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Hoja 2: Mascotas por especie
    const speciesData: (string | number)[][] = [['Especie', 'Cantidad']];
    stats.pets.bySpecies.forEach((item) => {
      speciesData.push([this.getSpeciesLabel(item.species), item.count]);
    });
    const speciesSheet = XLSX.utils.aoa_to_sheet(speciesData);
    XLSX.utils.book_append_sheet(workbook, speciesSheet, 'Por Especie');

    // Hoja 3: Solicitudes por mes
    const monthlyData: (string | number)[][] = [['Mes', 'Cantidad']];
    stats.applications.byMonth.forEach((item) => {
      monthlyData.push([item.month, item.count]);
    });
    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Por Mes');

    XLSX.writeFile(workbook, `reporte-estadisticas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  private exportPetsToExcel(pets: Pet[]): void {
    const data = [
      ['Nombre', 'Especie', 'Género', 'Tamaño', 'Edad', 'Raza', 'Color', 'Peso (Kg)', 'Estado', 'Fundación'],
    ];

    pets.forEach((pet) => {
      data.push([
        pet.name,
        this.getSpeciesLabel(pet.species),
        pet.gender === 'M' ? 'Macho' : 'Hembra',
        this.getSizeLabel(pet.size),
        pet.age ? pet.age.toFixed(1) : '',
        pet.breed || '',
        pet.color || '',
        pet.weight ? pet.weight.toString() : '',
        pet.is_available ? 'Disponible' : 'Adoptada',
        pet.foundation?.name || 'Sin fundación',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mascotas');
    XLSX.writeFile(workbook, `listado-mascotas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  private exportApplicationsToExcel(applications: AdoptionApplication[]): void {
    const data = [
      [
        'Solicitante',
        'Email',
        'Teléfono',
        'Mascota',
        'Estado',
        'Fecha de Solicitud',
        'Tiene Otras Mascotas',
        'Tiene Niños',
      ],
    ];

    applications.forEach((app) => {
      data.push([
        app.applicant_name,
        app.applicant_email,
        app.applicant_phone || '',
        app.pet?.name || 'N/A',
        this.getStatusLabel(app.status),
        format(new Date(app.created_at || ''), 'dd/MM/yyyy', { locale: es }),
        app.has_other_pets ? 'Sí' : 'No',
        app.has_children ? 'Sí' : 'No',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitudes');
    XLSX.writeFile(workbook, `listado-solicitudes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  private exportFoundationsToExcel(foundations: Foundation[]): void {
    const data = [
      ['Nombre', 'Dirección', 'Teléfono', 'Email', 'Sitio Web', 'Estado'],
    ];

    foundations.forEach((foundation) => {
      data.push([
        foundation.name,
        foundation.address,
        foundation.phone_number,
        foundation.email,
        foundation.website || '',
        foundation.is_active ? 'Activa' : 'Inactiva',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fundaciones');
    XLSX.writeFile(workbook, `listado-fundaciones-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  // ========== MÉTODOS HELPER ==========

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

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      completed: 'Completada',
    };
    return labels[status] || status;
  }
}

