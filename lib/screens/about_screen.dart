import 'package:flutter/material.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text("About")),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Container(
              width: 84,
              height: 84,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.school, color: Colors.white, size: 40),
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text("CBMU Assistant",
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 4),
          Center(
            child: Text("Version 1.0.0",
                style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.6))),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, color: theme.colorScheme.primary, size: 20),
                      const SizedBox(width: 8),
                      const Text("Important note", style: TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "This is an independent, unofficial student project built to help "
                        "Mangalore University students find department, office, hostel, and fee "
                        "information more easily. It is NOT an official app of Mangalore University "
                        "and is not affiliated with or endorsed by the university administration.\n\n"
                        "Some information (department chairpersons, contacts) may become outdated "
                        "as roles change. Always confirm anything important — fees, deadlines, exact "
                        "current staff — directly with the relevant university office before relying "
                        "on it.",
                    style: TextStyle(height: 1.5),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Built with", style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  const Text("Flutter, FastAPI, and Google's Gemini API for natural-language "
                      "understanding — with every factual answer grounded in verified data, "
                      "not generated freely by AI.", style: TextStyle(height: 1.5)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              "Official university website:\nmangaloreuniversity.ac.in",
              textAlign: TextAlign.center,
              style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.5), fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}