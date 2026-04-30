import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { RecruitmentRule, RecruitmentRuleMatchType } from '../../models';
import { OrganizationService } from '../../services/organization.service';
import { ApiUrlService } from '../../services/api-url.service';
import { RecruitmentRulesStore } from '../../stores/recruitment-rules.store';
import { getEnv } from '../../utils/env.utils';

type RuleForm = Omit<RecruitmentRule, 'id' | 'created_at' | 'updated_at'>;

const EMPTY_FORM: RuleForm = {
  company_id: '',
  name: '',
  description: '',
  target_role: 'piso_venta',
  field_to_check: 'resume_text',
  match_type: 'contains_keyword',
  match_value: '',
  score_points: 3,
  is_active: true,
  priority: 0,
};

@Component({
  selector: 'pt-recruitment-rules-tab',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    Tag,
    Button,
    InputText,
    Select,
    InputNumber,
    Checkbox,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="flex flex-col gap-4 px-2">
      <!-- Descripción -->
      <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
        <h3 class="text-sm font-semibold text-gray-200 mb-2">¿Cómo funcionan las reglas?</h3>
        <p class="text-sm text-gray-400">
          Cada regla evalúa un campo del candidato (ej: texto del CV) y si hace match, suma puntos al rol destino.
          El candidato recibe el rol con mayor puntaje total.
          Las reglas se evalúan en orden de prioridad (mayor primero).
        </p>
      </div>

      <!-- Tabla de reglas existentes -->
      <div class="flex gap-2 items-center flex-wrap">
        <p-button
          icon="pi pi-plus"
          label="Nueva Regla"
          severity="success"
          rounded
          (onClick)="openCreateForm()"
        />
        <p-button
          icon="pi pi-refresh"
          severity="secondary"
          text
          rounded
          [loading]="rulesStore.isLoading()"
          (onClick)="rulesStore.reloadItems()"
          pTooltip="Actualizar reglas"
        />
      </div>

      <p-table
        [value]="rulesStore.entities()"
        [loading]="rulesStore.isLoading()"
        [paginator]="true"
        [rows]="20"
        sortField="priority"
        [sortOrder]="-1"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="priority" class="text-center" style="width:55px">Prio <p-sortIcon field="priority" /></th>
            <th pSortableColumn="name">Nombre</th>
            <th>Campo</th>
            <th>Condición</th>
            <th pSortableColumn="target_role" class="text-center" style="width:110px">Rol</th>
            <th pSortableColumn="score_points" class="text-center" style="width:55px">Pts</th>
            <th class="text-center" style="width:60px">Activa</th>
            <th class="text-center" style="width:90px">Acciones</th>
          </tr>
        </ng-template>
        <ng-template #body let-rule>
          <tr class="hover:bg-neutral-800/50 transition-colors" [class.opacity-50]="!rule.is_active">
            <td class="text-center text-gray-400 text-sm">{{ rule.priority }}</td>
            <td>
              <div class="font-medium text-white text-sm">{{ rule.name }}</div>
              @if (rule.description) {
                <div class="text-xs text-gray-500">{{ rule.description }}</div>
              }
            </td>
            <td class="text-center text-xs text-gray-400">{{ getFieldLabel(rule.field_to_check) }}</td>
            <td class="text-center text-xs">
              <span class="text-gray-400">{{ getMatchTypeLabel(rule.match_type) }}: </span>
              <span class="text-gray-200 font-mono">{{ rule.match_value || '—' }}</span>
            </td>
            <td class="text-center">
              <p-tag [value]="getRoleLabel(rule.target_role)" [severity]="getRoleSeverity(rule.target_role)" />
            </td>
            <td class="text-center font-bold" [class.text-green-400]="rule.score_points > 0">{{ rule.score_points }}</td>
            <td class="text-center">
              @if (rule.is_active) {
                <i class="pi pi-check-circle text-green-400"></i>
              } @else {
                <i class="pi pi-times-circle text-gray-500"></i>
              }
            </td>
            <td class="text-center">
              <p-button icon="pi pi-pencil" text rounded severity="info" (onClick)="openEditForm(rule)" pTooltip="Editar" />
              <p-button icon="pi pi-trash" text rounded severity="danger" (onClick)="deleteRule(rule)" pTooltip="Eliminar" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="8" class="text-center py-8">
              <div class="flex flex-col items-center gap-2">
                <i class="pi pi-list text-4xl text-gray-500"></i>
                <p class="text-gray-400">No hay reglas configuradas</p>
                <p class="text-gray-500 text-sm">Crea una regla para empezar a clasificar candidatos</p>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Formulario de creación/edición -->
      @if (showForm()) {
        <div class="bg-neutral-800 border border-neutral-600 rounded-xl p-6">
          <h3 class="text-base font-semibold text-white mb-4">
            {{ editingRule() ? 'Editar Regla' : 'Nueva Regla' }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Nombre -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Nombre *</label>
              <input pInputText [(ngModel)]="form().name" placeholder="Ej: Experiencia veterinaria" class="w-full" />
            </div>
            <!-- Descripción -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Descripción</label>
              <input pInputText [(ngModel)]="form().description" placeholder="Descripción breve (opcional)" class="w-full" />
            </div>
            <!-- Campo a evaluar -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Campo a evaluar *</label>
              <p-select
                [(ngModel)]="form().field_to_check"
                [options]="fieldOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar campo"
                appendTo="body"
                styleClass="w-full"
              />
            </div>
            <!-- Tipo de match -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Condición *</label>
              <p-select
                [(ngModel)]="form().match_type"
                [options]="matchTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar condición"
                appendTo="body"
                styleClass="w-full"
              />
            </div>
            <!-- Valor a buscar -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Valor *</label>
              <input
                pInputText
                [(ngModel)]="form().match_value"
                [placeholder]="getMatchValuePlaceholder(form().match_type)"
                class="w-full"
              />
              <span class="text-xs text-gray-500">{{ getMatchValueHint(form().match_type) }}</span>
            </div>
            <!-- Rol destino -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Rol destino *</label>
              <p-select
                [(ngModel)]="form().target_role"
                [options]="roleOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar rol"
                appendTo="body"
                styleClass="w-full"
              />
            </div>
            <!-- Puntos -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Puntos al hacer match *</label>
              <p-inputnumber [(ngModel)]="form().score_points" [min]="1" [max]="100" styleClass="w-full" />
            </div>
            <!-- Prioridad -->
            <div class="flex flex-col gap-1">
              <label class="text-sm text-gray-300">Prioridad (mayor = primero)</label>
              <p-inputnumber [(ngModel)]="form().priority" [min]="0" [max]="100" styleClass="w-full" />
            </div>
            <!-- Activa -->
            <div class="flex items-center gap-2 pt-4">
              <p-checkbox [(ngModel)]="form().is_active" [binary]="true" inputId="is_active" />
              <label for="is_active" class="text-sm text-gray-300">Regla activa</label>
            </div>
          </div>
          <div class="flex gap-2 mt-6">
            <p-button
              [label]="editingRule() ? 'Guardar Cambios' : 'Crear Regla'"
              severity="success"
              rounded
              [loading]="isSaving()"
              (onClick)="saveRule()"
            />
            <p-button
              label="Cancelar"
              severity="secondary"
              rounded
              [outlined]="true"
              (onClick)="closeForm()"
            />
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentRulesTabComponent implements OnInit {
  readonly rulesStore = inject(RecruitmentRulesStore);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);

  public showForm = signal(false);
  public editingRule = signal<RecruitmentRule | null>(null);
  public isSaving = signal(false);
  public form = signal<RuleForm>({ ...EMPTY_FORM });

  readonly fieldOptions = [
    { label: 'Texto completo del CV (PDF/Word)', value: 'resume_text' },
    { label: 'CV Parseado – Experiencia', value: 'resume_parsed.experiencia' },
    { label: 'CV Parseado – Educación', value: 'resume_parsed.educacion' },
    { label: 'CV Parseado – Habilidades', value: 'resume_parsed.habilidades' },
    { label: 'CV Parseado – Idiomas', value: 'resume_parsed.idiomas' },
    { label: 'CV Parseado – Keywords detectadas', value: 'resume_parsed.keywords_found' },
    { label: 'Info adicional (formulario)', value: 'additional_info' },
    { label: 'Vacante aplicada', value: 'position_name' },
    { label: 'Expectativa salarial', value: 'salary_expectation' },
    { label: 'Provincia de residencia', value: 'province' },
    { label: '¿Está trabajando actualmente?', value: 'currently_working' },
  ];

  readonly matchTypeOptions = [
    { label: 'Contiene keyword exacta', value: 'contains_keyword' },
    { label: 'Contiene alguna de (separadas por |)', value: 'contains_any' },
    { label: 'Expresión regular (regex)', value: 'regex' },
    { label: 'Igual a', value: 'equals' },
    { label: 'Mayor o igual a (numérico)', value: 'min_value' },
    { label: 'Menor o igual a (numérico)', value: 'max_value' },
    { label: 'Es verdadero (booleano)', value: 'is_true' },
    { label: 'Es falso (booleano)', value: 'is_false' },
  ];

  readonly roleOptions = [
    { label: 'Gerente', value: 'gerente' },
    { label: 'Subgerente', value: 'subgerente' },
    { label: 'Piso de Venta', value: 'piso_venta' },
  ];

  ngOnInit(): void {
    this.rulesStore.reloadItems();
  }

  getFieldLabel(value: string): string {
    return this.fieldOptions.find(o => o.value === value)?.label ?? value;
  }

  getMatchTypeLabel(value: string): string {
    return this.matchTypeOptions.find(o => o.value === value)?.label ?? value;
  }

  getRoleLabel(role: string): string {
    return this.roleOptions.find(o => o.value === role)?.label ?? role;
  }

  getRoleSeverity(role: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn'> = {
      gerente: 'warn',
      subgerente: 'info',
      piso_venta: 'success',
    };
    return map[role] ?? 'secondary';
  }

  getMatchValuePlaceholder(matchType: RecruitmentRuleMatchType | string): string {
    const map: Record<string, string> = {
      contains_keyword: 'veterinaria',
      contains_any: 'veterinaria|clínica|mascotas',
      regex: '\\d+\\s+años?\\s+de\\s+experiencia',
      equals: 'Panamá',
      min_value: '1000',
      max_value: '2000',
      is_true: '(no aplica)',
      is_false: '(no aplica)',
    };
    return map[matchType] ?? '';
  }

  getMatchValueHint(matchType: RecruitmentRuleMatchType | string): string {
    const map: Record<string, string> = {
      contains_any: 'Separa múltiples valores con |',
      regex: 'Expresión regular JavaScript (case-insensitive)',
      is_true: 'Deja vacío, no se usa',
      is_false: 'Deja vacío, no se usa',
    };
    return map[matchType] ?? '';
  }

  openCreateForm(): void {
    const companyId = this.organizationService.getCurrentCompanyId() ?? '';
    this.editingRule.set(null);
    this.form.set({ ...EMPTY_FORM, company_id: companyId });
    this.showForm.set(true);
  }

  openEditForm(rule: RecruitmentRule): void {
    this.editingRule.set(rule);
    this.form.set({
      company_id: rule.company_id,
      name: rule.name,
      description: rule.description ?? '',
      target_role: rule.target_role,
      field_to_check: rule.field_to_check,
      match_type: rule.match_type,
      match_value: rule.match_value,
      score_points: rule.score_points,
      is_active: rule.is_active,
      priority: rule.priority,
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingRule.set(null);
  }

  async saveRule(): Promise<void> {
    const f = this.form();
    if (!f.name || !f.field_to_check || !f.match_type || !f.target_role) {
      this.messageService.add({ severity: 'warn', detail: 'Completa todos los campos obligatorios' });
      return;
    }

    this.isSaving.set(true);
    try {
      const editing = this.editingRule();
      const supabaseUrl = getEnv('ENV_SUPABASE_URL');
      const serviceKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ?? getEnv('ENV_SUPABASE_TOKEN') ?? '';

      if (editing) {
        await firstValueFrom(
          this.http.patch(
            `${supabaseUrl}/rest/v1/recruitment_rules?id=eq.${editing.id}`,
            f,
            { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' } }
          )
        );
      } else {
        await firstValueFrom(
          this.http.post(
            `${supabaseUrl}/rest/v1/recruitment_rules`,
            f,
            { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' } }
          )
        );
      }

      this.messageService.add({ severity: 'success', detail: editing ? 'Regla actualizada' : 'Regla creada' });
      this.rulesStore.reloadItems();
      this.closeForm();
    } catch (err) {
      this.messageService.add({ severity: 'error', detail: 'Error al guardar la regla' });
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteRule(rule: RecruitmentRule): Promise<void> {
    if (!confirm(`¿Eliminar la regla "${rule.name}"?`)) return;

    try {
      const supabaseUrl = getEnv('ENV_SUPABASE_URL');
      const serviceKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ?? getEnv('ENV_SUPABASE_TOKEN') ?? '';

      await firstValueFrom(
        this.http.delete(
          `${supabaseUrl}/rest/v1/recruitment_rules?id=eq.${rule.id}`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        )
      );

      this.messageService.add({ severity: 'success', detail: 'Regla eliminada' });
      this.rulesStore.reloadItems();
    } catch (err) {
      this.messageService.add({ severity: 'error', detail: 'Error al eliminar la regla' });
    }
  }
}
