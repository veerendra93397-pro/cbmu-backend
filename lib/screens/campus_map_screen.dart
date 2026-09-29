import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

/// Shows every campus location that currently has REAL GPS coordinates.
/// As of now, that's just the Main Gate (from the verified Wikimedia
/// Commons-sourced entry) — this screen is built to scale automatically
/// as more real pins get added to the backend's CAMPUS_DATA, without
/// needing any code changes here.
class CampusMapScreen extends StatelessWidget {
  const CampusMapScreen({super.key});

  // Mirrors any entry in the backend's CAMPUS_DATA that has real lat/lng
  // set. Update this list as you add more verified GPS pins on the
  // backend — once Admin Login + a database are wired up, this should
  // fetch from the backend directly instead of being duplicated here.
  static const List<Map<String, dynamic>> _pinnedLocations = [
    // Main Gate has no confirmed lat/lng yet either (see main.py) — this
    // list is intentionally empty until real coordinates exist, so the
    // map below shows an honest "no pins yet" state instead of guessing.
  ];

  @override
  Widget build(BuildContext context) {
    // Fallback center: general Mangalore University campus location,
    // same verified Wikipedia-sourced coordinate used by the backend.
    const campusCenter = LatLng(12.8157556, 74.9240750);

    return Scaffold(
      appBar: AppBar(title: const Text("Campus Map")),
      body: Stack(
        children: [
          FlutterMap(
            options: const MapOptions(initialCenter: campusCenter, initialZoom: 16),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.cbmu.assistant', // set to your actual package name
                retinaMode: true,
              ),
              MarkerLayer(
                markers: [
                  const Marker(
                    point: campusCenter,
                    width: 44,
                    height: 44,
                    child: Icon(Icons.location_pin, color: Color(0xFF10A37F), size: 44),
                  ),
                  ..._pinnedLocations.map((loc) => Marker(
                    point: LatLng(loc['lat'], loc['lng']),
                    width: 40,
                    height: 40,
                    child: const Icon(Icons.place, color: Colors.redAccent, size: 36),
                  )),
                ],
              ),
              const RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                  TextSourceAttribution('CARTO'),
                ],
              ),
            ],
          ),
          if (_pinnedLocations.isEmpty)
            Positioned(
              left: 16,
              right: 16,
              bottom: 20,
              child: Material(
                color: const Color(0xFF1A1A1A),
                borderRadius: BorderRadius.circular(14),
                elevation: 6,
                child: const Padding(
                  padding: EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: Color(0xFF10A37F)),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          "Showing the general campus location only — specific building "
                              "pins (departments, hostels, offices) will appear here once real "
                              "GPS coordinates are added.",
                          style: TextStyle(color: Colors.white, fontSize: 12.5),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}