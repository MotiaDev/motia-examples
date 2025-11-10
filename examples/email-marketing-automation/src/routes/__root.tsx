import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/" activeProps={{ className: 'active' }}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/campaigns" activeProps={{ className: 'active' }}>
              Campaigns
            </Link>
          </li>
          <li>
            <Link to="/analytics" activeProps={{ className: 'active' }}>
              Analytics
            </Link>
          </li>
          <li>
            <Link to="/users" activeProps={{ className: 'active' }}>
              Users
            </Link>
          </li>
        </ul>
      </nav>
      <div className="container">
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </>
  ),
  notFoundComponent: () => (
    <div style={{ padding: '2rem' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="button" style={{ marginTop: '1rem', display: 'inline-block' }}>
        Go to Dashboard
      </Link>
    </div>
  ),
})

