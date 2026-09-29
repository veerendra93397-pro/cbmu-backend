import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Small shared helper so Buildings/Chairpersons/Fees screens don't each
/// reimplement the same HTTP + token logic.
class AdminApi {
  static const String baseUrl = "https://cbmu-backend.onrender.com";

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('admin_token');
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('admin_token');
  }

  static Future<Map<String, String>> headers() async {
    final token = await getToken();
    return {
      "Content-Type": "application/json",
      "Authorization": "Bearer $token",
    };
  }

  static Future<Map<String, dynamic>?> getDepartments() async {
    final res = await http
        .get(Uri.parse("$baseUrl/admin/departments"), headers: await headers())
        .timeout(const Duration(seconds: 30));
    if (res.statusCode == 200) return jsonDecode(res.body);
    if (res.statusCode == 401) return null; // caller should redirect to login
    throw Exception("Failed to load departments (${res.statusCode})");
  }

  static Future<Map<String, dynamic>?> getFees() async {
    final res = await http
        .get(Uri.parse("$baseUrl/admin/fees"), headers: await headers())
        .timeout(const Duration(seconds: 30));
    if (res.statusCode == 200) return jsonDecode(res.body);
    if (res.statusCode == 401) return null;
    throw Exception("Failed to load fees (${res.statusCode})");
  }

  static Future<Map<String, dynamic>> updateDepartment(String key, Map<String, dynamic> fields) async {
    final res = await http
        .put(Uri.parse("$baseUrl/admin/departments/$key"),
        headers: await headers(), body: jsonEncode({"fields": fields}))
        .timeout(const Duration(seconds: 30));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> createDepartment(Map<String, dynamic> body) async {
    final res = await http
        .post(Uri.parse("$baseUrl/admin/departments"), headers: await headers(), body: jsonEncode(body))
        .timeout(const Duration(seconds: 30));
    final decoded = jsonDecode(res.body);
    if (res.statusCode != 200) throw Exception(decoded['detail']?.toString() ?? "Failed");
    return decoded;
  }

  static Future<void> deleteDepartment(String key) async {
    final res = await http
        .delete(Uri.parse("$baseUrl/admin/departments/$key"), headers: await headers())
        .timeout(const Duration(seconds: 30));
    if (res.statusCode != 200) throw Exception("Delete failed (${res.statusCode})");
  }

  static Future<Map<String, dynamic>> updateFee(String key, Map<String, dynamic> fields) async {
    final res = await http
        .put(Uri.parse("$baseUrl/admin/fees/$key"), headers: await headers(), body: jsonEncode({"fields": fields}))
        .timeout(const Duration(seconds: 30));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> createFee(Map<String, dynamic> body) async {
    final res = await http
        .post(Uri.parse("$baseUrl/admin/fees"), headers: await headers(), body: jsonEncode(body))
        .timeout(const Duration(seconds: 30));
    final decoded = jsonDecode(res.body);
    if (res.statusCode != 200) throw Exception(decoded['detail']?.toString() ?? "Failed");
    return decoded;
  }

  static Future<void> deleteFee(String key) async {
    final res = await http
        .delete(Uri.parse("$baseUrl/admin/fees/$key"), headers: await headers())
        .timeout(const Duration(seconds: 30));
    if (res.statusCode != 200) throw Exception("Delete failed (${res.statusCode})");
  }

  // ---------------- Notices ----------------

  /// The list itself is public, but this checks the admin token is still
  /// valid first so an expired session redirects to login like every other
  /// admin screen (returns null when the token is rejected).
  static Future<List<Map<String, dynamic>>?> getNotices() async {
    final token = await getToken();
    if (token == null) return null;
    // Probe an admin-only endpoint cheaply to validate the session.
    final probe = await http
        .get(Uri.parse("$baseUrl/admin/fees"), headers: await headers())
        .timeout(const Duration(seconds: 30));
    if (probe.statusCode == 401) return null;

    final res = await http.get(Uri.parse("$baseUrl/notices")).timeout(const Duration(seconds: 30));
    if (res.statusCode != 200) throw Exception("Failed to load notices (${res.statusCode})");
    final data = jsonDecode(res.body);
    return List<Map<String, dynamic>>.from(data['notices'] ?? []);
  }

  static Future<Map<String, dynamic>> createNotice(Map<String, dynamic> body) async {
    final res = await http
        .post(Uri.parse("$baseUrl/admin/notices"), headers: await headers(), body: jsonEncode(body))
        .timeout(const Duration(seconds: 30));
    final decoded = jsonDecode(res.body);
    if (res.statusCode != 200) throw Exception(decoded['detail']?.toString() ?? "Failed");
    return decoded;
  }

  static Future<void> deleteNotice(String id) async {
    final res = await http
        .delete(Uri.parse("$baseUrl/admin/notices/$id"), headers: await headers())
        .timeout(const Duration(seconds: 30));
    if (res.statusCode != 200) throw Exception("Delete failed (${res.statusCode})");
  }
}