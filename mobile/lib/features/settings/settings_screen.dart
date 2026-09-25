import "package:flutter/material.dart";
import "../../shared/theme/app_theme.dart";

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text("SettingsScreen")),
    body: const Center(child: Text("Coming Soon", style: TextStyle(fontSize: 20))),
  );
}
