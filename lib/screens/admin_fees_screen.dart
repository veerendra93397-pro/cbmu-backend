import 'package:flutter/material.dart';
import 'admin_api.dart';
import 'admin_login_screen.dart';

class AdminFeesScreen extends StatefulWidget {
  const AdminFeesScreen({super.key});

  @override
  State<AdminFeesScreen> createState() => _AdminFeesScreenState();
}

class _AdminFeesScreenState extends State<AdminFeesScreen> {
  Map<String, dynamic>? _fees;
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
      final fees = await AdminApi.getFees();
      if (fees == null) {
        _goToLogin();
        return;
      }
      setState(() {
        _fees = fees;
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
    final labelCtrl = TextEditingController(text: entry['label'] ?? '');
    final yearCtrl = TextEditingController(text: entry['year'] ?? '');
    final pdfCtrl = TextEditingController(text: entry['pdf'] ?? '');
    final pdfLabelCtrl = TextEditingController(text: entry['pdf_label'] ?? '');
    final noteCtrl = TextEditingController(text: entry['note'] ?? '');

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
              Text(entry['label'] ?? key, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextField(controller: labelCtrl, decoration: const InputDecoration(labelText: "Label (e.g. \"MCA\")")),
              const SizedBox(height: 12),
              TextField(controller: yearCtrl, decoration: const InputDecoration(labelText: "Year (e.g. \"2025-26\")")),
              const SizedBox(height: 12),
              TextField(controller: pdfCtrl, decoration: const InputDecoration(labelText: "PDF link")),
              const SizedBox(height: 12),
              TextField(controller: pdfLabelCtrl, decoration: const InputDecoration(labelText: "PDF display label")),
              const SizedBox(height: 12),
              TextField(controller: noteCtrl, decoration: const InputDecoration(labelText: "Note (optional)")),
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
      if (!await _confirmDelete(entry['label'] ?? key)) return;
      try {
        await AdminApi.deleteFee(key);
        _showSnack("Deleted");
        _load();
      } catch (e) {
        _showSnack("Delete failed", warn: true);
      }
      return;
    }
    if (action != 'save') return;

    final fields = <String, dynamic>{
      if (labelCtrl.text.trim().isNotEmpty) 'label': labelCtrl.text.trim(),
      if (yearCtrl.text.trim().isNotEmpty) 'year': yearCtrl.text.trim(),
      if (pdfCtrl.text.trim().isNotEmpty) 'pdf': pdfCtrl.text.trim(),
      if (pdfLabelCtrl.text.trim().isNotEmpty) 'pdf_label': pdfLabelCtrl.text.trim(),
      'note': noteCtrl.text.trim().isEmpty ? null : noteCtrl.text.trim(),
    };

    try {
      final result = await AdminApi.updateFee(key, fields);
      _showSnack(
        result['persisted'] == true ? "Saved — will persist" : "Saved, but NOT persisted yet",
        warn: result['persisted'] != true,
      );
      _load();
    } catch (e) {
      _showSnack("Save failed", warn: true);
    }
  }

  Future<void> _add() async {
    final keyCtrl = TextEditingController();
    final labelCtrl = TextEditingController();
    final yearCtrl = TextEditingController();
    final pdfCtrl = TextEditingController();
    final pdfLabelCtrl = TextEditingController();

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
              const Text("Add New Fee Category", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextField(controller: keyCtrl, decoration: const InputDecoration(labelText: "Internal key (e.g. \"bca\")")),
              const SizedBox(height: 12),
              TextField(controller: labelCtrl, decoration: const InputDecoration(labelText: "Label (e.g. \"BCA\")")),
              const SizedBox(height: 12),
              TextField(controller: yearCtrl, decoration: const InputDecoration(labelText: "Year (e.g. \"2025-26\")")),
              const SizedBox(height: 12),
              TextField(controller: pdfCtrl, decoration: const InputDecoration(labelText: "PDF link")),
              const SizedBox(height: 12),
              TextField(controller: pdfLabelCtrl, decoration: const InputDecoration(labelText: "PDF display label")),
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

    if (keyCtrl.text.trim().isEmpty || labelCtrl.text.trim().isEmpty) {
      _showSnack("Key and label are required", warn: true);
      return;
    }

    try {
      final result = await AdminApi.createFee({
        "key": keyCtrl.text.trim().toLowerCase(),
        "label": labelCtrl.text.trim(),
        "year": yearCtrl.text.trim(),
        "pdf": pdfCtrl.text.trim(),
        "pdf_label": pdfLabelCtrl.text.trim(),
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
      appBar: AppBar(title: const Text("Fees")),
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
          itemCount: _fees!.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final key = _fees!.keys.elementAt(i);
            final entry = _fees![key] as Map<String, dynamic>;
            return Card(
              child: ListTile(
                leading: const Icon(Icons.receipt_long, color: Color(0xFF10A37F)),
                title: Text(entry['label'] ?? key, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text("${entry['year'] ?? ''} · ${entry['pdf_label'] ?? 'No PDF link yet'}",
                    maxLines: 1, overflow: TextOverflow.ellipsis),
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
        label: const Text("Add Fee", style: TextStyle(color: Colors.white)),
      ),
    );
  }
}