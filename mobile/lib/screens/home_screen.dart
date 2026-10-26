import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api.dart';

/// Xonalarga bo'lingan panel: har bir qurilma holati real-vaqtda (WebSocket).
class HomeScreen extends StatefulWidget {
  final Api api;
  const HomeScreen({super.key, required this.api});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Room> rooms = [];
  Map<String, Device> devices = {};
  int total = 0;
  Alert? alert;
  String? error;
  StreamSubscription? _sub;

  @override
  void initState() {
    super.initState();
    _load();
    _connect();
  }

  Future<void> _load() async {
    try {
      final j = await widget.api.home();
      _apply(j);
    } catch (e) {
      setState(() => error = 'Serverga ulanib bo\'lmadi: $e');
    }
  }

  void _apply(Map<String, dynamic> j) {
    setState(() {
      error = null;
      rooms = (j['rooms'] as List).map((r) => Room(r['id'], r['name'])).toList();
      devices = {for (final d in j['devices']) d['id']: Device.fromJson(d)};
      total = (j['totalWatts'] ?? 0).round();
    });
  }

  void _connect() {
    final ch = widget.api.live();
    _sub = ch.stream.listen((raw) {
      final m = jsonDecode(raw as String);
      switch (m['type']) {
        case 'snapshot':
          _apply(m);
        case 'state':
          final d = devices[m['id']];
          if (d == null) return;
          final s = m['state'];
          setState(() {
            devices[d.id] = d.copyWith(on: s['on'], watts: (s['watts'] ?? 0).toDouble(), online: s['online']);
            total = devices.values.fold(0.0, (a, x) => a + (x.on ? x.watts : 0)).round();
          });
        case 'alert':
          setState(() => alert = Alert(m['message'], m['level']));
      }
    }, onDone: () => Future.delayed(const Duration(seconds: 3), () { if (mounted) _connect(); }));
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        children: [
          Text('Uyim', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text('Hozirgi yuklama: $total W', style: TextStyle(color: cs.onSurfaceVariant)),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: TextStyle(color: cs.error))),
          if (alert != null)
            Card(
              color: cs.errorContainer,
              margin: const EdgeInsets.only(top: 12),
              child: ListTile(
                leading: Icon(Icons.warning_amber_rounded, color: cs.onErrorContainer),
                title: Text(alert!.message, style: TextStyle(color: cs.onErrorContainer)),
                trailing: IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() => alert = null)),
              ),
            ),
          for (final r in rooms) ...[
            Padding(
              padding: const EdgeInsets.only(top: 24, bottom: 8),
              child: Text(r.name['uz'], style: Theme.of(context).textTheme.titleMedium),
            ),
            for (final d in devices.values.where((d) => d.room == r.id)) _tile(d, cs),
          ],
        ],
      ),
    );
  }

  Widget _tile(Device d, ColorScheme cs) {
    final icon = switch (d.kind) {
      'light' => Icons.lightbulb_outline,
      'tv' => Icons.tv,
      'iron' => Icons.iron_outlined,
      'coffee' => Icons.coffee_outlined,
      'fridge' => Icons.kitchen_outlined,
      _ => Icons.power_outlined,
    };
    return Card(
      elevation: 0,
      color: d.on ? cs.primaryContainer.withValues(alpha: .35) : cs.surfaceContainerHigh,
      child: SwitchListTile(
        secondary: Icon(icon, color: d.online ? null : cs.outline),
        title: Text(d.name['uz'].toString().replaceFirstMapped(RegExp(r'^.'), (m) => m[0]!.toUpperCase())),
        subtitle: Text(!d.online ? 'Tarmoqda emas' : d.on ? '${d.watts.round()} W' : 'O\'chiq'),
        value: d.on,
        onChanged: d.online && !d.essential
            ? (v) {
                setState(() => devices[d.id] = d.copyWith(on: v));
                widget.api.power(d.id, v);
              }
            : null,
      ),
    );
  }
}
