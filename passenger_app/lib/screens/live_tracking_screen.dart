import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import '../theme/app_theme.dart';

class LiveTrackingScreen extends StatefulWidget {
  final String rideId;
  final String rideCode;
  final String otpCode;

  const LiveTrackingScreen({
    Key? key,
    required this.rideId,
    this.rideCode = 'KT-4920',
    this.otpCode = '4821',
  }) : super(key: key);

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen> {
  late MapLibreMapController mapController;
  LatLng driverPosition = const LatLng(10.9601, 78.0766);

  void _onMapCreated(MapLibreMapController controller) {
    mapController = controller;
    _drawCurvedRoute();
  }

  void _drawCurvedRoute() {
    mapController.addLine(
      const LineOptions(
        geometry: [
          LatLng(10.9660, 78.0830),
          LatLng(10.9645, 78.0810),
          LatLng(10.9630, 78.0795),
          LatLng(10.9615, 78.0780),
          LatLng(10.9601, 78.0766),
        ],
        lineColor: "#2563EB",
        lineWidth: 5.0,
        lineOpacity: 0.85,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: AppTheme.pureWhite,
      body: Stack(
        children: [
          // 1. BASE MAP
          Positioned.fill(
            child: MapLibreMap(
              initialCameraPosition: CameraPosition(
                target: driverPosition,
                zoom: 15.5,
              ),
              onMapCreated: _onMapCreated,
              styleString: "http://10.0.2.2:8080/tiles/light_style.json",
              myLocationEnabled: true,
              trackCameraPosition: true,
            ),
          ),

          // 2. UNIFIED APPLE MAPS STYLE TOP ISLAND (No awkward wrapping!)
          Positioned(
            top: topPadding + 10,
            left: 14,
            right: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.primaryObsidian,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x33000000),
                    blurRadius: 14,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Top Row: Live Beacon + ETA + Plate
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.accentEmerald,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            "3 MINS",
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            "850m away",
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              color: const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: AppTheme.pureWhite,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
                        ),
                        child: Text(
                          "TN 47 AJ 4920",
                          style: GoogleFonts.plusJakartaSans(
                            color: AppTheme.pureBlack,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Route Progress Bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: Container(
                      height: 3,
                      width: double.infinity,
                      color: Colors.white24,
                      alignment: Alignment.centerLeft,
                      child: Container(
                        width: MediaQuery.of(context).size.width * 0.5,
                        color: AppTheme.accentEmerald,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),

                  // Clean Single-Line Status
                  Row(
                    children: [
                      Text(
                        "Driver is arriving",
                        style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                      const SizedBox(width: 4),
                      const Text("•", style: TextStyle(color: Colors.white54)),
                      const SizedBox(width: 4),
                      Text(
                        "ஓட்டுநர் வந்து கொண்டிருக்கிறார்",
                        style: GoogleFonts.notoSansTamil(fontSize: 10, color: const Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // 3. DRIVER & OTP BOTTOM SHEET
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: AppTheme.pureWhite,
                borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x18000000),
                    blurRadius: 16,
                    offset: Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Handle
                      Container(
                        width: 32,
                        height: 3,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Vehicle & Live Speed Strip
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.bgSubtle,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.subtleDivider),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.directions_car, size: 16, color: AppTheme.textPrimary),
                                const SizedBox(width: 6),
                                Text(
                                  "Maruti Swift Dzire AC • White",
                                  style: GoogleFonts.plusJakartaSans(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                "⚡ 38 km/h",
                                style: GoogleFonts.plusJakartaSans(fontSize: 9.5, fontWeight: FontWeight.w800, color: const Color(0xFF047857)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Driver Profile Row
                      _buildDriverDetailsRow(),

                      const SizedBox(height: 8),

                      // Start OTP Block
                      _buildOtpDisplayBlock(),

                      const SizedBox(height: 10),

                      // Action Buttons (Schedule & Cancel)
                      _buildActionFooter(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDriverDetailsRow() {
    return Row(
      children: [
        Stack(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.bgSubtle,
              ),
              child: const Icon(Icons.person, size: 22, color: AppTheme.textMuted),
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  color: AppTheme.accentBlue,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, size: 7, color: Colors.white),
              ),
            ),
          ],
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    "Senthil Kumar",
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      "Police Verified",
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 8.5,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF047857),
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  const Icon(Icons.star, color: AppTheme.accentAmber, size: 12),
                  const SizedBox(width: 3),
                  Text(
                    "4.94",
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    "• 1,482 rides",
                    style: AppTheme.getBody(),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Action Circles (Call & Chat)
        Row(
          children: [
            GestureDetector(
              onTap: _initiateMaskedCall,
              child: Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: AppTheme.accentEmerald,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.phone, color: Colors.white, size: 15),
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: () {},
              child: Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: AppTheme.bgSubtle,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.chat_bubble_outline, size: 15, color: AppTheme.textPrimary),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildOtpDisplayBlock() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.bgSubtle,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.subtleDivider),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "START PIN (வண்டியில் ஏறிய பின் பகிரவும்)",
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                  color: AppTheme.textSecondary,
                ),
              ),
              Text("Cryptographic 4-Digit Security", style: AppTheme.getTamilSubtitle()),
            ],
          ),
          Row(
            children: widget.otpCode.split('').map((digit) {
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                width: 24,
                height: 30,
                decoration: BoxDecoration(
                  color: AppTheme.pureWhite,
                  borderRadius: BorderRadius.circular(5),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Center(
                  child: Text(
                    digit,
                    style: AppTheme.getOtpDigit(),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildActionFooter() {
    return Row(
      children: [
        Expanded(
          child: SizedBox(
            height: 36,
            child: ElevatedButton(
              onTap: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.bgSubtle,
                foregroundColor: AppTheme.textPrimary,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(
                "Schedule Next",
                style: GoogleFonts.plusJakartaSans(fontSize: 11.5, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: SizedBox(
            height: 36,
            child: ElevatedButton(
              onTap: _showCancelConfirmSheet,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFFF1F2),
                foregroundColor: AppTheme.accentRose,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Color(0x33F43F5E)),
                ),
              ),
              child: Text(
                "Cancel Ride",
                style: GoogleFonts.plusJakartaSans(fontSize: 11.5, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showCancelConfirmSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(color: Color(0xFFFFF1F2), shape: BoxShape.circle),
              child: const Icon(Icons.close, color: AppTheme.accentRose, size: 24),
            ),
            const SizedBox(height: 12),
            Text("Cancel Karur Taxi?", style: AppTheme.getHeadingLarge()),
            const SizedBox(height: 6),
            Text(
              "Senthil Kumar is already 850m away (2 min). Cancellation is 100% FREE within the first 3 minutes.",
              textAlign: TextAlign.center,
              style: AppTheme.getBody(),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: ElevatedButton(
                      onTap: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryObsidian,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text("Keep My Ride", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: ElevatedButton(
                      onTap: () {
                        Navigator.pop(ctx);
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFF1F2),
                        foregroundColor: AppTheme.accentRose,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: const BorderSide(color: Color(0x33F43F5E)),
                        ),
                      ),
                      child: const Text("Confirm Cancel", style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _initiateMaskedCall() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(color: Color(0xFFDCFCE7), shape: BoxShape.circle),
              child: const Icon(Icons.phone_in_talk, color: AppTheme.accentEmerald, size: 24),
            ),
            const SizedBox(height: 12),
            Text("Masked Voice Bridge", style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(
              "Connecting via virtual trunk +91 7969002802. Please accept the incoming call to bridge directly to Senthil Kumar with total privacy.",
              textAlign: TextAlign.center,
              style: AppTheme.getBody(),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 40,
              child: ElevatedButton(
                onTap: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryObsidian,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text("Understood", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
