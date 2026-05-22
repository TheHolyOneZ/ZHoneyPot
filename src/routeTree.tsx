import {
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { TokenCreator } from "./pages/TokenCreator";
import { ActiveTokens } from "./pages/ActiveTokens";
import { AlertInbox } from "./pages/AlertInbox";
import { AlertDetail } from "./pages/AlertDetail";
import { Settings } from "./pages/Settings";
import { Autonomous } from "./pages/Autonomous";
import { Guide } from "./pages/Guide";
import { SelfTest } from "./pages/SelfTest";
import { About } from "./pages/About";

const rootRoute = createRootRoute({
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const createTokenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  component: TokenCreator,
});

const tokensRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tokens",
  component: ActiveTokens,
});

const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/alerts",
  component: AlertInbox,
});

const alertDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/alerts/$id",
  component: AlertDetail,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const autonomousRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/autonomous",
  component: Autonomous,
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide",
  component: Guide,
});

const selfTestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/selftest",
  component: SelfTest,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: About,
});

export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  createTokenRoute,
  tokensRoute,
  alertsRoute,
  alertDetailRoute,
  settingsRoute,
  autonomousRoute,
  guideRoute,
  selfTestRoute,
  aboutRoute,
]);
