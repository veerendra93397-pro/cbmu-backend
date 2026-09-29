import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Deliberately does NOT list specific exam/semester dates — Mangalore
/// University's academic calendar changes every year and by faculty/
/// program, and no reliable single source for exact dates was confirmed
/// during data-gathering. Rather than guess or show outdated dates,
/// this links straight to the university's own notifications page,
/// which is the actual authoritative source for current dates.
class AcademicCalendarScreen extends StatelessWidget {
  const AcademicCalendarScreen({super.key});

  static const String _notificationsUrl = "https://mangaloreuniversity.ac.in";

  Future<void> _openOfficialPage(BuildContext context) async {
    final uri = Uri.parse(_notificationsUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Could not open the website")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text("Academic Calendar")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.calendar_month, size: 56, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            const Text("Exact dates aren't shown here",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text(
              "Semester start/end dates, exam schedules, and holidays change every academic "
                  "year and vary by faculty. Rather than show dates that could be outdated or "
                  "wrong, this opens the official university site directly — always the most "
                  "current source.",
              style: TextStyle(height: 1.5),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openOfficialPage(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10A37F),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.open_in_new),
                label: const Text("Open Official Notifications Page"),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Icon(Icons.school_outlined, color: theme.colorScheme.primary),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        "Ask the chatbot directly for exam schedule or fee-deadline "
                            "info — it links to the specific current PDF, not a fixed date.",
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}