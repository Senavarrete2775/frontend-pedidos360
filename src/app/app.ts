import { Component, OnInit } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html' // Modificado para leer el archivo HTML
})
export class App implements OnInit {
  isLoggedIn = false;
  mensajeBackend = '';

  constructor(private msalService: MsalService, private http: HttpClient) {}

  ngOnInit() {
    this.msalService.instance.initialize().then(() => {
      const cuentasGuardadas = this.msalService.instance.getAllAccounts();
      if (cuentasGuardadas.length > 0) {
        this.msalService.instance.setActiveAccount(cuentasGuardadas[0]);
        this.isLoggedIn = true;
      }
    }).catch(err => console.error("Error al inicializar MSAL:", err));
  }

  login() {
    this.msalService.loginPopup({
      scopes: environment.azure.protectedResourceScopes as unknown as string[]
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
