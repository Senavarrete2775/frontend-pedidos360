import { Component, OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="text-align: center; margin-top: 50px;">
      <h1>Bienvenido a Pedidos360</h1>

      <div *ngIf="!isLoggedIn">
        <button (click)="login()" style="padding: 10px 20px; font-size: 16px;">Iniciar Sesión con Microsoft</button>
      </div>

      <div *ngIf="isLoggedIn">
        <h2 style="color: green;">¡Autenticado correctamente!</h2>
        <button (click)="llamarBackend()" style="padding: 10px 20px; font-size: 16px; margin-right: 10px;">Llamar al Backend</button>
        <button (click)="logout()" style="padding: 10px 20px; font-size: 16px;">Cerrar Sesión</button>

        <div *ngIf="mensajeBackend" style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; max-width: 600px; margin-left: auto; margin-right: auto;">
          <strong>Respuesta del servidor:</strong> <br> {{ mensajeBackend }}
        </div>
      </div>
    </div>
  `
})
export class App implements OnInit {
  isLoggedIn = false;
  mensajeBackend = '';

  constructor(private msalService: MsalService, private http: HttpClient) {}

  ngOnInit() {
    this.msalService.instance.initialize().then(() => {
      // Ya no esperamos redirecciones, solo verificamos si ya hay una cuenta en la caché
      const cuentasGuardadas = this.msalService.instance.getAllAccounts();
      if (cuentasGuardadas.length > 0) {
        this.msalService.instance.setActiveAccount(cuentasGuardadas[0]);
        this.isLoggedIn = true;
      }
    }).catch(err => console.error("Error al inicializar MSAL:", err));
  }

  login() {
    this.msalService.loginPopup({
      scopes: environment.azure.protectedResourceScopes
    }).subscribe({
      next: (res) => {
        if (res.account) {
          this.msalService.instance.setActiveAccount(res.account);
          this.isLoggedIn = true;
        }
      },
      error: (err) => console.error("Error en login:", err)
    });
  }

  logout() {
    this.msalService.logoutPopup().subscribe({
      next: () => {
        this.isLoggedIn = false;
        this.mensajeBackend = '';
      }
    });
  }

  llamarBackend() {
    this.http.get(environment.apiBaseUrl + '/api/pedidos', { responseType: 'text' }).subscribe({
      next: (res) => this.mensajeBackend = res,
      error: (err) => {
        console.error(err);
        this.mensajeBackend = 'Error de conexión. Asegúrate de que Spring Boot está corriendo.';
      }
    });
  }
}
