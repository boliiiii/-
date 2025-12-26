
import React, { useState, useEffect, useRef } from 'react';
import { Language, ImageState, AnalysisResult, GenerationHistoryItem } from './types';
import { TEXTS } from './constants';
import { analyzeUserProfile, generateMakeoverImage } from './services/gemini';
import ImageUpload from './components/ImageUpload';
import LoadingOverlay from './components/LoadingOverlay';
import ApiKeySelector from './components/ApiKeySelector';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.CN);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [images, setImages] = useState<ImageState>({ front: null, left: null, right: null });
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  // Selection state
  const [selectedHairIdx, setSelectedHairIdx] = useState<number>(-1);
  const [selectedGlassesIdx, setSelectedGlassesIdx] = useState<number>(-1);
  
  // History and View State
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [activeImageId, setActiveImageId] = useState<string>('original'); // 'original' or history item ID
  const [isComparing, setIsComparing] = useState<boolean>(false); // True when user holds "Compare"

  useEffect(() => {
    document.title = lang === Language.CN ? "AI 造型顾问" : "StyleMatch AI";
  }, [lang]);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true); 
      }
    };
    checkKey();
  }, []);

  const handleAnalyze = async () => {
    if (!images.front || !images.left || !images.right) {
      alert(TEXTS[lang].errorMissingImages);
      return;
    }

    setLoading(true);
    setLoadingMessage(TEXTS[lang].analyzing);
    setAnalysis(null);
    setHistory([]);
    setActiveImageId('original');
    setSelectedHairIdx(-1);
    setSelectedGlassesIdx(-1);

    try {
      const result = await analyzeUserProfile(
        { front: images.front, left: images.left, right: images.right },
        lang
      );
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("An error occurred during analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!analysis || !images.front) return;
    
    if (selectedHairIdx === -1 && selectedGlassesIdx === -1) {
      alert(TEXTS[lang].errorNoSelection);
      return;
    }

    setLoading(true);
    setLoadingMessage(TEXTS[lang].generating);

    try {
      const selectedHair = selectedHairIdx !== -1 ? analysis.recommendedHairstyles[selectedHairIdx] : undefined;
      const selectedGlasses = selectedGlassesIdx !== -1 ? analysis.recommendedGlasses[selectedGlassesIdx] : undefined;

      const newLookUrl = await generateMakeoverImage(
        images.front, 
        { 
          hairstyle: selectedHair, 
          glasses: selectedGlasses 
        }, 
        lang
      );

      const newItem: GenerationHistoryItem = {
        id: Date.now().toString(),
        imageUrl: newLookUrl,
        timestamp: Date.now(),
        options: {
          hairName: selectedHair?.name,
          glassesName: selectedGlasses?.style
        }
      };

      setHistory(prev => [newItem, ...prev]);
      setActiveImageId(newItem.id);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Image generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm(lang === Language.CN ? "确定要重新开始吗？所有记录将清除。" : "Are you sure? All history will be cleared.")) {
      setImages({ front: null, left: null, right: null });
      setAnalysis(null);
      setHistory([]);
      setActiveImageId('original');
      setSelectedHairIdx(-1);
      setSelectedGlassesIdx(-1);
    }
  };

  const LangToggle = () => (
    <button 
      onClick={() => setLang(l => l === Language.EN ? Language.CN : Language.EN)}
      className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium border border-white/40 transition-colors"
    >
      {lang === Language.EN ? '中文' : 'English'}
    </button>
  );

  // Helper to get currently displayed image URL
  const getDisplayImage = () => {
    if (isComparing || activeImageId === 'original') {
      return images.front;
    }
    const item = history.find(h => h.id === activeImageId);
    return item ? item.imageUrl : images.front;
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 shadow-md flex justify-between items-center">
          <div className="text-xl font-bold tracking-tight">{TEXTS[lang].title}</div>
          <LangToggle />
        </header>
        <ApiKeySelector lang={lang} onKeySelected={() => setHasApiKey(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {loading && <LoadingOverlay message={loadingMessage} />}

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight">{TEXTS[lang].title}</h1>
            {analysis && <span className="text-slate-400 text-sm hidden sm:block">| {TEXTS[lang].visualizeTitle}</span>}
          </div>
          <div className="flex items-center space-x-3">
             {analysis && (
                <button 
                  onClick={handleReset}
                  className="text-xs sm:text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors"
                >
                  {TEXTS[lang].reset}
                </button>
             )}
             <LangToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        
        {/* Step 1: Upload (Only show if no analysis yet) */}
        {!analysis && (
          <section className="flex flex-col justify-center min-h-[80vh] animate-fade-in-up">
             <div className="text-center mb-10">
               <h2 className="text-3xl font-extrabold text-slate-800 mb-4">{TEXTS[lang].uploadStep}</h2>
               <p className="text-slate-500 max-w-lg mx-auto">{TEXTS[lang].subtitle}</p>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto w-full px-4">
               <ImageUpload 
                 label={TEXTS[lang].frontView} 
                 imageSrc={images.front} 
                 onUpload={(b64) => setImages(prev => ({ ...prev, front: b64 }))} 
                 placeholderText={TEXTS[lang].uploadPlaceholder}
               />
               <ImageUpload 
                 label={TEXTS[lang].leftView} 
                 imageSrc={images.left} 
                 onUpload={(b64) => setImages(prev => ({ ...prev, left: b64 }))} 
                 placeholderText={TEXTS[lang].uploadPlaceholder}
               />
               <ImageUpload 
                 label={TEXTS[lang].rightView} 
                 imageSrc={images.right} 
                 onUpload={(b64) => setImages(prev => ({ ...prev, right: b64 }))} 
                 placeholderText={TEXTS[lang].uploadPlaceholder}
               />
             </div>

             <div className="mt-12 text-center">
               <button
                 onClick={handleAnalyze}
                 disabled={!images.front || !images.left || !images.right}
                 className={`
                    px-10 py-4 rounded-full text-lg font-bold shadow-lg transform transition-all duration-300
                    ${(!images.front || !images.left || !images.right) 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:scale-105 hover:bg-indigo-700 hover:shadow-xl'
                    }
                 `}
               >
                 {TEXTS[lang].analyzeBtn}
               </button>
             </div>
          </section>
        )}

        {/* Step 2: Main Workspace */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* Left Column: Options (Scrollable) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 order-2 lg:order-1">
              
              {/* Profile Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex justify-between items-center">
                 <div>
                   <span className="text-xs font-bold text-slate-400 uppercase">{TEXTS[lang].faceShape}</span>
                   <p className="font-semibold text-slate-800">{analysis.faceShape}</p>
                 </div>
                 <div className="h-8 w-px bg-slate-100"></div>
                 <div>
                   <span className="text-xs font-bold text-slate-400 uppercase">{TEXTS[lang].skinTone}</span>
                   <p className="font-semibold text-slate-800">{analysis.skinTone}</p>
                 </div>
              </div>

              {/* Selection Lists */}
              <div className="space-y-6">
                 {/* Hair */}
                 <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">{TEXTS[lang].hairRec}</h3>
                    <div className="space-y-3">
                      {analysis.recommendedHairstyles.map((hair, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedHairIdx(idx === selectedHairIdx ? -1 : idx)}
                          className={`
                            cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 group
                            ${selectedHairIdx === idx 
                              ? 'border-indigo-500 bg-indigo-50/50' 
                              : 'border-white bg-white hover:border-indigo-100 shadow-sm'
                            }
                          `}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold ${selectedHairIdx === idx ? 'text-indigo-700' : 'text-slate-700'}`}>
                              {hair.name}
                            </span>
                            {selectedHairIdx === idx && (
                              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{hair.description}</p>
                          <p className="text-slate-400 text-[10px] mt-2 italic border-t border-slate-100 pt-1">{hair.reason}</p>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Glasses */}
                 <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">{TEXTS[lang].glassesRec}</h3>
                    <div className="space-y-3">
                      {analysis.recommendedGlasses.map((glasses, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedGlassesIdx(idx === selectedGlassesIdx ? -1 : idx)}
                          className={`
                            cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 group
                            ${selectedGlassesIdx === idx 
                              ? 'border-purple-500 bg-purple-50/50' 
                              : 'border-white bg-white hover:border-purple-100 shadow-sm'
                            }
                          `}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold ${selectedGlassesIdx === idx ? 'text-purple-700' : 'text-slate-700'}`}>
                              {glasses.style}
                            </span>
                             {selectedGlassesIdx === idx && (
                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{glasses.description}</p>
                          <p className="text-slate-400 text-[10px] mt-2 italic border-t border-slate-100 pt-1">{glasses.reason}</p>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>

            {/* Right Column: Preview & History (Sticky) */}
            <div className="lg:col-span-7 xl:col-span-8 order-1 lg:order-2">
               <div className="sticky top-24 space-y-4">
                 
                 {/* Main Preview Card */}
                 <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col relative">
                    
                    {/* Toolbar */}
                    <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                       <span className="font-medium text-sm">
                         {activeImageId === 'original' 
                           ? TEXTS[lang].original 
                           : `${TEXTS[lang].look} #${history.findIndex(h => h.id === activeImageId) + 1}`
                         }
                       </span>
                       <div className="flex space-x-2">
                         {activeImageId !== 'original' && (
                           <button
                             onMouseDown={() => setIsComparing(true)}
                             onMouseUp={() => setIsComparing(false)}
                             onMouseLeave={() => setIsComparing(false)}
                             onTouchStart={() => setIsComparing(true)}
                             onTouchEnd={() => setIsComparing(false)}
                             className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded transition-colors select-none"
                           >
                             {isComparing ? TEXTS[lang].original : TEXTS[lang].compareBtn}
                           </button>
                         )}
                         {activeImageId !== 'original' && (
                           <a 
                             href={getDisplayImage() || ''} 
                             download={`style-match-${activeImageId}.png`}
                             className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded transition-colors flex items-center"
                           >
                             <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                             Download
                           </a>
                         )}
                       </div>
                    </div>

                    {/* Image Area */}
                    <div className="aspect-[4/5] sm:aspect-square md:aspect-[4/3] w-full bg-slate-100 flex items-center justify-center relative overflow-hidden group">
                       {getDisplayImage() ? (
                         <img 
                           src={getDisplayImage() || ''} 
                           alt="Preview" 
                           className="w-full h-full object-contain transition-transform duration-500"
                         />
                       ) : (
                         <div className="text-slate-300">No Image</div>
                       )}
                       
                       {/* Floating Generate Button (Desktop) */}
                       <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-3/4 sm:w-1/2">
                          <button
                           onClick={handleGenerate}
                           disabled={selectedHairIdx === -1 && selectedGlassesIdx === -1}
                           className={`
                             w-full py-3 rounded-xl font-bold text-sm sm:text-base shadow-2xl transition-all duration-300 flex items-center justify-center backdrop-blur-sm
                             ${(selectedHairIdx === -1 && selectedGlassesIdx === -1)
                               ? 'bg-slate-800/50 text-slate-400 cursor-not-allowed border border-slate-600/30'
                               : 'bg-indigo-600/90 text-white hover:bg-indigo-500 hover:scale-105 border border-indigo-500/50'
                             }
                           `}
                         >
                           {loading ? (
                             <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                           ) : (
                             <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                           )}
                           {TEXTS[lang].generateBtn}
                         </button>
                       </div>
                    </div>
                 </div>

                 {/* History Strip */}
                 {history.length > 0 && (
                   <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                     <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{TEXTS[lang].history}</h4>
                     <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                       
                       {/* Original Thumb */}
                       <div 
                         onClick={() => setActiveImageId('original')}
                         className={`
                           flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 relative
                           ${activeImageId === 'original' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}
                         `}
                       >
                         <img src={images.front || ''} className="w-full h-full object-cover" alt="Original" />
                         <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                           {TEXTS[lang].original}
                         </div>
                       </div>

                       {/* Generated Thumbs */}
                       {history.map((item, idx) => (
                         <div 
                           key={item.id}
                           onClick={() => setActiveImageId(item.id)}
                           className={`
                             flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 relative group
                             ${activeImageId === item.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}
                           `}
                         >
                           <img src={item.imageUrl} className="w-full h-full object-cover" alt={`Look ${history.length - idx}`} />
                           <div className="absolute bottom-0 inset-x-0 bg-indigo-600/80 text-white text-[10px] text-center py-0.5">
                             #{history.length - idx}
                           </div>
                           {/* Tooltipish overlay for options */}
                           <div className="absolute inset-0 bg-black/80 text-white p-1 text-[9px] opacity-0 group-hover:opacity-100 flex items-center justify-center text-center transition-opacity">
                              {item.options.hairName || '-'}<br/>+<br/>{item.options.glassesName || '-'}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {history.length === 0 && (
                    <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl border-dashed">
                      <p className="text-sm text-slate-400">{TEXTS[lang].emptyHistory}</p>
                    </div>
                 )}

               </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default App;
