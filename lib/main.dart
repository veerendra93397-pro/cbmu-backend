import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'splash_screen.dart';
import 'map_screen.dart';
import 'theme_notifier.dart';
import 'app_theme.dart';
import 'screens/settings_screen.dart';
import 'screens/about_screen.dart';
import 'screens/contact_us_screen.dart';
import 'screens/feedback_screen.dart';
import 'screens/campus_map_screen.dart';
import 'screens/academic_calendar_screen.dart';
import 'screens/admin_login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadSavedThemeMode();
  runApp(const MyApp());
}

// ── UI strings for the language toggle ──────────────────────────────────
const Map<String, Map<String, String>> kStrings = {
  'en': {
    'appBarTitle': 'CBMU Assistant',
    'hint': 'Message...',
    'clearTitle': 'Clear Chat?',
    'clearBody': 'This will delete all messages.',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'emptyTitle': 'How can I help you today?',
    'emptySubtitle': 'Ask anything about CBMU campus',
    'thinking': 'Thinking...',
    'goodMorning': 'Good Morning 🌅',
    'goodAfternoon': 'Good Afternoon ☀️',
    'goodEvening': 'Good Evening',
    'goodNight': 'Good Night 🌙',
    'welcomeSuffix': 'How can I help you with CBMU today?',
    'serverError': '⚠️ Server error ({code}). Please try again.',
    'timeoutError': '⚠️ Request timed out. Render free-tier servers can take '
        '30–60s to wake up from sleep — tap Retry below.',
    'connectionError': '⚠️ Connection error. Server might be waking up — '
        'tap Retry in a moment.',
    'retry': 'Retry',
    'copied': 'Copied to clipboard',
    'noMaps': 'Could not open Google Maps',
    'openMaps': 'Open in Google Maps',
  },
  'kn': {
    'appBarTitle': 'ಸಿಬಿಎಂಯು ಸಹಾಯಕ',
    'hint': 'ಸಂದೇಶ...',
    'clearTitle': 'ಚಾಟ್ ಅಳಿಸಬೇಕೆ?',
    'clearBody': 'ಇದು ಎಲ್ಲಾ ಸಂದೇಶಗಳನ್ನು ಅಳಿಸುತ್ತದೆ.',
    'cancel': 'ರದ್ದುಮಾಡಿ',
    'delete': 'ಅಳಿಸಿ',
    'emptyTitle': 'ನಾನು ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    'emptySubtitle': 'ಸಿಬಿಎಂಯು ಕ್ಯಾಂಪಸ್ ಬಗ್ಗೆ ಏನು ಬೇಕಾದರೂ ಕೇಳಿ',
    'thinking': 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...',
    'goodMorning': 'ಶುಭೋದಯ 🌅',
    'goodAfternoon': 'ಶುಭ ಮಧ್ಯಾಹ್ನ ☀️',
    'goodEvening': 'ಶುಭ ಸಂಜೆ',
    'goodNight': 'ಶುಭ ರಾತ್ರಿ 🌙',
    'welcomeSuffix': 'ಇಂದು ಸಿಬಿಎಂಯು ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    'serverError': '⚠️ ಸರ್ವರ್ ದೋಷ ({code}). ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    'timeoutError': '⚠️ ವಿನಂತಿ ಸಮಯ ಮೀರಿದೆ. ಸರ್ವರ್ ಎಚ್ಚರಗೊಳ್ಳಲು 30–60 ಸೆಕೆಂಡುಗಳು ಬೇಕಾಗಬಹುದು — '
        'ಕೆಳಗೆ Retry ಒತ್ತಿ.',
    'connectionError': '⚠️ ಸಂಪರ್ಕ ದೋಷ. ಸರ್ವರ್ ಎಚ್ಚರಗೊಳ್ಳುತ್ತಿರಬಹುದು — '
        'ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ Retry ಒತ್ತಿ.',
    'retry': 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    'copied': 'ಕ್ಲಿಪ್‌ಬೋರ್ಡ್‌ಗೆ ನಕಲಿಸಲಾಗಿದೆ',
    'noMaps': 'ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್ ತೆರೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
    'openMaps': 'ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್‌ನಲ್ಲಿ ತೆರೆಯಿರಿ',
  },
};


class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (context, mode, _) {
        return MaterialApp(
          title: 'CBMU Assistant',
          debugShowCheckedModeBanner: false,
          themeMode: mode,
          theme: AppTheme.light.copyWith(
            textTheme: GoogleFonts.interTextTheme(AppTheme.light.textTheme),
          ),
          darkTheme: AppTheme.dark.copyWith(
            textTheme: GoogleFonts.interTextTheme(AppTheme.dark.textTheme),
          ),
          home: const SplashScreen(),
        );
      },
    );
  }
}

