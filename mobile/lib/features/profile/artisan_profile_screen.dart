import "package:flutter/material.dart";
import "../../shared/theme/app_theme.dart";

class ArtisanProfileScreen extends StatelessWidget {
  final String artisanId; const ArtisanProfileScreen({super.key, required this.artisanId});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text("ArtisanProfileScreen")),
    body: const Center(child: Text("Coming Soon", style: TextStyle(fontSize: 20))),
  );
}
