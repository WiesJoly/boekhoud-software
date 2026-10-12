import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { usePracticeStore } from './stores/practice'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/', name: 'overview', component: () => import('./views/OverviewView.vue') },
    { path: '/sessies', name: 'consults', component: () => import('./views/ConsultsView.vue') },
    { path: '/facturen', name: 'invoices', component: () => import('./views/InvoicesView.vue') },
    { path: '/facturen/:id/print', name: 'invoice-print', component: () => import('./views/InvoicePrintView.vue'), meta: { bare: true } },
    { path: '/uitgaven', name: 'expenses', component: () => import('./views/ExpensesView.vue') },
    { path: '/bank', name: 'bank', component: () => import('./views/BankView.vue') },
    { path: '/belasting', name: 'tax', component: () => import('./views/TaxView.vue') },
    { path: '/instellingen', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.ready
  if (!authStore.user) return to.meta.public ? true : { name: 'login' }
  if (to.name === 'login') return { name: 'overview' }

  // A new account first fills in the practice details.
  const practice = usePracticeStore()
  practice.start(authStore.user.uid)
  await practice.whenSettingsLoaded()
  if (!practice.settings && to.name !== 'settings') return { name: 'settings' }
  return true
})
