/** Exact rational arithmetic using BigInt — no floating point anywhere in validation. */
const abs = (a: bigint) => (a < 0n ? -a : a);
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a); b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export class Fraction {
  readonly num: bigint;
  readonly den: bigint;

  constructor(num: bigint | number, den: bigint | number = 1n) {
    let n = BigInt(num);
    let d = BigInt(den);
    if (d === 0n) throw new RangeError("Division by zero");
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    this.num = n / g;
    this.den = d / g;
  }

  static of(n: number | bigint) { return new Fraction(n); }
  add(o: Fraction) { return new Fraction(this.num * o.den + o.num * this.den, this.den * o.den); }
  sub(o: Fraction) { return new Fraction(this.num * o.den - o.num * this.den, this.den * o.den); }
  mul(o: Fraction) { return new Fraction(this.num * o.num, this.den * o.den); }
  div(o: Fraction) {
    if (o.num === 0n) throw new RangeError("Division by zero");
    return new Fraction(this.num * o.den, this.den * o.num);
  }
  neg() { return new Fraction(-this.num, this.den); }
  isZero() { return this.num === 0n; }
  equals(o: Fraction) { return this.num === o.num && this.den === o.den; }
  toString() { return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`; }
}
