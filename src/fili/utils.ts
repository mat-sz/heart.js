import { Complex, ICF } from './types';

/**
 * Evaluate phase
 */
export function evaluatePhase(res) {
  var xcnt = 0;
  var cnt = 0;
  var pi = Math.PI;
  var tpi = 2 * pi;
  var phase = [];
  for (cnt = 0; cnt < res.length; cnt++) {
    phase.push(res[cnt].phase);
  }
  res[0].unwrappedPhase = res[0].phase;
  res[0].groupDelay = 0;
  // TODO: more sophisticated phase unwrapping needed
  for (cnt = 1; cnt < phase.length; cnt++) {
    var diff = phase[cnt] - phase[cnt - 1];
    if (diff > pi) {
      for (xcnt = cnt; xcnt < phase.length; xcnt++) {
        phase[xcnt] -= tpi;
      }
    } else if (diff < -pi) {
      for (xcnt = cnt; xcnt < phase.length; xcnt++) {
        phase[xcnt] += tpi;
      }
    }
    if (phase[cnt] < 0) {
      res[cnt].unwrappedPhase = -phase[cnt];
    } else {
      res[cnt].unwrappedPhase = phase[cnt];
    }

    res[cnt].phaseDelay = res[cnt].unwrappedPhase / (cnt / res.length);
    res[cnt].groupDelay =
      (res[cnt].unwrappedPhase - res[cnt - 1].unwrappedPhase) /
      (pi / res.length);
    if (res[cnt].groupDelay < 0) {
      res[cnt].groupDelay = -res[cnt].groupDelay;
    }
  }
  if (res[0].magnitude !== 0) {
    res[0].phaseDelay = res[1].phaseDelay;
    res[0].groupDelay = res[1].groupDelay;
  } else {
    res[0].phaseDelay = res[2].phaseDelay;
    res[0].groupDelay = res[2].groupDelay;
    res[1].phaseDelay = res[2].phaseDelay;
    res[1].groupDelay = res[2].groupDelay;
  }
}

/**
 * Run multi filter
 */
export function runMultiFilter(
  input: number[],
  d: ICF[],
  doStep: (input: number, d: ICF[]) => number,
  overwrite = false
) {
  var out: number[] = [];
  if (overwrite) {
    out = input;
  }
  var i;
  for (i = 0; i < input.length; i++) {
    out[i] = doStep(input[i], d);
  }
  return out;
}

export function runMultiFilterReverse(
  input: number[],
  d: ICF[],
  doStep: (input: number, d: ICF[]) => number,
  overwrite = false
) {
  var out: number[] = [];
  if (overwrite) {
    out = input;
  }
  var i;
  for (i = input.length - 1; i >= 0; i--) {
    out[i] = doStep(input[i], d);
  }
  return out;
}

var factorial = function (n: number, a: number) {
  if (!a) {
    a = 1;
  }
  if (n !== Math.floor(n) || a !== Math.floor(a)) {
    return 1;
  }
  if (n === 0 || n === 1) {
    return a;
  } else {
    return factorial(n - 1, a * n);
  }
};

/**
 * Complex
 */
export const complex = {
  div: function (p: Complex, q: Complex) {
    var a = p.re;
    var b = p.im;
    var c = q.re;
    var d = q.im;
    var n = c * c + d * d;
    var x = {
      re: (a * c + b * d) / n,
      im: (b * c - a * d) / n,
    };
    return x;
  },
  mul: function (p: Complex, q: Complex) {
    var a = p.re;
    var b = p.im;
    var c = q.re;
    var d = q.im;
    var x = {
      re: a * c - b * d,
      im: (a + b) * (c + d) - a * c - b * d,
    };
    return x;
  },
  add: function (p: Complex, q: Complex) {
    var x = {
      re: p.re + q.re,
      im: p.im + q.im,
    };
    return x;
  },
  sub: function (p: Complex, q: Complex) {
    var x = {
      re: p.re - q.re,
      im: p.im - q.im,
    };
    return x;
  },
  phase: function (n: Complex) {
    return Math.atan2(n.im, n.re);
  },
  magnitude: function (n: Complex) {
    return Math.sqrt(n.re * n.re + n.im * n.im);
  },
};
