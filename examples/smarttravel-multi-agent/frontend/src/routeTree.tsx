import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { Home } from './pages/Home'
import { PlanStatus } from './pages/PlanStatus'

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Outlet />
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plan/$planId',
  component: PlanStatus,
})

export const routeTree = rootRoute.addChildren([indexRoute, planRoute])

