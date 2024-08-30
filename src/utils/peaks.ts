import { CalcCascades } from '../fili/calcCascades';
import { IirFilter } from '../fili/iirFilter';
import {
  arrayGradient,
  arrayAbs,
  arrayMultiply,
  arrayGreaterThan,
  arrayAverage,
} from './array';

export function ecgPeaks(signal: number[], samplingRate = 1000) {
  const filtered = signalFilterButterworth(signal, samplingRate, 0.5, 5);
  return ecgFindPeaksNeurokit(filtered, samplingRate);
}

export function ecgFindPeaksNeurokit(
  signal: number[],
  samplingRate = 1000,
  smoothWindow = 0.1,
  avgWindow = 0.75,
  gradThreshWeight = 1.5,
  minLenWeight = 0.4,
  minDelay = 0.3
) {
  const grad = arrayGradient(signal);
  const absGrad = arrayAbs(grad);
  const smoothSize = Math.round(smoothWindow * samplingRate);
  const avgSize = Math.round(avgWindow * samplingRate);
  const smoothGrad = signalSmoothBoxcar(absGrad, smoothSize);
  const avgGrad = signalSmoothBoxcar(smoothGrad, avgSize);
  const gradThreshold = arrayMultiply(avgGrad, gradThreshWeight);
  minDelay = Math.round(samplingRate * minDelay);

  const qrs = arrayGreaterThan(smoothGrad, gradThreshold);
  const begQrs: number[] = [];
  let endQrs: number[] = [];
  for (let i = -1; i < qrs.length - 1; i++) {
    if (!qrs[i] && qrs[i + 1]) {
      begQrs.push(i);
    }
    if (qrs[i] && !qrs[i + 1]) {
      endQrs.push(i);
    }
  }

  if (!begQrs.length) {
    return [];
  }

  endQrs = endQrs.filter(v => v > begQrs[0]);
  const numQrs = Math.min(begQrs.length, endQrs.length);
  const average = arrayAverage(
    new Array(numQrs).fill(0).map((_, i) => endQrs[i] - begQrs[i])
  );
  const minLen = average * minLenWeight;
  const peaks = [0];

  for (let i = 0; i < numQrs; i++) {
    const beg = begQrs[i];
    const end = endQrs[i];
    const lenQrs = end - beg;

    if (lenQrs < minLen) {
      continue;
    }

    const data = signal.slice(beg, end);
    let peak: number = 0;
    for (let j = 0; j < data.length; j++) {
      if (data[j] > peak) {
        peak = j;
      }
    }
    peak += beg;

    if (peak - peaks[peaks.length - 1] > minDelay) {
      peaks.push(peak);
    }
  }

  peaks.shift();
  return peaks;
}

export function signalSmoothBoxcar(signal: number[], size: number) {
  const out: number[] = new Array(signal.length);
  const halfSize = Math.floor(size / 2);
  size = halfSize * 2 + 1; // TODO: Fix

  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let j = i - halfSize; j <= i + halfSize; j++) {
      if (j < 0) {
        sum += signal[0];
      } else if (j >= out.length) {
        sum += signal[out.length - 1];
      } else {
        sum += signal[j];
      }
    }
    out[i] = sum / size;
  }

  return out;
}

export function signalFilterButterworth(
  signal: number[],
  samplingRate: number,
  lowCut: number,
  order: number
) {
  const iirCalculator = new CalcCascades() as any;

  const iirFilterCoeffs = iirCalculator.highpass({
    order, // cascade 3 biquad filters (max: 12)
    characteristic: 'butterworth',
    Fs: samplingRate, // sampling frequency
    Fc: lowCut, // cutoff frequency / center frequency for bandpass, bandstop, peak
    BW: 1, // bandwidth only for bandstop and bandpass filters - optional
    gain: 0, // gain for peak, lowshelf and highshelf
    preGain: false, // adds one constant multiplication for highpass and lowpass
    // k = (1 + cos(omega)) * 0.5 / k = 1 with preGain == false
  });

  // create a filter instance from the calculated coeffs
  const iirFilter = new IirFilter(iirFilterCoeffs);
  return iirFilter.multiStep(signal);
}
