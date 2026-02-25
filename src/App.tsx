/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Lock, 
  Unlock, 
  Maximize2, 
  Info, 
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Type,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { encodeLSB, decodeLSB, scaleImage } from './utils/steganography';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [message, setMessage] = useState('');
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [bitsPerChannel, setBitsPerChannel] = useState(1);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (originalImage) {
      const pixels = (originalImage.width * scale) * (originalImage.height * scale);
      // 3 channels (RGB) * bitsPerChannel
      const totalBits = pixels * 3 * bitsPerChannel;
      const bytes = Math.floor(totalBits / 8) - 4; // -4 for the 32-bit length header
      setCapacity(Math.max(0, bytes));
    }
  }, [originalImage, scale, bitsPerChannel]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          setImage(event.target?.result as string);
          setResultImage(null);
          setDecodedMessage(null);
          setError(null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    setError(null);

    try {
      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      if (mode === 'encode') {
        const scaledCanvas = scaleImage(originalImage, scale);
        if (message.length > capacity) {
          throw new Error(`Message too long for current capacity (${capacity} bytes).`);
        }
        const result = encodeLSB(scaledCanvas, message, bitsPerChannel);
        setResultImage(result.dataUrl);
      } else {
        // In decode mode, we use the image as is (scale 1)
        const canvas = document.createElement('canvas');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        ctx.drawImage(originalImage, 0, 0);
        
        const decoded = decodeLSB(canvas, bitsPerChannel);
        setDecodedMessage(decoded);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `stega_image_${Date.now()}.png`;
    link.click();
  };

  const resetAll = () => {
    setImage(null);
    setOriginalImage(null);
    setMessage('');
    setDecodedMessage(null);
    setResultImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    setDecodedMessage(null);
    setResultImage(null);
    setError(null);
  }, [mode]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Layers className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">StegaScale</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={resetAll}
              className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors"
            >
              Reset
            </button>
            <div className="flex bg-[#F2F2F7] p-1 rounded-xl">
              <button 
                onClick={() => setMode('encode')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'encode' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Encode
              </button>
              <button 
                onClick={() => setMode('decode')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'decode' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Decode
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Source Image
              </h2>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3 ${image ? 'border-transparent' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
              >
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Click to upload image</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className={`bg-white rounded-3xl p-6 shadow-sm border border-black/5 space-y-6 transition-opacity ${mode === 'decode' ? 'opacity-50 pointer-events-none' : ''}`}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Scaling & Capacity
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <label className="font-medium">Image Scale</label>
                      <span className="text-blue-600 font-mono">{scale}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="4" 
                      step="0.5" 
                      value={scale} 
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <p className="text-[11px] text-gray-400 mt-2 italic">
                      Scaling up increases the number of available pixels for data storage.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Current Capacity</span>
                      <span className="text-sm font-bold font-mono">
                        {capacity.toLocaleString()} bytes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 space-y-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  LSB Settings
                </h2>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label className="font-medium">Bits per Channel</label>
                    <span className="text-blue-600 font-mono">{bitsPerChannel} bit</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((b) => (
                      <button
                        key={b}
                        onClick={() => setBitsPerChannel(b)}
                        className={`py-2 rounded-xl text-sm font-medium transition-all ${bitsPerChannel === b ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 italic">
                    Must match the bit-depth used during encoding.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Interaction */}
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  {mode === 'encode' ? (
                    <>
                      <Lock className="w-6 h-6 text-blue-600" />
                      Encode Message
                    </>
                  ) : (
                    <>
                      <Unlock className="w-6 h-6 text-emerald-600" />
                      Decode Message
                    </>
                  )}
                </h2>
                
                <button
                  disabled={!image || isProcessing || (mode === 'encode' && !message)}
                  onClick={handleProcess}
                  className="px-8 py-3 bg-black text-white rounded-2xl font-semibold hover:bg-black/90 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center gap-2 shadow-lg shadow-black/10"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    mode === 'encode' ? 'Generate Stego Image' : 'Extract Message'
                  )}
                </button>
              </div>

              <div className="flex-grow space-y-6">
                {mode === 'encode' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <label className="font-medium flex items-center gap-2">
                        <Type className="w-4 h-4 text-gray-400" />
                        Secret Message
                      </label>
                      <span className={`${message.length > capacity ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {message.length} / {capacity}
                      </span>
                    </div>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your secret message here..."
                      className="w-full h-48 p-6 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-gray-200 transition-all outline-none resize-none font-medium"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 min-h-[200px] flex flex-col items-center justify-center text-center">
                      {decodedMessage ? (
                        <div className="w-full text-left space-y-4">
                          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Message Extracted Successfully
                          </div>
                          <p className="text-lg font-medium text-gray-800 bg-white p-6 rounded-xl border border-gray-100 shadow-sm whitespace-pre-wrap">
                            {decodedMessage}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Info className="w-10 h-10 text-gray-300 mb-4" />
                          <p className="text-gray-500 font-medium">
                            Upload an image and click "Extract Message" to reveal hidden content.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {resultImage && mode === 'encode' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-3xl bg-blue-50 border border-blue-100 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700 font-semibold">
                        <CheckCircle2 className="w-5 h-5" />
                        Stego Image Ready
                      </div>
                      <button 
                        onClick={downloadResult}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                      >
                        <Download className="w-4 h-4" />
                        Download PNG
                      </button>
                    </div>
                    <div className="aspect-video rounded-xl overflow-hidden border border-blue-200 bg-white">
                      <img src={resultImage} alt="Result" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-xs text-blue-600/70 italic text-center">
                      Note: Always save as PNG to preserve pixel data. JPEG compression will destroy the hidden message.
                    </p>
                  </motion.div>
                )}
              </div>
            </section>

            {/* Journal Info */}
            <section className="bg-black text-white rounded-3xl p-8 shadow-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Methodology Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300 leading-relaxed">
                <div className="space-y-2">
                  <p className="font-bold text-white">1. Image Scaling</p>
                  <p>
                    By scaling the cover image using high-quality interpolation, we increase the total pixel count. 
                    A 2x scale increases capacity by 400%, allowing for much larger payloads without significant visual degradation.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-white">2. Advanced LSB</p>
                  <p>
                    Instead of just the 1st bit, this implementation allows selecting up to 4 bits per channel. 
                    This further multiplies capacity, though higher bit counts may introduce subtle visual artifacts.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-black/5 text-center text-gray-400 text-sm">
        <p>© 2026 StegaScale Implementation • Based on Advanced LSB and Image Scaling Research</p>
      </footer>
    </div>
  );
}
