import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Fetches the public notices list and works out how many are "unread".
///
/// "Unread" = posted after the last time the student opened the Notices
/// screen. We store that moment locally (SharedPreferences), so no login
/// or server-side tracking is needed. created_at values are ISO-8601 UTC
/// strings, which sort correctly as plain strings.
class NoticesService {
  static const String _baseUrl = "https://cbmu-backend.onrender.com";
  static const String _lastSeenKey = 'notices_last_seen';

  /// Returns notices newest-first. Throws on network failure so callers can
  /// decide whether to show an error or just stay quiet (e.g. the badge check).
  static Future<List<Map<String, dynamic>>> fetch() async {
    final res = await http
        .get(Uri.parse("$_baseUrl/notices"))
        .timeout(const Duration(seconds: 60)); // Render free tier can be slow to wake
    if (res.statusCode != 200) {
      throw Exception("Failed to load notices (${res.statusCode})");
    }
    final data = jsonDecode(res.body);
    return List<Map<String, dynamic>>.from(data['notices'] ?? []);
  }

  static Future<String?> _lastSeen() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_lastSeenKey);
  }

  static Future<int> unreadCount(List<Map<String, dynamic>> notices) async {
    final lastSeen = await _lastSeen();
    if (lastSeen == null) return notices.length;
    return notices.where((n) => (n['created_at'] ?? '').toString().compareTo(lastSeen) > 0).length;
  }

  /// Call when the student opens the Notices screen.
  static Future<void> markAllSeen(List<Map<String, dynamic>> notices) async {
    if (notices.isEmpty) return;
    final newest = notices
        .map((n) => (n['created_at'] ?? '').toString())
        .reduce((a, b) => a.compareTo(b) >= 0 ? a : b);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastSeenKey, newest);
  }
}