import "package:flutter/material.dart";
import "../../shared/theme/app_theme.dart";

class PricingScreen extends StatelessWidget {
  final String productId; const PricingScreen({super.key, required this.productId});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text("PricingScreen")),
    body: const Center(child: Text("Coming Soon", style: TextStyle(fontSize: 20))),
  );
}
