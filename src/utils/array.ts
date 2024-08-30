export function arrayAverage(array: number[]) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum / array.length;
}

export function arrayNormalize(array: number[]) {
  let avg = arrayAverage(array);
  let min = Math.min(...array) - avg;
  let max = Math.max(...array) - avg;
  const normalized: number[] = [];
  for (let i = 0; i < array.length; i++) {
    normalized.push(((array[i] - avg - min) / (max - min)) * 2 - 1);
  }

  return normalized;
}

export function arrayGreaterThan(a: number[], b: number[]) {
  return a.map((v, i) => typeof b[i] !== 'undefined' && v > b[i]);
}

export function arrayAbs(array: number[]) {
  return array.map(v => Math.abs(v));
}

export function arrayGradient(array: number[]) {
  const out: number[] = new Array(array.length);
  for (let i = 0; i < array.length; i++) {
    if (i === 0) {
      out[i] = array[1] - array[0];
    } else if (i === array.length - 1) {
      out[i] = array[i] - array[i - 1];
    } else {
      out[i] = (array[i + 1] - array[i - 1]) / 2;
    }
  }

  return out;
}

export function arrayMultiply(array: number[], factor: number) {
  return array.map(v => v * factor);
}

export function arrayRound(array: number[]) {
  return array.map(v => Math.round(v));
}
