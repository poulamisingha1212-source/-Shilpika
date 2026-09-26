import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/services/api_service.dart';

class MarketplaceScreen extends ConsumerStatefulWidget {
  const MarketplaceScreen({super.key});
  @override
  ConsumerState<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends ConsumerState<MarketplaceScreen> {
  final _search = TextEditingController();
  String? _query;
  String? _selectedCategory;

  static const categories = [
    'All',
    'Pottery',
    'Textile',
    'Clothing',
    'Religious',
    'Home Decor',
    'Jewellery',
    'Woodwork'
  ];

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Marketplace')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                hintText: 'Search handcrafted products...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query != null
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          setState(() {
                            _query = null;
                            _search.clear();
                          });
                        },
                      )
                    : null,
              ),
              onSubmitted: (v) => setState(() => _query = v.isEmpty ? null : v),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final cat = categories[i];
                final sel = (_selectedCategory == null && cat == 'All') ||
                    _selectedCategory == cat;
                return FilterChip(
                  label: Text(cat),
                  selected: sel,
                  onSelected: (_) => setState(
                      () => _selectedCategory = cat == 'All' ? null : cat),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: FutureBuilder(
              future: ref.read(apiServiceProvider).get('/marketplace/feed', params: {
                if (_query != null) 'q': _query,
                if (_selectedCategory != null) 'category': _selectedCategory,
              }),
              builder: (ctx, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(
                      child: CircularProgressIndicator(color: AppTheme.primary));
                }
                if (snap.hasError) {
                  return Center(child: Text('Error loading products: ${snap.error}'));
                }
                final data = snap.data?.data ?? {};
                final products = (data['data'] ?? []) as List;
                if (products.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off, size: 56, color: AppTheme.textSecondary),
                        SizedBox(height: 12),
                        Text('No products found', style: TextStyle(color: AppTheme.textSecondary)),
                      ],
                    ),
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.72,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: products.length,
                  itemBuilder: (ctx, i) {
                    final p = products[i] as Map<String, dynamic>;
                    final priceMin = p['priceMin'];
                    final priceMax = p['priceMax'];
                    final priceText = (priceMin != null && priceMax != null)
                        ? 'INR $priceMin - $priceMax'
                        : (priceMin != null ? 'INR $priceMin' : 'Price on request');

                    return GestureDetector(
                      onTap: () => context.push('/products/${p["id"]}'),
                      child: Card(
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withOpacity(0.08),
                                  borderRadius: const BorderRadius.vertical(
                                      top: Radius.circular(16)),
                                ),
                                child: const Center(
                                  child: Icon(Icons.inventory_2_outlined,
                                      size: 44, color: AppTheme.primary),
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    p['title'] ?? 'Untitled',
                                    style: AppTheme.bodySmall
                                        .copyWith(fontWeight: FontWeight.w600),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    priceText,
                                    style: AppTheme.caption.copyWith(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (p['category'] != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      p['category'] as String,
                                      style: AppTheme.caption.copyWith(
                                        color: AppTheme.textSecondary,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
