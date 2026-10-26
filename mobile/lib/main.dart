import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/energy_screen.dart';
import 'screens/scenes_screen.dart';
import 'screens/voice_sheet.dart';
import 'services/api.dart';

void main() => runApp(const SmartHomeApp());

class SmartHomeApp extends StatelessWidget {
  const SmartHomeApp({super.key});
  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(seedColor: const Color(0xFF4F8CFF), brightness: Brightness.dark);
    return MaterialApp(
      title: 'SmartHome',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorScheme: scheme, useMaterial3: true, scaffoldBackgroundColor: const Color(0xFF0E1116)),
      home: const Shell(),
    );
  }
}

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  final api = Api();
  int tab = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [HomeScreen(api: api), EnergyScreen(api: api), ScenesScreen(api: api)];
    return Scaffold(
      body: SafeArea(child: pages[tab]),
      floatingActionButton: FloatingActionButton.large(
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          showDragHandle: true,
          builder: (_) => VoiceSheet(api: api),
        ),
        child: const Icon(Icons.mic),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (i) => setState(() => tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Uy'),
          NavigationDestination(icon: Icon(Icons.bolt_outlined), selectedIcon: Icon(Icons.bolt), label: 'Energiya'),
          NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Stsenariy'),
        ],
      ),
    );
  }
}
