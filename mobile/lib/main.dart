import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/home_screen.dart';
import 'screens/energy_screen.dart';
import 'screens/scenes_screen.dart';
import 'screens/voice_sheet.dart';
import 'services/api.dart';

void main() => runApp(const SmartHomeApp());

class SmartHomeApp extends StatefulWidget {
  const SmartHomeApp({super.key});

  @override
  State<SmartHomeApp> createState() => _SmartHomeAppState();
}

class _SmartHomeAppState extends State<SmartHomeApp> {
  ThemeMode _themeMode = ThemeMode.dark;

  @override
  void initState() {
    super.initState();
    _restoreTheme();
  }

  Future<void> _restoreTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() => _themeMode = prefs.getBool('smarthome-light-theme') == true
          ? ThemeMode.light
          : ThemeMode.dark);
    } catch (_) {
      // Theme persistence is optional; the app still starts in dark mode.
    }
  }

  Future<void> _toggleTheme() async {
    final next = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    setState(() => _themeMode = next);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('smarthome-light-theme', next == ThemeMode.light);
    } catch (_) {
      // Keep the in-memory selection if storage is unavailable.
    }
  }

  ThemeData _buildTheme(Brightness brightness) {
    const accent = Color(0xFFF07837);
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: accent,
      brightness: brightness,
      surface: isDark ? const Color(0xFF1F2230) : Colors.white,
    );
    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: isDark ? const Color(0xFF101119) : const Color(0xFFF3F5FA),
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF202435) : Colors.white,
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: isDark ? Colors.white.withValues(alpha: .07) : const Color(0xFFE3E7F0)),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? const Color(0xFF101119) : const Color(0xFFF3F5FA),
        foregroundColor: isDark ? const Color(0xFFF6F7FB) : const Color(0xFF1D2333),
        elevation: 0,
        centerTitle: false,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: isDark ? const Color(0xFF1F2230) : Colors.white,
        indicatorColor: accent.withValues(alpha: isDark ? .25 : .13),
        elevation: 0,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: accent,
        foregroundColor: Colors.white,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF202435) : Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartHome',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      themeMode: _themeMode,
      home: Shell(
        isDark: _themeMode == ThemeMode.dark,
        onToggleTheme: _toggleTheme,
      ),
    );
  }
}

class Shell extends StatefulWidget {
  final bool isDark;
  final VoidCallback onToggleTheme;
  const Shell({super.key, required this.isDark, required this.onToggleTheme});

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
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: pages[tab]),
            Positioned(
              top: 8,
              right: 12,
              child: Material(
                color: Theme.of(context).colorScheme.surface.withValues(alpha: .92),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: .25)),
                ),
                child: IconButton(
                  tooltip: widget.isDark ? 'Yorug‘ rejim' : 'Qorong‘i rejim',
                  onPressed: widget.onToggleTheme,
                  icon: Icon(widget.isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
                ),
              ),
            ),
          ],
        ),
      ),
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
