import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/app_theme.dart';
import 'screens/home_map_screen.dart';
import 'screens/live_tracking_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set system UI overlay style for extreme sunlight contrast
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: AppTheme.pureWhite,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const KarurTaxiPassengerApp());
}

class KarurTaxiPassengerApp extends StatelessWidget {
  const KarurTaxiPassengerApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Karur Taxi (கரூர் டாக்ஸி)',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppTheme.pureWhite,
        primaryColor: AppTheme.accentYellow,
        colorScheme: const ColorScheme.light(
          primary: AppTheme.accentYellow,
          secondary: AppTheme.accentGreen,
          error: AppTheme.accentRed,
          background: AppTheme.pureWhite,
          surface: AppTheme.pureWhite,
        ),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const HomeMapScreen(),
        '/tracking': (context) => const LiveTrackingScreen(
              rideId: 'demo-ride-4920',
              rideCode: 'KT-4920',
              otpCode: '4821',
            ),
      },
    );
  }
}
