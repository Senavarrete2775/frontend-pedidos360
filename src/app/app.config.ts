import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MsalInterceptor, MsalService, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalGuard } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';
import { environment } from '../environments/environment';

export function MSALInstanceFactory() {
  return new PublicClientApplication({
    auth: {
      clientId: environment.azure.clientId,
      authority: environment.azure.authority,
      redirectUri: environment.azure.redirectUri
    },
    cache: {
      cacheLocation: 'localStorage'
    }
  });
}

export function MSALInterceptorConfigFactory() {
  return {
    interactionType: InteractionType.Popup,
    protectedResourceMap: new Map([
      [environment.apiBaseUrl + '/api/pedidos', [environment.azure.protectedResourceScopes]] // Corrección: el valor de los scopes debe ser un array
    ])
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    //{ provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },  <---- dejar de comentar para volver a la normalidad
    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },
    MsalService,
    MsalGuard
  ]
};
