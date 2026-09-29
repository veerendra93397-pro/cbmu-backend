import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'notices_service.dart';

class NoticesScreen extends StatefulWidget {
  const NoticesScreen({super.key});

  @override
  State<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends State<NoticesScreen> {
  List<Map<String, dynamic>>? _notices;
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
      final notices = await NoticesService.fetch();
      // Opening this screen counts as "reading" everything currently posted.
      await NoticesService.markAllSeen(notices);
      if (!mounted) return;
      setState(() {
        _notices = notices;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = "Couldn't load notices. The server may be waking up — pull down to retry.";
        _loading = false;
      });
    }
  }

  static const Map<String, IconData> _icons = {
    'exam': Icons.edit_note,
    'fee': Icons.receipt_long,
    'admission': Icons.how_to_reg,
    'holiday': Icons.beach_access,
    'event': Icons.event,
    'general': Icons.campaign,
  };

  static const Map<String, Color> _colors = {
    'exam': Color(0xFFEF4444),
    'fee': Color(0xFFF59E0B),
    'admission': Color(0xFF3B82F6),
    'holiday': Color(0xFF8B5CF6),
    'event': Color(0xFFEC4899),
    'general': Color(0xFF10A37F),
  };

  String _formatDate(String? iso) {
    if (iso == null || iso.length < 10) return '';
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return iso.substring(0, 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return "${d.day} ${months[d.month - 1]} ${d.year}";
  }

  Future<void> _openLink(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text("Notices")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
        onRefresh: _load,
        child: _error != null
            ? ListView(children: [
          const SizedBox(height: 120),
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(_error!, textAlign: TextAlign.center),
            ),
          ),
        ])
            : (_notices == null || _notices!.isEmpty)
            ? ListView(children: [
          const SizedBox(height: 120),
          Icon(Icons.notifications_none, size: 56, color: theme.colorScheme.primary),
          const SizedBox(height: 12),
          const Center(
            child: Text("No notices yet", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              "New announcements from the university office will appear here.",
              textAlign: TextAlign.center,
              style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.6)),
            ),
          ),
        ])
            : ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: _notices!.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            final n = _notices![i];
            final category = (n['category'] ?? 'general').toString();
            final color = _colors[category] ?? _colors['general']!;
            final link = (n['link'] ?? '').toString();
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(_icons[category] ?? Icons.campaign, size: 14, color: color),
                              const SizedBox(width: 4),
                              Text(category.toUpperCase(),
                                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: color)),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(_formatDate(n['created_at']?.toString()),
                            style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withOpacity(0.55))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(n['title'] ?? '',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    if ((n['body'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(n['body'], style: const TextStyle(height: 1.45)),
                    ],
                    if (link.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      TextButton.icon(
                        onPressed: () => _openLink(link),
                        icon: const Icon(Icons.open_in_new, size: 16),
                        label: const Text("View details"),
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}