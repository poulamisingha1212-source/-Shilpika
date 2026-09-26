import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/services/api_service.dart';

class ArtisanProfileScreen extends ConsumerStatefulWidget {
  final String artisanId;
  const ArtisanProfileScreen({super.key, required this.artisanId});

  @override
  ConsumerState<ArtisanProfileScreen> createState() => _ArtisanProfileScreenState();
}

class _ArtisanProfileScreenState extends ConsumerState<ArtisanProfileScreen> {
  Map<String, dynamic>? _artisan;
  List<dynamic> _products = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadArtisan();
  }

  Future<void> _loadArtisan() async {
    try {
      final api = ref.read(apiServiceProvider);
      // Fetch profile
      try {
        final profileRes = await api.get('/artisans/${widget.artisanId}');
        if (profileRes.data != null) {
          _artisan = Map<String, dynamic>.from(profileRes.data as Map);
        }
      } catch (_) {
        // Fallback if profile not populated yet
      }

      // Fetch products for marketplace feed
      final feedRes = await api.get('/marketplace/feed');
      if (feedRes.data != null && feedRes.data['data'] is List) {
        final all = feedRes.data['data'] as List;
        _products = all.where((p) => p['artisanId'] == widget.artisanId).toList();
      }

      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _error = 'Failed to load artisan profile: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      );
    }

    final user = _artisan?['user'] as Map<String, dynamic>?;
    final displayName = user?['displayName'] as String? ?? 'Artisan';
    final craftType = _artisan?['craftType'] as String? ?? 'Handcrafted Art';
    final region = _artisan?['region'] as String? ?? '';
    final state = _artisan?['state'] as String? ?? 'India';
    final bio = _artisan?['bio'] as String? ?? 'Passionate artisan preserving traditional heritage crafts.';
    final tags = (_artisan?['craftTags'] as List?)?.cast<String>() ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(displayName),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero banner & Profile Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.paddingLG),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 46,
                    backgroundColor: Colors.white,
                    child: CircleAvatar(
                      radius: 43,
                      backgroundColor: AppTheme.primary.withOpacity(0.1),
                      child: Text(
                        displayName.isNotEmpty ? displayName[0].toUpperCase() : 'A',
                        style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppTheme.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    displayName,
                    style: AppTheme.h2.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.verified, size: 16, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(
                        'Verified Master Artisan',
                        style: AppTheme.caption.copyWith(color: Colors.white.withOpacity(0.9), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      [craftType, if (region.isNotEmpty) '$region, $state' else state].join(' • '),
                      style: AppTheme.caption.copyWith(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(AppTheme.paddingLG),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Artisan Story', style: AppTheme.h3),
                  const SizedBox(height: 8),
                  Text(
                    bio,
                    style: AppTheme.body.copyWith(color: AppTheme.textSecondary, height: 1.6),
                  ),
                  if (tags.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: tags.map((t) => Chip(
                        label: Text(t),
                        backgroundColor: AppTheme.primary.withOpacity(0.08),
                        labelStyle: AppTheme.caption.copyWith(color: AppTheme.primary),
                      )).toList(),
                    ),
                  ],
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Creations', style: AppTheme.h3),
                      Text('${_products.length} Items', style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_products.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderLight),
                      ),
                      child: Center(
                        child: Text(
                          'No listed items in the active marketplace feed yet.',
                          style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary),
                        ),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _products.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (ctx, i) {
                        final p = _products[i] as Map<String, dynamic>;
                        final priceMin = (p['priceMin'] as num?)?.toDouble();
                        final priceMax = (p['priceMax'] as num?)?.toDouble();
                        return InkWell(
                          onTap: () => context.push('/products/${p['id']}'),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.borderLight),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 60,
                                  height: 60,
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.inventory_2_outlined, color: AppTheme.primary),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        p['title'] as String? ?? 'Untitled Craft',
                                        style: AppTheme.body.copyWith(fontWeight: FontWeight.w600),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        p['category'] as String? ?? 'Handmade',
                                        style: AppTheme.caption.copyWith(color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                                if (priceMin != null && priceMax != null)
                                  Text(
                                    'INR ${priceMin.toStringAsFixed(0)}',
                                    style: AppTheme.bodySmall.copyWith(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
