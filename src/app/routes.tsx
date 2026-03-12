import { createBrowserRouter } from "react-router";
import { MobileLayout } from "./layouts/MobileLayout";
import { Login } from "./pages/Login";
import { DeviceList } from "./pages/DeviceList";
import { DeviceOverview } from "./pages/DeviceOverview";
import { DeviceUI } from "./pages/DeviceUI";
import { SettingsPage } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MobileLayout,
    children: [
      { index: true, Component: Login },
      { path: "login", Component: Login },
      { path: "devices", Component: DeviceList },
      { path: "devices/:id", Component: DeviceOverview },
      { path: "devices/:id/config/:configId", Component: DeviceUI },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);
