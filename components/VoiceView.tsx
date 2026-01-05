
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, encode, decodeAudioData, createBlob } from '../services/audioUtils';

const VoiceView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  // Audio Settings State with localStorage persistence
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string>(() => 
    localStorage.getItem('ohm_voice_output_id') || 'default'
  );
  const [sampleRate, setSampleRate] = useState<number>(() => {
    const saved = localStorage.getItem('ohm_voice_sample_rate');
    return saved ? Number(saved) : 24000;
  });
  const [numChannels, setNumChannels] = useState<number>(() => {
    const saved = localStorage.getItem('ohm_voice_channels');
    return saved ? Number(saved) : 1;
  });
  const [showSettings, setShowSettings] = useState(false);

  // Hands-free State
  const [isHandsFreeEnabled, setIsHandsFreeEnabled] = useState(() => 
    localStorage.getItem('ohm_hands_free') === 'true'
  );
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const recognitionRef = useRef<any>(null);
  const speakingTimeoutRef = useRef<number | null>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('ohm_voice_output_id', selectedOutputId);
    localStorage.setItem('ohm_voice_sample_rate', sampleRate.toString());
    localStorage.setItem('ohm_voice_channels', numChannels.toString());
    localStorage.setItem('ohm_hands_free', isHandsFreeEnabled.toString());
  }, [selectedOutputId, sampleRate, numChannels, isHandsFreeEnabled]);

  const startSession = async () => {
    if (isConnecting || isActive) return;
    
    // Stop wake word listener before starting main session to free mic
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsWakeWordListening(false);
    }

    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: sampleRate 
      });

      if (selectedOutputId !== 'default' && (outputCtx as any).setSinkId) {
        try {
          await (outputCtx as any).setSinkId(selectedOutputId);
        } catch (err) {
          console.warn('Browser does not support setSinkId or device is unavailable:', err);
        }
      }

      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Voice session opened');
            setIsActive(true);
            setIsConnecting(false);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              
              if (rms > 0.015) {
                setIsUserSpeaking(true);
                if (speakingTimeoutRef.current) window.clearTimeout(speakingTimeoutRef.current);
                speakingTimeoutRef.current = window.setTimeout(() => {
                  setIsUserSpeaking(false);
                }, 150);
              }

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const outCtx = outputAudioContextRef.current;
              if (!outCtx) return;

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, numChannels);
              
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + ' ' + message.serverContent.outputTranscription.text);
            }
          },
          onerror: (e) => {
            console.error('Voice error:', e);
            stopSession();
          },
          onclose: () => {
            console.log('Voice session closed');
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: 'You are OhM, a helpful voice assistant. Keep responses short and conversational.',
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start voice session:', err);
      setIsConnecting(false);
      if (isHandsFreeEnabled) startWakeWordListener();
    }
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    setIsUserSpeaking(false);
    
    // Resume wake word listening if hands-free is enabled
    if (isHandsFreeEnabled) {
      setTimeout(() => startWakeWordListener(), 500);
    }
  }, [isHandsFreeEnabled]);

  const startWakeWordListener = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.toLowerCase();
          console.log('Heard:', text);
          if (text.includes('ohm') || text.includes('start')) {
            console.log('Wake word detected!');
            startSession();
            return;
          }
        }
      }
    };

    recognition.onend = () => {
      // Restart if still enabled and not in a main session
      if (isHandsFreeEnabled && !isActive && !isConnecting) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsWakeWordListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsHandsFreeEnabled(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsWakeWordListening(true);
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, [isActive, isConnecting, isHandsFreeEnabled]);

  useEffect(() => {
    if (isHandsFreeEnabled && !isActive && !isConnecting) {
      startWakeWordListener();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsWakeWordListening(false);
      }
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isHandsFreeEnabled, isActive, isConnecting, startWakeWordListener]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const outputs = allDevices.filter(device => device.kind === 'audiooutput');
        setDevices(outputs);
      } catch (err) {
        console.error('Error fetching devices:', err);
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    return () => {
      stopSession();
      if (speakingTimeoutRef.current) window.clearTimeout(speakingTimeoutRef.current);
    };
  }, [stopSession]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl w-full text-center space-y-8 py-10">
        <div className="relative flex justify-center items-center">
          {/* Main Visual Circle */}
          <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner relative ${
            isActive ? 'bg-indigo-600/10 dark:bg-indigo-600/20 scale-110' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'
          }`}>
            {isActive && (
              <>
                <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/10 dark:bg-indigo-500/10"></div>
                <div className="absolute inset-4 rounded-full animate-pulse bg-indigo-500/20 dark:bg-indigo-500/20"></div>
              </>
            )}
            
            {/* User Speaking Feedback Ring */}
            {isUserSpeaking && isActive && (
              <div className="absolute inset-[-15px] rounded-full border-4 border-cyan-400 dark:border-cyan-500 animate-pulse opacity-75 blur-sm"></div>
            )}

            {/* Wake word status ring */}
            {isWakeWordListening && !isActive && !isConnecting && (
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-indigo-500/30 animate-[spin_10s_linear_infinite]"></div>
            )}

            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
              isActive ? 'bg-indigo-600 shadow-2xl shadow-indigo-600/40' : 'bg-slate-50 dark:bg-slate-800 shadow-lg'
            }`}>
              <i className={`fa-solid ${isConnecting ? 'fa-spinner fa-spin' : 'fa-microphone'} text-5xl md:text-6xl ${
                isActive ? 'text-white' : 
                isWakeWordListening ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 
                'text-slate-400 dark:text-white'
              }`}></i>
            </div>
            
            {isUserSpeaking && isActive && (
              <div className="absolute -bottom-4 bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-cyan-500/30 animate-bounce">
                Voice Detected
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            {isConnecting ? 'Connecting...' : 
             isActive ? (isUserSpeaking ? 'Listening to You...' : 'OhM is Listening') : 
             isWakeWordListening ? 'Ready for "Hey OhM"' : 
             'Real-time Voice'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isWakeWordListening 
              ? 'Say "Hey OhM" or "Start OhM" to begin hands-free.' 
              : 'Experience ultra-low latency multimodal conversations.'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex justify-center gap-4">
            {!isActive ? (
              <button
                onClick={startSession}
                disabled={isConnecting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <i className="fa-solid fa-play"></i>
                Start Conversation
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <i className="fa-solid fa-stop"></i>
                End Call
              </button>
            )}
            
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-4 rounded-2xl transition-all shadow-sm border ${
                showSettings 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600'
              }`}
              title="Audio Settings"
            >
              <i className={`fa-solid fa-sliders transition-transform ${showSettings ? 'rotate-90' : ''}`}></i>
            </button>
          </div>

          {/* Hands-free Toggle */}
          <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Hands-free Mode</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Voice Wake-Word Activation</span>
            </div>
            <button 
              onClick={() => setIsHandsFreeEnabled(!isHandsFreeEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${isHandsFreeEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm ${isHandsFreeEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          {showSettings && (
            <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-left">Audio Configuration</h3>
              
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Output Device</label>
                  <select 
                    value={selectedOutputId}
                    onChange={(e) => setSelectedOutputId(e.target.value)}
                    disabled={isActive}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                  >
                    <option value="default">System Default</option>
                    {devices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Output Device ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Sample Rate</label>
                    <select 
                      value={sampleRate}
                      onChange={(e) => setSampleRate(Number(e.target.value))}
                      disabled={isActive}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    >
                      <option value={16000}>16 kHz</option>
                      <option value={24000}>24 kHz</option>
                      <option value={44100}>44.1 kHz</option>
                      <option value={48000}>48 kHz</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Channels</label>
                    <select 
                      value={numChannels}
                      onChange={(e) => setNumChannels(Number(e.target.value))}
                      disabled={isActive}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    >
                      <option value={1}>Mono</option>
                      <option value={2}>Stereo</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {isActive && (
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                  Settings are locked while session is active.
                </p>
              )}
            </div>
          )}
        </div>

        {transcription && (
          <div className="mt-8 p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-left max-h-40 overflow-y-auto custom-scrollbar shadow-sm">
            <p className="text-slate-600 dark:text-slate-300 italic text-sm leading-relaxed">"{transcription}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceView;
