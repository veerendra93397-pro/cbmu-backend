import 'package:flutter/material.dart';
import 'admin_api.dart';
import 'admin_login_screen.dart';

class AdminDepartmentsScreen extends StatefulWidget {
  const AdminDepartmentsScreen({super.key});

  @override
  State<AdminDepartmentsScreen> createState() => _AdminDepartmentsScreenState();
}

class _AdminDepartmentsScreenState extends State<AdminDepartmentsScreen> {
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

  Future<bool> _confirmDelete(String label) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete this?"),
        content: Text("This removes \"$label\" permanently. This can't be undone."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Delete", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  Future<void> _edit(String key, Map<String, dynamic> entry) async {
    final locationCtrl = TextEditingController(text: entry['location'] ?? '');
    final chairCtrl = TextEditingController(text: entry['chairperson'] ?? entry['person'] ?? '');
    final contactCtrl = TextEditingController(text: entry['contact'] ?? '');
    final timingsCtrl = TextEditingController(text: entry['timings'] ?? '');

    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(entry['name'] ?? key, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextField(controller: locationCtrl, decoration: const InputDecoration(labelText: "Building / Location")),
              const SizedBox(height: 12),
              TextField(controller: chairCtrl, decoration: const InputDecoration(labelText: "Chairperson / Person")),
              const SizedBox(height: 12),
              TextField(controller: contactCtrl, decoration: const InputDecoration(labelText: "Contact (phone/email)")),
              const SizedBox(height: 12),
              TextField(controller: timingsCtrl, decoration: const InputDecoration(labelText: "Timings")),
              const SizedBox(height: 20),
              Row(
                children: [
                  TextButton.icon(
                    onPressed: () => Navigator.of(context).pop('delete'),
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    label: const Text("Delete", style: TextStyle(color: Colors.red)),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10A37F), foregroundColor: Colors.white),
                    onPressed: () => Navigator.of(context).pop('save'),
                    child: const Text("Save"),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (action == 'delete') {
      if (!await _confirmDelete(entry['name'] ?? key)) return;
      try {
        await AdminApi.deleteDepartment(key);
        _showSnack("Deleted");
        _load();
      } catch (e) {
        _showSnack("Delete failed", warn: true);
      }
      return;
    }
    if (action != 'save') return;

    final fields = <String, dynamic>{};
    if (locationCtrl.text.trim().isNotEmpty) fields['location'] = locationCtrl.text.trim();
    if (chairCtrl.text.trim().isNotEmpty) fields['chairperson'] = chairCtrl.text.trim();
    if (contactCtrl.text.trim().isNotEmpty) fields['contact'] = contactCtrl.text.trim();
    if (timingsCtrl.text.trim().isNotEmpty) fields['timings'] = timingsCtrl.text.trim();

    try {
      final result = await AdminApi.updateDepartment(key, fields);
      _showSnack(
        result['persisted'] == true ? "Saved — will persist" : "Saved, but NOT persisted yet (Supabase not set up)",
        warn: result['persisted'] != true,
      );
      _load();
    } catch (e) {
      _showSnack("Save failed", warn: true);
    }
  }

  Future<void> _add() async {
    final keyCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final locationCtrl = TextEditingController();
    final chairCtrl = TextEditingController();
    final contactCtrl = TextEditingController();

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("Add New Department / Office", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextField(controller: keyCtrl, decoration: const InputDecoration(labelText: "Internal key (e.g. \"geography department\")")),
              const SizedBox(height: 12),
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Display name")),
              const SizedBox(height: 12),
              TextField(controller: locationCtrl, decoration: const InputDecoration(labelText: "Building / Location")),
              const SizedBox(height: 12),
              TextField(controller: chairCtrl, decoration: const InputDecoration(labelText: "Chairperson / Person")),
              const SizedBox(height: 12),
              TextField(controller: contactCtrl, decoration: const InputDecoration(labelText: "Contact")),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10A37F), foregroundColor: Colors.white),
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text("Add"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (saved != true) return;

    if (keyCtrl.text.trim().isEmpty || nameCtrl.text.trim().isEmpty) {
      _showSnack("Key and name are required", warn: true);
      return;
    }

    try {
      final result = await AdminApi.createDepartment({
        "key": keyCtrl.text.trim().toLowerCase(),
        "name": nameCtrl.text.trim(),
        "location": locationCtrl.text.trim(),
        "chairperson": chairCtrl.text.trim(),
        "contact": contactCtrl.text.trim(),
      });
      _showSnack(
        result['persisted'] == true ? "Added — persisted" : "Added, but NOT persisted yet",
        warn: result['persisted'] != true,
      );
      _load();
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''), warn: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Departments")),
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
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
          itemCount: _departments!.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final key = _departments!.keys.elementAt(i);
            final entry = _departments![key] as Map<String, dynamic>;
            final verified = entry['verified'] == true;
            return Card(
              child: ListTile(
                leading: Icon(verified ? Icons.verified : Icons.help_outline,
                    color: verified ? const Color(0xFF10A37F) : Colors.orange),
                title: Text(entry['name'] ?? key, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(
                  "${entry['chairperson'] ?? entry['person'] ?? 'No contact yet'}"
                      "${(entry['location'] ?? '').toString().isNotEmpty ? ' · ${entry['location']}' : ''}",
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                ),
                trailing: const Icon(Icons.edit, size: 20),
                onTap: () => _edit(key, entry),
              ),
            );
          },
        ),
      ),
      floatingActionButton: (_loading || _error != null)
          ? null
          : FloatingActionButton.extended(
        backgroundColor: const Color(0xFF10A37F),
        onPressed: _add,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("Add Department", style: TextStyle(color: Colors.white)),
      ),
    );
  }
}