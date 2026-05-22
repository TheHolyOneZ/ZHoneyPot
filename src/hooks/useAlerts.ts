import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AlertsAPI } from "@/ipc/alerts";
import { subscribeToAlerts, useAlertsStore } from "@/stores/alertsStore";

export function useAlerts(limit = 100) {
  const { alerts, setAlerts } = useAlertsStore();

  const query = useQuery({
    queryKey: ["alerts", limit],
    queryFn: () => AlertsAPI.list(limit),
  });

  useEffect(() => {
    if (query.data) setAlerts(query.data);
  }, [query.data, setAlerts]);

  useEffect(() => {
    subscribeToAlerts();
  }, []);

  return { alerts: query.data ?? alerts, isLoading: query.isLoading };
}
