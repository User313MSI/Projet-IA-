import {
  makePathPolicy as coreMakePathPolicy,
  type PathPolicy,
} from "./safe-path";
import {
  makeCommandPolicy as coreMakeCommandPolicy,
  type CommandPolicy,
} from "./safe-command";

export function makePathPolicy(root: string): PathPolicy {
  return coreMakePathPolicy(root);
}

export function makeCommandPolicy(powerUser = false): CommandPolicy {
  return coreMakeCommandPolicy(powerUser);
}
