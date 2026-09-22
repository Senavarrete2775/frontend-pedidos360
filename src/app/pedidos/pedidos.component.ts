import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pedidos-container">
      <!-- Ficha de Usuario y Claims de Token -->
      <div class="card profile-card">
        <div class="card-header">
          <div>
            <h2 class="section-title">Perfil de Sesión y Claims IDaaS (Azure AD)</h2>
            <p class="section-subtitle">Información leída directamente desde los claims del token JWT</p>
          </div>
          <span class="status-badge">Autenticado vía MSAL</span>
        </div>

        <div class="claims-grid">
          <div class="claim-item">
            <span class="claim-label">Usuario</span>
            <span class="claim-value">{{ account?.name || account?.username || 'No disponible' }}</span>
          </div>
          <div class="claim-item">
            <span class="claim-label">Correo / UPN</span>
            <span class="claim-value">{{ account?.username || 'No disponible' }}</span>
          </div>
          <div class="claim-item">
            <span class="claim-label">Tenant ID</span>
            <span class="claim-value text-mono">{{ account?.tenantId }}</span>
          </div>
          <div class="claim-item">
            <span class="claim-label">Entorno API Base</span>
            <span class="claim-value text-mono">{{ apiBaseUrl }}</span>
          </div>
        </div>

        <!-- Sección de Roles y Scopes (Requisito Clave de la Pauta) -->
        <div class="roles-section">
          <h4>Roles y Scopes Detectados en Token:</h4>
          <div class="tags-container">
            <div *ngIf="roles.length > 0; else noRoles">
              <span *ngFor="let rol of roles" class="tag tag-role">Rol: {{ rol }}</span>
            </div>
            <ng-template #noRoles>
              <span class="tag tag-neutral">Sin rol específico (Usuario Estándar / Authenticated)</span>
            </ng-template>

            <span *ngFor="let scope of scopes" class="tag tag-scope">Scope: {{ scope }}</span>
          </div>
        </div>
      </div>

      <!-- Acciones de Consumo al Backend -->
      <div class="card actions-card">
        <h3 class="subsection-title">Operaciones contra Backend / BFF</h3>
        <p class="section-subtitle">
          Las peticiones viajan con el encabezado <code>Authorization: Bearer &lt;token&gt;</code> gestionado por <strong>MsalInterceptor</strong>.
        </p>

        <div class="btn-group">
          <button class="btn btn-primary" (click)="cargarPedidos()">
            Consultar Pedidos (Base de Datos)
          </button>
          <button class="btn btn-warning" (click)="consultarAdmin()">
            Probar Endpoint con Rol Admin (/api/pedidos/admin)
          </button>
        </div>

        <!-- Alerta de Respuesta / Error -->
        <div *ngIf="mensajeEstado" [class]="'alert alert-' + tipoMensaje">
          <strong>{{ tipoMensaje === 'error' ? 'Aviso / Error:' : 'Éxito:' }}</strong>
          <div>{{ mensajeEstado }}</div>
        </div>

        <!-- Tabla de Pedidos obtenidos de la BD -->
        <div *ngIf="pedidos.length > 0" class="table-container">
          <h4>Listado de Pedidos Persistidos en Base de Datos Cloud ({{ pedidos.length }})</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Producto / Servicio</th>
                <th>Monto (CLP)</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of pedidos">
                <td>#{{ p.id }}</td>
                <td><strong>{{ p.cliente }}</strong></td>
                <td>{{ p.producto }}</td>
                <td>\${{ p.monto | number }}</td>
                <td>
                  <span class="badge-status" [class]="'status-' + p.estado.toLowerCase()">
                    {{ p.estado }}
                  </span>
                </td>
                <td>{{ p.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pedidos-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .subsection-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px 0;
    }
    .section-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .status-badge {
      background: #dcfce7;
      color: #15803d;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
    }
    .claims-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .claim-item {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
    }
    .claim-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .claim-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    .text-mono {
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
    }
    .roles-section {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 16px;
    }
    .roles-section h4 {
      margin: 0 0 10px 0;
      font-size: 13px;
      color: #334155;
    }
    .tags-container {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .tag-role {
      background: #ede9fe;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
    }
    .tag-scope {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }
    .tag-neutral {
      background: #e2e8f0;
      color: #475569;
    }
    .btn-group {
      display: flex;
      gap: 12px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #0078d4;
      color: white;
    }
    .btn-primary:hover {
      background: #006abc;
    }
    .btn-warning {
      background: #f59e0b;
      color: white;
    }
    .btn-warning:hover {
      background: #d97706;
    }
    .alert {
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .alert-success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .table-container {
      margin-top: 15px;
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }
    .data-table th {
      background: #f8fafc;
      padding: 12px 14px;
      font-weight: 700;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .badge-status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-completado {
      background: #dcfce7;
      color: #15803d;
    }
    .status-pendiente {
      background: #fef3c7;
      color: #b45309;
    }
    .status-en_proceso {
      background: #e0f2fe;
      color: #0369a1;
    }
  `]
})
export class PedidosComponent implements OnInit {
  account: AccountInfo | null = null;
  roles: string[] = [];
  scopes: string[] = [];
  pedidos: any[] = [];
  mensajeEstado = '';
  tipoMensaje: 'success' | 'error' = 'success';
  apiBaseUrl = environment.apiBaseUrl;

  constructor(
    private authService: MsalService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarDatosSesion();
    this.cargarPedidos();
  }

  cargarDatosSesion(): void {
    const activeAccount = this.authService.instance.getActiveAccount();
    if (activeAccount) {
      this.account = activeAccount;
      // Extraer roles desde idTokenClaims
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

  cargarPedidos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/api/pedidos`).subscribe({
      next: (res) => {
        this.pedidos = res.pedidos || [];
        this.tipoMensaje = 'success';
        this.mensajeEstado = `${res.mensaje} (Consultados ${this.pedidos.length} pedidos de la BD).`;
      },
      error: (err) => {
        this.tipoMensaje = 'error';
        this.mensajeEstado = err.error?.message || `Error ${err.status}: ${err.statusText}`;
      }
    });
  }

  consultarAdmin(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/api/pedidos/admin`).subscribe({
      next: (res) => {
        this.tipoMensaje = 'success';
        this.mensajeEstado = `[200 OK - Autorizado] ${res.mensaje} Métricas obtenidas: Ventas $${res.metricas?.totalVentas}.`;
      },
      error: (err) => {
        this.tipoMensaje = 'error';
        const msg = err.error?.message || err.message;
        this.mensajeEstado = `[Código HTTP ${err.status} - Rechazado]: ${msg}`;
      }
    });
  }
}
