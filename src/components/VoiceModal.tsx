import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  Sparkles,
  AlertCircle,
  FileAudio,
  Copy,
  Check,
  Square,
  UploadCloud,
  Zap,
} from 'lucide-react';
import { Language, VoiceResponse } from '../types';
import { sendVoiceCommand, transcribeAudio } from '../services/api';
import { triggerHaptic } from '../utils/haptics';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onActionSuccess?: () => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLanguageChange,
  onActionSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'transcribe' | 'assistant'>('transcribe');
  const [inputText, setInputText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<VoiceResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Gemini Transcribe state
  const [isRecordingGemini, setIsRecordingGemini] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Web Speech recognition ref for quick assistant
  const recognitionRef = useRef<any>(null);

  const suggestions =
    lang === 'uz'
      ? [
          'Mehmonxonadagi chiroqni yoq',
          "Yotoqxona chirog'ini o'chir",
          'Dazmol yoqilganmi?',
          'Ertalab soat 7 da kofevarkani yoq',
          'Uydan ketyapman',
          'Qancha tok sarflandi?',
        ]
      : [
          'Включи свет в гостиной',
          'Выключи свет в спальне',
          'Утюг включен?',
          'Включи кофеварку в 7 утра',
          'Я ухожу',
          'Сколько электричества потрачено?',
        ];

  // Initialize Web Speech API for quick fallback
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang === 'uz' ? 'uz-UZ' : 'ru-RU';

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);

        if (event.results[event.results.length - 1].isFinal) {
          executeCommand(current);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicError(
            lang === 'uz'
              ? 'Mikrofon ruxsati berilmagan. Iltimos matn orqali yozing.'
              : 'Доступ к микрофону заблокирован. Используйте текстовый ввод.'
          );
        } else if (event.error !== 'no-speech') {
          setMicError(`Mic error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
      stopGeminiRecording();
    };
  }, [lang]);

  // Clean up recording on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopGeminiRecording();
      setTranscript('');
      setResponse(null);
      setMicError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Text-To-Speech (TTS)
  const speak = (text: string, voiceLang: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceLang === 'ru' ? 'ru-RU' : 'uz-UZ';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const executeCommand = async (text: string) => {
    if (!text.trim()) return;
    try {
      triggerHaptic('quickAction');
      setIsProcessing(true);
      setMicError(null);
      const res = await sendVoiceCommand(text);
      setResponse(res);
      speak(res.reply, res.lang);
      onActionSuccess?.();
    } catch (err: any) {
      setMicError(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
      setIsListening(false);
    }
  };

  // ========================================================
  // GEMINI 3.5 TRANSCRIBE (AUDIO INPUT & UPLOAD)
  // ========================================================
  const startGeminiRecording = async () => {
    try {
      triggerHaptic('toggle');
      setMicError(null);
      setResponse(null);
      setTranscript('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          lang === 'uz'
            ? 'Brauzeringiz audio yozishni qo‘llab-quvvatlamaydi'
            : 'Ваш браузер не поддерживает запись аудио'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determine supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearInterval(timerIntervalRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) return;

        await processAudioBlob(audioBlob, mimeType);
      };

      recorder.start(250);
      setIsRecordingGemini(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Recording start error:', err);
      setMicError(
        err.message || (lang === 'uz' ? 'Mikrofonni ochishda xato' : 'Ошибка включения микрофона')
      );
      setIsRecordingGemini(false);
    }
  };

  const stopGeminiRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      triggerHaptic('toggle');
      mediaRecorderRef.current.stop();
    }
    setIsRecordingGemini(false);
    clearInterval(timerIntervalRef.current);
  };

  const processAudioBlob = async (blob: Blob, mimeType: string) => {
    try {
      setIsProcessing(true);
      setMicError(null);

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);

      const base64DataUrl = await base64Promise;
      const result = await transcribeAudio(base64DataUrl, mimeType);

      if (result.text) {
        setTranscript(result.text);
        triggerHaptic('success');
      } else {
        setTranscript(lang === 'uz' ? '(Ovoz aniqlanmadi)' : '(Речь не распознана)');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setMicError(err.message || 'Audio transkripsiyasida xatolik yuz berdi');
      triggerHaptic('warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('toggle');
    const mimeType = file.type || 'audio/mp3';
    processAudioBlob(file, mimeType);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyTranscript = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setIsCopied(true);
    triggerHaptic('light');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleListeningAssistant = () => {
    triggerHaptic('toggle');
    if (!recognitionRef.current) {
      setMicError(
        lang === 'uz'
          ? 'Nutqni tanish qo‘llab-quvvatlanmaydi. Gemini Transcribe yoki matndan foydalaning.'
          : 'Распознавание речи не поддерживается. Используйте Gemini Transcribe.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setResponse(null);
      try {
        recognitionRef.current.lang = lang === 'uz' ? 'uz-UZ' : 'ru-RU';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start err:', err);
      }
    }
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setTranscript(inputText);
    executeCommand(inputText);
    setInputText('');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="control-center-panel w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header with Title and Mode Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0A84FF] flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm leading-tight">
                {lang === 'uz' ? 'Audio Transkripsiya va Ovoz' : 'Транскрипция аудио и голос'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-[#0A84FF] font-medium bg-[#0A84FF]/15 px-1.5 py-0.2 rounded-md">
                  gemini-3.5-transcribe
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Lang switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-white/[0.08] border border-white/10">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onLanguageChange('uz');
                }}
                className={`px-2 py-0.5 text-xs rounded-md font-medium transition cursor-pointer ${
                  lang === 'uz' ? 'bg-[#0A84FF] text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                O'zbek
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onLanguageChange('ru');
                }}
                className={`px-2 py-0.5 text-xs rounded-md font-medium transition cursor-pointer ${
                  lang === 'ru' ? 'bg-[#0A84FF] text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                Русский
              </button>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection: Gemini Transcribe vs Quick Assistant */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.06] rounded-2xl my-3.5">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('transcribe');
            }}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'transcribe'
                ? 'bg-[#0A84FF] text-white shadow-md shadow-blue-500/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{lang === 'uz' ? 'Audio Transkripsiya' : 'Транскрипция аудио'}</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('assistant');
            }}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-[#0A84FF] text-white shadow-md shadow-blue-500/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'uz' ? 'Ovozli Yordamchi' : 'Голосовой помощник'}</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: GEMINI 3.5 TRANSCRIBE                             */}
        {/* ======================================================== */}
        {activeTab === 'transcribe' && (
          <div className="space-y-4 my-2">
            {/* Center Big Record Button */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="relative">
                {isRecordingGemini && (
                  <span className="absolute -inset-2.5 rounded-full bg-[#FF453A]/30 animate-ping pointer-events-none" />
                )}
                <button
                  onClick={isRecordingGemini ? stopGeminiRecording : startGeminiRecording}
                  disabled={isProcessing}
                  title={isRecordingGemini ? 'To‘xtatish' : 'Audio yozish'}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
                    isRecordingGemini
                      ? 'bg-[#FF453A] text-white scale-105'
                      : 'bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white hover:scale-105'
                  } disabled:opacity-50`}
                >
                  {isRecordingGemini ? (
                    <Square className="w-7 h-7 fill-white" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Status and Timer */}
              <div className="text-center space-y-1">
                {isRecordingGemini ? (
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF453A]">
                    <span className="w-2 h-2 rounded-full bg-[#FF453A] animate-pulse" />
                    <span>{formatTime(recordingSeconds)}</span>
                    <span className="text-[11px] font-sans font-medium text-white/80">
                      {lang === 'uz' ? '— Yozilmoqda...' : '— Идет запись...'}
                    </span>
                  </div>
                ) : isProcessing ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-[#0A84FF]">
                    <div className="w-3.5 h-3.5 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
                    <span>
                      {lang === 'uz'
                        ? 'Gemini 3.5 Transcribe matnga o‘tkazmoqda...'
                        : 'Gemini 3.5 Transcribe расшифровывает...'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-white/80">
                    {lang === 'uz'
                      ? 'Mikrofonga bosing va gapiring'
                      : 'Нажмите на микрофон и говорите'}
                  </p>
                )}

                {/* Animated Waveform Visualizer when recording */}
                {isRecordingGemini && (
                  <div className="flex items-center justify-center gap-1 h-6 pt-1">
                    {[12, 22, 16, 26, 14, 24, 18, 28, 15, 20].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-[#0A84FF] rounded-full animate-pulse"
                        style={{
                          height: `${h}px`,
                          animationDelay: `${i * 100}ms`,
                          animationDuration: '600ms',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Transcribed Output Box */}
            {transcript && (
              <div className="control-tile rounded-2xl p-3.5 space-y-2 border-[#0A84FF]/30 bg-white/[0.08] animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#0A84FF] font-semibold">
                    <FileAudio className="w-3.5 h-3.5" />
                    <span>{lang === 'uz' ? 'Transkripsiya natijasi:' : 'Результат транскрипции:'}</span>
                  </div>
                  <button
                    onClick={handleCopyTranscript}
                    className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#30D158]" />
                        <span className="text-[#30D158]">{lang === 'uz' ? 'Nusxalandi' : 'Скопировано'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{lang === 'uz' ? 'Nusxa olish' : 'Копировать'}</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm font-medium text-white select-text leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                  «{transcript}»
                </p>

                {/* One-click Execute Smart Home Command */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => executeCommand(transcript)}
                    disabled={isProcessing}
                    className="flex-1 bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{lang === 'uz' ? 'Buyruqni bajarish' : 'Выполнить как команду'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Smart Home Response if Executed */}
            {response && (
              <div className="control-tile rounded-2xl p-3.5 text-center space-y-1 bg-[#30D158]/15 border-[#30D158]/35 animate-in fade-in duration-200">
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#30D158] font-semibold">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? 'Bajarildi' : 'Выполнено'}</span>
                </div>
                <p className="text-sm font-semibold text-white">{response.reply}</p>
              </div>
            )}

            {/* Audio File Upload Dropzone */}
            <div className="pt-2 border-t border-white/[0.08]">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center gap-2 text-xs font-medium text-white/70 hover:text-white transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-[#0A84FF]" />
                <span>
                  {lang === 'uz'
                    ? 'Audio faylni yuklash (.mp3, .wav, .m4a, .webm)'
                    : 'Загрузить аудиофайл (.mp3, .wav, .m4a, .webm)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: QUICK ASSISTANT / VOICE RECOGNITION               */}
        {/* ======================================================== */}
        {activeTab === 'assistant' && (
          <div className="space-y-4 my-2">
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <button
                onClick={toggleListeningAssistant}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  isListening
                    ? 'bg-[#FF453A] text-white animate-pulse'
                    : 'bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white hover:scale-105'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              <p className="text-xs font-semibold text-white/80 text-center">
                {isListening
                  ? lang === 'uz'
                    ? 'Tinglayapman... Gapiring'
                    : 'Слушаю... Говорите'
                  : isProcessing
                  ? lang === 'uz'
                    ? 'Natija qayta ishlanmoqda...'
                    : 'Обработка запроса...'
                  : lang === 'uz'
                  ? 'Bosing va buyruq bering'
                  : 'Нажмите и скажите команду'}
              </p>
            </div>

            {/* Spoken text transcript */}
            {transcript && (
              <div className="control-tile rounded-2xl px-4 py-2 text-center">
                <span className="text-[10px] text-white/50 block mb-0.5">
                  {lang === 'uz' ? 'Eshitildi:' : 'Распознано:'}
                </span>
                <p className="text-xs font-medium text-white">«{transcript}»</p>
              </div>
            )}

            {/* Assistant Reply bubble */}
            {response && (
              <div className="control-tile rounded-2xl p-3.5 w-full text-center space-y-1 bg-[#0A84FF]/20 border-[#0A84FF]/40">
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#0A84FF] font-semibold">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? 'Javob' : 'Ответ'}</span>
                </div>
                <p className="text-sm font-semibold text-white">{response.reply}</p>
              </div>
            )}

            {/* Text Input Form Fallback */}
            <form onSubmit={handleSubmitText} className="relative mt-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  lang === 'uz'
                    ? 'Yoki yozing: «mehmonxonadagi chiroqni o\'chir»'
                    : 'Или введите: «выключи свет в гостиной»'
                }
                className="w-full bg-white/[0.1] border border-white/15 rounded-full pl-4 pr-11 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#0A84FF] transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#0A84FF] hover:bg-[#0A84FF]/90 disabled:opacity-30 text-white rounded-full flex items-center justify-center cursor-pointer transition shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Error Notification */}
        {micError && (
          <div className="flex items-center gap-2 text-xs text-[#FF9F0A] bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 px-3 py-2 rounded-2xl my-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="mt-3 pt-3 border-t border-white/[0.08]">
          <span className="text-[10px] text-white/50 block mb-2 font-medium">
            {lang === 'uz' ? 'Tezkor misollar:' : 'Быстрые примеры:'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  triggerHaptic('light');
                  setTranscript(s);
                  executeCommand(s);
                }}
                className="text-[11px] bg-white/[0.08] hover:bg-white/[0.15] text-white/80 hover:text-white px-3 py-1 rounded-full border border-white/[0.08] transition text-left cursor-pointer active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default VoiceModal;
