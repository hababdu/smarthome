import 'package:flutter/material.dart';
import '../services/api.dart';

/// Kunlik/haftalik/oylik sarf (kWh), xarajat va tejash tavsiyalari.
class EnergyScreen extends StatelessWidget {
  final Api api;
  const EnergyScreen({super.key, required this.api});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: api.energy('uz'),
      builder: (context, snap) {
        if (snap.hasError) return Center(child: Text('Xato: ${snap.error}'));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final e = snap.data!;
        final per = Map<String, dynamic>.from(e['week']['perDevice']);
        final sorted = per.entries.toList()..sort((a, b) => (b.value as num).compareTo(a.value as num));
        final maxV = sorted.isEmpty ? 1.0 : (sorted.first.value as num).toDouble().clamp(0.001, double.infinity);
        return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 120), children: [
          Text('Energiya', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          Row(children: [
            for (final k in [('Bugun', 'day'), ('Hafta', 'week'), ('Oy', 'month')])
              Expanded(
                child: Card(
                  elevation: 0,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(k.$1, style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 6),
                      Text('${(e[k.$2]['kwh'] as num).toStringAsFixed(1)} kWh', style: Theme.of(context).textTheme.titleMedium),
                      Text('~${e[k.$2]['cost']} so\'m', style: Theme.of(context).textTheme.bodySmall),
                    ]),
                  ),
                ),
              ),
          ]),
          const SizedBox(height: 24),
          Text('Haftalik sarf bo\'yicha qurilmalar', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final s in sorted)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${s.key}  ·  ${(s.value as num).toStringAsFixed(2)} kWh'),
                const SizedBox(height: 4),
                LinearProgressIndicator(value: (s.value as num) / maxV, minHeight: 8, borderRadius: BorderRadius.circular(4)),
              ]),
            ),
          const SizedBox(height: 24),
          Text('Tavsiyalar', style: Theme.of(context).textTheme.titleMedium),
          for (final t in e['tips'] as List)
            ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.eco_outlined), title: Text(t)),
        ]);
      },
    );
  }
}
