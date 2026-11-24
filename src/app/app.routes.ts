import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { HomeComponent } from './home/home.component';
import { PedidosComponent } from './pedidos/pedidos.component';
import { MensajeriaComponent } from './mensajeria/mensajeria.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'pedidos', component: PedidosComponent, canActivate: [MsalGuard] },
  { path: 'mensajeria', component: MensajeriaComponent, canActivate: [MsalGuard] },
  { path: '**', redirectTo: '' }
];
