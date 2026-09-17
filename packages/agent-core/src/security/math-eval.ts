/**
 * Parseur d'expressions arithmétiques sécurisé (récursif descendant).
 * Supporte : chiffres, + - * / % ** (puissance), parenthèses, et les
 * fonctions Math sans accès à l'objet global (sqrt, sin, cos, tan, log, exp,
 * abs, pow, round, floor, ceil, min, max…).
 * Aucun `eval`/`Function` : pas d'exécution de code arbitraire.
 */

const FUNCTIONS: Record<
  string,
  { arity: number; fn: (args: number[]) => number }
> = {
  sqrt: { arity: 1, fn: (a) => Math.sqrt(a[0] ?? 0) },
  cbrt: { arity: 1, fn: (a) => Math.cbrt(a[0] ?? 0) },
  sin: { arity: 1, fn: (a) => Math.sin(a[0] ?? 0) },
  cos: { arity: 1, fn: (a) => Math.cos(a[0] ?? 0) },
  tan: { arity: 1, fn: (a) => Math.tan(a[0] ?? 0) },
  log: { arity: 1, fn: (a) => Math.log(a[0] ?? 0) },
  log10: { arity: 1, fn: (a) => Math.log10(a[0] ?? 0) },
  log2: { arity: 1, fn: (a) => Math.log2(a[0] ?? 0) },
  exp: { arity: 1, fn: (a) => Math.exp(a[0] ?? 0) },
  abs: { arity: 1, fn: (a) => Math.abs(a[0] ?? 0) },
  pow: { arity: 2, fn: (a) => Math.pow(a[0] ?? 0, a[1] ?? 0) },
  round: { arity: 1, fn: (a) => Math.round(a[0] ?? 0) },
  floor: { arity: 1, fn: (a) => Math.floor(a[0] ?? 0) },
  ceil: { arity: 1, fn: (a) => Math.ceil(a[0] ?? 0) },
  sign: { arity: 1, fn: (a) => Math.sign(a[0] ?? 0) },
  min: { arity: -1, fn: (a) => (a.length ? Math.min(...a) : NaN) },
  max: { arity: -1, fn: (a) => (a.length ? Math.max(...a) : NaN) },
};

const VARIADIC = new Set(["min", "max"]);

class Parser {
  private pos = 0;
  constructor(private src: string) {
    this.src = src.replace(/\s+/g, "");
  }

  private peek(): string {
    return this.src[this.pos] ?? "";
  }

  private eof(): boolean {
    return this.pos >= this.src.length;
  }

  parse(): number {
    const v = this.parseExpr();
    if (!this.eof()) throw new Error(`caractère inattendu: ${this.peek()}`);
    return v;
  }

  // Expr: Term (('+' | '-') Term)*
  private parseExpr(): number {
    let left = this.parseTerm();
    while (!this.eof()) {
      const c = this.peek();
      if (c === "+") {
        this.pos++;
        left = left + this.parseTerm();
      } else if (c === "-") {
        this.pos++;
        left = left - this.parseTerm();
      } else {
        break;
      }
    }
    return left;
  }

  // Term: Factor (('*' | '/' | '%') Factor)*
  private parseTerm(): number {
    let left = this.parseFactor();
    while (!this.eof()) {
      const c = this.peek();
      if (c === "*") {
        this.pos++;
        left = left * this.parseFactor();
      } else if (c === "/") {
        this.pos++;
        const r = this.parseFactor();
        if (r === 0) throw new Error("division par zéro");
        left = left / r;
      } else if (c === "%") {
        this.pos++;
        const r = this.parseFactor();
        if (r === 0) throw new Error("modulo par zéro");
        left = left % r;
      } else {
        break;
      }
    }
    return left;
  }

  // Factor: Unary ('**' Factor)?  (associativité à droite)
  private parseFactor(): number {
    const base = this.parseUnary();
    if (this.peek() === "*" && this.src[this.pos + 1] === "*") {
      this.pos += 2;
      const exp = this.parseFactor();
      return base ** exp;
    }
    return base;
  }

  // Unary: ('+' | '-')? Primary
  private parseUnary(): number {
    if (this.peek() === "-") {
      this.pos++;
      return -this.parseUnary();
    }
    if (this.peek() === "+") {
      this.pos++;
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const c = this.peek();
    if (c === "(") {
      this.pos++;
      const v = this.parseExpr();
      if (this.peek() !== ")") throw new Error("parenthèse fermante manquante");
      this.pos++;
      return v;
    }
    if (c >= "0" && c <= "9") {
      return this.parseNumber();
    }
    if (c >= "a" && c <= "z") {
      return this.parseFunction();
    }
    throw new Error(`caractère interdit: ${c}`);
  }

  private parseNumber(): number {
    let num = "";
    let dot = false;
    while (!this.eof()) {
      const c = this.peek();
      if (c >= "0" && c <= "9") {
        num += c;
        this.pos++;
      } else if (c === "." && !dot) {
        dot = true;
        num += c;
        this.pos++;
      } else {
        break;
      }
    }
    const val = Number(num);
    if (Number.isNaN(val)) throw new Error(`nombre invalide: ${num}`);
    return val;
  }

  private parseFunction(): number {
    let name = "";
    while (!this.eof()) {
      const c = this.peek();
      if (/[a-zA-Z0-9_]/.test(c)) {
        name += c;
        this.pos++;
      } else {
        break;
      }
    }
    const fn = FUNCTIONS[name];
    if (!fn) throw new Error(`fonction inconnue: ${name}`);
    if (this.peek() !== "(") {
      throw new Error(`parenthèse attendue après ${name}`);
    }
    this.pos++;
    const args: number[] = [];
    if (this.peek() === ")") {
      this.pos++;
    } else {
      args.push(this.parseExpr());
      while (this.peek() === ",") {
        this.pos++;
        args.push(this.parseExpr());
      }
      if (this.peek() !== ")") throw new Error("parenthèse fermante manquante");
      this.pos++;
    }
    if (VARIADIC.has(name)) {
      if (args.length === 0) throw new Error(`${name} nécessite au moins un argument`);
    } else {
      if (args.length !== fn.arity) {
        throw new Error(`${name} nécessite ${fn.arity} argument(s), reçu ${args.length}`);
      }
    }
    return fn.fn(args);
  }
}

export function safeEvalMath(expression: string): number {
  const p = new Parser(expression);
  return p.parse();
}
