import { create } from "zustand";
import type { Token } from "@/lib/types";

interface TokensState {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  upsertToken: (token: Token) => void;
  removeToken: (id: string) => void;
}

export const useTokensStore = create<TokensState>((set) => ({
  tokens: [],
  setTokens: (tokens) => set({ tokens }),
  upsertToken: (token) =>
    set((s) => {
      const idx = s.tokens.findIndex((t) => t.id === token.id);
      if (idx === -1) return { tokens: [...s.tokens, token] };
      const next = [...s.tokens];
      next[idx] = token;
      return { tokens: next };
    }),
  removeToken: (id) =>
    set((s) => ({ tokens: s.tokens.filter((t) => t.id !== id) })),
}));
