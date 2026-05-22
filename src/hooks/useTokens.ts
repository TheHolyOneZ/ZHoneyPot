import { useQuery } from "@tanstack/react-query";
import { TokensAPI } from "@/ipc/tokens";

export const TOKENS_KEY = ["tokens"] as const;

export function useTokens() {
  return useQuery({
    queryKey: TOKENS_KEY,
    queryFn: TokensAPI.list,
  });
}
