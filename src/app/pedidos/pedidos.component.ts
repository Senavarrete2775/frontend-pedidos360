import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { environment } from '../../environments/environment';

interface Pedido {
  id: number;
  cliente: string;
  producto: string;
  monto: number;
  estado: string;
  fecha: string;
}

interface ColaInfo {
  nombre: string;
  mensajes: number;
  consumidores: number;
  existe: boolean;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './pedidos.component.css',
  template: `
    <div class="dashboard-wrapper">
      <header class="dashboard-header">
        <div class="header-content">
          <div class="header-titles">
            <div class="header-badge">
              <span class="badge-dot"></span> Event-Driven Architecture &bull; RabbitMQ Microservices
            </div>
            <h1 class="header-title">Panel de Control & Mensajería Pedidos360</h1>
            <p class="header-subtitle">
              Gestión desacoplada de pedidos asíncronos con confirmación ACK manual, Dead Letter Queue (DLQ) y administración dinámica.
            </p>
          </div>
          <div class="header-user-card" *ngIf="account">
            <div class="user-avatar">{{ getInitials(account.name || account.username) }}</div>
            <div class="user-info">
              <span class="user-name">{{ account.name || account.username }}</span>
              <span class="user-badge" [class.badge-admin]="esAdmin()">
                {{ esAdmin() ? 'Rol Administrador' : 'Usuario Estándar' }}
              </span>
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon icon-orders">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Total Pedidos</span>
              <span class="kpi-value">{{ pedidos.length }}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon icon-money">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Facturado Válido</span>
              <span class="kpi-value">\${{ calcularTotalFacturado() | number }}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon icon-amqp">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Exchange RabbitMQ</span>
              <span class="kpi-value text-mono">pedidos.exchange</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon icon-services">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">Colas Activas</span>
              <span class="kpi-value font-emerald">{{ colasRabbit.length }} en Broker</span>
            </div>
          </div>
        </div>
      </header>

      <div *ngIf="mensajeEstado" class="notification-banner" [class.banner-error]="tipoMensaje === 'error'" [class.banner-success]="tipoMensaje === 'success'">
        <div class="banner-icon">
          <svg *ngIf="tipoMensaje === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <svg *ngIf="tipoMensaje === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div class="banner-content">
          <strong>{{ tipoMensaje === 'error' ? 'Aviso del Sistema:' : 'Operación Exitosa:' }}</strong>
          <span>{{ mensajeEstado }}</span>
        </div>
        <button class="banner-close" (click)="mensajeEstado = ''">&times;</button>
      </div>

      <nav class="tabs-nav">
        <button class="tab-btn" [class.tab-active]="activeTab === 'pedidos'" (click)="activeTab = 'pedidos'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
          </svg>
          Gestión de Pedidos & Productor
        </button>

        <button class="tab-btn" [class.tab-active]="activeTab === 'rabbitmq'" (click)="cambiarTabRabbitmq()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 11a9 9 0 0 1 9 9"></path>
            <path d="M4 4a16 16 0 0 1 16 16"></path>
            <circle cx="5" cy="19" r="1"></circle>
          </svg>
          Consola RabbitMQ & Admin
          <span class="status-dot-mini" [class.dot-online]="adminOnline === true" [class.dot-offline]="adminOnline === false"></span>
        </button>

        <button class="tab-btn" [class.tab-active]="activeTab === 'seguridad'" (click)="activeTab = 'seguridad'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Seguridad IDaaS (Azure AD JWT)
        </button>
      </nav>

      <div *ngIf="activeTab === 'pedidos'" class="tab-content fade-in">
        <section class="card form-card">
          <div class="card-header-styled">
            <div class="icon-bubble bubble-emerald">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div>
              <h2 class="card-title">Registrar Nuevo Pedido (Productor RabbitMQ)</h2>
              <p class="card-desc">Guarda el pedido en base de datos y publica un evento asíncrono a la cola de RabbitMQ.</p>
            </div>
          </div>

          <div class="quick-presets">
            <span class="preset-label">Acciones de prueba rápida:</span>
            <button type="button" class="preset-chip chip-success" (click)="cargarPresetValido()">
              ✨ Cargar Pedido Válido (Flujo Exitoso)
            </button>
            <button type="button" class="preset-chip chip-warning" (click)="simularFalloDLQDirecto()">
              ⚡ Simular Fallo Asíncrono (Demostración DLQ)
            </button>
          </div>

          <form (ngSubmit)="crearPedido()" class="order-form">
            <div class="form-row">
              <div class="input-group">
                <label class="input-label">Cliente</label>
                <div class="input-wrapper">
                  <svg class="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input type="text" [(ngModel)]="nuevoCliente" name="nuevoCliente" required placeholder="Nombre del cliente" class="styled-input" />
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Producto / Servicio</label>
                <div class="input-wrapper">
                  <svg class="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <input type="text" [(ngModel)]="nuevoProducto" name="nuevoProducto" required placeholder="Ej: Suscripción Cloud Pro" class="styled-input" />
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Monto (CLP > 0)</label>
                <div class="input-wrapper">
                  <span class="currency-prefix">$</span>
                  <input type="number" min="1" [(ngModel)]="nuevoMonto" name="nuevoMonto" required placeholder="Monto mayor a 0" class="styled-input pl-currency" />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-cta btn-cta-primary" [disabled]="loadingPedido">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>{{ loadingPedido ? 'Registrando...' : 'Crear Pedido & Emitir Evento AMQP' }}</span>
              </button>
            </div>
          </form>
        </section>

        <section class="card table-card">
          <div class="table-header-bar">
            <div>
              <h2 class="card-title">Listado de Pedidos Persistidos</h2>
              <p class="card-desc">Sincronizados en tiempo real con la Base de Datos ({{ pedidosFiltrados().length }} pedidos)</p>
            </div>

            <div class="table-controls">
              <div class="search-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" [(ngModel)]="filtroTexto" (input)="filtrarTabla()" placeholder="Buscar por cliente o producto..." class="search-input" />
              </div>
              <button class="btn-refresh" (click)="cargarPedidos()" title="Recargar pedidos">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Actualizar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Producto / Servicio</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha de Registro</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of pedidosFiltrados()">
                  <td>
                    <span class="id-pill">#{{ p.id }}</span>
                  </td>
                  <td>
                    <div class="cell-client">
                      <div class="client-avatar">{{ getInitials(p.cliente) }}</div>
                      <strong>{{ p.cliente }}</strong>
                    </div>
                  </td>
                  <td>{{ p.producto }}</td>
                  <td>
                    <span class="cell-amount" [class.text-danger]="p.monto <= 0">\${{ p.monto | number }}</span>
                  </td>
                  <td>
                    <span class="badge-status" [class]="'badge-' + p.estado.toLowerCase()">
                      <span class="status-indicator"></span>
                      {{ p.estado }}
                    </span>
                  </td>
                  <td class="cell-date">
                    {{ p.fecha | date:'dd/MM/yyyy &bull; HH:mm' }}
                  </td>
                  <td style="text-align: right;">
                    <button class="btn-delete-row" (click)="eliminarPedido(p.id)" title="Eliminar pedido de la base de datos">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>

                <tr *ngIf="pedidosFiltrados().length === 0">
                  <td colspan="7" class="empty-table-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 12h8"></path>
                    </svg>
                    <p>No se encontraron pedidos registrados coincidentes.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div *ngIf="activeTab === 'rabbitmq'" class="tab-content fade-in">
        <section class="card mb-20">
          <div class="card-header-styled">
            <div class="icon-bubble bubble-purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
            </div>
            <div>
              <h2 class="card-title">Malla de Microservicios Cloud Native</h2>
              <p class="card-desc">Estado y roles de cada microservicio en la topología distribuida.</p>
            </div>
          </div>

          <div class="services-grid">
            <div class="service-chip-card">
              <div class="service-top">
                <span class="service-role">Core & Productor</span>
                <span class="ping-pill ping-green">Puerto 8080</span>
              </div>
              <h3 class="service-name">backend-pedidos360</h3>
              <p class="service-desc">Persistencia JPA, Autenticación Azure AD y emisor de eventos AMQP.</p>
            </div>

            <div class="service-chip-card">
              <div class="service-top">
                <span class="service-role">Consumidor Asíncrono</span>
                <span class="ping-pill ping-green">Puerto 8081</span>
              </div>
              <h3 class="service-name">ms-notificaciones</h3>
              <p class="service-desc">Consumo @RabbitListener, ACK manual explícito y desvío a DLQ.</p>
            </div>

            <div class="service-chip-card" [class.border-warning]="adminOnline === false">
              <div class="service-top">
                <span class="service-role">Administrador REST</span>
                <span class="ping-pill" [class.ping-green]="adminOnline === true" [class.ping-red]="adminOnline === false">
                  {{ adminOnline === true ? 'En línea' : (adminOnline === false ? 'Desconectado' : 'Verificando...') }}
                </span>
              </div>
              <h3 class="service-name">ms-rabbit-admin</h3>
              <p class="service-desc">Servicio RabbitAdminService con endpoints para colas, exchanges y validaciones DTO.</p>
            </div>
          </div>
        </section>

        <section class="card rabbit-admin-card">
          <div class="card-header-styled">
            <div class="icon-bubble bubble-orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div>
              <h2 class="card-title">Administrador Dinámico de RabbitMQ</h2>
              <p class="card-desc">Crea o elimina colas en caliente y visualiza de inmediato los cambios en la tabla.</p>
            </div>
          </div>

          <div *ngIf="mensajeAdminDirecto" class="admin-toast-banner" [class.toast-success]="tipoAdminDirecto === 'success'" [class.toast-error]="tipoAdminDirecto === 'error'">
            <span>{{ mensajeAdminDirecto }}</span>
            <button class="toast-close" (click)="mensajeAdminDirecto = ''">&times;</button>
          </div>

          <div *ngIf="adminOnline === false" class="admin-offline-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <strong>Microservicio 'ms-rabbit-admin' no detectado.</strong>
              <p style="margin: 2px 0 0 0; font-size: 12px;">Para que las operaciones respondan, asegúrate de iniciar el microservicio en su terminal.</p>
            </div>
          </div>

          <div class="admin-actions-box">
            <div class="input-group flex-1">
              <label class="input-label">Nombre de la Cola a Crear / Eliminar</label>
              <div class="input-wrapper">
                <input type="text" [(ngModel)]="nombreNuevaCola" placeholder="ej: cola.auditoria.demo" class="styled-input text-mono" />
              </div>
            </div>

            <div class="admin-btn-row">
              <button class="btn-admin btn-post" [disabled]="loadingAdmin" (click)="crearColaAdmin()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>{{ loadingAdmin ? 'Creando...' : 'POST ' }}</span>
              </button>

              <button class="btn-admin btn-delete" [disabled]="loadingAdmin" (click)="eliminarColaAdmin()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>DELETE</span>
              </button>

              <button class="btn-admin btn-test" [disabled]="loadingAdmin" (click)="probarValidacionVacia()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Probar Rechazo DTO Inválido (Validación 400)
              </button>
            </div>
          </div>

          <div class="live-queues-box">
            <div class="live-queues-header">
              <div class="live-queues-title">
                <span class="rabbit-icon-live">🐇</span>
                <h3>Colas Activas en el Broker RabbitMQ</h3>
                <span class="count-tag">{{ colasRabbit.length }} declaradas</span>
              </div>
              <button class="btn-sync" (click)="cargarColasRabbit()" title="Sincronizar con RabbitMQ">
                🔄 Sincronizar
              </button>
            </div>

            <div class="table-responsive">
              <table class="queues-table">
                <thead>
                  <tr>
                    <th>Nombre de la Cola</th>
                    <th>Mensajes Listos</th>
                    <th>Consumidores Activos</th>
                    <th>Estado en Broker</th>
                    <th style="text-align: right;">Acción Directa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let q of colasRabbit">
                    <td>
                      <div class="cell-queue-name">
                        <span class="queue-icon-pill">Q</span>
                        <strong>{{ q.nombre }}</strong>
                        <span *ngIf="q.nombre.includes('dlq')" class="dlq-tag">DLQ</span>
                      </div>
                    </td>
                    <td>
                      <span class="pill-messages">{{ q.mensajes || 0 }} pendientes</span>
                    </td>
                    <td>
                      <span class="pill-consumers">{{ q.consumidores || 0 }} conectados</span>
                    </td>
                    <td>
                      <span class="badge-broker-online">
                        <span class="pulse-dot"></span> Activa
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn-delete-queue-pill" (click)="eliminarColaDirecto(q.nombre)" title="Eliminar cola">
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>

                  <tr *ngIf="colasRabbit.length === 0">
                    <td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">
                      No hay colas registradas o ms-rabbit-admin está desconectado.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div *ngIf="ultimaRespuestaAdmin" class="console-box" style="margin-top: 20px;">
            <div class="console-header">
              <div class="console-dots">
                <span class="dot-red"></span><span class="dot-yellow"></span><span class="dot-green"></span>
              </div>
              <span class="console-title">Respuesta HTTP devuelta por ms-rabbit-admin:</span>
            </div>
            <pre class="console-body">{{ ultimaRespuestaAdmin | json }}</pre>
          </div>
        </section>
      </div>

      <div *ngIf="activeTab === 'seguridad'" class="tab-content fade-in">
        <section class="card profile-card-styled">
          <div class="card-header-styled">
            <div class="icon-bubble bubble-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div>
              <h2 class="card-title">Identidad Federada IDaaS (Azure Active Directory)</h2>
              <p class="card-desc">Validación de tokens JWT en los filtros de seguridad de Spring Security.</p>
            </div>
          </div>

          <div class="claims-summary-grid">
            <div class="claim-card">
              <span class="claim-label">Usuario Conectado</span>
              <span class="claim-val">{{ account?.name || account?.username || 'No disponible' }}</span>
            </div>
            <div class="claim-card">
              <span class="claim-label">UPN / Correo Institucional</span>
              <span class="claim-val">{{ account?.username }}</span>
            </div>
            <div class="claim-card">
              <span class="claim-label">Tenant ID (Directorio)</span>
              <span class="claim-val text-mono">{{ account?.tenantId }}</span>
            </div>
            <div class="claim-card">
              <span class="claim-label">Endpoint BFF</span>
              <span class="claim-val text-mono">{{ apiBaseUrl }}</span>
            </div>
          </div>

          <div class="roles-box">
            <h3 class="roles-title">Roles y Scopes Activos en el Token:</h3>
            <div class="tags-row">
              <div *ngIf="roles.length > 0; else noRolesList">
                <span *ngFor="let rol of roles" class="role-tag">
                  🛡️ Rol: {{ rol }}
                </span>
              </div>
              <ng-template #noRolesList>
                <span class="neutral-tag">Usuario Estándar Autenticado</span>
              </ng-template>

              <span *ngFor="let scope of scopes" class="scope-tag">
                🔑 Scope: {{ scope }}
              </span>
            </div>
          </div>

          <div class="security-test-bar">
            <div>
              <strong>Prueba de Autorización Estricta (RBAC):</strong>
              <p class="card-desc">Comprueba la restricción hasAuthority('APPROLE_Admin') en <code>/api/pedidos/admin</code>.</p>
            </div>
            <button class="btn-warning-styled" (click)="consultarAdmin()">
              Probar Endpoint Admin
            </button>
          </div>
        </section>
      </div>
    </div>
  `
})
export class PedidosComponent implements OnInit {
  account: AccountInfo | null = null;
  roles: string[] = [];
  scopes: string[] = [];
  pedidos: Pedido[] = [];

