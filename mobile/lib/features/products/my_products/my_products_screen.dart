import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "../../../shared/theme/app_theme.dart";
import "../../../core/services/api_service.dart";

class MyProductsScreen extends ConsumerWidget {
  const MyProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text("My Products")),
      body: FutureBuilder(
        future: ref.read(apiServiceProvider).get("/products/my"),
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
          if (snap.hasError) return Center(child: Text("Error: ${snap.error}"));
          final products = (snap.data?.data ?? []) as List;
          if (products.isEmpty) return Center(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.inventory_2_outlined, size: 64, color: AppTheme.textSecondary),
              const SizedBox(height: 16),
              Text("No products yet", style: AppTheme.h3),
              const SizedBox(height: 8),
              Text("Tap the + button to add your first product", style: AppTheme.body.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
            ]),
          );
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: products.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) {
              final p = products[i] as Map<String, dynamic>;
              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.all(12),
                  title: Text(p["title"] ?? "Untitled", style: AppTheme.body.copyWith(fontWeight: FontWeight.w600)),
                  subtitle: Text(p["status"] ?? "draft"),
                  trailing: Chip(label: Text("?${p["priceMin"] ?? "—"}")),
                  onTap: () => context.push("/products/${p["id"]}"),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        onPressed: () => context.push("/add-product"),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("Add Product", style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
