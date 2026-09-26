import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_theme.dart';
import '../voice_cataloger/tts_player_widget.dart';
import '../../core/services/api_service.dart';

class PricingScreen extends ConsumerStatefulWidget {
  final String productId;
  const PricingScreen({super.key, required this.productId});

  @override
  ConsumerState<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends ConsumerState<PricingScreen> {
  final _matCtrl = TextEditingController();
  final _labCtrl = TextEditingController();
  final _othCtrl = TextEditingController();
  final _marginCtrl = TextEditingController(text: '30');

  final _overrideMinCtrl = TextEditingController();
  final _overrideMaxCtrl = TextEditingController();

  Map<String, dynamic>? _product;
  Map<String, dynamic>? _recommendation;
  double? _selectedPriceMin;
  double? _selectedPriceMax;
  bool _isOverride = false;
  bool _pricePersisted = false;

  bool _loadingProduct = true;
  bool _calculating = false;
  bool _saving = false;
  String? _error;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _loadProduct();
  }

  @override
  void dispose() {
    _matCtrl.dispose();
    _labCtrl.dispose();
    _othCtrl.dispose();
    _marginCtrl.dispose();
    _overrideMinCtrl.dispose();
    _overrideMaxCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProduct() async {
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.get('/products/${widget.productId}');
      final productData = Map<String, dynamic>.from(res.data as Map);

      // Check if price is already persisted on product
      final currentMin = (productData['priceMin'] as num?)?.toDouble();
      final currentMax = (productData['priceMax'] as num?)?.toDouble();

      // Attempt to load existing price recommendation
      Map<String, dynamic>? existingRec;
      try {
        final recRes = await api.get('/ai/price-recommendation/${widget.productId}');
        if (recRes.data != null && recRes.data is Map) {
          final rawRec = Map<String, dynamic>.from(recRes.data as Map);
          existingRec = {
            'id': rawRec['id'],
            'min_price': (rawRec['rangeMin'] as num?)?.toDouble() ?? 0,
            'max_price': (rawRec['rangeMax'] as num?)?.toDouble() ?? 0,
            'estimated_cost': (rawRec['estimatedCost'] as num?)?.toDouble() ?? 0,
            'suggested_margin_percent': (rawRec['suggestedMarginPercent'] as num?)?.toDouble() ?? 30,
            'factors': rawRec['factors'] is List ? (rawRec['factors'] as List).cast<String>() : <String>[],
            'data_timestamp': rawRec['dataTimestamp'] ?? rawRec['createdAt'],
            'data_availability': rawRec['dataAvailability'] ?? 'COST_BASED',
            'explanation': rawRec['dataAvailability'] == 'MARKET_DATA'
                ? 'Price range estimated from market observations.'
                : 'Transparent cost-based recommendation.',
          };
        }
      } catch (_) {}

      setState(() {
        _product = productData;
        _recommendation = existingRec;
        if (currentMin != null && currentMax != null) {
          _selectedPriceMin = currentMin;
          _selectedPriceMax = currentMax;
          _pricePersisted = true;
          final aiMin = (productData['aiRecommendedPriceMin'] as num?)?.toDouble();
          final aiMax = (productData['aiRecommendedPriceMax'] as num?)?.toDouble();
          _isOverride = (aiMin != null && aiMax != null) && (currentMin != aiMin || currentMax != aiMax);
        }
        _loadingProduct = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load product: $e';
        _loadingProduct = false;
      });
    }
  }

