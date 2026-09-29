import 'package:flutter/material.dart';
import 'admin_api.dart';
import 'admin_login_screen.dart';

class AdminBuildingsScreen extends StatefulWidget {
  const AdminBuildingsScreen({super.key});

  @override
  State<AdminBuildingsScreen> createState() => _AdminBuildingsScreenState();
}

class _AdminBuildingsScreenState extends State<AdminBuildingsScreen> {
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

  Future<void> _editBuilding(String key, Map<String, dynamic> entry) async {
    final locationCtrl = TextEditingController(text: entry['location'] ?? '');

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(entry['name'] ?? key, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text("Building / Location name", style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            TextField(
              controller: locationCtrl,
              decoration: const InputDecoration(
                hintText: "e.g. Science Block, 2nd Floor",
                border: OutlineInputBorder(),
              ),
              autofocus: true,
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

    if (saved != true) return;

    try {
      final result = await AdminApi.updateDepartment(key, {"location": locationCtrl.text.trim()});
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
      appBar: AppBar(title: const Text("Buildings")),
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
            final hasLocation = (entry['location'] ?? '').toString().trim().isNotEmpty;
            return Card(
              child: ListTile(
                leading: const Icon(Icons.apartment, color: Color(0xFF10A37F)),
                title: Text(entry['name'] ?? key, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(
                  hasLocation ? entry['location'] : "No building set yet",
                  style: TextStyle(color: hasLocation ? null : Colors.orange.shade700),
                ),
                trailing: const Icon(Icons.edit, size: 20),
                onTap: () => _editBuilding(key, entry),
              ),
            );
          },
        ),
      ),
    );
  }
}