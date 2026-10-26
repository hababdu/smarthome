import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// Mikrofon (STT) va ovozli javob (TTS).
/// Eslatma: o'zbek tili (uz_UZ) STT/TTS qo'llab-quvvatlashi qurilmaga bog'liq.
/// Mavjud bo'lmasa rus tiliga o'tadi; backend baribir matnni tushunadi.
class VoiceService {
  final _stt = SpeechToText();
  final _tts = FlutterTts();
  bool _ready = false;

  Future<bool> init() async => _ready = await _stt.initialize();

  Future<String> _pickLocale(String wanted) async {
    final locales = await _stt.locales();
    final ids = locales.map((l) => l.localeId).toList();
    if (ids.contains(wanted)) return wanted;
    return ids.firstWhere((i) => i.startsWith('ru'), orElse: () => ids.first);
  }

  /// Tinglashni boshlaydi; yakuniy natija chiqqanda onFinal chaqiriladi.
  Future<void> listen({
    required String locale,
    required void Function(String partial) onPartial,
    required void Function(String text) onFinal,
  }) async {
    if (!_ready && !await init()) return;
    final loc = await _pickLocale(locale);
    await _stt.listen(
      localeId: loc,
      listenOptions: SpeechListenOptions(partialResults: true),
      onResult: (r) => r.finalResult ? onFinal(r.recognizedWords) : onPartial(r.recognizedWords),
    );
  }

  Future<void> stop() => _stt.stop();
  bool get isListening => _stt.isListening;

  Future<void> speak(String text, String lang) async {
    final code = lang == 'ru' ? 'ru-RU' : 'uz-UZ';
    final ok = await _tts.isLanguageAvailable(code);
    await _tts.setLanguage(ok == true ? code : 'ru-RU');
    await _tts.speak(text);
  }
}
