import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class ContactUsScreen extends StatelessWidget {
  const ContactUsScreen({super.key});

  // Sourced from the same verified data as the backend's CAMPUS_DATA —
  // if you update a phone number/name there, update it here too so the
  // two stay consistent. Once Admin Login + a real database are wired up
  // (next phase), this screen should fetch from the backend instead of
  // being hardcoded twice.
  static const List<Map<String, String>> _contacts = [
    {"title": "Vice Chancellor's Office", "person": "Prof. P.L. Dharma", "phone": "08242287347"},
    {"title": "Registrar's Office", "person": "Dr. Ganesh Sanjeev", "phone": "08242287276"},
    {"title": "Examination Section", "person": "Dr. H Devendrappa (Registrar, Evaluation)", "phone": "08242287327"},
    {"title": "Finance Officer", "person": "Sri Panchalingaswamy S.", "phone": "08242287376"},
    {"title": "International Students Centre", "person": "Dr. B.H. Shekar", "phone": "9480146921"},
    {"title": "University Library", "person": "Dr. M. Purushotham Gowda", "phone": "9449450671"},
    {"title": "Hostel for Men", "person": "Dr. Ramesh H.N.", "phone": "08242287206"},
    {"title": "Hostel for Women", "person": "Dr. H.L Shashirekha", "phone": "08242287319"},
  ];

  Future<void> _call(String phone) async {
    final uri = Uri.parse("tel:$phone");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Contact Us")),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _contacts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final c = _contacts[i];
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: const Color(0xFF10A37F).withOpacity(0.15),
                child: const Icon(Icons.phone, color: Color(0xFF10A37F), size: 20),
              ),
              title: Text(c["title"]!, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text("${c["person"]}\n${c["phone"]}"),
              isThreeLine: true,
              trailing: IconButton(
                icon: const Icon(Icons.call, color: Color(0xFF10A37F)),
                onPressed: () => _call(c["phone"]!),
              ),
            ),
          );
        },
      ),
    );
  }
}