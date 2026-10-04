import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class MaskedCallModal extends StatelessWidget {
  final String virtualDid;
  final String driverName;

  const MaskedCallModal({
    Key? key,
    this.virtualDid = "+91 7969002802",
    this.driverName = "Senthil Kumar",
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.pureWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFD1D5DB),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          // Pulsing Shield / Phone Icon
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppTheme.accentGreen.withOpacity(0.2),
                  blurRadius: 16,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: const Icon(
              Icons.phone_in_talk_rounded,
              color: AppTheme.accentGreen,
              size: 40,
            ),
          ),
          const SizedBox(height: 18),

          // Headline
          Text(
            "Connecting Masked Call...",
            style: GoogleFonts.plusJakartaSans(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppTheme.pureBlack,
            ),
          ),
          const SizedBox(height: 8),

          // Dual-Leg Call Explanation (per call-taxi-masking skill)
          Text(
            "Please pick up the incoming call from $virtualDid. We are bridging you directly to $driverName while keeping your personal number 100% hidden.",
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13,
              color: const Color(0xFF4B5563),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),

          Text(
            "உங்கள் தொலைபேசி எண் ஓட்டுநருக்குத் தெரியாது. உங்கள் போனுக்கு வரும் அழைப்பை எடுக்கவும்.",
            textAlign: TextAlign.center,
            style: GoogleFonts.notoSansTamil(
              fontSize: 12,
              color: const Color(0xFF6B7280),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 20),

          // Virtual DID Indicator Box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.security, size: 18, color: AppTheme.accentGreen),
                const SizedBox(width: 8),
                Text(
                  "Incoming Caller ID: $virtualDid",
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppTheme.pureBlack,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Confirmation Close Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onTap: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.pureBlack,
                foregroundColor: AppTheme.pureWhite,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: Text(
                "Got It (புரிந்தது)",
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
