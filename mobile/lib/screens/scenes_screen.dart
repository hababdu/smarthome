import 'package:flutter/material.dart';
import '../services/api.dart';

class ScenesScreen extends StatelessWidget {
  final Api api;
  const ScenesScreen({super.key, required this.api});

  static const _icons = {'leave_home': Icons.logout, 'good_night': Icons.bedtime_outlined};

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: api.scenes(),
      builder: (context, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 120), children: [
          Text('Stsenariylar', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          for (final s in snap.data!)
            Card(
              elevation: 0,
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                leading: Icon(_icons[s['id']] ?? Icons.auto_awesome, size: 32),
                title: Text(s['name']['uz']),
                trailing: FilledButton(
                  onPressed: () async {
                    await api.runScene(s['id']);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${s['name']['uz']} bajarildi')));
                    }
                  },
                  child: const Text('Ishga tushirish'),
                ),
              ),
            ),
        ]);
      },
    );
  }
}
