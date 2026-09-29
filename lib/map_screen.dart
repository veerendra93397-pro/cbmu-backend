import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

/// Shows a location INSIDE the app using an embedded map, built on
/// OpenStreetMap tiles via flutter_map — NO Google Cloud billing account,
/// NO API key, and NO credit card needed anywhere in this screen.
///
/// Tiles come from CartoDB's free "Dark Matter" basemap (matches this
/// app's black/teal theme) built on OpenStreetMap data. Both are free for
/// this kind of usage; attribution is shown on-screen as required by
/// their usage policies — don't remove that text if you keep this tile
/// source.
///
/// Note: like the Google Maps version, this only DISPLAYS a location —
/// it doesn't do live turn-by-turn walking navigation itself. The
/// "Navigate" button still hands off to the Google Maps app for that,
/// since real voice-guided navigation is a much bigger feature than a
/// student-project map view needs to build from scratch.
class MapScreen extends StatelessWidget {
  final double lat;
  final double lng;
  final String locationName;

  const MapScreen({
    super.key,
    required this.lat,
    required this.lng,
    this.locationName = "Location",
  });

  @override
  Widget build(BuildContext context) {
    final position = LatLng(lat, lng);

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A1A1A),
        elevation: 0,
        title: Text(locationName,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: position,
              initialZoom: 17,
            ),
            children: [
              TileLayer(
                // Free, no API key: CartoDB Dark Matter tiles (built on
                // OpenStreetMap data). {s} = subdomain, {r} = retina suffix.
                urlTemplate:
                'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.cbmu.assistant', // set to your actual package name
                retinaMode: true,
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: position,
                    width: 44,
                    height: 44,
                    child: const Icon(Icons.location_pin,
                        color: Color(0xFF10A37F), size: 44),
                  ),
                ],
              ),
              // Required attribution for OpenStreetMap + CartoDB's free tiles.
              const RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                  TextSourceAttribution('CARTO'),
                ],
              ),
            ],
          ),

          Positioned(
            left: 16,
            right: 16,
            bottom: 20,
            child: Material(
              color: const Color(0xFF1A1A1A),
              borderRadius: BorderRadius.circular(16),
              elevation: 6,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                            colors: [Color(0xFF10A37F), Color(0xFF1A7F64)]),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.place, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        locationName,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () => _startExternalNavigation(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10A37F),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.directions_walk, size: 18),
                      label: const Text("Navigate"),
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

  Future<void> _startExternalNavigation(BuildContext context) async {
    // Launches turn-by-turn WALKING navigation directly in the Google
    // Maps app. This one action still benefits from Google Maps being
    // installed on the phone, but it costs nothing and needs no API key —
    // it's just handing off to an app the student already has.
    final navUri = Uri.parse("google.navigation:q=$lat,$lng&mode=w");
    try {
      if (await canLaunchUrl(navUri)) {
        await launchUrl(navUri, mode: LaunchMode.externalApplication);
        return;
      }
      final webUri = Uri.parse(
          "https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=walking");
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Could not start navigation")),
        );
      }
    }
  }
}