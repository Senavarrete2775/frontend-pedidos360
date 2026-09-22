import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { HomeComponent } from './home/home.component';
import { PedidosComponent } from './pedidos/pedidos.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'pedidos', component: PedidosComponent, canActivate: [MsalGuard] },
  { path: '**', redirectTo: '' }
];
