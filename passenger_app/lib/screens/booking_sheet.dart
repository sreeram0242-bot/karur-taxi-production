import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class BookingVehicleSelectionSheet extends StatefulWidget {
  final Function(String category) onRideConfirmed;

  const BookingVehicleSelectionSheet({Key? key, required this.onRideConfirmed}) : super(key: key);

  @override
  State<BookingVehicleSelectionSheet> createState() => _BookingVehicleSelectionSheetState();
}

class _BookingVehicleSelectionSheetState extends State<BookingVehicleSelectionSheet> {
  String selectedCategory = 'sedan';

  final List<Map<String, dynamic>> vehicles = [
    {
      'id': 'auto',
      'name': 'Auto',
      'nameTa': 'ஆட்டோ',
      'capacity': '3',
      'time': '2 min',
      'oldPrice': '₹60',
      'price': '₹48',
      'badge': 'Quick Zip',
      'badgeColor': const Color(0xFFDCFCE7),
      'badgeTextColor': const Color(0xFF15803D),
      'perks': ['Affordable', 'Meter Rate'],
      'icon': Icons.electric_rickshaw_outlined,
    },
    {
      'id': 'mini',
      'name': 'Mini AC',
      'nameTa': 'மினி கார்',
      'capacity': '4',
      'time': '3 min',
      'oldPrice': '₹115',
      'price': '₹95',
      'badge': 'Chilled AC',
      'badgeColor': const Color(0xFFDBEAFE),
      'badgeTextColor': const Color(0xFF1D4ED8),
      'perks': ['AC Included', '2 Bags'],
      'icon': Icons.directions_car_outlined,
    },
    {
      'id': 'sedan',
      'name': 'Sedan Prime',
      'nameTa': 'செடான்',
      'capacity': '4',
      'time': '3 min',
      'oldPrice': '₹160',
      'price': '₹135',
      'isPopular': true,
      'badge': '✨ Best Value',
      'badgeColor': const Color(0xFFFEF3C7),
      'badgeTextColor': const Color(0xFF92400E),
      'perks': ['Top Driver', 'Extra Legroom', '3 Bags'],
      'icon': Icons.car_rental_outlined,
    },
    {
      'id': 'suv',
      'name': 'SUV XL',
      'nameTa': 'எஸ்.யு.வி',
      'capacity': '6',
      'time': '5 min',
      'oldPrice': '₹245',
      'price': '₹210',
      'badge': 'Family Size',
      'badgeColor': const Color(0xFFF3E8FF),
      'badgeTextColor': const Color(0xFF6B21A8),
      'perks': ['6-7 Seats', 'Roof Carrier'],
      'icon': Icons.airport_shuttle_outlined,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.pureWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sleek Sheet Handle
          Center(
            child: Container(
              width: 32,
              height: 3,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Select Ride", style: AppTheme.getHeadingLarge()),
                  Text("Upfront fixed pricing • Zero surge traps", style: AppTheme.getBody()),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: const BoxDecoration(
                        color: AppTheme.accentEmerald,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      "Karur Active",
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF047857),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Trip Insights Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.subtleDivider),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 13, color: AppTheme.textPrimary),
                    const SizedBox(width: 5),
                    Text(
                      "11.4 km • ~19 min",
                      style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Container(width: 5, height: 5, decoration: const BoxDecoration(color: AppTheme.accentEmerald, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text(
                      "Kovai Rd • Fast",
                      style: GoogleFonts.plusJakartaSans(fontSize: 10.5, fontWeight: FontWeight.w600, color: const Color(0xFF047857)),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    "🏷️ -₹25 APPLIED",
                    style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF92400E)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Vehicle Cards List
          Column(
            children: vehicles.map((veh) {
              final isSelected = selectedCategory == veh['id'];
              return GestureDetector(
                onTap: () {
                  setState(() {
                    selectedCategory = veh['id'];
                  });
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFF0FDF4) : AppTheme.pureWhite,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? AppTheme.accentEmerald : AppTheme.subtleDivider,
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 36,
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFDCFCE7) : AppTheme.bgSubtle,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          veh['icon'],
                          size: 20,
                          color: isSelected ? const Color(0xFF15803D) : AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  veh['name'],
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
                                    color: AppTheme.bgSubtle,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: Text(
                                    "${veh['capacity']} seats",
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: veh['badgeColor'] as Color,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: Text(
                                    veh['badge'] as String,
                                    style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: veh['badgeTextColor'] as Color),
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              "${veh['time']} away • ${veh['nameTa']}",
                              style: AppTheme.getBody(),
                            ),
                            const SizedBox(height: 2),
                            // Perks list
                            Row(
                              children: (veh['perks'] as List<String>).map((perk) {
                                return Container(
                                  margin: const EdgeInsets.only(right: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(3),
                                    border: Border.all(color: AppTheme.subtleDivider),
                                  ),
                                  child: Text(
                                    perk,
                                    style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                      // Price Column (Strikethrough Old Price + Active Price)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            veh['oldPrice'],
                            style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8), decoration: TextDecoration.lineThrough),
                          ),
                          Text(
                            veh['price'],
                            style: AppTheme.getBoldPrice(),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 8),

          // Payment mode preview row
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
                    const Icon(Icons.payment_outlined, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 6),
                    Text("Cash on Drop", style: AppTheme.getBody()),
                    const SizedBox(width: 4),
                    const Text("• UPI available", style: TextStyle(fontSize: 9.5, color: AppTheme.accentEmerald, fontWeight: FontWeight.bold)),
                  ],
                ),
                GestureDetector(
                  onTap: _showFareBreakdownSheet,
                  child: Row(
                    children: [
                      Text(
                        "Fare Breakdown",
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.accentBlue,
                        ),
                      ),
                      const SizedBox(width: 2),
                      const Icon(Icons.chevron_right, size: 14, color: AppTheme.accentBlue),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // Obsidian Black Confirm CTA (42px height)
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton(
              onTap: () => widget.onRideConfirmed(selectedCategory),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryObsidian,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Book ${selectedCategory.toUpperCase()} • ₹135",
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.arrow_forward_rounded, size: 15),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showFareBreakdownSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Fare Transparency", style: AppTheme.getHeadingLarge()),
            const SizedBox(height: 4),
            Text("Guaranteed fixed upfront tariff for Karur Central ➔ Textile SEZ (11.4 km)", style: AppTheme.getBody()),
            const SizedBox(height: 14),
            _receiptRow("Base Minimum Fare (First 3 km)", "₹40.00"),
            _receiptRow("Distance Fare (8.4 km × ₹11.50)", "₹96.60"),
            _receiptRow("Platform & Safety Fee", "₹3.40"),
            _receiptRow("🏷️ Promo Discount (TAMPASS25)", "-₹25.00", isDiscount: true),
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Total Upfront Amount", style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800)),
                Text("₹135.00", style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: AppTheme.accentEmerald)),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 40,
              child: ElevatedButton(
                onTap: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryObsidian),
                child: const Text("Got It", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _receiptRow(String label, String val, {bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: isDiscount ? const Color(0xFF047857) : AppTheme.textSecondary)),
          Text(val, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isDiscount ? const Color(0xFF047857) : AppTheme.textPrimary)),
        ],
      ),
    );
  }
}
