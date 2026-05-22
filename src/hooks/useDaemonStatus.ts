import { useQuery } from "@tanstack/react-query";
import { DaemonAPI } from "@/ipc/daemon";

export function useDaemonStatus() {
  return useQuery({
    queryKey: ["daemon-status"],
    queryFn: DaemonAPI.status,
    refetchInterval: 5000,
  });
}
