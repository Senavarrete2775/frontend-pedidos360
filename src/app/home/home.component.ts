import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <div class="hero-card">
        <div class="badge-tag">Cloud Native Architecture</div>
        <h1 class="hero-title">Sistema de Gestión Pedidos360</h1>
        <p class="hero-subtitle">
          Arquitectura de microservicios en la nube: frontend Angular, backend Spring Boot con PostgreSQL en AWS, mensajería asíncrona con RabbitMQ y Kafka, y autenticación federada con Azure Active Directory (MSAL).
        </p>

        <div class="pipeline" aria-label="Arquitectura general">
          <span class="pipe-step">Angular</span>
          <span class="pipe-arrow">→</span>
          <span class="pipe-step">API Gateway (JWT)</span>
          <span class="pipe-arrow">→</span>
          <span class="pipe-step">Backend + PostgreSQL</span>
          <span class="pipe-arrow">→</span>
          <span class="pipe-step pipe-rabbit">RabbitMQ</span>
          <span class="pipe-step pipe-kafka">Kafka</span>
          <span class="pipe-arrow">→</span>
          <span class="pipe-step">Consumidores</span>
        </div>

        <div class="actions-grid">
          <div class="action-card">
            <h3>Flujo de mensajería en vivo</h3>
            <p>Mira cómo un pedido viaja por RabbitMQ y Kafka, qué consumidores lo procesan y qué pasa cuando un mensaje falla (DLQ).</p>
            <a routerLink="/mensajeria" class="btn btn-primary">Ver el flujo asíncrono</a>
          </div>

          <div class="action-card">
            <h3>Ruta Protegida (MsalGuard)</h3>
            <p>Panel de pedidos y administración de colas. Si no has iniciado sesión, el Guard te redirigirá automáticamente a Azure AD.</p>
            <a routerLink="/pedidos" class="btn btn-primary">Ir a Pedidos (Protegido)</a>
          </div>

          <div class="action-card">
            <h3>Prueba de Backend sin Token</h3>
            <p>Verifica la disponibilidad del backend en EC2 consumiendo el endpoint público <code>/api/public/status</code>.</p>
            <button class="btn btn-secondary" (click)="probarPublico()">Probar sin Token</button>
          </div>
        </div>

        <div *ngIf="respuestaPublica" class="result-box">
          <div class="result-title">Respuesta del Backend (Público):</div>
          <pre>{{ respuestaPublica | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      display: flex;
      justify-content: center;
      padding: 40px 20px;
    }
    .hero-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      max-width: 800px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .badge-tag {
      display: inline-block;
      padding: 6px 14px;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .hero-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 12px 0;
    }
    .hero-subtitle {
      font-size: 15px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 35px;
    }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      text-align: left;
    }
    .pipeline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 0 0 30px 0;
    }
    .pipe-step {
      font-size: 12.5px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
    }
    .pipe-rabbit { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
    .pipe-kafka { background: #f5f3ff; border-color: #ddd6fe; color: #5b21b6; }
    .pipe-arrow { color: #94a3b8; font-size: 16px; }
    .action-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .action-card h3 {
      font-size: 17px;
      color: #1e293b;
      margin: 0 0 8px 0;
    }
    .action-card p {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      text-align: center;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: none;
    }
    .btn-primary {
      background: #0078d4;
      color: white;
    }
    .btn-primary:hover {
      background: #006abc;
    }
    .btn-secondary {
      background: #0f172a;
      color: white;
    }
    .btn-secondary:hover {
      background: #334155;
    }
    .result-box {
      margin-top: 25px;
      padding: 16px;
      background: #f1f5f9;
      border-radius: 8px;
      text-align: left;
    }
    .result-title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 8px;
    }
    pre {
      margin: 0;
      font-family: monospace;
      font-size: 13px;
      color: #0f172a;
      white-space: pre-wrap;
    }
  `]
})
export class HomeComponent {
  respuestaPublica: any = null;

  constructor(private http: HttpClient) {}

  probarPublico() {
    this.http.get(environment.apiBaseUrl + '/api/public/status').subscribe({
      next: (data) => (this.respuestaPublica = data),
      error: (err) => (this.respuestaPublica = { error: 'Error al conectar', detalle: err.message })
    });
  }
}