// ── Message Model ───────────────────────────────────────────────────────
class Message {
  final String text;
  final bool isUser;
  final DateTime time;
  final bool isError;

  Message({
    required this.text,
    required this.isUser,
    required this.time,
    this.isError = false,
  });

  Map<String, dynamic> toJson() => {
    'text': text,
    'isUser': isUser,
    'time': time.toIso8601String(),
    'isError': isError,
  };

  factory Message.fromJson(Map<String, dynamic> json) => Message(
    text: json['text'],
    isUser: json['isUser'],
    time: DateTime.parse(json['time']),
    isError: json['isError'] ?? false,
  );
}

// ── Chat Screen ─────────────────────────────────────────────────────────
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final List<Message> _messages = [];
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;
  String _lang = 'en'; // 'en' or 'kn' — toggled via the AppBar button
  static const String _backendUrl = "https://cbmu-backend.onrender.com/chat";

  String t(String key) => kStrings[_lang]?[key] ?? kStrings['en']![key]!;

  @override
  void initState() {
    super.initState();
    _loadLangPref();
    _loadHistory();
  }

  Future<void> _loadLangPref() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('app_lang');
    if (saved != null && mounted) {
      setState(() => _lang = saved);
    }
  }

  Future<void> _toggleLang() async {
    setState(() => _lang = _lang == 'en' ? 'kn' : 'en');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_lang', _lang);
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final history = prefs.getStringList('chat_history') ?? [];
    if (history.isNotEmpty) {
      if (!mounted) return;
      setState(() {
        for (var h in history) {
          _messages.add(Message.fromJson(jsonDecode(h)));
        }
      });
      _scrollToBottom();
    } else {
      _showWelcomeMessage();
    }
  }

  Future<void> _saveHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final history = _messages.map((m) => jsonEncode(m.toJson())).toList();
    await prefs.setStringList('chat_history', history);
  }

  Future<void> _sendMessage([String? overrideText]) async {
    final text = (overrideText ?? _controller.text).trim();
    if (text.isEmpty || _isLoading) return;

    setState(() {
      // Don't duplicate the user bubble on a retry.
      if (overrideText == null) {
        _messages.add(Message(text: text, isUser: true, time: DateTime.now()));
      }
      _isLoading = true;
    });
    _controller.clear();
    _focusNode.requestFocus();
    _saveHistory();
    _scrollToBottom();

    try {
      final res = await http
          .post(
        Uri.parse(_backendUrl),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "message": text,
          "lang": _lang,
        }),
      )
          .timeout(const Duration(seconds: 60));

      if (!mounted) return;

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _isLoading = false;
          _messages.add(Message(
            text: data['answer'] ?? "No response from server.",
            isUser: false,
            time: DateTime.now(),
          ));
        });
      } else {
        setState(() {
          _isLoading = false;
          _messages.add(Message(
            text: t('serverError').replaceAll('{code}', '${res.statusCode}'),
            isUser: false,
            time: DateTime.now(),
            isError: true,
          ));
        });
      }
    } on TimeoutException {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _messages.add(Message(
          text: t('timeoutError'),
          isUser: false,
          time: DateTime.now(),
          isError: true,
        ));
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _messages.add(Message(
          text: t('connectionError'),
          isUser: false,
          time: DateTime.now(),
          isError: true,
        ));
      });
    }

    _saveHistory();
    _scrollToBottom();
  }

  Future<void> _clearChat() async {
    bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        title: Text(t('clearTitle'), style: const TextStyle(color: Colors.white)),
        content: Text(t('clearBody'), style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t('cancel'))),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t('delete'), style: const TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _messages.clear());
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('chat_history');
      _showWelcomeMessage();
    }
  }

  void _showWelcomeMessage() {
    final hour = DateTime.now().hour;
    String greeting = hour < 12
        ? t('goodMorning')
        : hour < 17
        ? t('goodAfternoon')
        : hour < 21
        ? t('goodEvening')
        : t('goodNight');
    setState(() {
      _messages.add(Message(
          text: "$greeting!\n\n${t('welcomeSuffix')}",
          isUser: false,
          time: DateTime.now()));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      drawer: _buildDrawer(context),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A1A1A),
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                    colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                borderRadius: BorderRadius.all(Radius.circular(8)),
              ),
              child: const Icon(Icons.school, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 12),
            Text(t('appBarTitle'),
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: _toggleLang,
            style: TextButton.styleFrom(
              backgroundColor: const Color(0xFF2A2A2A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: Size.zero,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.language, size: 16, color: Color(0xFF10A37F)),
                const SizedBox(width: 6),
                Text(
                  _lang == 'en' ? 'EN' : 'ಕನ್ನಡ',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.white),
              tooltip: "Clear Chat",
              onPressed: _clearChat),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                          colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.school,
                        color: Colors.white, size: 36),
                  ),
                  const SizedBox(height: 20),
                  Text(t('emptyTitle'),
                      style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white)),
                  const SizedBox(height: 8),
                  Text(t('emptySubtitle'),
                      style: TextStyle(color: Colors.grey.shade400)),
                ],
              ),
            )
                : ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isLoading ? 1 : 0),
              itemBuilder: (ctx, i) {
                if (i == _messages.length) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Color(0xFF10A37F))),
                        const SizedBox(width: 12),
                        Text(t('thinking'),
                            style: const TextStyle(color: Color(0xFF10A37F))),
                      ],
                    ),
                  );
                }
                return _buildMessage(_messages[i]);
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF1A1A1A),
                border: Border(top: BorderSide(color: Color(0xFF2A2A2A))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2A2A2A),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: TextField(
                        controller: _controller,
                        focusNode: _focusNode,
                        style: const TextStyle(color: Colors.white),
                        textInputAction: TextInputAction.send,
                        decoration: InputDecoration(
                          hintText: t('hint'),
                          hintStyle: const TextStyle(color: Colors.grey),
                          border: InputBorder.none,
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                      shape: BoxShape.circle,
                      // Dim visually while a request is in flight.
                      color: _isLoading ? Colors.grey : null,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_upward, color: Colors.white),
                      onPressed: _isLoading ? null : () => _sendMessage(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Message Builder with Clickable Google Maps Button ───────────────────
  Widget _buildMessage(Message msg) {
    // Extract coordinates from the message (format: __LOCATION__:lat,lng)
    final locationRegex = RegExp(r'__LOCATION__:(-?\d+\.\d+),(-?\d+\.\d+)');
    final locationMatch = locationRegex.firstMatch(msg.text);

    // Extract a real building/campus photo, if the backend attached one
    // (format: __IMAGE__:<url>|<attribution text>)
    final imageRegex = RegExp(r'__IMAGE__:(\S+)\|([^\n]*)');
    final imageMatch = imageRegex.firstMatch(msg.text);
    final imageUrl = imageMatch?.group(1);
    final imageAttribution = imageMatch?.group(2);

    // Clean the text by removing both markers
    String cleanText = msg.text.replaceAll(locationRegex, '').replaceAll(imageRegex, '').trim();
    cleanText = cleanText.replaceAll(RegExp(r'\n+$'), '').replaceAll(RegExp(r'^\n+'), '');

    final bubbleColor = msg.isUser
        ? const Color(0xFF10A37F)
        : (msg.isError ? const Color(0xFF3A2222) : const Color(0xFF2A2A2A));

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment:
        msg.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!msg.isUser)
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: msg.isError
                    ? const LinearGradient(
                    colors: [Color(0xFFB33939), Color(0xFF7A2222)])
                    : const LinearGradient(
                    colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                borderRadius: const BorderRadius.all(Radius.circular(6)),
              ),
              child: Icon(
                msg.isError ? Icons.error_outline : Icons.smart_toy,
                color: Colors.white,
                size: 18,
              ),
            ),
          if (!msg.isUser) const SizedBox(width: 12),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Real building/campus photo, when the backend attached a
                // verified one. Shows a loading spinner while fetching and
                // quietly disappears (no broken-image icon) if it fails to
                // load, since a missing photo shouldn't look like an error.
                if (imageUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.network(
                      imageUrl,
                      width: 260,
                      height: 150,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Container(
                          width: 260,
                          height: 150,
                          color: const Color(0xFF2A2A2A),
                          child: const Center(
                            child: SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Color(0xFF10A37F)),
                            ),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) =>
                      const SizedBox.shrink(),
                    ),
                  ),
                  if (imageAttribution != null && imageAttribution.trim().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4, left: 2),
                      child: Text(
                        imageAttribution,
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                      ),
                    ),
                  const SizedBox(height: 8),
                ],

                // Main Chat Bubble — long-press to copy.
                GestureDetector(
                  onLongPress: () {
                    Clipboard.setData(ClipboardData(text: cleanText));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(t('copied')),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: bubbleColor,
                      borderRadius: BorderRadius.circular(16),
                      border: msg.isError
                          ? Border.all(color: const Color(0xFFB33939))
                          : null,
                    ),
                    child: msg.isUser
                        ? SelectableText(
                      cleanText,
                      style:
                      const TextStyle(color: Colors.white, fontSize: 15),
                    )
                        : MarkdownBody(
                      data: cleanText,
                      selectable: true,
                      styleSheet: MarkdownStyleSheet(
                        p: const TextStyle(
                            color: Colors.white, fontSize: 15, height: 1.4),
                        strong: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold),
                        listBullet:
                        const TextStyle(color: Colors.white, fontSize: 15),
                        a: const TextStyle(
                            color: Color(0xFF6FE3C4),
                            decoration: TextDecoration.underline),
                      ),
                      onTapLink: (text, href, title) async {
                        if (href != null) {
                          final uri = Uri.parse(href);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri,
                                mode: LaunchMode.externalApplication);
                          }
                        }
                      },
                    ),
                  ),
                ),

                // Retry button for connection/timeout errors.
                if (msg.isError) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: _isLoading
                        ? null
                        : () {
                      // Re-send the most recent user message.
                      final lastUser = _messages
                          .lastWhere((m) => m.isUser, orElse: () => msg);
                      _sendMessage(lastUser.text);
                    },
                    icon: const Icon(Icons.refresh, size: 16, color: Color(0xFF10A37F)),
                    label: Text(t('retry'),
                        style: TextStyle(color: Color(0xFF10A37F))),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],

                // Clickable Google Maps Button
                if (locationMatch != null) ...[
                  const SizedBox(height: 10),

                  // View the location INSIDE this app (embedded Google Map).
                  GestureDetector(
                    onTap: () {
                      final lat = double.tryParse(locationMatch.group(1) ?? '');
                      final lng = double.tryParse(locationMatch.group(2) ?? '');
                      if (lat == null || lng == null) return;
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => MapScreen(
                            lat: lat,
                            lng: lng,
                            locationName: cleanText.split('\n').first.replaceAll('*', ''),
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2A2A2A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF10A37F), width: 1.2),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.map_outlined, color: Color(0xFF10A37F), size: 20),
                          SizedBox(width: 8),
                          Text(
                            'View in App',
                            style: TextStyle(
                              color: Color(0xFF10A37F),
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  GestureDetector(
                    onTap: () async {
                      final lat = locationMatch.group(1);
                      final lng = locationMatch.group(2);

                      final geoUri = Uri.parse('geo:$lat,$lng?q=$lat,$lng(CBMU)');

                      try {
                        if (await canLaunchUrl(geoUri)) {
                          await launchUrl(geoUri, mode: LaunchMode.externalApplication);
                        } else {
                          final mapsUri =
                          Uri.parse('com.google.android.apps.maps://?q=$lat,$lng');
                          if (await canLaunchUrl(mapsUri)) {
                            await launchUrl(mapsUri,
                                mode: LaunchMode.externalApplication);
                          } else {
                            final webUri = Uri.parse(
                                'https://www.google.com/maps/search/?api=1&query=$lat,$lng');
                            await launchUrl(webUri,
                                mode: LaunchMode.externalApplication);
                          }
                        }
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(t('noMaps'))),
                        );
                      }
                    },
                    child: Container(
                      padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                            colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF10A37F).withOpacity(0.4),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.map, color: Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            t('openMaps'),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (msg.isUser) const SizedBox(width: 12),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              color: Theme.of(context).appBarTheme.backgroundColor,
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                      borderRadius: BorderRadius.all(Radius.circular(10)),
                    ),
                    child: const Icon(Icons.school, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text("CBMU Assistant",
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _drawerItem(context, Icons.map_outlined, "Campus Map", const CampusMapScreen()),
                  _drawerItem(context, Icons.calendar_month_outlined, "Academic Calendar", const AcademicCalendarScreen()),
                  _drawerItem(context, Icons.contact_phone_outlined, "Contact Us", const ContactUsScreen()),
                  _drawerItem(context, Icons.feedback_outlined, "Feedback", const FeedbackScreen()),
                  const Divider(),
                  _drawerItem(context, Icons.settings_outlined, "Settings", const SettingsScreen()),
                  _drawerItem(context, Icons.info_outline, "About", const AboutScreen()),
                  const Divider(),
                  _drawerItem(context, Icons.admin_panel_settings_outlined, "Admin Login", const AdminLoginScreen()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _drawerItem(BuildContext context, IconData icon, String label, Widget screen) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      onTap: () {
        Navigator.of(context).pop(); // close the drawer first
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
      },
    );
  }
}