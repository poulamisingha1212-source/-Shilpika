import "package:flutter/material.dart";
import "../../shared/theme/app_theme.dart";

class ProductDetailScreen extends StatelessWidget {
  final String productId; const ProductDetailScreen({super.key, required this.productId});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text("ProductDetailScreen")),
    body: const Center(child: Text("Coming Soon", style: TextStyle(fontSize: 20))),
  );
}
