import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _controller = TextEditingController();
  int _rating = 0;

  // Replace with your own email — this is where feedback actually lands.
  // Using mailto: means this works immediately with zero backend/database
  // setup; if you want feedback stored and viewable in an admin panel
  // instead, that can be added once the Admin Login database is wired up.
  static const String _feedbackEmail = "veerendra93397@gmail.com";

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final stars = "⭐" * _rating;
    final body = Uri.encodeComponent(
      "Rating: ${_rating > 0 ? '$stars ($_rating/5)' : 'Not rated'}\n\n"
          "Feedback:\n${_controller.text.trim()}",
    );
    final uri = Uri.parse(
        "mailto:$_feedbackEmail?subject=CBMU%20Assistant%20Feedback&body=$body");

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
      if (mounted) Navigator.of(context).pop();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("No email app found on this device")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Feedback")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("How was your experience?",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              children: List.generate(5, (i) {
                final filled = i < _rating;
                return IconButton(
                  icon: Icon(filled ? Icons.star : Icons.star_border,
                      color: const Color(0xFF10A37F), size: 32),
                  onPressed: () => setState(() => _rating = i + 1),
                );
              }),
            ),
            const SizedBox(height: 16),
            const Text("Tell us more (optional)",
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _controller,
              maxLines: 6,
              decoration: InputDecoration(
                hintText: "What worked well? What was confusing or wrong?",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _send,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10A37F),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.send),
                label: const Text("Send Feedback"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}