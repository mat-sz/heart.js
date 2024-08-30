import { useCallback, useRef, useState } from 'react';
import './App.scss';
import { ecgPeaks } from './utils/peaks';
import { arrayAverage, arrayNormalize } from './utils/array';

const WEBCAM_BLACKLIST = ['front', 'double', 'triple'];

const sleep = (time: number) =>
  new Promise(resolve => {
    setTimeout(resolve, time);
  });

function getAverageRed(ctx: CanvasRenderingContext2D) {
  const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

  let sumR = 0;
  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      const offset = (y * data.width + x) * 4;
      sumR += data.data[offset];
    }
  }

  return sumR / (data.width * data.height);
}

function getPresetCameraName() {
  return 'Back Telephoto Camera';
}

async function requestPermission() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { exact: 'environment' },
    },
  });

  return !!stream;
}

async function findCamera(onLog?: (log: string) => void) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const presetCameraName = getPresetCameraName();
  if (presetCameraName) {
    const find = presetCameraName.toLowerCase();
    for (const device of devices) {
      if (device.label.toLowerCase() === find) {
        onLog?.(`Using hardcoded camera label - ${device.label}`);
        return device;
      }
    }
  }

  const canvas = document.createElement('canvas');
  const video = document.createElement('video');
  const ctx = canvas.getContext('2d')!;

  canvas.width = 200;
  canvas.height = 200;

  let maxAvgR = 0;
  let maxDevice: MediaDeviceInfo | undefined = undefined;

  for (const device of devices) {
    if (device.kind !== 'videoinput') {
      continue;
    }

    onLog?.(`== Device ${device.label} ==`);

    const label = device.label.toLowerCase();
    let exit = false;
    for (const word of WEBCAM_BLACKLIST) {
      if (label.includes(word)) {
        exit = true;
        break;
      }
    }

    if (exit) {
      onLog?.(`Blacklisted`);
      continue;
    }

    onLog?.(`Getting stream`);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: device.deviceId,
        torch: true,
      } as any,
    });

    video.srcObject = stream;
    video.play();
    await sleep(500);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const avgR = getAverageRed(ctx);
    onLog?.(`Average red ${avgR}`);

    if (avgR > maxAvgR) {
      maxAvgR = avgR;
      maxDevice = device;
    }
  }

  if (maxAvgR < 128 || !maxDevice) {
    return undefined;
  }

  return maxDevice;
}

function App() {
  const [log, setLog] = useState('');
  const [bpm, setBPM] = useState(0);
  const chartRef = useRef<HTMLCanvasElement>(null);

  const appendLog = useCallback(
    (text: string) => {
      setLog(log => `${log}\n${text}`);
    },
    [setLog]
  );

  const run = useCallback(async () => {
    if (!(await requestPermission())) {
      appendLog(`Unable to obtain camera permission`);
      return;
    }

    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    const ctx = canvas.getContext('2d')!;
    const chart = chartRef.current!;
    const chartCtx = chart.getContext('2d')!;

    canvas.width = 200;
    canvas.height = 200;

    const device = await findCamera(appendLog);
    if (!device) {
      appendLog('Unable to find suitable camera');
      return;
    }

    const finalStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: device.deviceId,
        torch: true,
      } as any,
    });

    appendLog('Waiting for stream');
    video.srcObject = finalStream;
    video.play();
    await sleep(1000);

    const SAMPLE_RATE = 60; // Hz
    const WINDOW_SEC = 5; // seconds
    const WINDOW_SIZE = WINDOW_SEC * SAMPLE_RATE; // Keep last x seconds.
    const CHART_MIDDLE = Math.floor(chart.height / 2);

    let samples: number[] = [];
    const onFrame = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const avgR = getAverageRed(ctx);

      samples.push(255 - avgR);
      if (samples.length > WINDOW_SIZE) {
        samples = samples.slice(-WINDOW_SIZE);
      }

      const normalized = arrayNormalize(samples);
      chartCtx.clearRect(0, 0, chart.width, chart.height);
      chartCtx.fillStyle = 'red';
      chartCtx.fillRect(0, CHART_MIDDLE, chart.width, 1);

      chartCtx.fillStyle = 'blue';
      chartCtx.strokeStyle = 'blue';
      chartCtx.beginPath();
      chartCtx.moveTo(0, CHART_MIDDLE);
      for (let i = 0; i < normalized.length; i++) {
        chartCtx.lineTo(i, CHART_MIDDLE - normalized[i] * CHART_MIDDLE);
      }
      chartCtx.stroke();
      chartCtx.closePath();

      const peaks = ecgPeaks(normalized, SAMPLE_RATE);
      chartCtx.fillStyle = 'yellow';
      for (const peak of peaks) {
        chartCtx.fillRect(peak, 0, 1, chart.height);
      }
      const timeBetweenPeaks = [];
      for (let i = 0; i < peaks.length - 1; i++) {
        timeBetweenPeaks.push(peaks[i + 1] - peaks[i]);
      }
      setBPM(60 / (arrayAverage(timeBetweenPeaks) / SAMPLE_RATE));
    };

    setInterval(onFrame, 1000 / SAMPLE_RATE);
  }, [appendLog, setBPM]);

  return (
    <div>
      <span>BPM: {Math.round(bpm)}</span>
      <pre>{log}</pre>
      <canvas width={600} height={255} ref={chartRef} />
      <button onClick={run}>Get heartrate</button>
    </div>
  );
}

export default App;
