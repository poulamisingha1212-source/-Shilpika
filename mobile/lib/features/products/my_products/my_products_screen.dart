import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class MyProductsScreen extends ConsumerWidget {
  const MyProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Products')),
      body: FutureBuilder(
        future: ref.read(apiServiceProvider).get('/products/my'),
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
          }
          if (snap.hasError) {
            return Center(child: Text('Error: ${snap.error}'));
          }
          final products = (snap.data?.data ?? []) as List;
          if (products.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.paddingLG),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.inventory_2_outlined, size: 44, color: AppTheme.primary),
                    ),
                    const SizedBox(height: 20),
                    Text('No products yet', style: AppTheme.h2),
                    const SizedBox(height: 8),
                    Text(
                      'Tap "+ Add Product" to record your voice and let AI generate your first professional listing.',
                      style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.add),
                      label: const Text('Add Your First Product'),
                      onPressed: () => context.push('/add-product'),
                    ),
                  ],
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: products.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) {
              final p = products[i] as Map<String, dynamic>;
              final isPublished = p['status'] == 'published';
              final priceMin = p['priceMin'];
              final priceMax = p['priceMax'];
              final priceText = (priceMin != null && priceMax != null)
                  ? 'INR $priceMin - $priceMax'
                  : (priceMin != null ? 'INR $priceMin' : 'Pricing unset');

              return Card(
                elevation: 1,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.inventory_2_outlined, color: AppTheme.primary),
                  ),
                  title: Text(
                    p['title'] ?? 'Untitled Draft',
                    style: AppTheme.body.copyWith(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(priceText, style: AppTheme.caption.copyWith(color: AppTheme.secondary, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: isPublished ? AppTheme.successGreen.withOpacity(0.12) : Colors.amber.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isPublished ? 'Live in Marketplace' : 'Draft',
                          style: AppTheme.caption.copyWith(
                            color: isPublished ? AppTheme.successGreen : Colors.amber[800],
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  trailing: PopupMenuButton<String>(
                    onSelected: (val) {
                      if (val == 'view') {
                        context.push('/products/${p["id"]}');
                      } else if (val == 'pricing') {
                        context.push('/pricing/${p["id"]}');
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'view',
                        child: Row(children: [Icon(Icons.visibility_outlined, size: 18), SizedBox(width: 8), Text('View Detail')]),
                      ),
                      const PopupMenuItem(
                        value: 'pricing',
                        child: Row(children: [Icon(Icons.tune, size: 18), SizedBox(width: 8), Text('Adjust Pricing')]),
                      ),
                    ],
                  ),
                  onTap: () => context.push('/products/${p["id"]}'),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        onPressed: () => context.push('/add-product'),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
