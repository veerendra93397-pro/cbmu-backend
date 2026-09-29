import 'package:flutter/material.dart';
import 'admin_api.dart';
import 'admin_login_screen.dart';
import 'admin_departments_screen.dart';
import 'admin_chairpersons_screen.dart';
import 'admin_fees_screen.dart';
import 'admin_buildings_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _departmentCount = 0;
  int _chairpersonCount = 0;
  int _feeCount = 0;
  int _buildingCount = 0;
  List<MapEntry<String, dynamic>> _recentlyEdited = [];

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
      final fees = await AdminApi.getFees();

      if (depts == null || fees == null) {
        if (mounted) {
          Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AdminLoginScreen()));
        }
        return;
      }

      final chairCount = depts.values.where((e) {
        final c = e['chairperson'] ?? e['person'];
        return c != null && c.toString().trim().isNotEmpty && !c.toString().toLowerCase().contains('unconfirmed');
      }).length;

      final buildingSet = depts.values
          .map((e) => (e['location'] ?? '').toString().trim())
          .where((l) => l.isNotEmpty)
          .toSet();

      final recent = depts.entries
          .where((e) => (e.value['last_verified'] ?? '').toString().startsWith('admin-'))
          .toList();

      setState(() {
        _departmentCount = depts.length;
        _chairpersonCount = chairCount;
        _feeCount = fees.length;
        _buildingCount = buildingSet.length;
        _recentlyEdited = recent;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = "Connection error — try again";
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Admin Dashboard"),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: "Log out",
            onPressed: () async {
              await AdminApi.logout();
              if (mounted) {
                Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AdminLoginScreen()));
              }
            },
          ),
        ],
      ),
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
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.3,
              children: [
                _StatCard(
                  icon: Icons.apartment,
                  color: const Color(0xFF10A37F),
                  label: "Departments",
                  count: _departmentCount,
                  onTap: () => _push(const AdminDepartmentsScreen()),
                ),
                _StatCard(
                  icon: Icons.person,
                  color: const Color(0xFF3B82F6),
                  label: "Chairpersons",
                  count: _chairpersonCount,
                  onTap: () => _push(const AdminChairpersonsScreen()),
                ),
                _StatCard(
                  icon: Icons.receipt_long,
                  color: const Color(0xFFF59E0B),
                  label: "Fees",
                  count: _feeCount,
                  onTap: () => _push(const AdminFeesScreen()),
                ),
                _StatCard(
                  icon: Icons.location_city,
                  color: const Color(0xFFEF4444),
                  label: "Buildings",
                  count: _buildingCount,
                  onTap: () => _push(const AdminBuildingsScreen()),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text("Recent Updates",
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            if (_recentlyEdited.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    "No admin edits yet — changes you make will show up here.",
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
                  ),
                ),
              )
            else
              ..._recentlyEdited.map((e) => Card(
                child: ListTile(
                  leading: Icon(
                    e.value['last_verified'] == 'admin-added' ? Icons.add_circle_outline : Icons.edit_outlined,
                    color: const Color(0xFF10A37F),
                  ),
                  title: Text(e.value['name'] ?? e.key),
                  subtitle: Text(e.value['last_verified'] == 'admin-added'
                      ? "Added by admin"
                      : "Edited by admin"),
                ),
              )),
          ],
        ),
      ),
    );
  }

  void _push(Widget screen) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen)).then((_) => _load());
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final int count;
  final VoidCallback onTap;

  const _StatCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.count,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).cardColor,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 22),
              ),
              const Spacer(),
              Text("$count", style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              Text(label, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6))),
            ],
          ),
        ),
      ),
    );
  }
}