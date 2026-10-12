import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/', name: 'overview', component: () => import('./views/OverviewView.vue') },
    { path: '/consulten', name: 'consults', component: () => import('./views/ConsultsView.vue') },
    { path: '/facturen', name: 'invoices', component: () => import('./views/InvoicesView.vue') },
    { path: '/facturen/:id/print', name: 'invoice-print', component: () => import('./views/InvoicePrintView.vue'), meta: { bare: true } },
    { path: '/uitgaven', name: 'expenses', component: () => import('./views/ExpensesView.vue') },
    { path: '/bank', name: 'bank', component: () => import('./views/BankView.vue') },
    { path: '/belasting', name: 'tax', component: () => import('./views/TaxView.vue') },
    { path: '/instellingen', name: 'settings', component: () => import('./views/SettingsView.vue') },
  ],
})
