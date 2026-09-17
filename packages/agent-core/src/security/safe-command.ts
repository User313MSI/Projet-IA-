export interface CommandPolicy {
  /** Active le mode "power user" : exécute sans confirmation (dangereux, par défaut false). */
  powerUser: boolean;
  /** Préfixes de commandes autorisés (exécutables sans confirmation). */
  allowedPrefixes: string[];
  /** Mots-clés destructeurs / sensibles interdits (insensibles à la casse). */
  blockedKeywords: string[];
  /** Timeout par défaut en ms. */
  timeoutMs: number;
}

export const DEFAULT_BLOCKED_KEYWORDS = [
  "rm -rf",
  "rm -fr",
  "rmdir /s",
  "del /f",
  "format",
  "mkfs",
  "dd if=",
  "shutdown",
  "reboot",
  "halt",
  "poweroff",
  "init 0",
  "init 6",
  ":(){:|:&};:",
  "curl ",
  "wget ",
  "nc ",
  "ncat ",
  "netcat",
  "ssh ",
  "scp ",
  "rsync ",
  "chmod 777",
  "chown",
  "visudo",
  "passwd",
  "useradd",
  "userdel",
  "adduser",
  "deluser",
  "sudo",
  "su -",
  "eval",
  "exec ",
  "> /dev/sd",
  "kill -9",
  "pkill",
  "killall",
  "systemctl",
  "service ",
  "crontab",
  "launchctl",
  "reg add",
  "reg delete",
  "regedit",
  "schtasks",
  "powershell -enc",
  "base64 -d",
  "openssl",
  "gpg ",
  "tar --to-stdout",
  "unzip -o",
  "git push",
  "git commit",
  "git config",
  "npm publish",
  "pnpm publish",
  "yarn publish",
];

export const DEFAULT_ALLOWED_PREFIXES = [
  "ls",
  "pwd",
  "cat",
  "head",
  "tail",
  "wc",
  "echo",
  "date",
  "whoami",
  "uname",
  "df",
  "du",
  "free",
  "uptime",
  "echo",
  "node --version",
  "node -v",
  "npm --version",
  "pnpm --version",
  "python --version",
  "python3 --version",
  "git status",
  "git log",
  "git diff",
  "git branch",
  "git show",
  "git remote -v",
  "dir",
  "ver",
];

export const DEFAULT_TIMEOUT_MS = 15000;

export function makeCommandPolicy(powerUser = false): CommandPolicy {
  return {
    powerUser,
    allowedPrefixes: DEFAULT_ALLOWED_PREFIXES,
    blockedKeywords: DEFAULT_BLOCKED_KEYWORDS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export type CommandVerdict =
  | { allowed: true; needsApproval: false }
  | { allowed: true; needsApproval: true }
  | { allowed: false; reason: string };

export function classifyCommand(
  command: string,
  policy: CommandPolicy
): CommandVerdict {
  const cmd = command.trim();
  if (!cmd) {
    return { allowed: false, reason: "commande vide" };
  }
  const lower = cmd.toLowerCase();
  for (const kw of policy.blockedKeywords) {
    if (lower.includes(kw.toLowerCase())) {
      return {
        allowed: false,
        reason: `commande interdite (mot-clé destructeur/sensible détecté: "${kw.trim()}")`,
      };
    }
  }
  // Empêche le chaînage de commandes dangereux via ; && || | >
  const shellMetachars = /[;&|<>`]|\$\(/;
  if (shellMetachars.test(cmd)) {
    // En mode power user, on autorise le chaînage simple mais on garde le blocage par mot-clé.
    if (!policy.powerUser) {
      return {
        allowed: false,
        reason:
          "opérateur shell interdit (; & | > $() `) — requiert le mode power user et confirmation",
      };
    }
  }
  const matchesAllowlist = policy.allowedPrefixes.some((p) =>
    lower.startsWith(p.toLowerCase())
  );
  if (matchesAllowlist) {
    return { allowed: true, needsApproval: false };
  }
  if (policy.powerUser) {
    return { allowed: true, needsApproval: true };
  }
  return {
    allowed: false,
    reason:
      "commande non dans la liste blanche (active le mode power user et confirme pour exécuter)",
  };
}
