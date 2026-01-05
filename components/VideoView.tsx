
import React, { useState, useRef, useEffect } from 'react';
import { generateVideo } from '../services/geminiService';

const VideoView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusMessages = [
    "Analyzing narrative structure...",
    "Simulating physics and motion...",
    "Rendering lighting and shadows...",
    "Applying cinematic grading...",
    "Synthesizing frames...",
    "Polishing the final cut..."
  ];

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const active = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(active);
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSourceImage({
        data: result.split(',')[1],
        mimeType: file.type,
        preview: result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    
    if (!hasApiKey) {
      await handleOpenKey();
      return;
    }

    setIsGenerating(true);
    let messageIndex = 0;
    setStatusMessage(statusMessages[0]);
    
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % statusMessages.length;
      setStatusMessage(statusMessages[messageIndex]);
    }, 8000);

    try {
      const imagePayload = sourceImage ? { imageBytes: sourceImage.data, mimeType: sourceImage.mimeType } : undefined;
      const url = await generateVideo(prompt, imagePayload, { resolution, aspectRatio });
      setVideoUrl(url);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        alert("API Key invalid or expired. Please re-select a paid project key.");
      } else {
        alert("Video generation failed. Please check your prompt and key status.");
      }
    } finally {
      setIsGenerating(false);
      clearInterval(interval);
    }
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 p-6 md:p-12 overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-clapperboard text-indigo-600"></i>
              Cinematic Studio
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Bring your vision to life with Veo 3.1 high-fidelity video generation.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 uppercase tracking-widest transition-colors"
            >
              Billing Docs <i className="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
            <button 
              onClick={handleOpenKey}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                hasApiKey 
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                  : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              }`}
            >
              {hasApiKey ? 'Key Active' : 'Set API Key'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Settings & Input */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Story Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A hyper-realistic cinematic tracking shot of a glowing futuristic train arriving at a floating station in the clouds..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-40 resize-none shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Resolution</label>
                  <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  >
                    <option value="720p">720p HD</option>
                    <option value="1080p">1080p Full HD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Aspect Ratio</label>
                  <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Starting Image (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    sourceImage ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  {sourceImage ? (
                    <div className="flex items-center gap-4 w-full">
                      <img src={sourceImage.preview} className="w-16 h-16 rounded-xl object-cover shadow-md" alt="Preview" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Frame Uploaded</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSourceImage(null); }} className="text-xs text-red-500 font-bold uppercase hover:underline">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-image text-3xl text-slate-300"></i>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Set Start Frame</p>
                    </>
                  )}
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                {isGenerating ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Directing...</>
                ) : (
                  <><i className="fa-solid fa-film group-hover:rotate-12 transition-transform"></i> Generate Video</>
                )}
              </button>
            </div>
          </div>

          {/* Player & Preview */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className={`aspect-[16/9] w-full bg-slate-900 rounded-[2.5rem] border-8 border-white dark:border-slate-800 shadow-2xl overflow-hidden relative group transition-all duration-700 ${aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[400px] mx-auto' : ''}`}>
              {videoUrl ? (
                <video 
                  key={videoUrl}
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-cover animate-in fade-in duration-1000"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center p-12">
                  {!isGenerating ? (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto flex items-center justify-center border border-slate-700 mb-6">
                        <i className="fa-solid fa-play text-2xl text-slate-600"></i>
                      </div>
                      <h3 className="text-xl font-bold text-slate-400">Cinematic Preview</h3>
                      <p className="text-sm text-slate-600 max-w-xs">Your generated masterpiece will appear here. Cinematic renders typically take 2-4 minutes.</p>
                    </div>
                  ) : (
                    <div className="space-y-8 w-full max-w-sm">
                       <div className="flex justify-center gap-3">
                        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white font-bold text-lg tracking-tight animate-pulse">{statusMessage}</p>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 animate-[shimmer_2s_infinite]"></div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-2">OhM Cinema Engine v1.0</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="flex justify-center">
                <a 
                  href={videoUrl} 
                  download="ohm-generation.mp4"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-8 py-3 rounded-2xl font-bold flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-download"></i> Save to Device
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default VideoView;
