import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree";
import { SettingsAPI } from "./ipc/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function ThemeBootstrap() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: SettingsAPI.get,
  });
  useEffect(() => {
    const theme = settings?.theme ?? "system";
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, [settings?.theme]);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBootstrap />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
