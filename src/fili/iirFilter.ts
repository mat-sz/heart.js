import { IIRCoeffs } from './iirCoeffs';
import { Complex, ICC, ICF, Pole } from './types';
import { runMultiFilter, runMultiFilterReverse } from './utils';

class IirFilter {
  cone = {
    re: 1,
    im: 0,
  };

  cf: ICF[] = [];
  cc: ICC[] = [];
  f: IIRCoeffs[] = [];

  constructor(filter: IIRCoeffs[]) {
    this.f = filter;
    var cf: ICF[] = [];
    var cc: ICC[] = [];
    for (var cnt = 0; cnt < filter.length; cnt++) {
      var s = filter[cnt];
      cf[cnt] = {
        b0: {
          re: s.b[0],
          im: 0,
        },
        b1: {
          re: s.b[1],
          im: 0,
        },
        b2: {
          re: s.b[2],
          im: 0,
        },
        a1: {
          re: s.a[0],
          im: 0,
        },
        a2: {
          re: s.a[1],
          im: 0,
        },
        k: {
          re: s.k,
          im: 0,
        },
        z: [0, 0],
      };
      cc[cnt] = {
        b1: s.b[1] / s.b[0],
        b2: s.b[2] / s.b[0],
        a1: s.a[0],
        a2: s.a[1],
      };
    }

    this.cf = cf;
    this.cc = cc;
    this.doStep = this.doStep.bind(this);
  }

  private runStage(s: ICF, input: number) {
    var temp = input * s.k.re - s.a1.re * s.z[0] - s.a2.re * s.z[1];
    var out = s.b0.re * temp + s.b1.re * s.z[0] + s.b2.re * s.z[1];
    s.z[1] = s.z[0];
    s.z[0] = temp;
    return out;
  }

  private doStep(input: number, coeffs: ICF[]) {
    var out = input;
    var cnt = 0;
    for (cnt = 0; cnt < coeffs.length; cnt++) {
      out = this.runStage(coeffs[cnt], out);
    }
    return out;
  }

  reinit() {
    var tempF: ICF[] = [];
    for (var cnt = 0; cnt < this.f.length; cnt++) {
      const s = this.f[cnt];
      tempF[cnt] = {
        b0: {
          re: s.b[0],
          im: 0,
        },
        b1: {
          re: s.b[1],
          im: 0,
        },
        b2: {
          re: s.b[2],
          im: 0,
        },
        a1: {
          re: s.a[0],
          im: 0,
        },
        a2: {
          re: s.a[1],
          im: 0,
        },
        k: {
          re: s.k,
          im: 0,
        },
        z: [0, 0],
      };
    }
    return tempF;
  }

  simulate(input: number[]) {
    var tempF = this.reinit();
    return runMultiFilter(input, tempF, this.doStep);
  }

  filtfilt(input: number[], overwrite = false) {
    return runMultiFilterReverse(
      runMultiFilter(input, this.cf, this.doStep, overwrite),
      this.cf,
      this.doStep,
      true
    );
  }

  multiStep(input: number[], overwrite = false) {
    return runMultiFilter(input, this.cf, this.doStep, overwrite);
  }

  singleStep(input: number) {
    return this.doStep(input, this.cf);
  }

  private getComplRes(n1: number, n2: number): [Complex, Complex] {
    var innerSqrt = Math.pow(n1 / 2, 2) - n2;
    if (innerSqrt < 0) {
      return [
        {
          re: -n1 / 2,
          im: Math.sqrt(Math.abs(innerSqrt)),
        },
        {
          re: -n1 / 2,
          im: -Math.sqrt(Math.abs(innerSqrt)),
        },
      ];
    } else {
      return [
        {
          re: -n1 / 2 + Math.sqrt(innerSqrt),
          im: 0,
        },
        {
          re: -n1 / 2 - Math.sqrt(innerSqrt),
          im: 0,
        },
      ];
    }
  }

  polesZeros() {
    var res: Pole[] = [];
    for (var cnt = 0; cnt < this.cc.length; cnt++) {
      res[cnt] = {
        z: this.getComplRes(this.cc[cnt].b1, this.cc[cnt].b2),
        p: this.getComplRes(this.cc[cnt].a1, this.cc[cnt].a2),
      };
    }
    return res;
  }
}

export { IirFilter };
