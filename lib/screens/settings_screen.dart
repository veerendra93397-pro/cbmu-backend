import 'package:flutter/material.dart';
import '../theme_notifier.dart';
import 'about_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Settings")),
      body: ValueListenableBuilder<ThemeMode>(
        valueListenable: themeNotifier,
        builder: (context, currentMode, _) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 8, left: 4),
                child: Text("Appearance",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
              ),
              _themeTile(context, "Dark", Icons.dark_mode, ThemeMode.dark, currentMode),
              _themeTile(context, "Light", Icons.light_mode, ThemeMode.light, currentMode),
              _themeTile(context, "Use device setting", Icons.settings_suggest, ThemeMode.system, currentMode),
              const SizedBox(height: 24),
              const Padding(
                padding: EdgeInsets.only(bottom: 8, left: 4),
                child: Text("About this app",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
              ),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.info_outline),
                      title: const Text("About"),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AboutScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _themeTile(BuildContext context, String label, IconData icon, ThemeMode mode, ThemeMode current) {
    final selected = mode == current;
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(label),
        trailing: selected ? const Icon(Icons.check_circle, color: Color(0xFF10A37F)) : null,
        onTap: () => saveThemeMode(mode),
      ),
    );
  }
}