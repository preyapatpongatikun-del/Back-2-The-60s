// Drop-in replacement for the ML for Kids "recognise image" extension.
// Uses a Teachable Machine model (runs fully in the player's browser, no
// dependency on machinelearningforkids.co.uk) but keeps the exact same
// block ids/shapes as the original mlforkidsimages4 / mlforkidsImageData
// extensions, so the existing project blocks do not need to change.

const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/RluRvr2vu/';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-mlkids-src="' + src + '"]')) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.setAttribute('data-mlkids-src', src);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load script: ' + src));
    document.head.appendChild(s);
  });
}

const sharedState = {
  model: null,
  modelPromise: null,
  video: null,
  videoPromise: null
};

async function ensureLibraries() {
  if (typeof tf === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js');
  }
  if (typeof tmImage === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js');
  }
}

async function ensureModel() {
  if (sharedState.model) return sharedState.model;
  if (!sharedState.modelPromise) {
    sharedState.modelPromise = (async () => {
      await ensureLibraries();
      const model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
      sharedState.model = model;
      return model;
    })();
  }
  return sharedState.modelPromise;
}

async function ensureVideo() {
  if (sharedState.video && sharedState.video.readyState >= 2) return sharedState.video;
  if (!sharedState.videoPromise) {
    sharedState.videoPromise = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      await new Promise((resolve) => {
        if (video.readyState >= 2) resolve();
        else video.addEventListener('loadeddata', () => resolve(), { once: true });
      });
      sharedState.video = video;
      return video;
    })();
  }
  return sharedState.videoPromise;
}

async function classify() {
  const model = await ensureModel();
  const video = await ensureVideo();
  const predictions = await model.predict(video);
  predictions.sort((a, b) => b.probability - a.probability);
  return predictions[0];
}

class MLForKidsImagesCompatible {
  getInfo() {
    return {
      id: 'mlforkidsimages4',
      name: 'Back 2 the 60s',
      color1: '#4B4A60',
      color2: '#707070',
      color3: '#4c97ff',
      blocks: [
        {
          opcode: 'label',
          blockType: Scratch.BlockType.REPORTER,
          text: 'recognise image [IMAGE] (label)',
          arguments: { IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: 'image' } }
        },
        {
          opcode: 'confidence',
          blockType: Scratch.BlockType.REPORTER,
          text: 'recognise image [IMAGE] (confidence)',
          arguments: { IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: 'image' } }
        },
        { opcode: 'return_label_0', blockType: Scratch.BlockType.REPORTER, text: ' red' },
        { opcode: 'return_label_1', blockType: Scratch.BlockType.REPORTER, text: ' purple' },
        { opcode: 'return_label_2', blockType: Scratch.BlockType.REPORTER, text: ' green' },
        { opcode: 'return_label_3', blockType: Scratch.BlockType.REPORTER, text: ' white' },
        { opcode: 'return_label_4', blockType: Scratch.BlockType.REPORTER, text: ' orange' }
      ]
    };
  }

  async label() {
    try {
      const r = await classify();
      return r.className;
    } catch (e) {
      console.error('mlkids-extension label error', e);
      return 'Unknown';
    }
  }

  async confidence() {
    try {
      const r = await classify();
      return Math.round(r.probability * 100);
    } catch (e) {
      console.error('mlkids-extension confidence error', e);
      return 0;
    }
  }

  return_label_0() { return 'red'; }
  return_label_1() { return 'purple'; }
  return_label_2() { return 'green'; }
  return_label_3() { return 'white'; }
  return_label_4() { return 'orange'; }
}

class MLForKidsImageDataCompatible {
  getInfo() {
    return {
      id: 'mlforkidsImageData',
      name: 'Back 2 the 60s (camera)',
      color1: '#4B4A60',
      color2: '#707070',
      color3: '#4c97ff',
      blocks: [
        {
          opcode: 'getWebcamFrameImage',
          blockType: Scratch.BlockType.REPORTER,
          text: 'webcam frame'
        }
      ]
    };
  }

  getWebcamFrameImage() {
    // The actual frame is captured live inside label()/confidence() above;
    // this just needs to return a value so it can plug into the IMAGE input.
    return 'frame:' + Date.now();
  }
}

Scratch.extensions.register(new MLForKidsImagesCompatible());
Scratch.extensions.register(new MLForKidsImageDataCompatible());
