import 'package:flutter/material.dart';
import 'admin_api.dart';
import 'admin_login_screen.dart';

/// Same underlying data as Departments, scoped to just the chairperson/
/// person field — for quickly updating who heads what without wading
/// through building/contact/timings fields too.
class AdminChairpersonsScreen extends StatefulWidget {
  const AdminChairpersonsScreen({super.key});

  @override
  State<AdminChairpersonsScreen> createState() => _AdminChairpersonsScreenState();
}

class _AdminChairpersonsScreenState extends State<AdminChairpersonsScreen> {
  Map<String, dynamic>? _departments;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final depts = await AdminApi.getDepartments();
      if (depts == null) {
        _goToLogin();
        return;
      }
      setState(() {
        _departments = depts;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = "Connection error — try again";
        _loading = false;
      });
    }
  }

  void _goToLogin() {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AdminLoginScreen()));
  }

  void _showSnack(String message, {bool warn = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: warn ? Colors.orange.shade800 : Colors.green.shade700,
      duration: const Duration(seconds: 4),
    ));
  }

  Future<void> _edit(String key, Map<String, dynamic> entry) async {
    final chairCtrl = TextEditingController(text: entry['chairperson'] ?? entry['person'] ?? '');

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(entry['name'] ?? key, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            TextField(
              controller: chairCtrl,
              autofocus: true,
              decoration: const InputDecoration(labelText: "Chairperson / Person in charge", border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10A37F), foregroundColor: Colors.white),
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text("Save"),
              ),
            ),
          ],
        ),
      ),
    );

    if (saved != true || chairCtrl.text.trim().isEmpty) return;

    try {
      final result = await AdminApi.updateDepartment(key, {"chairperson": chairCtrl.text.trim()});
      _showSnack(
        result['persisted'] == true ? "Saved — will persist" : "Saved, but NOT persisted yet (Supabase not set up)",
        warn: result['persisted'] != true,
      );
      _load();
    } catch (e) {
      _showSnack("Save failed", warn: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Chairpersons")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(_error!),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _load, child: const Text("Retry")),
        ]),
      )
          : RefreshIndicator(
        onRefresh: _load,
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: _departments!.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final key = _departments!.keys.elementAt(i);
            final entry = _departments![key] as Map<String, dynamic>;
            final chair = entry['chairperson'] ?? entry['person'];
            final hasChair = chair != null && chair.toString().isNotEmpty;
            final unconfirmed = chair != null && chair.toString().toLowerCase().contains('unconfirmed');
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: (hasChair && !unconfirmed ? const Color(0xFF10A37F) : Colors.orange).withOpacity(0.15),
                  child: Icon(Icons.person,
                      color: hasChair && !unconfirmed ? const Color(0xFF10A37F) : Colors.orange, size: 20),
                ),
                title: Text(entry['name'] ?? key, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(hasChair ? chair.toString() : "Not set", maxLines: 2, overflow: TextOverflow.ellipsis),
                trailing: const Icon(Icons.edit, size: 20),
                onTap: () => _edit(key, entry),
              ),
            );
          },
        ),
      ),
    );
  }
}