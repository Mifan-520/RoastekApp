import { createBrowserRouter } from "react-router";
import { MobileLayout } from "./layouts/MobileLayout";
import { Login } from "./pages/Login";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MobileLayout,
    children: [
      { index: true, Component: Login },
      { path: "login", Component: Login },
      {
        path: "devices",
        lazy: async () => {
          const module = await import("./pages/DeviceList");
          return { Component: module.DeviceList };
        },
      },
      {
        path: "devices/:id",
        lazy: async () => {
          const module = await import("./pages/DeviceOverview");
          return { Component: module.DeviceOverview };
        },
      },
      {
        path: "devices/:id/config/:configId",
        lazy: async () => {
          const module = await import("./pages/DeviceUI");
          return { Component: module.DeviceUI };
        },
      },
      {
        path: "report",
        lazy: async () => {
          const module = await import("../../Report");
          return { Component: module.ProductionReportPage };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const module = await import("./pages/Settings");
          return { Component: module.SettingsPage };
        },
      },
    ],
  },
]);
