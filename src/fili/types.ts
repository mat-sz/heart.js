export interface Complex {
  re: number;
  im: number;
}

export interface ICF {
  b0: Complex;
  b1: Complex;
  b2: Complex;
  a1: Complex;
  a2: Complex;
  k: Complex;
  z: [number, number];
}

export interface ICC {
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export interface Pole {
  z: [Complex, Complex];
  p: [Complex, Complex];
}
