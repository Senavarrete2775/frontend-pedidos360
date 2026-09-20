import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  RouterLink,
  RouterOutlet
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  MsalBroadcastService,
  MsalService
} from '@azure/msal-angular';
import {
  AuthenticationResult,
  EventMessage,
  EventType,
  InteractionStatus
} from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  loginDisplay = false;

  get isLoggedIn(): boolean {
    return this.loginDisplay;
  }

  usuario: any = null;
  mensajeBackend = '';
  private readonly destroying$ = new Subject<void>();

  constructor(
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService
      .handleRedirectObservable()
      .pipe(takeUntil(this.destroying$))
      .subscribe({
        next: (result: AuthenticationResult | null) => {
          if (result?.account) {
            this.authService.instance.setActiveAccount(result.account);
          }
        },
        error: (error) => console.error('Error MSAL:', error)
      });

    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((message: EventMessage) => message.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this.destroying$)
      )
      .subscribe((message: EventMessage) => {
        const result = message.payload as AuthenticationResult;
        this.authService.instance.setActiveAccount(result.account);
        this.actualizarEstado();
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroying$)
      )
      .subscribe(() => {
        this.checkAndSetActiveAccount();
        this.actualizarEstado();
      });
  }

  login(): void {
    this.authService.loginRedirect({
      scopes: environment.azure.protectedResourceScopes as unknown as string[]
    });
  }

  logout(): void {
    this.authService.logoutRedirect({
      postLogoutRedirectUri: environment.azure.redirectUri
    });
  }

  checkAndSetActiveAccount(): void {
    let activeAccount = this.authService.instance.getActiveAccount();
    if (!activeAccount) {
      const accounts = this.authService.instance.getAllAccounts();
      if (accounts.length > 0) {
        activeAccount = accounts[0];
        this.authService.instance.setActiveAccount(activeAccount);
      }
    }
  }

  actualizarEstado(): void {
    const accounts = this.authService.instance.getAllAccounts();
    this.loginDisplay = accounts.length > 0;
    this.usuario = this.authService.instance.getActiveAccount()
      ?? accounts[0]
      ?? null;
    this.cdr.detectChanges();
  }

  llamarBackend() {
    this.http.get(environment.apiBaseUrl + '/api/pedidos', { responseType: 'text' }).subscribe({
      next: (res) => {
        this.mensajeBackend = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.mensajeBackend = 'Error de conexión. Asegúrate de que Spring Boot está corriendo.';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroying$.next();
    this.destroying$.complete();
  }
}
