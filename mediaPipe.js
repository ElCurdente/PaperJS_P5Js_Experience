
const video3 = document.getElementsByClassName('input_video3')[0];
const out3 = document.createElement('canvas');
canvasvideo.classList.add('output3');
canvasvideo.width = '200px';
canvasvideo.height = '200px';
// const out3 = document.getElementsByClassName('output3')[0];
const controlsElement3 = document.getElementsByClassName('control3')[0];
const canvasCtx3 = out3.getContext('2d');
const fpsControl = new FPS();


const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

function onResultsHands(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();

  canvasCtx3.save();
  canvasCtx3.clearRect(0, 0, out3.width, out3.height);
  canvasCtx3.drawImage(
    results.image, 0, 0, out3.width, out3.height);
  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      const classification = results.multiHandedness[index];
      const isRightHand = classification.label === 'Right';
      const landmarks = results.multiHandLandmarks[index];
      drawConnectors(
        canvasCtx3, landmarks, HAND_CONNECTIONS,
        { color: isRightHand ? '#00FF00' : '#FF0000' }),
        drawLandmarks(canvasCtx3, landmarks, {
          color: isRightHand ? '#00FF00' : '#FF0000',
          fillColor: isRightHand ? '#FF0000' : '#00FF00',
          radius: (x) => {
            return lerp(x.from.z, -0.15, .1, 10, 1);
          }
        });
    }

    for (let i = 0; i < results.multiHandLandmarks[0].length; i++) {
      sessionStorage.setItem(i, JSON.stringify(results.multiHandLandmarks[0][i]));
      localStorage.setItem('isHands', true);
    }
  } else {
    sessionStorage.clear();
    localStorage.setItem('isHands', false);
  }
  canvasCtx3.restore();
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1/${file}`;
  }
});
hands.onResults(onResultsHands);

const camera = new Camera(video3, {
  onFrame: async () => {
    await hands.send({ image: video3 });
  },
  width: 480,
  height: 480
});
const startButton = document.querySelector('#startButton');
startButton.addEventListener('click', () => {
  camera.start();
  startButton.remove();
});

new ControlPanel(controlsElement3, {
  selfieMode: true,
  maxNumHands: 2,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
})
  .add([
    new StaticText({ title: 'MediaPipe Hands' }),
    fpsControl,
    new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new Slider(
      { title: 'Max Number of Hands', field: 'maxNumHands', range: [1, 4], step: 1 }),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
    new Slider({
      title: 'Min Tracking Confidence',
      field: 'minTrackingConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  .on(options => {
    video3.classList.toggle('selfie', options.selfieMode);
    hands.setOptions(options);
  });

/**
* P5
*/
let fft, audio, toggleBtn, mapBass, mapTremble, mapMid, waveform, micLevel
const s = (p) => {

  p.setup = () => {
    fft = new p5.AudioIn()
    startButton.addEventListener('click', () => {
      fft.start()
    });
  }

  p.draw = () => {
    micLevel = fft.getLevel()
  }
}
new p5(s)

const tick = () => {
  requestAnimationFrame(tick);
  if (micLevel > 0.01) {
    localStorage.setItem('micLevel', micLevel)
  } else {
    localStorage.setItem('micLevel', '')
  }
}

tick()