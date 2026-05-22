import { useState } from "react";
import type React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bot,
  FileText,
  Folder,
  Key,
  Lock,
  Package,
  Rocket,
  Sparkles,
  Terminal,
} from "lucide-react";
import { TokensAPI } from "@/ipc/tokens";
import { TOKENS_KEY } from "@/hooks/useTokens";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { TokenKind } from "@/lib/types";

interface TokenTypeDef {
  kind: TokenKind;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  realism: number;
  description: string;
  suggestedPaths: string[];
  defaultPath: string;
}

const TOKEN_TYPES: TokenTypeDef[] = [
  {
    kind: "aws_credentials",
    label: "AWS Credentials",
    icon: Key,
    realism: 5,
    description: "Fake AKIA keys in the real AWS format. The highest-value target for cloud attackers.",
    suggestedPaths: ["~/.aws/credentials", "~/.aws/credentials.backup", "~/backup/aws-creds"],
    defaultPath: "~/.aws/credentials",
  },
  {
    kind: "dotenv",
    label: ".env File",
    icon: FileText,
    realism: 5,
    description: "DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY. The #1 most accidentally-leaked developer file.",
    suggestedPaths: ["~/projects/.env", "~/projects/app/.env", "~/projects/api/.env", "~/code/backend/.env"],
    defaultPath: "~/projects/app/.env",
  },
  {
    kind: "ssh_keypair",
    label: "SSH Keypair",
    icon: Lock,
    realism: 5,
    description: "Real ed25519 private key in valid PEM format. Looks exactly like a backed-up SSH key.",
    suggestedPaths: ["~/.ssh/id_rsa_backup", "~/.ssh/id_ed25519.old", "~/.ssh/deploy_key", "~/backup/ssh-key"],
    defaultPath: "~/.ssh/id_rsa_backup",
  },
  {
    kind: "git_repo",
    label: "Git Repository",
    icon: Package,
    realism: 4,
    description: "Fake git repo with a leaked credential planted 3–5 commits deep in history. Attracts git log scrapers.",
    suggestedPaths: ["~/projects/internal-tools", "~/projects/company-scripts", "~/dev/backup-tools"],
    defaultPath: "~/projects/internal-tools",
  },
  {
    kind: "passwords_txt",
    label: "Passwords.txt",
    icon: FileText,
    realism: 4,
    description: "Plaintext password list in site:password format. Classic high-signal decoy — no legitimate tool reads this.",
    suggestedPaths: ["~/Documents/passwords.txt", "~/Desktop/passwords.txt", "~/Dropbox/passwords.txt"],
    defaultPath: "~/Documents/passwords.txt",
  },
  {
    kind: "kube_config",
    label: "Kubeconfig",
    icon: Bot,
    realism: 4,
    description: "Fake Kubernetes cluster credentials. Targets cloud-native attackers pivoting into container infrastructure.",
    suggestedPaths: ["~/.kube/config", "~/.kube/config.bak", "~/backup/kubeconfig"],
    defaultPath: "~/.kube/config",
  },
  {
    kind: "docker_config",
    label: "Docker Config",
    icon: Package,
    realism: 4,
    description: "Fake Docker Hub / private registry auth. High value for supply chain attackers.",
    suggestedPaths: ["~/.docker/config.json", "~/backup/docker-config.json"],
    defaultPath: "~/.docker/config.json",
  },
  {
    kind: "npmrc",
    label: ".npmrc",
    icon: Terminal,
    realism: 3,
    description: "Fake npm registry auth token. Targets supply chain attackers looking for publish access.",
    suggestedPaths: ["~/.npmrc", "~/projects/app/.npmrc", "~/projects/lib/.npmrc"],
    defaultPath: "~/.npmrc",
  },
  {
    kind: "pypirc",
    label: ".pypirc",
    icon: Terminal,
    realism: 3,
    description: "Fake PyPI publishing credentials. Lures Python ecosystem supply chain attackers.",
    suggestedPaths: ["~/.pypirc", "~/projects/.pypirc"],
    defaultPath: "~/.pypirc",
  },
  {
    kind: "generic_file",
    label: "Generic File",
    icon: Folder,
    realism: 2,
    description: "A custom file with any content. Use this for domain-specific decoys not covered above.",
    suggestedPaths: ["~/Documents/notes.txt", "~/Documents/secrets.json", "~/backup/config.json"],
    defaultPath: "~/Documents/notes.txt",
  },
];