  Future<void> _calculateRecommendation() async {
    final matText = _matCtrl.text.trim();
    final labText = _labCtrl.text.trim();
    final othText = _othCtrl.text.trim();
    final marginText = _marginCtrl.text.trim();

    final mat = double.tryParse(matText);
    final lab = double.tryParse(labText);
    final oth = othText.isEmpty ? 0.0 : double.tryParse(othText);
    final margin = marginText.isEmpty ? 30.0 : double.tryParse(marginText);

    // 1. Validate numeric inputs
    if ((matText.isNotEmpty && mat == null) ||
        (labText.isNotEmpty && lab == null) ||
        (othText.isNotEmpty && oth == null) ||
        (marginText.isNotEmpty && margin == null)) {
      setState(() => _error = 'Please enter valid numeric values for all cost fields.');
      return;
    }

    final matVal = mat ?? 0.0;
    final labVal = lab ?? 0.0;
    final othVal = oth ?? 0.0;
    final marginVal = margin ?? 30.0;

    // 2. Prevent negative values
    if (matVal < 0 || labVal < 0 || othVal < 0 || marginVal < 0) {
      setState(() => _error = 'Cost values and desired margin percentage cannot be negative.');
      return;
    }

    setState(() {
      _calculating = true;
      _error = null;
      _successMessage = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final body = <String, dynamic>{
        'productId': widget.productId,
        'materialCost': matVal,
        'laborCost': labVal,
        'otherCost': othVal,
        'desiredMarginPercent': marginVal,
      };
      if (_product?['category'] != null) body['category'] = _product!['category'];
      if (_product?['craft'] != null) body['craft'] = _product!['craft'];
      if (_product?['region'] != null) body['region'] = _product!['region'];

      final res = await api.post('/ai/price-recommendation', data: body);
      final recData = Map<String, dynamic>.from(res.data as Map);

      setState(() {
        _recommendation = recData;
        _calculating = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to calculate price recommendation: $e';
        _calculating = false;
      });
    }
  }

  Future<void> _acceptRecommendation() async {
    if (_recommendation == null) return;
    final recMin = (_recommendation!['min_price'] as num?)?.toDouble() ?? 0;
    final recMax = (_recommendation!['max_price'] as num?)?.toDouble() ?? 0;

    await _persistPrice(recMin, recMax, isOverride: false);
  }

  void _showEditPriceDialog() {
    final recMin = (_recommendation?['min_price'] as num?)?.toDouble() ?? (_selectedPriceMin ?? 500);
    final recMax = (_recommendation?['max_price'] as num?)?.toDouble() ?? (_selectedPriceMax ?? 1000);

    _overrideMinCtrl.text = (_selectedPriceMin ?? recMin).toStringAsFixed(0);
    _overrideMaxCtrl.text = (_selectedPriceMax ?? recMax).toStringAsFixed(0);

    String? dialogError;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.edit_outlined, color: AppTheme.secondary),
              SizedBox(width: 8),
              Text('Edit Price (Artisan Override)'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Set your own custom price range. Your custom price will be saved separately from the AI recommendation.',
                  style: AppTheme.caption.copyWith(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 16),
                _PriceInputField(
                  label: 'Minimum Price',
                  prefix: '₹ ',
                  ctrl: _overrideMinCtrl,
                  hint: 'e.g. 1800',
                ),
                const SizedBox(height: 12),
                _PriceInputField(
                  label: 'Maximum Price',
                  prefix: '₹ ',
                  ctrl: _overrideMaxCtrl,
                  hint: 'e.g. 2200',
                ),
                if (dialogError != null) ...[
                  const SizedBox(height: 10),
                  Text(dialogError!, style: AppTheme.caption.copyWith(color: AppTheme.errorRed)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                minimumSize: const Size(120, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                final minVal = double.tryParse(_overrideMinCtrl.text.trim());
                final maxVal = double.tryParse(_overrideMaxCtrl.text.trim());

                if (minVal == null || maxVal == null) {
                  setDialogState(() => dialogError = 'Please enter valid numeric prices.');
                  return;
                }
                if (minVal < 0 || maxVal < 0) {
                  setDialogState(() => dialogError = 'Prices cannot be negative.');
                  return;
                }
                if (minVal > maxVal) {
                  setDialogState(() => dialogError = 'Minimum price cannot exceed maximum price.');
                  return;
                }

                Navigator.of(ctx).pop();
                _persistPrice(minVal, maxVal, isOverride: true);
              },
              child: const Text('Apply Price'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _persistPrice(double min, double max, {required bool isOverride}) async {
    setState(() {
      _saving = true;
      _error = null;
      _successMessage = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final recId = _recommendation?['id'] ?? _recommendation?['recommendation_id'];

      // 1. Post to dedicated acceptance endpoint
      await api.post('/ai/price-recommendation/accept', data: {
        'productId': widget.productId,
        if (recId != null) 'recommendationId': recId,
        'priceMin': min,
        'priceMax': max,
        'isOverride': isOverride,
      });

      // 2. Also patch product to ensure both AI recommended and artisan selected prices are preserved
      final aiMin = (_recommendation?['min_price'] as num?)?.toDouble() ?? min;
      final aiMax = (_recommendation?['max_price'] as num?)?.toDouble() ?? max;

      await api.patch('/products/${widget.productId}', data: {
        'priceMin': min,
        'priceMax': max,
        'aiRecommendedPriceMin': aiMin,
        'aiRecommendedPriceMax': aiMax,
        'currency': 'INR',
      });

      setState(() {
        _saving = false;
        _selectedPriceMin = min;
        _selectedPriceMax = max;
        _isOverride = isOverride;
        _pricePersisted = true;
        if (_product != null) {
          _product!['priceMin'] = min;
          _product!['priceMax'] = max;
          _product!['aiRecommendedPriceMin'] = aiMin;
          _product!['aiRecommendedPriceMax'] = aiMax;
        }
        _successMessage = isOverride
            ? 'Custom artisan price of ₹${min.toStringAsFixed(0)} – ₹${max.toStringAsFixed(0)} successfully saved!'
            : 'AI recommendation of ₹${min.toStringAsFixed(0)} – ₹${max.toStringAsFixed(0)} successfully accepted & saved!';
      });
    } catch (e) {
      setState(() {
        _saving = false;
        _error = 'Failed to persist price: $e';
      });
    }
  }

  Future<void> _publishProduct() async {
    if (_selectedPriceMin == null || _selectedPriceMax == null) {
      setState(() => _error = 'Please accept or set a price before publishing.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      await api.post('/products/${widget.productId}/publish', data: {});

      setState(() {
        _saving = false;
        _successMessage = 'Listing successfully published to marketplace!';
        if (_product != null) {
          _product!['status'] = 'published';
        }
      });
    } catch (e) {
      setState(() {
        _saving = false;
        _error = 'Failed to publish: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingProduct) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      );
    }

    final title = _product?['title'] as String? ?? 'Product Pricing';
    final category = _product?['category'] as String?;
    final craft = _product?['craft'] as String?;
    final region = _product?['region'] as String?;
    final isDraft = _product?['status'] == 'draft';

    final rec = _recommendation;
    final recMin = (rec?['min_price'] as num?)?.toDouble() ?? 0;
    final recMax = (rec?['max_price'] as num?)?.toDouble() ?? 0;
    final estimatedCost = (rec?['estimated_cost'] as num?)?.toDouble() ?? 0;
    final suggestedMargin = (rec?['suggested_margin_percent'] as num?)?.toDouble() ?? 30;

    final availabilityRaw = (rec?['data_availability'] as String?)?.toUpperCase() ?? 'COST_BASED';
    final isMarketData = availabilityRaw.contains('MARKET');
    final availabilityBadge = isMarketData ? 'MARKET_DATA' : 'COST_BASED';

    final dataTimestamp = rec?['data_timestamp'] as String? ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dynamic Pricing'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderLight),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.inventory_2_outlined, color: AppTheme.primary, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: AppTheme.h3, maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 3),
                        Text(
                          [
                            if (craft != null && craft.isNotEmpty) craft,
                            if (category != null && category.isNotEmpty) category,
                            if (region != null && region.isNotEmpty) region,
                          ].join(' • '),
                          style: AppTheme.caption.copyWith(color: AppTheme.textSecondary),
                        ),
                        if (_selectedPriceMin != null && _selectedPriceMax != null) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text(
                                'Current Price: ₹${_selectedPriceMin!.toStringAsFixed(0)} – ₹${_selectedPriceMax!.toStringAsFixed(0)}',
                                style: AppTheme.caption.copyWith(
                                  color: AppTheme.secondary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (_isOverride) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.amber.shade700, width: 0.5),
                                  ),
                                  child: Text(
                                    'Artisan Override',
                                    style: TextStyle(fontSize: 10, color: Colors.amber.shade900, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Production Cost Form
            Text('Production Cost', style: AppTheme.h2),
            const SizedBox(height: 4),
            Text(
              'Enter your input costs to calculate a transparent, fair market price.',
              style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),

            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderLight),
              ),
              child: Column(
                children: [
                  _PriceInputField(
                    label: 'Material',
                    prefix: '₹ ',
                    ctrl: _matCtrl,
                    hint: '500',
                  ),
                  const SizedBox(height: 12),
                  _PriceInputField(
                    label: 'Labor',
                    prefix: '₹ ',
                    ctrl: _labCtrl,
                    hint: '600',
                  ),
                  const SizedBox(height: 12),
                  _PriceInputField(
                    label: 'Other',
                    prefix: '₹ ',
                    ctrl: _othCtrl,
                    hint: '100',
                  ),
                  const SizedBox(height: 12),
                  _PriceInputField(
                    label: 'Desired Margin',
                    suffix: ' %',
                    ctrl: _marginCtrl,
                    hint: '30',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Calculate Button
            ElevatedButton.icon(
              icon: _calculating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.calculate_outlined),
              label: Text(_calculating ? 'Analyzing Market Rates...' : 'Calculate Suggested Price'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.secondary),
              onPressed: _calculating ? null : _calculateRecommendation,
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.errorRed.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.errorRed.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppTheme.errorRed, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_error!, style: AppTheme.bodySmall.copyWith(color: AppTheme.errorRed)),
                    ),
                  ],
                ),
              ),
            ],

            if (_successMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.successGreen.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.successGreen.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, color: AppTheme.successGreen, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _successMessage!,
                        style: AppTheme.bodySmall.copyWith(
                          color: AppTheme.successGreen,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Recommendation Result Card
            if (rec != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isMarketData ? AppTheme.successGreen : AppTheme.secondary,
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (isMarketData ? AppTheme.successGreen : AppTheme.secondary).withOpacity(0.08),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header row: Recommended Price + Availability Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          'Recommended Price',
                          style: AppTheme.caption.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textSecondary,
                            letterSpacing: 0.5,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isMarketData
                                ? AppTheme.successGreen.withOpacity(0.12)
                                : Colors.blueGrey.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isMarketData ? AppTheme.successGreen : Colors.blueGrey,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isMarketData ? Icons.verified_outlined : Icons.tune_outlined,
                                size: 14,
                                color: isMarketData ? AppTheme.successGreen : Colors.blueGrey.shade800,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                availabilityBadge,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isMarketData ? AppTheme.successGreen : Colors.blueGrey.shade800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 10),

                    // Price Range Display
                    Text(
                      '₹${recMin.toStringAsFixed(0)} – ₹${recMax.toStringAsFixed(0)}',
                      style: AppTheme.h1.copyWith(
                        color: AppTheme.secondary,
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Estimated Cost and Margin Breakdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Estimated Cost', style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${estimatedCost.toStringAsFixed(0)}',
                                  style: AppTheme.h3.copyWith(fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                          Container(width: 1, height: 32, color: AppTheme.borderLight),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Suggested Margin', style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                                const SizedBox(height: 2),
                                Text(
                                  '${suggestedMargin.toStringAsFixed(0)}%',
                                  style: AppTheme.h3.copyWith(fontWeight: FontWeight.w700, color: AppTheme.secondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (rec['explanation'] != null) ...[
                      const SizedBox(height: 14),
                      Text(
                        rec['explanation'] as String,
                        style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary, height: 1.4),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Why? Factors Section
                    Text('Why?', style: AppTheme.body.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    if (rec['factors'] is List && (rec['factors'] as List).isNotEmpty) ...[
                      ...((rec['factors'] as List).cast<String>()).map(
                        (factor) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('• ', style: TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.bold)),
                              Expanded(
                                child: Text(factor, style: AppTheme.caption.copyWith(height: 1.3)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ] else ...[
                      Text('• Material cost base analysis', style: AppTheme.caption),
                      Text('• Craft category baseline', style: AppTheme.caption),
                    ],

                    if (dataTimestamp.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.access_time, size: 14, color: AppTheme.textSecondary),
                          const SizedBox(width: 6),
                          Text(
                            'Market data timestamp: $dataTimestamp',
                            style: AppTheme.caption.copyWith(color: AppTheme.textSecondary, fontSize: 11),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 14),

                    // TTS Voice Player
                    TtsPlayerWidget(
                      text: 'Recommended price range is ₹${recMin.toStringAsFixed(0)} to ₹${recMax.toStringAsFixed(0)}. Total estimated cost is ₹${estimatedCost.toStringAsFixed(0)} with ${suggestedMargin.toStringAsFixed(0)}% margin. ${rec["explanation"] ?? ""}',
                      label: 'Listen to AI Recommendation',
                    ),

                    // Artisan Selected Price Banner (if saved)
                    if (_pricePersisted && _selectedPriceMin != null && _selectedPriceMax != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _isOverride ? Colors.amber.shade50 : AppTheme.secondary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _isOverride ? Colors.amber.shade300 : AppTheme.secondary.withOpacity(0.4),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _isOverride ? Icons.edit_note : Icons.check_circle,
                              color: _isOverride ? Colors.amber.shade900 : AppTheme.secondary,
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _isOverride ? 'Artisan Selected Price (Override)' : 'Accepted Price',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: _isOverride ? Colors.amber.shade900 : AppTheme.secondary,
                                    ),
                                  ),
                                  Text(
                                    '₹${_selectedPriceMin!.toStringAsFixed(0)} – ₹${_selectedPriceMax!.toStringAsFixed(0)}',
                                    style: AppTheme.h3.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: _isOverride ? Colors.amber.shade900 : AppTheme.secondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // Action Buttons: [ Accept Recommendation ] & [ Edit Price ]
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.secondary,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: _saving ? null : _acceptRecommendation,
                            child: Text(_saving ? 'Saving...' : 'Accept Recommendation'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.primary,
                              side: const BorderSide(color: AppTheme.primary, width: 1.5),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: _saving ? null : _showEditPriceDialog,
                            child: const Text('Edit Price'),
                          ),
                        ),
                      ],
                    ),

                    if (isDraft && _pricePersisted) ...[
                      const SizedBox(height: 12),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: _saving ? null : _publishProduct,
                        child: Text(_saving ? 'Publishing...' : 'Publish Listing to Marketplace'),
                      ),
                    ],
                  ],
                ),
              ),
            ],

            const SizedBox(height: 36),
          ],
        ),
      ),
    );
  }
}

class _PriceInputField extends StatelessWidget {
  final String label;
  final String? prefix;
  final String? suffix;
  final TextEditingController ctrl;
  final String hint;

  const _PriceInputField({
    required this.label,
    this.prefix,
    this.suffix,
    required this.ctrl,
    required this.hint,
  });

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextField(
            controller: ctrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              prefixText: prefix,
              suffixText: suffix,
              hintText: hint,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      );
}
