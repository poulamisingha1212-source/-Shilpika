import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';
import '../../shared/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/auth_provider.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});
  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  Map<String, dynamic>? _product;
  List<dynamic> _mediaList = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProduct();
  }

  Future<void> _loadProduct() async {
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.get('/products/${widget.productId}');
      setState(() {
        _product = Map<String, dynamic>.from(res.data as Map);
      });

      // Try fetching media
      try {
        final mediaRes = await api.get('/products/${widget.productId}/media');
        if (mediaRes.data is List) {
          setState(() {
            _mediaList = mediaRes.data as List;
          });
        }
      } catch (_) {}

      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Widget _buildMediaHeader() {
    String? imageUrl;
    if (_mediaList.isNotEmpty) {
      final first = _mediaList.first as Map<String, dynamic>;
      imageUrl = (first['processedUrl'] ?? first['rawUrl']) as String?;
    } else if (_product?['thumbnailUrl'] != null) {
      imageUrl = _product!['thumbnailUrl'] as String?;
    }

    if (imageUrl != null && imageUrl.isNotEmpty) {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return Image.network(
          imageUrl,
          width: double.infinity,
          height: 280,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildPlaceholder(),
        );
      } else if (imageUrl.startsWith('/') || imageUrl.contains('\\')) {
        final f = File(imageUrl);
        if (f.existsSync()) {
          return Image.file(
            f,
            width: double.infinity,
            height: 280,
            fit: BoxFit.cover,
          );
        }
      }
    }

    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Container(
      width: double.infinity,
      height: 280,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primary.withOpacity(0.08),
            AppTheme.primaryDark.withOpacity(0.15),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 72, color: AppTheme.primary.withOpacity(0.7)),
            const SizedBox(height: 8),
            Text(
              'Handcrafted Artisan Item',
              style: AppTheme.caption.copyWith(color: AppTheme.primary, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final isBuyer = auth.role != 'artisan';

    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      );
    }

    if (_error != null || _product == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Product')),
        body: Center(child: Text(_error ?? 'Product not found')),
      );
    }

    final p = _product!;
    final title = p['title'] as String? ?? 'Untitled';
    final description = p['description'] as String? ?? '';
    final category = p['category'] as String? ?? '';
    final material = p['material'] as String? ?? '';
    final craft = p['craft'] as String? ?? '';
    final region = p['region'] as String? ?? '';
    final priceMin = (p['priceMin'] as num?)?.toDouble();
    final priceMax = (p['priceMax'] as num?)?.toDouble();
    final tags = (p['tags'] as List?)?.cast<String>() ?? [];
    final artisan = p['artisan'] as Map<String, dynamic>?;
    final artisanId = p['artisanId'] as String? ?? '';
    final artisanName = artisan?['displayName'] as String? ?? 'Master Artisan';
    final isOwner = !isBuyer && (auth.userId == artisanId || artisanId.isEmpty);

    return Scaffold(
      appBar: AppBar(
        title: Text(title, overflow: TextOverflow.ellipsis),
        actions: [
          if (isOwner)
            IconButton(
              icon: const Icon(Icons.tune),
              tooltip: 'Adjust Pricing',
              onPressed: () => context.push('/pricing/${widget.productId}'),
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildMediaHeader(),
            Padding(
              padding: const EdgeInsets.all(AppTheme.paddingLG),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (priceMin != null && priceMax != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'INR ${priceMin.toStringAsFixed(0)} - ${priceMax.toStringAsFixed(0)}',
                        style: AppTheme.h3.copyWith(color: AppTheme.secondary),
                      ),
                    ),
                  const SizedBox(height: 16),
                  Text(title, style: AppTheme.h2),
                  const SizedBox(height: 12),

                  // Artisan attribution card
                  if (artisanId.isNotEmpty)
                    InkWell(
                      onTap: () => context.push('/artisan/$artisanId'),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: AppTheme.primary,
                              child: Text(
                                artisanName.isNotEmpty ? artisanName[0].toUpperCase() : 'A',
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(artisanName, style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.w600)),
                                  Text('Craftsperson • Tap to view profile', style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right, size: 18, color: AppTheme.primary),
                          ],
                        ),
                      ),
                    ),

                  const SizedBox(height: 16),
                  if (category.isNotEmpty) _Attribute(label: 'Category', value: category),
                  if (material.isNotEmpty) _Attribute(label: 'Material', value: material),
                  if (craft.isNotEmpty) _Attribute(label: 'Craft', value: craft),
                  if (region.isNotEmpty) _Attribute(label: 'Region', value: region),
                  const SizedBox(height: 16),
                  if (description.isNotEmpty) ...[
                    Text('About this Product', style: AppTheme.h3),
                    const SizedBox(height: 8),
                    Text(description, style: AppTheme.body.copyWith(color: AppTheme.textSecondary, height: 1.5)),
                    const SizedBox(height: 16),
                  ],
                  if (tags.isNotEmpty) ...[
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: tags.map((t) => Chip(
                        label: Text(t),
                        backgroundColor: AppTheme.primary.withOpacity(0.08),
                        labelStyle: AppTheme.caption.copyWith(color: AppTheme.primary),
                      )).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],
                  if (isBuyer)
                    ElevatedButton.icon(
                      icon: const Icon(Icons.mail_outline),
                      label: const Text('Contact Artisan'),
                      onPressed: () => context.push(
                        '/inquiry/${widget.productId}',
                        extra: {
                          'title': title,
                          'artisanName': artisanName,
                          'category': category,
                          'craft': craft,
                        },
                      ),
                    )
                  else ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderLight),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.storefront_outlined, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Text('This is your listing', style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.auto_awesome),
                      label: const Text('Recalculate AI Pricing'),
                      onPressed: () => context.push('/pricing/${widget.productId}'),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Attribute extends StatelessWidget {
  final String label, value;
  const _Attribute({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          children: [
            SizedBox(
              width: 80,
              child: Text(label, style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600)),
            ),
            Expanded(child: Text(value, style: AppTheme.bodySmall)),
          ],
        ),
      );
}