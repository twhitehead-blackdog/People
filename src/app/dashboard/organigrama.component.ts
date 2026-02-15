import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { PositionsStore } from '../stores/positions.store';
import { EmployeesStore } from '../stores/employees.store';
import { Position, Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { DeviceService } from '../services/device.service';
import { LoggerService } from '../services/logger.service';

interface OrgStructureRow {
  position_id: string;
  parent_position_id: string | null;
  sort_order: number;
}

interface OrgNode {
  position: Position;
  employees: Employee[];
  children: OrgNode[];
  branchId?: string;
  branchName?: string;
}

interface ConfigEntry {
  position: Position;
  parentId: string | null;
  employeeCount: number;
}

@Component({
  selector: 'pt-organigrama',
  standalone: true,
  imports: [Card, Button, ToastModule, Select, FormsModule, NgTemplateOutlet, TooltipModule, UpperCasePipe],
  providers: [MessageService],
  template: `
    <p-toast />

    <!-- ========== DESKTOP: Recursive tree node ========== -->
    <ng-template #treeNodeTpl let-node let-idx="idx">
      <div class="tree-node-wrapper anim-pop" [class.has-children]="hasExpandableContent(node)" [style.animation-delay]="(idx || 0) * 60 + 'ms'">
        <div class="node-card-container">
          <div class="node-bubble" [style.background]="getGradient(node)" [class.node-bubble-branch]="!!node.branchName"
               (click)="toggleNode(nodeKey(node))">
            <div class="bubble-avatar" [style.background-color]="getDeptColor(node)">
              {{ getInitials(node) }}
            </div>
            <span class="bubble-name">{{ getLeader(node) }}</span>
            <span class="bubble-role">{{ node.position.name }}</span>
            @if (node.branchName) {
              <span class="bubble-branch">
                <i class="pi pi-map-marker"></i> {{ node.branchName }}
              </span>
            } @else if (node.position.department?.name) {
              <span class="bubble-dept">{{ node.position.department.name }}</span>
            }
            @if (hasExpandableContent(node)) {
              <span class="bubble-toggle" [class.open]="isExpanded(nodeKey(node))">
                <i class="pi pi-chevron-down"></i>
                <span class="toggle-count">{{ node.children.length + node.employees.length }}</span>
              </span>
            }
          </div>
        </div>
        @if (isExpanded(nodeKey(node)) && hasExpandableContent(node)) {
          <div class="tree-children-row anim-fade">
            <!-- Employee bubbles -->
            @for (emp of node.employees; track emp.id; let i = $index) {
              <div class="tree-node-wrapper anim-pop" [style.animation-delay]="i * 40 + 'ms'">
                <div class="node-card-container">
                  <div class="emp-bubble" [style.border-color]="getDeptColor(node) + '30'">
                    <div class="emp-bubble-avatar" [style.background-color]="getDeptColor(node)">
                      {{ (emp.first_name?.[0] || '') + (emp.father_name?.[0] || '') | uppercase }}
                    </div>
                    <span class="emp-bubble-name">{{ emp.first_name }} {{ emp.father_name }}</span>
                    @if (emp.branch?.name && !node.branchName) {
                      <span class="emp-bubble-branch">{{ emp.branch.short_name || emp.branch.name }}</span>
                    }
                  </div>
                </div>
              </div>
            }
            <!-- Child position nodes -->
            @for (child of node.children; track (child.branchId || '') + child.position.id; let i = $index) {
              <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: child, idx: node.employees.length + i }"></ng-container>
            }
          </div>
        }
      </div>
    </ng-template>

    <!-- ========== MOBILE: Vertical tree node ========== -->
    <ng-template #mobileNodeTpl let-node let-depth="depth" let-isLast="isLast" let-idx="idx">
      <div class="m-node anim-slide-up" [style.animation-delay]="(idx || 0) * 40 + 'ms'">
        <div class="m-card" [style.margin-left.px]="depth * 24" [style.border-left-color]="getDeptColor(node)"
             (click)="toggleNode(nodeKey(node))">
          <div class="m-card-avatar" [style.background]="getGradient(node)">
            {{ getInitials(node) }}
          </div>
          <div class="m-card-body">
            <span class="m-card-name">{{ getLeader(node) }}</span>
            <span class="m-card-role">{{ node.position.name }}</span>
            @if (node.branchName) {
              <span class="m-card-branch"><i class="pi pi-map-marker"></i> {{ node.branchName }}</span>
            }
          </div>
          @if (hasExpandableContent(node)) {
            <span class="m-card-toggle" [class.open]="isExpanded(nodeKey(node))">
              <i class="pi pi-chevron-down"></i>
              <span>{{ node.children.length + node.employees.length }}</span>
            </span>
          }
        </div>
        @if (isExpanded(nodeKey(node))) {
          <!-- Employee cards -->
          @for (emp of node.employees; track emp.id; let i = $index) {
            <div class="m-emp-card anim-slide-up" [style.margin-left.px]="(depth + 1) * 24" [style.animation-delay]="i * 30 + 'ms'">
              <div class="m-emp-avatar" [style.background-color]="getDeptColor(node)">
                {{ (emp.first_name?.[0] || '') + (emp.father_name?.[0] || '') | uppercase }}
              </div>
              <span class="m-emp-name">{{ emp.first_name }} {{ emp.father_name }}</span>
              @if (emp.branch?.name && !node.branchName) {
                <span class="m-emp-branch">{{ emp.branch.short_name || emp.branch.name }}</span>
              }
            </div>
          }
          <!-- Child position nodes -->
          @for (child of node.children; track (child.branchId || '') + child.position.id; let last = $last; let i = $index) {
            <ng-container *ngTemplateOutlet="mobileNodeTpl; context: { $implicit: child, depth: depth + 1, isLast: last, idx: node.employees.length + i }"></ng-container>
          }
        }
      </div>
    </ng-template>

    <!-- ========== PAGE ========== -->
    <div class="org-page">
    @if (device.isDesktop()) {
      <!-- DESKTOP -->
      <div class="org-desktop">
        <div class="org-header">
          <div>
            <h2 class="org-title">Organigrama</h2>
            <p class="org-subtitle">Estructura organizacional por posiciones</p>
          </div>
          <div class="org-tabs">
            <button class="otab" [class.active]="activeTab() === 'view'" (click)="activeTab.set('view')">
              <i class="pi pi-sitemap"></i> Vista
            </button>
            <button class="otab" [class.active]="activeTab() === 'config'" (click)="activeTab.set('config')">
              <i class="pi pi-cog"></i> Configurar
            </button>
          </div>
        </div>

        @if (activeTab() === 'view') {
          <div class="org-view anim-fade">
            @if (rootNodes().length > 0) {
              <div class="org-canvas">
                <div class="org-tree-root">
                  @for (root of rootNodes(); track (root.branchId || '') + root.position.id; let i = $index) {
                    <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: root, idx: i }"></ng-container>
                  }
                </div>
              </div>
            } @else {
              <div class="org-empty">
                <div class="org-empty-icon"><i class="pi pi-sitemap"></i></div>
                <p class="org-empty-title">Sin estructura configurada</p>
                <p class="org-empty-sub">Ve a "Configurar" para armar el organigrama</p>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'config') {
          <div class="org-config anim-fade">
            <div class="config-actions">
              <p-button label="Restablecer" (click)="loadStructure()" icon="pi pi-refresh" severity="secondary" rounded />
              <p-button label="Guardar" (click)="saveStructure()" icon="pi pi-save" [disabled]="!hasChanges() || saving()" [loading]="saving()" rounded />
            </div>
            <div class="config-grid">
              @for (entry of configEntries(); track entry.position.id; let i = $index) {
                <div class="config-card anim-pop" [style.animation-delay]="i * 40 + 'ms'">
                  <div class="config-card-top">
                    <div class="config-card-color" [style.background-color]="getDeptColorByPosition(entry.position)"></div>
                    <div class="config-card-info">
                      <h4>{{ entry.position.name }}</h4>
                      <p>{{ entry.position.department?.name || 'Sin departamento' }}</p>
                    </div>
                    <span class="config-card-badge">{{ entry.employeeCount }}</span>
                  </div>
                  <label>Reporta a:</label>
                  <p-select
                    [options]="parentOptionsMap().get(entry.position.id) ?? []"
                    optionLabel="name"
                    optionValue="id"
                    [ngModel]="entry.parentId"
                    (ngModelChange)="setParent(entry.position.id, $event)"
                    [showClear]="true"
                    placeholder="Sin superior (raiz)"
                    appendTo="body"
                    [filter]="true"
                    filterBy="name"
                    class="w-full"
                    styleClass="w-full"
                  />
                </div>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <!-- MOBILE -->
      <div class="org-mobile">
        <header class="org-mob-header">
          <h2>Organigrama</h2>
          <div class="org-mob-tabs">
            <button [class.active]="activeTab() === 'view'" (click)="activeTab.set('view')">
              <i class="pi pi-sitemap"></i> Vista
            </button>
            <button [class.active]="activeTab() === 'config'" (click)="activeTab.set('config')">
              <i class="pi pi-cog"></i> Config
            </button>
          </div>
        </header>
        <main class="org-mob-main">
          @if (activeTab() === 'view') {
            @if (rootNodes().length > 0) {
              <div class="m-tree-area">
                @for (root of rootNodes(); track (root.branchId || '') + root.position.id; let last = $last; let i = $index) {
                  <ng-container *ngTemplateOutlet="mobileNodeTpl; context: { $implicit: root, depth: 0, isLast: last, idx: i }"></ng-container>
                }
              </div>
            } @else {
              <div class="org-empty" style="padding:3rem 1rem;">
                <div class="org-empty-icon"><i class="pi pi-sitemap"></i></div>
                <p class="org-empty-title">Sin estructura</p>
                <p class="org-empty-sub">Ve a Config para armar el organigrama</p>
              </div>
            }
          } @else {
            <div class="m-config">
              <div class="m-config-actions">
                <p-button icon="pi pi-refresh" severity="secondary" rounded size="small" (click)="loadStructure()" pTooltip="Restablecer" />
                <p-button icon="pi pi-save" [disabled]="!hasChanges() || saving()" [loading]="saving()" rounded size="small" (click)="saveStructure()" pTooltip="Guardar" />
              </div>
              @for (entry of configEntries(); track entry.position.id; let i = $index) {
                <div class="m-config-card anim-slide-up" [style.animation-delay]="i * 40 + 'ms'">
                  <div class="m-config-top">
                    <div class="m-config-dot" [style.background-color]="getDeptColorByPosition(entry.position)"></div>
                    <div class="m-config-info">
                      <p class="m-config-name">{{ entry.position.name }}</p>
                      <p class="m-config-dept">{{ entry.position.department?.name || 'Sin depto.' }}</p>
                    </div>
                    <span class="m-config-badge">{{ entry.employeeCount }}</span>
                  </div>
                  <label>Reporta a:</label>
                  <p-select
                    [options]="parentOptionsMap().get(entry.position.id) ?? []"
                    optionLabel="name"
                    optionValue="id"
                    [ngModel]="entry.parentId"
                    (ngModelChange)="setParent(entry.position.id, $event)"
                    [showClear]="true"
                    placeholder="Sin superior (raiz)"
                    appendTo="body"
                    [filter]="true"
                    filterBy="name"
                    class="w-full"
                    styleClass="w-full"
                  />
                </div>
              }
            </div>
          }
        </main>
      </div>
    }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }

    /* ===== ANIMATIONS ===== */
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.85) translateY(12px); }
      60% { transform: scale(1.03) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.3); }
      50% { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0); }
    }
    .anim-pop { animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .anim-slide { animation: slideIn 0.35s ease both; }
    .anim-slide-up { animation: slideUp 0.4s ease both; }
    .anim-fade { animation: fadeIn 0.3s ease both; }

    /* ===== DESKTOP LAYOUT ===== */
    .org-page { width: 100%; }
    .org-desktop {
      background: linear-gradient(135deg, rgba(17,24,39,0.97), rgba(30,41,59,0.95));
      border: 1px solid rgba(100,116,139,0.25);
      border-radius: 16px; overflow: hidden;
    }
    .org-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid rgba(100,116,139,0.2);
    }
    .org-title { margin: 0; font-size: 1.25rem; font-weight: 800; color: #f1f5f9; }
    .org-subtitle { margin: 4px 0 0; font-size: 0.8rem; color: #94a3b8; }
    .org-tabs { display: flex; gap: 4px; background: rgba(30,41,59,0.6); border-radius: 10px; padding: 3px; }
    .otab {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 18px; border: none; border-radius: 8px;
      background: transparent; color: #94a3b8;
      font-size: 0.82rem; font-weight: 600; cursor: pointer;
      transition: all 0.25s ease;
    }
    .otab:hover { color: #e2e8f0; background: rgba(255,255,255,0.06); }
    .otab.active {
      color: #fbbf24; background: rgba(251,191,36,0.12);
      box-shadow: 0 0 12px rgba(251,191,36,0.08);
    }
    .otab i { font-size: 0.85rem; }

    /* ===== VIEW: Canvas area ===== */
    .org-view { padding: 12px; }
    .org-canvas {
      background: linear-gradient(160deg, #faf7f2 0%, #f0ebe3 40%, #e8e2d8 100%);
      border-radius: 14px; padding: 16px 12px 24px;
      min-height: 400px; overflow-x: auto; overflow-y: visible;
      box-shadow: inset 0 2px 20px rgba(0,0,0,0.04);
    }
    .org-tree-root {
      display: flex; justify-content: center; gap: 0.6rem; min-width: fit-content;
    }

    /* Empty state */
    .org-empty { text-align: center; padding: 5rem 2rem; }
    .org-empty-icon {
      width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 16px;
      background: rgba(100,116,139,0.08);
      display: flex; align-items: center; justify-content: center;
    }
    .org-empty-icon i { font-size: 2rem; color: #64748b; }
    .org-empty-title { font-size: 1rem; font-weight: 700; color: #94a3b8; margin: 0 0 6px; }
    .org-empty-sub { font-size: 0.82rem; color: #64748b; margin: 0; }

    /* ===== TREE NODE (Desktop) ===== */
    .tree-node-wrapper {
      display: flex; flex-direction: column; align-items: center; position: relative;
    }
    .node-card-container {
      display: flex; flex-direction: column; align-items: center; position: relative;
    }
    .has-children > .node-card-container::after {
      content: ''; position: absolute; bottom: 0; left: 50%;
      transform: translateX(-50%) translateY(100%);
      width: 1.5px; height: 18px; background: #c0b8ac;
    }

    /* Connectors */
    .tree-children-row {
      display: flex; justify-content: center; gap: 0.5rem;
      padding-top: 18px; position: relative;
    }
    .tree-children-row > .tree-node-wrapper::before {
      content: ''; position: absolute; top: -18px; left: 50%;
      transform: translateX(-50%); width: 1.5px; height: 18px; background: #c0b8ac;
    }
    .tree-children-row > .tree-node-wrapper:not(:only-child)::after {
      content: ''; position: absolute; top: -18px; height: 1.5px; background: #c0b8ac;
    }
    .tree-children-row > .tree-node-wrapper:first-child:not(:only-child)::after {
      left: 50%; width: calc(50% + 0.25rem);
    }
    .tree-children-row > .tree-node-wrapper:last-child:not(:only-child)::after {
      left: -0.25rem; width: calc(50% + 0.25rem);
    }
    .tree-children-row > .tree-node-wrapper:not(:first-child):not(:last-child)::after {
      left: -0.25rem; right: -0.25rem; width: calc(100% + 0.5rem);
    }

    /* ===== BUBBLE CARD ===== */
    .node-bubble {
      display: flex; flex-direction: column; align-items: center;
      width: 120px; padding: 10px 6px 8px; border-radius: 14px;
      background: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03);
      border: 1px solid rgba(0,0,0,0.04);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
      cursor: default; position: relative;
    }
    .node-bubble:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    }
    .node-bubble-branch {
      border: 1.5px solid rgba(37, 99, 235, 0.18);
    }
    .bubble-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 0.7rem;
      margin-bottom: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
      transition: transform 0.25s;
    }
    .node-bubble:hover .bubble-avatar { transform: scale(1.08); }
    .bubble-name {
      font-size: 0.62rem; font-weight: 700; color: #1e293b;
      text-align: center; line-height: 1.2; margin-bottom: 1px;
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .bubble-role {
      font-size: 0.55rem; font-weight: 500; color: #64748b;
      text-align: center; line-height: 1.2;
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .bubble-dept {
      font-size: 0.5rem; color: #94a3b8; margin-top: 2px;
    }
    .bubble-branch {
      display: inline-flex; align-items: center; gap: 2px;
      margin-top: 3px; padding: 1px 6px; border-radius: 10px;
      background: #eff6ff;
      color: #1d4ed8; font-size: 0.5rem; font-weight: 700;
    }
    .bubble-branch i { font-size: 0.45rem; }

    /* People pills below bubble */
    .node-people {
      display: flex; flex-direction: column; align-items: center;
      gap: 2px; margin-top: 4px;
    }
    .person-pill {
      display: flex; align-items: center; gap: 3px;
      background: #fff; border: 1px solid #e9e3db; border-radius: 10px;
      padding: 1px 6px 1px 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      transition: transform 0.2s;
    }
    .person-pill:hover { transform: translateX(2px); }
    .pill-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
    /* Toggle expand/collapse */
    .bubble-toggle {
      display: flex; align-items: center; gap: 3px;
      margin-top: 5px; padding: 2px 8px; border-radius: 10px;
      background: #f1f5f9; color: #64748b;
      font-size: 0.5rem; font-weight: 700;
      transition: all 0.25s;
    }
    .bubble-toggle i {
      font-size: 0.5rem;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .bubble-toggle.open { background: #fef3c7; color: #92400e; }
    .bubble-toggle.open i { transform: rotate(180deg); }
    .toggle-count { font-size: 0.48rem; }
    .node-bubble { cursor: pointer; }

    /* Employee bubble (individual person) */
    .emp-bubble {
      display: flex; flex-direction: column; align-items: center;
      width: 100px; padding: 8px 6px 6px; border-radius: 12px;
      background: #fff; border: 1.5px solid #e2e8f0;
      box-shadow: 0 1px 6px rgba(0,0,0,0.04);
      transition: transform 0.25s, box-shadow 0.25s;
    }
    .emp-bubble:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .emp-bubble-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 0.6rem;
      margin-bottom: 4px;
    }
    .emp-bubble-name {
      font-size: 0.55rem; font-weight: 600; color: #334155;
      text-align: center; line-height: 1.2;
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .emp-bubble-branch {
      font-size: 0.45rem; font-weight: 700; color: #2563eb;
      background: #eff6ff; padding: 0 4px; border-radius: 6px; margin-top: 2px;
    }

    /* ===== CONFIG TAB (Desktop) ===== */
    .org-config { padding: 24px; }
    .config-actions { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 20px; }
    .config-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 14px;
    }
    .config-card {
      background: rgba(30, 41, 59, 0.6); border-radius: 14px;
      padding: 16px; border: 1px solid rgba(100,116,139,0.2);
      transition: border-color 0.25s, box-shadow 0.25s;
    }
    .config-card:hover {
      border-color: rgba(251,191,36,0.3);
      box-shadow: 0 0 20px rgba(251,191,36,0.05);
    }
    .config-card-top {
      display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
    }
    .config-card-color {
      width: 6px; height: 36px; border-radius: 3px; flex-shrink: 0;
    }
    .config-card-info { flex: 1; min-width: 0; }
    .config-card-info h4 {
      margin: 0; font-size: 0.88rem; font-weight: 700; color: #f1f5f9;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .config-card-info p { margin: 2px 0 0; font-size: 0.72rem; color: #94a3b8; }
    .config-card-badge {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: rgba(251,191,36,0.12); color: #fbbf24;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 800;
    }
    .config-card label {
      display: block; font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px;
    }

    /* ===== MOBILE ===== */
    .org-mobile { display: flex; flex-direction: column; min-height: 80vh; }
    .org-mob-header {
      position: sticky; top: 0; z-index: 20;
      background: rgba(15, 23, 42, 0.97); backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(100,116,139,0.2);
      padding: 14px 16px 0;
    }
    .org-mob-header h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
    .org-mob-tabs {
      display: flex; gap: 0; margin-top: 12px;
    }
    .org-mob-tabs button {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 0; border: none; background: none;
      border-bottom: 2.5px solid transparent;
      color: #94a3b8; font-size: 0.82rem; font-weight: 600;
      cursor: pointer; transition: all 0.25s;
    }
    .org-mob-tabs button.active { color: #fbbf24; border-bottom-color: #fbbf24; }
    .org-mob-tabs button i { font-size: 0.85rem; }
    .org-mob-main {
      flex: 1; overflow-y: auto; padding: 14px;
      -webkit-overflow-scrolling: touch;
    }

    /* Mobile Tree */
    .m-tree-area {
      background: linear-gradient(160deg, #faf7f2, #f0ebe3);
      border-radius: 14px; padding: 16px 10px 24px;
    }
    .m-node { position: relative; }
    .m-connector {
      position: absolute; top: 0; bottom: 0;
    }
    .m-vline {
      position: absolute; left: 0; top: -4px; bottom: 0;
      width: 2px; background: #ccc5b9;
    }
    .m-vline.last { bottom: 50%; }
    .m-hline {
      position: absolute; top: 50%; left: 0;
      width: 14px; height: 2px; background: #ccc5b9;
      transform: translateY(-50%);
    }
    .m-card {
      display: flex; align-items: center; gap: 10px;
      background: #fff; border-radius: 14px;
      padding: 10px 12px; margin: 3px 0;
      border-left: 3.5px solid;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
    }
    .m-card:active {
      transform: scale(0.97);
    }
    .m-card-avatar {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 0.75rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .m-card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .m-card-name {
      font-size: 0.82rem; font-weight: 700; color: #1e293b;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .m-card-role {
      font-size: 0.68rem; color: #64748b;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .m-card-branch {
      display: inline-flex; align-items: center; gap: 3px; width: fit-content;
      font-size: 0.62rem; font-weight: 700; color: #1d4ed8;
      background: #eff6ff; padding: 1px 7px; border-radius: 10px;
      margin-top: 2px;
    }
    .m-card-branch i { font-size: 0.5rem; }
    .m-card-toggle {
      flex-shrink: 0; display: flex; align-items: center; gap: 3px;
      padding: 3px 8px; border-radius: 10px;
      background: #f1f5f9; color: #64748b;
      font-size: 0.6rem; font-weight: 700;
      transition: all 0.25s;
    }
    .m-card-toggle i {
      font-size: 0.55rem;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .m-card-toggle.open { background: #fef3c7; color: #92400e; }
    .m-card-toggle.open i { transform: rotate(180deg); }
    .m-card { cursor: pointer; }

    /* Mobile employee card */
    .m-emp-card {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border-radius: 10px;
      padding: 7px 10px; margin: 2px 0;
      border-left: 2px solid #e2e8f0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    }
    .m-emp-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 0.55rem;
    }
    .m-emp-name {
      font-size: 0.72rem; font-weight: 600; color: #334155;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .m-emp-branch {
      font-size: 0.55rem; font-weight: 700; color: #2563eb;
      background: #eff6ff; padding: 1px 5px; border-radius: 6px;
      margin-left: auto; flex-shrink: 0;
    }

    /* Mobile Config */
    .m-config { display: flex; flex-direction: column; gap: 10px; padding-bottom: 24px; }
    .m-config-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .m-config-card {
      background: rgba(30,41,59,0.7); border-radius: 14px;
      padding: 14px; border: 1px solid rgba(100,116,139,0.2);
    }
    .m-config-top {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .m-config-dot { width: 5px; height: 32px; border-radius: 3px; flex-shrink: 0; }
    .m-config-info { flex: 1; min-width: 0; }
    .m-config-name { margin: 0; font-size: 0.82rem; font-weight: 700; color: #f1f5f9; }
    .m-config-dept { margin: 2px 0 0; font-size: 0.68rem; color: #94a3b8; }
    .m-config-badge {
      width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
      background: rgba(251,191,36,0.12); color: #fbbf24;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.65rem; font-weight: 800;
    }
    .m-config-card label { display: block; font-size: 0.68rem; color: #94a3b8; margin-bottom: 6px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganigramaComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private positionsStore = inject(PositionsStore);
  private employeesStore = inject(EmployeesStore);
  protected device = inject(DeviceService);
  private logger = inject(LoggerService);

  // === Writable signals ===
  activeTab = signal<'view' | 'config'>('view');
  orgStructure = signal<Map<string, string | null>>(new Map());
  originalStructure = signal<Map<string, string | null>>(new Map());
  saving = signal(false);
  expandedNodes = signal<Set<string>>(new Set());

  // === Computed: positions & employees from root stores ===
  private availablePositions = computed(() => this.positionsStore.entities());
  private activeEmployees = computed(() =>
    this.employeesStore.entities().filter(e => e.is_active)
  );

  // === Computed: config entries (one per position) ===
  configEntries = computed<ConfigEntry[]>(() => {
    const positions = this.availablePositions();
    const structure = this.orgStructure();
    const employees = this.activeEmployees();
    return positions.map(p => ({
      position: p,
      parentId: structure.get(p.id) ?? null,
      employeeCount: employees.filter(e => e.position_id === p.id).length,
    }));
  });

  // === Computed: valid parent options per position (excludes self + descendants) ===
  parentOptionsMap = computed<Map<string, Position[]>>(() => {
    const positions = this.availablePositions();
    const structure = this.orgStructure();
    const result = new Map<string, Position[]>();
    for (const pos of positions) {
      const excluded = this.getDescendants(pos.id, structure);
      excluded.add(pos.id);
      result.set(pos.id, positions.filter(p => !excluded.has(p.id)));
    }
    return result;
  });

  // === Computed: dirty check ===
  hasChanges = computed(() => {
    const current = this.orgStructure();
    const original = this.originalStructure();
    if (current.size !== original.size) return true;
    for (const [key, value] of current) {
      if (original.get(key) !== value) return true;
    }
    for (const key of original.keys()) {
      if (!current.has(key)) return true;
    }
    return false;
  });

  // === Computed: tree for view tab ===
  rootNodes = computed<OrgNode[]>(() => {
    const structure = this.orgStructure();
    const positions = this.availablePositions();
    const employees = this.activeEmployees();
    if (structure.size === 0) return [];

    const involvedIds = new Set<string>();
    for (const [posId, parentId] of structure) {
      involvedIds.add(posId);
      if (parentId) involvedIds.add(parentId);
    }

    const posMap = new Map(positions.map(p => [p.id, p]));
    const childrenMap = new Map<string, string[]>();
    for (const [posId, parentId] of structure) {
      if (parentId) {
        const arr = childrenMap.get(parentId) || [];
        arr.push(posId);
        childrenMap.set(parentId, arr);
      }
    }

    const rootIds = [...involvedIds].filter(id => {
      const parent = structure.get(id);
      return parent === null || parent === undefined;
    });

    // Build basic position tree
    const buildNode = (posId: string, depth: number): OrgNode | null => {
      if (depth > 50) return null;
      const position = posMap.get(posId);
      if (!position) return null;
      const posEmployees = employees.filter(e => e.position_id === posId);
      const childIds = childrenMap.get(posId) || [];
      const children = childIds
        .map(cid => buildNode(cid, depth + 1))
        .filter((n): n is OrgNode => n !== null);
      return { position, employees: posEmployees, children };
    };

    // Split nodes by branch when a position has employees in multiple branches.
    // Once split, the branch filter cascades to all descendants.
    const splitByBranch = (node: OrgNode, branchFilter?: string): OrgNode[] => {
      const filteredEmps = branchFilter
        ? node.employees.filter(e => e.branch_id === branchFilter)
        : node.employees;

      // Group employees by branch
      const branchGroups = new Map<string, { name: string; emps: Employee[] }>();
      for (const emp of filteredEmps) {
        const bid = emp.branch_id || '_none';
        if (!branchGroups.has(bid)) {
          branchGroups.set(bid, {
            name: emp.branch?.short_name || emp.branch?.name || '',
            emps: [],
          });
        }
        branchGroups.get(bid)!.emps.push(emp);
      }

      const shouldSplit = !branchFilter && branchGroups.size > 1;

      if (shouldSplit) {
        // Multiple branches → one node per branch, cascade filter to children
        return [...branchGroups.entries()].map(([bid, group]) => ({
          position: node.position,
          employees: group.emps,
          children: node.children.flatMap(c => splitByBranch(c, bid)),
          branchId: bid,
          branchName: group.name,
        })).filter(n => n.employees.length > 0 || n.children.length > 0);
      }

      // No split needed - recurse children with same filter
      const childNodes = node.children.flatMap(c => splitByBranch(c, branchFilter));

      // If filtering and this node has no employees and no children, skip it
      if (branchFilter && filteredEmps.length === 0 && childNodes.length === 0) {
        return [];
      }

      const branchName = branchFilter && branchGroups.size > 0
        ? branchGroups.values().next().value!.name
        : undefined;

      return [{
        position: node.position,
        employees: filteredEmps,
        children: childNodes,
        branchId: branchFilter,
        branchName,
      }];
    };

    const rawRoots = rootIds
      .map(id => buildNode(id, 0))
      .filter((n): n is OrgNode => n !== null);

    return rawRoots.flatMap(root => splitByBranch(root));
  });

  // === Helper: get all descendants (prevents circular parent selection) ===
  private getDescendants(posId: string, structure: Map<string, string | null>): Set<string> {
    const descendants = new Set<string>();
    const queue: string[] = [];
    for (const [childId, parentId] of structure) {
      if (parentId === posId) queue.push(childId);
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (descendants.has(current)) continue;
      descendants.add(current);
      for (const [childId, parentId] of structure) {
        if (parentId === current && !descendants.has(childId)) queue.push(childId);
      }
    }
    return descendants;
  }

  // === Config: set parent for a position ===
  setParent(positionId: string, parentId: string | null): void {
    const newStructure = new Map(this.orgStructure());
    if (parentId === null || parentId === undefined) {
      newStructure.delete(positionId);
    } else {
      newStructure.set(positionId, parentId);
    }
    this.orgStructure.set(newStructure);
  }

  // === Expand/collapse helpers ===
  nodeKey(node: OrgNode): string {
    return (node.branchId || '') + '_' + node.position.id;
  }

  hasExpandableContent(node: OrgNode): boolean {
    return node.children.length > 0 || node.employees.length > 0;
  }

  isExpanded(key: string): boolean {
    return this.expandedNodes().has(key);
  }

  toggleNode(key: string): void {
    const current = new Set(this.expandedNodes());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.expandedNodes.set(current);
  }

  // === View helpers ===
  private readonly colorPalette = [
    '#0d9488', '#7c3aed', '#2563eb', '#d97706',
    '#db2777', '#059669', '#0891b2', '#dc2626',
  ];
  private deptColorMap: Record<string, string> = {};
  private colorIdx = 0;

  getDeptColor(node: OrgNode): string {
    const dept = (node.position.department?.name || '').toLowerCase();
    if (dept.includes('direc') || dept.includes('general') || dept.includes('ceo') || dept.includes('coo')) return '#0d9488';
    if (dept.includes('comerci') || dept.includes('vent')) return '#7c3aed';
    if (dept.includes('mercad') || dept.includes('market')) return '#2563eb';
    if (dept.includes('admin') || dept.includes('finanz') || dept.includes('contab')) return '#d97706';
    if (dept.includes('fabric') || dept.includes('produc')) return '#db2777';
    if (dept.includes('rrhh') || dept.includes('human') || dept.includes('recur') || dept.includes('planilla')) return '#059669';
    if (dept.includes('it') || dept.includes('tecno') || dept.includes('sistema')) return '#0891b2';
    if (dept.includes('oper') || dept.includes('logist') || dept.includes('distri') || dept.includes('compra')) return '#7e22ce';
    if (dept.includes('tienda') || dept.includes('sucursal')) return '#e11d48';
    const key = dept || node.position.name.toLowerCase();
    if (!this.deptColorMap[key]) {
      this.deptColorMap[key] = this.colorPalette[this.colorIdx % this.colorPalette.length];
      this.colorIdx++;
    }
    return this.deptColorMap[key];
  }

  getGradient(node: OrgNode): string {
    const c = this.getDeptColor(node);
    return `linear-gradient(135deg, ${c}18, ${c}08)`;
  }

  getDeptColorByPosition(pos: Position): string {
    return this.getDeptColor({ position: pos, employees: [], children: [] });
  }

  getInitials(node: OrgNode): string {
    if (node.employees.length > 0) {
      const e = node.employees[0];
      return ((e.first_name?.[0] || '') + (e.father_name?.[0] || '')).toUpperCase() || '?';
    }
    return node.position.name.split(' ').filter(w => w).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  getLeader(node: OrgNode): string {
    if (node.employees.length > 0) {
      const e = node.employees[0];
      return `${e.first_name || ''} ${e.father_name || ''}`.trim();
    }
    return node.position.name;
  }

  // === Data loading ===
  loadStructure(): void {
    const url = this.apiUrl.build('rest/v1/org_structure', {
      select: 'position_id,parent_position_id,sort_order',
    });
    this.http.get<OrgStructureRow[]>(url).subscribe({
      next: (data) => {
        const structure = new Map<string, string | null>();
        data.forEach(row => structure.set(row.position_id, row.parent_position_id));
        this.orgStructure.set(structure);
        this.originalStructure.set(new Map(structure));
      },
      error: (err) => {
        this.logger.error('[Organigrama] Error loading:', err);
        this.orgStructure.set(new Map());
        this.originalStructure.set(new Map());
      },
    });
  }

  // === Data saving (delete-all + bulk insert) ===
  async saveStructure(): Promise<void> {
    this.saving.set(true);
    const structure = this.orgStructure();
    try {
      await firstValueFrom(
        this.http.delete(this.apiUrl.build('rest/v1/org_structure'), {
          params: { position_id: 'not.is.null' },
        })
      );
      const records: OrgStructureRow[] = [];
      for (const [positionId, parentId] of structure) {
        records.push({ position_id: positionId, parent_position_id: parentId, sort_order: 0 });
      }
      if (records.length > 0) {
        await firstValueFrom(
          this.http.post(this.apiUrl.build('rest/v1/org_structure'), records)
        );
      }
      this.originalStructure.set(new Map(structure));
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Estructura guardada correctamente' });
    } catch (err: any) {
      this.logger.error('[Organigrama] Error saving:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar' });
    } finally {
      this.saving.set(false);
    }
  }

  constructor() {
    this.positionsStore.fetchItems();
    this.employeesStore.fetchItems();
    this.loadStructure();
  }
}
