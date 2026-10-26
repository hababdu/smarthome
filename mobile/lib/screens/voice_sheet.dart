import 'package:flutter/material.dart';
import '../services/api.dart';
import '../services/voice_service.dart';

/// Mikrofon oynasi: tinglaydi -> backendga yuboradi -> javobni ovozli aytadi (TTS).
class VoiceSheet extends StatefulWidget {
  final Api api;
  const VoiceSheet({super.key, required this.api});
  @override
  State<VoiceSheet> createState() => _VoiceSheetState();
}

class _VoiceSheetState extends State<VoiceSheet> {
  final voice = VoiceService();
  final text = TextEditingController();
  String heard = '';
  String reply = '';
  bool listening = false;
  String locale = 'uz_UZ';

  Future<void> _send(String t) async {
    if (t.trim().isEmpty) return;
    setState(() { heard = t; listening = false; });
    try {
      final r = await widget.api.voice(t);
      setState(() => reply = r['reply']);
      await voice.speak(r['reply'], r['lang']);
    } catch (e) {
      setState(() => reply = 'Xato: $e');
    }
  }

  Future<void> _toggle() async {
    if (listening) {
      await voice.stop();
      setState(() => listening = false);
      return;
    }
    setState(() { listening = true; heard = ''; reply = ''; });
    await voice.listen(locale: locale, onPartial: (p) => setState(() => heard = p), onFinal: _send);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 8, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'uz_UZ', label: Text('O\'zbek')), ButtonSegment(value: 'ru_RU', label: Text('Русский'))],
          selected: {locale},
          onSelectionChanged: (s) => setState(() => locale = s.first),
        ),
        const SizedBox(height: 24),
        GestureDetector(
          onTap: _toggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            width: listening ? 112 : 96, height: listening ? 112 : 96,
            decoration: BoxDecoration(shape: BoxShape.circle, color: Theme.of(context).colorScheme.primary),
            child: Icon(listening ? Icons.stop : Icons.mic, size: 40, color: Theme.of(context).colorScheme.onPrimary),
          ),
        ),
        const SizedBox(height: 16),
        Text(listening ? 'Tinglayapman...' : 'Bosing va gapiring', style: Theme.of(context).textTheme.bodyMedium),
        if (heard.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Text('«$heard»', style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center)),
        if (reply.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(reply, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.primary))),
        const SizedBox(height: 16),
        TextField(
          controller: text,
          decoration: const InputDecoration(hintText: 'Yoki yozing: mehmonxonadagi chiroqni o\'chir', border: OutlineInputBorder()),
          onSubmitted: (v) { _send(v); text.clear(); },
        ),
      ]),
    );
  }
}
