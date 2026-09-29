import 'package:flutter/material.dart';

/// Shared brand colors and theme definitions. Currently ChatScreen itself
/// still uses hardcoded dark colors (a bigger refactor to make it fully
/// theme-aware is a separate task) — but every NEW screen added from here
/// on (Settings, About, Contact Us, Feedback, Campus Map) uses these
/// themes properly via Theme.of(context), so the toggle genuinely works
/// for all of them.
class AppColors {
  static const primary = Color(0xFF10A37F);
  static const primaryDark = Color(0xFF1A7F64);
}

class AppTheme {
  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF000000),
    colorScheme: const ColorScheme.dark(
      primary: AppColors.primary,
      secondary: AppColors.primaryDark,
      surface: Color(0xFF1A1A1A),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF1A1A1A),
      elevation: 0,
      foregroundColor: Colors.white,
    ),
    cardColor: const Color(0xFF1A1A1A),
    dividerColor: const Color(0xFF2A2A2A),
  );

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF7F7F5),
    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      secondary: AppColors.primaryDark,
      surface: Colors.white,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0.5,
      foregroundColor: Colors.black87,
    ),
    cardColor: Colors.white,
    dividerColor: const Color(0xFFE0E0E0),
  );
}