const schema = z.object({
  path: z.string().min(1, "Path is required"),
  display_name: z.string().optional(),
  severity: z.enum(["info", "warn", "critical"] as const),
  metadata: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TokenCreator() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedKind, setSelectedKind] = useState<TokenKind | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const typeDef = TOKEN_TYPES.find((t) => t.kind === selectedKind);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "warn" },
  });

  const currentPath = watch("path");

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      let meta = {};
      try { meta = JSON.parse(values.metadata ?? "{}"); } catch {}
      return TokensAPI.create({
        kind: selectedKind!,
        path: values.path,
        display_name: values.display_name ?? null,
        metadata: meta,
        severity: values.severity,
        callback_url: null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TOKENS_KEY });
      navigate({ to: "/tokens" });
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Create Token</h1>


      <div className="flex gap-2 text-sm">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className={cn("flex items-center gap-1", s <= step ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]")}>
            <span className={cn(
              "rounded-full w-6 h-6 flex items-center justify-center text-xs border",
              s <= step ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white" : "border-[hsl(var(--muted-foreground))]"
            )}>{s}</span>
            <span>{["Pick Type", "Configure", "Deploy"][s - 1]}</span>
            {s < 3 && <span className="mx-2 text-[hsl(var(--muted-foreground))]">→</span>}
          </div>
        ))}
      </div>


      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Choose the type of decoy file to deploy. Higher realism = harder for an attacker to distinguish from a real credential.
          </p>
          <div className="grid gap-2">
            {TOKEN_TYPES.map((t) => (
              <button
                key={t.kind}
                onClick={() => {
                  setSelectedKind(t.kind);
                  setValue("path", "");
                  setStep(2);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-colors",
                  selectedKind === t.kind && "border-[hsl(var(--primary))]"
                )}
              >
                <t.icon className="h-6 w-6 shrink-0 mt-0.5 text-[hsl(var(--primary))]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{t.label}</span>
                    <RealismBadge value={t.realism} />
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{t.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}


      {step === 2 && selectedKind && typeDef && (
        <form onSubmit={handleSubmit(() => setStep(3))} className="space-y-5">
          <div className="rounded-lg border bg-[hsl(var(--muted))] px-4 py-3 flex gap-3 items-center">
            <typeDef.icon className="h-6 w-6 text-[hsl(var(--primary))]" />
            <div>
              <p className="font-medium text-sm">{typeDef.label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{typeDef.description}</p>
            </div>
          </div>


          <div>
            <label className="mb-1 block text-sm font-medium">Deployment Path</label>
            <input
              {...register("path")}
              placeholder={typeDef.defaultPath}
              className="w-full rounded-md border bg-[hsl(var(--background))] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
            {errors.path && <p className="mt-1 text-xs text-red-500">{errors.path.message}</p>}


            <div className="mt-2">
              <div className="flex items-center gap-1 mb-1.5">
                <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
                <span className="text-xs font-medium text-[hsl(var(--primary))]">Suggested realistic paths</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {typeDef.suggestedPaths.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue("path", p)}
                    className={cn(
                      "rounded border px-2 py-1 font-mono text-xs transition-colors",
                      currentPath === p
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                These paths look natural on a real workstation. Click one to use it, or type your own.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Display Name <span className="text-[hsl(var(--muted-foreground))]">(optional)</span>
            </label>
            <input
              {...register("display_name")}
              placeholder={`My ${typeDef.label}`}
              className="w-full rounded-md border bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Alert Severity</label>
            <Select {...register("severity")} className="w-full">
              <option value="info">Info — low-priority, log only</option>
              <option value="warn">Warn — notify immediately (recommended)</option>
              <option value="critical">Critical — maximum urgency</option>
            </Select>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Credentials (AWS, SSH, .env) should be Warn or Critical. Generic files can be Info.
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]">
              Back
            </button>
            <button type="submit"
              className="flex-1 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90">
              Next →
            </button>
          </div>
        </form>
      )}


      {step === 3 && typeDef && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <p className="font-medium">Review</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[hsl(var(--muted-foreground))]">
              <span>Type</span>       <span className="font-medium text-[hsl(var(--foreground))] flex items-center gap-1"><typeDef.icon className="h-4 w-4" /> {typeDef.label}</span>
              <span>Path</span>       <span className="font-mono text-[hsl(var(--foreground))] break-all">{watch("path")}</span>
              <span>Severity</span>   <span className="capitalize text-[hsl(var(--foreground))]">{watch("severity")}</span>
              {watch("display_name") && <>
                <span>Name</span>     <span className="text-[hsl(var(--foreground))]">{watch("display_name")}</span>
              </>}
            </div>
          </div>

          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            The file will be written to disk immediately and the watcher will start monitoring it.
            Any access will generate an alert.
          </p>

          {mutation.error && (
            <p className="text-sm text-red-500">{(mutation.error as Error).message}</p>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]">
              Back
            </button>
            <button
              onClick={() => handleSubmit((v) => mutation.mutate(v))()}
              disabled={mutation.isPending}
              className="flex-1 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? "Deploying…" : <><Rocket className="inline h-4 w-4 mr-1" />Deploy Token</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RealismBadge({ value }: { value: number }) {
  const barColor = value >= 5 ? "bg-green-600" : value >= 4 ? "bg-yellow-600" : "bg-gray-400";
  return (
    <span className="inline-flex gap-0.5 items-center" title={`Realism: ${value}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn("inline-block h-2 w-2 rounded-sm", i < value ? barColor : "bg-gray-200 dark:bg-gray-700")}
        />
      ))}
    </span>
  );
}
