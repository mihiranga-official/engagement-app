import { Routes } from '@angular/router';
import { AdminGuard } from './core/auth/admin.guard';
import { AuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
    { 
        path: '', 
        pathMatch: 'full',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) 
    },
    {
        path: 'gallery',
        canActivate: [AuthGuard],
        loadComponent: () => import('./features/gallery/gallery').then(m => m.GalleryComponent)
    },
    {
        path: 'admin',
        canActivate: [AdminGuard],
        loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent)
    },
    {
        path: 'guest-wall',
        canActivate: [AuthGuard],
        loadComponent: () => import('./features/guest-wall/guest-wall').then(m => m.GuestWallComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./core/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'invite',
        loadComponent: () => import('./features/invitation/invitation.component').then(m => m.InvitationComponent)
    },
    { path: '**', redirectTo: '' }
];
