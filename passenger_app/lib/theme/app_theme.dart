import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Ultra-Refined Modern Minimalist Color System
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color pureBlack = Color(0xFF090D16);
  static const Color surfaceCard = Color(0xFFFFFFFF);
  static const Color bgSubtle = Color(0xFFF8FAFC);
  static const Color subtleDivider = Color(0xFFE2E8F0);
  static const Color subtleDividerDark = Color(0xFF1E293B);

  // Modern Accents
  static const Color primaryObsidian = Color(0xFF090D16);
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color accentEmerald = Color(0xFF10B981);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color accentRose = Color(0xFFF43F5E);
  static const Color textPrimary = Color(0xFF0A0F1D);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF94A3B8);

  // Clean, Balanced Typography (No oversized fonts)
  static TextStyle getHeadingLarge({bool isDark = false}) {
    return GoogleFonts.plusJakartaSans(
      fontSize: 16,
      fontWeight: FontWeight.w800,
      color: isDark ? pureWhite : textPrimary,
      letterSpacing: -0.3,
    );
  }

  static TextStyle getHeadingMedium({bool isDark = false}) {
    return GoogleFonts.plusJakartaSans(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: isDark ? pureWhite : textPrimary,
      letterSpacing: -0.2,
    );
  }

  static TextStyle getBody({bool isDark = false}) {
    return GoogleFonts.plusJakartaSans(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      color: isDark ? const Color(0xFFCBD5E1) : textSecondary,
    );
  }

  static TextStyle getTamilSubtitle({bool isDark = false}) {
    return GoogleFonts.notoSansTamil(
      fontSize: 11,
      fontWeight: FontWeight.w600,
      color: isDark ? const Color(0xFF94A3B8) : textMuted,
    );
  }

  static TextStyle getBoldPrice() {
    return GoogleFonts.plusJakartaSans(
      fontSize: 16,
      fontWeight: FontWeight.w800,
      color: textPrimary,
      letterSpacing: -0.3,
    );
  }

  static TextStyle getOtpDigit() {
    return GoogleFonts.plusJakartaSans(
      fontSize: 16,
      fontWeight: FontWeight.w800,
      color: textPrimary,
    );
  }
}