  activeTab: 'pedidos' | 'rabbitmq' | 'seguridad' = 'pedidos';

  mensajeEstado = '';
  tipoMensaje: 'success' | 'error' = 'success';
  loadingPedido = false;
  loadingAdmin = false;

  mensajeAdminDirecto = '';
  tipoAdminDirecto: 'success' | 'error' = 'success';

  adminOnline: boolean | null = null;
  colasRabbit: ColaInfo[] = [];

  apiBaseUrl = environment.apiBaseUrl;
  rabbitAdminApiUrl = environment.rabbitAdminApiUrl || 'http://localhost:8082';

  nuevoCliente = 'Sebastián Gallardo';
  nuevoProducto = 'Suscripción Cloud Native Pro';
  nuevoMonto: number | null = 45000;

  filtroTexto = '';

  nombreNuevaCola = 'cola.auditoria.demo';
  ultimaRespuestaAdmin: any = null;

  constructor(
    private authService: MsalService,
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosSesion();
    this.cargarPedidos();
    this.verificarSaludAdmin();
  }

  cargarDatosSesion(): void {
    const activeAccount = this.authService.instance.getActiveAccount();
    if (activeAccount) {
      this.account = activeAccount;
      const claims = activeAccount.idTokenClaims as any;
      if (claims?.roles && Array.isArray(claims.roles)) {
        this.roles = claims.roles;
      }
      if (claims?.scp) {
        this.scopes = claims.scp.split(' ');
      } else if (environment.azure.protectedResourceScopes) {
        this.scopes = environment.azure.protectedResourceScopes.map((s) => s.split('/').pop() || s);
      }
    }
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  esAdmin(): boolean {
    return this.roles.includes('APPROLE_Admin') || this.roles.includes('Admin');
  }

  calcularTotalFacturado(): number {
    return this.pedidos
      .filter((p) => (p.monto || 0) > 0)
      .reduce((acc, p) => acc + (p.monto || 0), 0);
  }

  filtrarTabla(): void {
    this.cdr.detectChanges();
  }

  pedidosFiltrados(): Pedido[] {
    if (!this.filtroTexto.trim()) {
      return this.pedidos;
    }
    const q = this.filtroTexto.toLowerCase().trim();
    return this.pedidos.filter(
      (p) =>
        p.cliente.toLowerCase().includes(q) ||
        p.producto.toLowerCase().includes(q) ||
        String(p.id).includes(q)
    );
  }

  cargarPresetValido(): void {
    this.nuevoCliente = 'Sebastián Gallardo';
    this.nuevoProducto = 'Suscripción Cloud Native Pro';
    this.nuevoMonto = 45000;
  }

  simularFalloDLQDirecto(): void {
    this.http.post<any>(`${environment.apiBaseUrl}/api/pedidos/simular-error-dlq`, {}).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.tipoMensaje = 'success';
          this.mensajeEstado = res.mensaje;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.tipoMensaje = 'error';
          this.mensajeEstado = err.error?.message || err.message || 'Error al emitir evento de fallo a RabbitMQ.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  cargarPedidos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/api/pedidos`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.pedidos = res.pedidos || [];
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.tipoMensaje = 'error';
          this.mensajeEstado = err.error?.message || `Error ${err.status}: ${err.statusText}`;
          this.cdr.detectChanges();
        });
      }
    });
  }

  crearPedido(): void {
    if (!this.nuevoCliente?.trim() || !this.nuevoProducto?.trim()) {
      this.tipoMensaje = 'error';
      this.mensajeEstado = 'Por favor complete cliente y producto.';
      return;
    }

    if (this.nuevoMonto === null || this.nuevoMonto <= 0) {
      this.tipoMensaje = 'error';
      this.mensajeEstado = 'El monto del pedido debe ser un valor positivo mayor a 0.';
      return;
    }

    this.loadingPedido = true;
    const payload = {
      cliente: this.nuevoCliente.trim(),
      producto: this.nuevoProducto.trim(),
      monto: Number(this.nuevoMonto),
      estado: 'PENDIENTE'
    };

    this.http.post<any>(`${environment.apiBaseUrl}/api/pedidos`, payload).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.loadingPedido = false;
          this.tipoMensaje = 'success';
          this.mensajeEstado = `¡Pedido #${res.id} creado en BD y publicado asíncronamente en pedidos.exchange!`;
          this.pedidos = [res, ...this.pedidos];
          this.nuevoCliente = '';
          this.nuevoProducto = '';
          this.nuevoMonto = null;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loadingPedido = false;
          this.tipoMensaje = 'error';
          this.mensajeEstado = err.error?.message || err.error?.error || `Error al registrar pedido: ${err.statusText}`;
          this.cdr.detectChanges();
        });
      }
    });
  }

  eliminarPedido(id: number): void {
    this.http.delete<any>(`${environment.apiBaseUrl}/api/pedidos/${id}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.pedidos = this.pedidos.filter((p) => p.id !== id);
          this.tipoMensaje = 'success';
          this.mensajeEstado = res.mensaje || `Pedido #${id} eliminado con éxito de la base de datos.`;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.tipoMensaje = 'error';
          this.mensajeEstado = err.error?.message || `No se pudo eliminar el pedido #${id}.`;
          this.cdr.detectChanges();
        });
      }
    });
  }

  cambiarTabRabbitmq(): void {
    this.activeTab = 'rabbitmq';
    this.verificarSaludAdmin();
    this.cargarColasRabbit();
  }

  verificarSaludAdmin(): void {
    this.http.get<any>(`${this.rabbitAdminApiUrl}/status`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.adminOnline = true;
          this.cargarColasRabbit();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.adminOnline = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  cargarColasRabbit(): void {
    this.http.get<any[]>(`${this.rabbitAdminApiUrl}/queues`).subscribe({
      next: (colas) => {
        this.ngZone.run(() => {
          this.colasRabbit = colas || [];
          this.adminOnline = true;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          if (err.status === 0) {
            this.adminOnline = false;
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  crearColaAdmin(): void {
    if (!this.nombreNuevaCola.trim()) {
      this.mostrarAlertaAdmin('El nombre de la cola no puede estar vacío.', 'error');
      return;
    }

    this.loadingAdmin = true;
    const cleanName = this.nombreNuevaCola.trim();
    const body = {
      name: cleanName,
      durable: true,
      exclusive: false,
      autoDelete: false
    };

    this.http.post<any>(`${this.rabbitAdminApiUrl}/queues`, body).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.loadingAdmin = false;
          this.adminOnline = true;
          this.ultimaRespuestaAdmin = res;
          this.mostrarAlertaAdmin(`¡Cola '${res.nombre}' creada y verificada en RabbitMQ!`, 'success');
          this.cargarColasRabbit();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loadingAdmin = false;
          const msg = err.status === 0
            ? 'No se pudo conectar al microservicio ms-rabbit-admin. Asegúrate de iniciarlo con .\\mvnw.cmd spring-boot:run.'
            : (err.error?.mensaje || err.error?.error || err.message);

          this.adminOnline = err.status !== 0;
          this.ultimaRespuestaAdmin = {
            codigoHttp: err.status || 0,
            error: msg,
            detalles: err.error?.detalles || 'Verifica que ms-rabbit-admin esté en ejecución.'
          };
          this.mostrarAlertaAdmin(`Fallo al crear cola: ${msg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  eliminarColaAdmin(): void {
    if (!this.nombreNuevaCola.trim()) {
      this.mostrarAlertaAdmin('Especifique el nombre de la cola a eliminar.', 'error');
      return;
    }
    this.eliminarColaDirecto(this.nombreNuevaCola.trim());
  }

  eliminarColaDirecto(nombre: string): void {
    this.loadingAdmin = true;
    this.http.delete<any>(`${this.rabbitAdminApiUrl}/queues/${nombre}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.loadingAdmin = false;
          this.adminOnline = true;
          this.ultimaRespuestaAdmin = res;
          this.mostrarAlertaAdmin(`¡Cola '${nombre}' eliminada exitosamente de RabbitMQ!`, 'success');
          this.colasRabbit = this.colasRabbit.filter((q) => q.nombre !== nombre);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loadingAdmin = false;
          const msg = err.status === 0
            ? 'No se pudo conectar al microservicio ms-rabbit-admin.'
            : (err.error?.mensaje || err.message);

          this.adminOnline = err.status !== 0;
          this.ultimaRespuestaAdmin = {
            codigoHttp: err.status || 0,
            error: msg
          };
          this.mostrarAlertaAdmin(`Fallo al eliminar cola: ${msg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  probarValidacionVacia(): void {
    this.loadingAdmin = true;
    const bodyInvalido = {
      name: '',
      durable: true
    };

    this.http.post<any>(`${this.rabbitAdminApiUrl}/queues`, bodyInvalido).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.loadingAdmin = false;
          this.adminOnline = true;
          this.ultimaRespuestaAdmin = res;
          this.mostrarAlertaAdmin('Respuesta inesperada: se esperaba error de validación.', 'error');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loadingAdmin = false;
          if (err.status === 0) {
            this.adminOnline = false;
            this.ultimaRespuestaAdmin = {
              codigoHttp: 0,
              error: 'ms-rabbit-admin desconectado.'
            };
            this.mostrarAlertaAdmin('ms-rabbit-admin no está respondiendo.', 'error');
          } else {
            this.adminOnline = true;
            this.ultimaRespuestaAdmin = err.error || err;
            const errorMsg = err.error?.detalles?.name || err.error?.mensaje || 'Validación rechazada.';
            this.mostrarAlertaAdmin(`[HTTP 400 Bad Request]: Rechazo exitoso -> "${errorMsg}"`, 'success');
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  mostrarAlertaAdmin(mensaje: string, tipo: 'success' | 'error'): void {
    this.mensajeAdminDirecto = mensaje;
    this.tipoAdminDirecto = tipo;
    this.mensajeEstado = mensaje;
    this.tipoMensaje = tipo;
  }

  consultarAdmin(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/api/pedidos/admin`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.tipoMensaje = 'success';
          this.mensajeEstado = `[200 OK - Autorizado] ${res.mensaje} Métricas obtenidas: Ventas $${res.metricas?.totalVentas}.`;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.tipoMensaje = 'error';
          const msg = err.error?.message || err.message;
          this.mensajeEstado = `[Código HTTP ${err.status} - Rechazado]: ${msg}`;
          this.cdr.detectChanges();
        });
      }
    });
  }
}
