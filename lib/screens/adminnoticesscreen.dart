import 'package:flutter/material.dart';
import 'admin_api.dart';
import 'admin_login_screen.dart';

class AdminNoticesScreen extends StatefulWidget {
  const AdminNoticesScreen({super.key});

  @override
  State<AdminNoticesScreen> createState() => _AdminNoticesScreenState();
}

class _AdminNoticesScreenState extends State<AdminNoticesScreen> {
  List<Map<String, dynamic>>? _notices;
  bool _loading = true;
  String? _error;

  static const List<String> _categories = ['general', 'exam', 'fee', 'admission', 'holiday', 'event'];

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
      final notices = await AdminApi.getNotices();
      if (notices == null) {
        _goToLogin();
        return;
      }
      setState(() {
        _notices = notices;
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
        title: const Text("Delete this notice?"),
        content: Text("\"$label\" will be removed for all students."),
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

  Future<void> _add() async {
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();
    final linkCtrl = TextEditingController();
    String category = 'general';

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("Post a Notice", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: "Title *")),
                const SizedBox(height: 12),
                TextField(
                  controller: bodyCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: "Details (optional)"),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  decoration: const InputDecoration(labelText: "Category"),
                  items: _categories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c[0].toUpperCase() + c.substring(1))))
                      .toList(),
                  onChanged: (v) => setSheetState(() => category = v ?? 'general'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: linkCtrl,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(labelText: "Link to official PDF/page (optional)"),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10A37F), foregroundColor: Colors.white),
                    onPressed: () => Navigator.of(context).pop(true),
                    icon: const Icon(Icons.campaign),
                    label: const Text("Publish"),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (saved != true) return;

    if (titleCtrl.text.trim().isEmpty) {
      _showSnack("A title is required", warn: true);
      return;
    }

    try {
      final result = await AdminApi.createNotice({
        "title": titleCtrl.text.trim(),
        "body": bodyCtrl.text.trim(),
        "category": category,
        if (linkCtrl.text.trim().isNotEmpty) "link": linkCtrl.text.trim(),
      });
      _showSnack(
        result['persisted'] == true
            ? "Published — students will see it"
            : "Published, but NOT saved permanently (Supabase not set up) — lost on server restart",
        warn: result['persisted'] != true,
      );
      _load();
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''), warn: true);
    }
  }

  Future<void> _delete(Map<String, dynamic> notice) async {
    if (!await _confirmDelete(notice['title'] ?? 'this notice')) return;
    try {
      await AdminApi.deleteNotice(notice['id'].toString());
      _showSnack("Deleted");
      _load();
    } catch (_) {
      _showSnack("Delete failed", warn: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Notices")),
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
        child: (_notices == null || _notices!.isEmpty)
            ? ListView(children: const [
          SizedBox(height: 120),
          Icon(Icons.campaign_outlined, size: 56, color: Color(0xFF10A37F)),
          SizedBox(height: 12),
          Center(child: Text("No notices posted yet")),
          SizedBox(height: 4),
          Center(child: Text("Tap \"Post Notice\" to publish one.", style: TextStyle(fontSize: 12))),
        ])
            : ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
          itemCount: _notices!.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final n = _notices![i];
            final date = (n['created_at'] ?? '').toString();
            return Card(
              child: ListTile(
                leading: const Icon(Icons.campaign, color: Color(0xFF10A37F)),
                title: Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(
                  "${(n['category'] ?? 'general').toString().toUpperCase()}"
                      "${date.length >= 10 ? ' · ${date.substring(0, 10)}' : ''}",
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () => _delete(n),
                ),
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
        label: const Text("Post Notice", style: TextStyle(color: Colors.white)),
      ),
    );
  }
}