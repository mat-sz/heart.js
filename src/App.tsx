import { useCallback, useRef, useState } from 'react';
import './App.scss';

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

function App() {
  const [log, setLog] = useState('');
  const chartRef = useRef<HTMLCanvasElement>(null);

  const appendLog = useCallback(
    (text: string) => {
      setLog(log => `${log}\n${text}`);
    },
    [setLog]
  );

  const run = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: 'environment' },
      },
    });

    if (!stream) {
      appendLog(`Can't find camera`);
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    const ctx = canvas.getContext('2d')!;
    const chart = chartRef.current!;
    const chartCtx = chart.getContext('2d')!;

    canvas.width = 200;
    canvas.height = 200;
    chartCtx.fillStyle = 'red';

    let maxAvgR = 0;
    let maxDevice: MediaDeviceInfo | undefined = undefined;

    for (const device of devices) {
      if (device.kind !== 'videoinput') {
        continue;
      }

      appendLog(`== Device ${device.label} ==`);

      const label = device.label.toLowerCase();
      let exit = false;
      for (const word of WEBCAM_BLACKLIST) {
        if (label.includes(word)) {
          exit = true;
          break;
        }
      }

      if (exit) {
        appendLog(`Blacklisted`);
        continue;
      }

      appendLog(`Getting stream`);
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
      appendLog(`Average red ${avgR}`);

      if (avgR > maxAvgR) {
        maxAvgR = avgR;
        maxDevice = device;
      }
    }

    if (maxAvgR < 128 || !maxDevice) {
      appendLog('Unable to find camera for heartrate measurement');
      return;
    }

    appendLog(`Found camera - ${maxDevice?.label}`);

    const finalStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: maxDevice.deviceId,
        torch: true,
      } as any,
    });

    appendLog('Waiting for stream');
    video.srcObject = finalStream;
    video.play();
    await sleep(1000);

    let current = 0;
    const onFrame = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const avgR = getAverageRed(ctx);

      chartCtx.clearRect(current, 0, 1, chart.height);
      chartCtx.fillRect(current, 255 - avgR, 1, 1);
      current++;
      if (current >= chart.width) {
        current = 0;
      }
    };

    setInterval(onFrame, 20);
  }, [appendLog]);

  return (
    <div>
      <pre>{log}</pre>
      <canvas width={600} height={255} ref={chartRef} />
      <button onClick={run}>Get heartrate</button>
    </div>
  );
}

export default App;
