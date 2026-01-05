
import React, { useState, useRef } from 'react';
import { generateImage } from '../services/geminiService';

const ImageView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64Data = result.split(',')[1];
      const mimeType = file.type;

      // Create an image to detect aspect ratio
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        let detected = "1:1";
        if (ratio > 1.5) detected = "16:9";
        else if (ratio > 1.1) detected = "4:3";
        else if (ratio < 0.6) detected = "9:16";
        else if (ratio < 0.9) detected = "3:4";
        
        setAspectRatio(detected);
        setSourceImage({ data: base64Data, mimeType, preview: result });
        setGeneratedImage(null); // Clear previous generated image to show preview
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const imageData = sourceImage ? { data: sourceImage.data, mimeType: sourceImage.mimeType } : undefined;
      const url = await generateImage(prompt, imageData, aspectRatio);
      setGeneratedImage(url);
    } catch (error) {
      console.error(error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearSourceImage = () => {
    setSourceImage(null);
    setAspectRatio("1:1");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 p-6 md:p-12 overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Visualize Your Ideas</h1>
          <p className="text-slate-500 dark:text-slate-400">Describe anything, or upload an image to edit it with OhM.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Controls */}
          <div className="space-y-8 bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Prompt</label>
                  {sourceImage && (
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase">Image-to-Image Mode</span>
                  )}
                </div>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={sourceImage ? "Describe how to modify this image..." : "A futuristic city with neon lights..."}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-32 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Reference Image</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    sourceImage 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                  {sourceImage ? (
                    <div className="flex items-center gap-4 w-full">
                      <img src={sourceImage.preview} className="w-12 h-12 rounded-lg object-cover border border-indigo-200 dark:border-indigo-800" alt="Source" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Image Uploaded</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tight">Aspect Ratio: {aspectRatio}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearSourceImage(); }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-full transition-colors"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-400"></i>
                      <p className="text-xs text-slate-500 font-medium">Click to upload reference image</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Aspect Ratio</label>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400">
                    {aspectRatio} {aspectRatio === "1:1" ? "Square" : ""}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Quality</label>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400">Standard</div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    {sourceImage ? 'Re-imagining...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-sparkles"></i>
                    {sourceImage ? 'Generate from Reference' : 'Generate Image'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="aspect-square w-full bg-slate-200 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center relative group shadow-inner">
            {generatedImage || sourceImage?.preview ? (
              <>
                <img 
                  src={generatedImage || sourceImage?.preview} 
                  alt="Content" 
                  className={`w-full h-full object-contain animate-in fade-in zoom-in duration-500 ${!generatedImage ? 'opacity-50 grayscale-[50%]' : ''}`}
                />
                {!generatedImage && sourceImage && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-xl">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Reference Preview</p>
                    </div>
                  </div>
                )}
                {generatedImage && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <a 
                      href={generatedImage} 
                      download="ohm-image.png"
                      className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                     >
                       <i className="fa-solid fa-download text-xl"></i>
                     </a>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-2 shadow-sm border border-slate-100 dark:border-slate-700">
                  <i className="fa-solid fa-image text-3xl text-slate-300 dark:text-slate-600"></i>
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-medium">Your creation will appear here</p>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="flex justify-center space-x-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-xs uppercase">Dreaming...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageView;
