import { useState } from 'react';
import axios from 'axios';
import './App.scss';

const defaultText = `I'm baby truffaut portland wayfarers fam, post-ironic deep v venmo messenger bag pug butcher flannel brunch plaid hashtag. Succulents readymade craft beer tote bag Brooklyn coloring book meggings hoodie literally selvage master cleanse austin marfa gastropub squid.`;

// https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createWaveShaper
const makeDistortionCurve = amount => {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;

  for (let i = 0; i < n_samples; i++) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

const App = () => {
  
  const [text, setText] = useState(defaultText);
  const [sentimentType, setSentimentType] = useState('');
  const [sentimentScore, setSentimentScore] = useState(0);
  const [distortionMultiplier, setDistortionMultiplier] = useState(0);
  
  const audioContext = new AudioContext();

  const biquadFilter = audioContext.createBiquadFilter();
  biquadFilter.frequency.setValueAtTime(500, audioContext.currentTime);

  const distortion = audioContext.createWaveShaper();
  distortion.curve = makeDistortionCurve(0); // this will be updated later
  
  const gain = audioContext.createGain();
  
  // https://rapidapi.com/twinword/api/twinword-text-analysis-bundle
  const getSentiment = async text => {

    const encodedParams = new URLSearchParams();
    encodedParams.set('text', text);

    const options = {
      method: 'POST',
      url: process.env.REACT_APP_API_URL,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-RapidAPI-Key': process.env.REACT_APP_API_KEY,
        'X-RapidAPI-Host': process.env.REACT_APP_API_HOST,
      },
      data: encodedParams,
    };

    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      return error;
    }
  }

  const playTone = word => {
    const osc = audioContext.createOscillator();
    osc.frequency.value = word.length * 50;
    osc.type = "square";
    osc.connect(biquadFilter);
    biquadFilter.connect(distortion);
    distortion.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();

    return osc;
  };

  const sonifyWords = remainingWords => {
    const currentWord = remainingWords.shift();
    if (!currentWord) return;
    
    const osc = playTone(currentWord);

    setTimeout(() => {
      osc.stop();
      sonifyWords(remainingWords);
    }, 500);
  };

  const sonify = async text => {
    const sentiment = await getSentiment(text);

    let distortionMultiplier = 0;
    const { type, score } = sentiment;

    setSentimentType(type);
    setSentimentScore(score);

    if (type === 'negative') {
      // invert so that negative sentiment is more distorted
      distortionMultiplier = score * -100;
      setDistortionMultiplier(distortionMultiplier);
    }

    distortion.curve = makeDistortionCurve(distortionMultiplier);

    const sentences = text.split('.');
    const words = sentences.map(sentence => sentence.split(' ')).flat().filter(word => word !== '');

    sonifyWords(words);
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col">
          <h1 className="mt-5">Text Sonification</h1>
          <p>Enter Text Below:</p>
          <textarea 
            className="w-100" 
            value={text} 
            onChange={e => setText(e.target.value)} />
          <div className="d-flex justify-content-between my-4">
            <button 
              className="btn btn-secondary"
              onClick={() => setText('')}>
              Clear
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => sonify(text)}>
              Sonify
            </button>
          </div>

          <div>
            <p>Sentiment Type: {sentimentType}</p>
            <p>Sentiment Score: {sentimentScore}</p>
            <p>Distortion Multiplier: {distortionMultiplier}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
