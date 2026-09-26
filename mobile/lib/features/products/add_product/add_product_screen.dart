import "dart:convert";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:image_picker/image_picker.dart";
import "../../voice_cataloger/voice_recorder_widget.dart";
import "../../voice_cataloger/tts_player_widget.dart";
import "package:dio/dio.dart";
import "dart:io";
import "../../../shared/theme/app_theme.dart";
import "../../../core/services/api_service.dart";
import "../../../core/providers/auth_provider.dart";

enum AddProductStep { photo, aiStudio, voice, catalog, pricing, publish }

final addProductStepProvider =
    StateProvider<AddProductStep>((ref) => AddProductStep.photo);

// Root screen
class AddProductScreen extends ConsumerStatefulWidget {
  const AddProductScreen({super.key});
  @override
  ConsumerState<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends ConsumerState<AddProductScreen> {
  File? _selectedImage;
  String? _productId;
  String? _mediaId;
  bool _isLoading = false;
  Map<String, dynamic>? _catalogData;
  Map<String, dynamic>? _priceData;
  String? _processedImageUrl;
  String? _processedImageBase64;
  bool _useProcessedImage = true;
  String? _lastVoiceTranscript;

  final _picker = ImagePicker();

  Future<void> _pickImage({bool fromCamera = true}) async {
    final xfile = await _picker.pickImage(
      source: fromCamera ? ImageSource.camera : ImageSource.gallery,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 85,
    );
    if (xfile == null) return;

    final file = File(xfile.path);
    final size = await file.length();
    if (size > 20 * 1024 * 1024) {
      _showError("Image exceeds 20MB limit. Please choose a smaller photo.");
      return;
    }

    setState(() {
      _selectedImage = file;
      _processedImageBase64 = null;
      _processedImageUrl = null;
    });
    await _createProductAndUpload(xfile.path);
  }

  Future<void> _createProductAndUpload(String imagePath) async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final productRes = await api.post("/products", data: {});
      _productId = productRes.data["id"] as String;
      final formData = FormData.fromMap({
        "file": await MultipartFile.fromFile(imagePath, filename: "product.jpg"),
      });
      final mediaRes = await api.postFormData("/products/$_productId/media", formData);
      _mediaId = mediaRes.data["id"] as String;
      ref.read(addProductStepProvider.notifier).state = AddProductStep.aiStudio;
    } catch (e) {
      _showError("Failed to upload image: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _enhanceImage() async {
    if (_mediaId == null || _productId == null || _selectedImage == null) return;
    try {
      final api = ref.read(apiServiceProvider);
      final bytes = await _selectedImage!.readAsBytes();
      final formData = FormData.fromMap({
        "image": MultipartFile.fromBytes(bytes, filename: "product.jpg"),
        "mediaId": _mediaId,
        "productId": _productId,
      });
      final res = await api.postFormData("/ai/image-enhance", formData);
      final data = Map<String, dynamic>.from(res.data as Map);
      setState(() {
        _processedImageUrl = data["processedUrl"] as String?;
        _processedImageBase64 = data["processedBase64"] as String?;
      });
    } catch (e) {
      debugPrint("[AddProduct] Image enhancement failed: $e");
      rethrow;
    }
  }

  Future<void> _generateCatalog(String transcript) async {
    if (_productId == null) return;
    _lastVoiceTranscript = transcript;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.post("/ai/catalog-generate", data: {
        "productId": _productId,
        "transcript": transcript,
      });
      setState(() => _catalogData = Map<String, dynamic>.from(response.data));
      ref.read(addProductStepProvider.notifier).state = AddProductStep.catalog;
    } catch (e) {
      _showError("AI catalog generation failed: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveCatalogAndProceed(Map<String, dynamic> edited) async {
    if (_productId == null) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.patch("/products/$_productId", data: {
        "title": edited["title"],
        "description": edited["description"],
        "titleHindi": edited["title_hindi"],
        "descriptionHindi": edited["description_hindi"],
        "category": edited["category"],
        "material": edited["material"],
        "craft": edited["craft"],
        "origin": edited["origin"],
        "region": edited["region"],
        "careInstructions": edited["care_instructions"],
        "tags": edited["tags"] is List ? (edited["tags"] as List).cast<String>() : <String>[],
      });
      setState(() => _catalogData = edited);
      ref.read(addProductStepProvider.notifier).state = AddProductStep.pricing;
    } catch (e) {
      _showError("Failed to save catalog: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveCatalogDraft(Map<String, dynamic> edited) async {
    if (_productId == null) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.patch("/products/$_productId", data: {
        "title": edited["title"],
        "description": edited["description"],
        "titleHindi": edited["title_hindi"],
        "descriptionHindi": edited["description_hindi"],
        "category": edited["category"],
        "material": edited["material"],
        "craft": edited["craft"],
        "origin": edited["origin"],
        "region": edited["region"],
        "careInstructions": edited["care_instructions"],
        "tags": edited["tags"] is List ? (edited["tags"] as List).cast<String>() : <String>[],
      });
      setState(() => _catalogData = edited);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Draft saved to database!"),
            backgroundColor: AppTheme.successGreen,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      _showError("Failed to save draft: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _getRecommendation({
    required double materialCost,
    required double laborCost,
    double? otherCost,
    double? marginPercent,
  }) async {
    if (_productId == null) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final body = <String, dynamic>{
        "productId": _productId,
        "materialCost": materialCost,
        "laborCost": laborCost,
      };
      if (otherCost != null) body["otherCost"] = otherCost;
      if (marginPercent != null) body["desiredMarginPercent"] = marginPercent;
      if (_catalogData?["category"] != null) body["category"] = _catalogData!["category"];
      if (_catalogData?["craft"] != null) body["craft"] = _catalogData!["craft"];
      if (_catalogData?["region"] != null) body["region"] = _catalogData!["region"];
      final response = await api.post("/ai/price-recommendation", data: body);
      setState(() => _priceData = Map<String, dynamic>.from(response.data));
    } catch (e) {
      _showError("Price recommendation failed: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _publishProduct(double priceMin, double priceMax, {bool isOverride = false}) async {
    if (_productId == null) return;
    setState(() => _isLoading = true);
    try {
      final activeThumb = (_useProcessedImage && _processedImageUrl != null)
          ? _processedImageUrl
          : null;
      final api = ref.read(apiServiceProvider);
      final recId = _priceData?["id"] ?? _priceData?["recommendation_id"];

      // 1. Record artisan accepted/override price
      try {
        await api.post("/ai/price-recommendation/accept", data: {
          "productId": _productId,
          if (recId != null) "recommendationId": recId,
          "priceMin": priceMin,
          "priceMax": priceMax,
          "isOverride": isOverride,
        });
      } catch (_) {}

      // 2. Persist price and AI recommendation on product
      final aiMin = (_priceData?["min_price"] as num?)?.toDouble() ?? priceMin;
      final aiMax = (_priceData?["max_price"] as num?)?.toDouble() ?? priceMax;
      await api.patch("/products/$_productId", data: {
        "priceMin": priceMin,
        "priceMax": priceMax,
        "aiRecommendedPriceMin": aiMin,
        "aiRecommendedPriceMax": aiMax,
        "currency": "INR",
        if (activeThumb != null) "thumbnailUrl": activeThumb,
      });

      await api.post("/products/$_productId/publish", data: {});
      ref.read(addProductStepProvider.notifier).state = AddProductStep.publish;
    } catch (e) {
      _showError("Failed to publish: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppTheme.errorRed),
    );
  }

  @override
  Widget build(BuildContext context) {
    final step = ref.watch(addProductStepProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text("Add Product"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            ref.read(addProductStepProvider.notifier).state = AddProductStep.photo;
            context.pop();
          },
        ),
      ),
      body: Stack(
        children: [
          _buildStep(step),
          if (_isLoading)
            Container(
              color: Colors.black26,
              child: const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            ),
        ],
      ),
    );
  }

  Widget _buildStep(AddProductStep step) {
    switch (step) {
      case AddProductStep.photo:
        return _PhotoStep(
          onCamera: () => _pickImage(fromCamera: true),
          onGallery: () => _pickImage(fromCamera: false),
        );
      case AddProductStep.aiStudio:
        return _AIStudioStep(
          image: _selectedImage,
          processedBase64: _processedImageBase64,
          processedUrl: _processedImageUrl,
          useProcessed: _useProcessedImage,
          onSelectUseProcessed: (val) => setState(() => _useProcessedImage = val),
          onEnhance: _enhanceImage,
          onChangePhoto: () => ref.read(addProductStepProvider.notifier).state = AddProductStep.photo,
          onContinue: () =>
              ref.read(addProductStepProvider.notifier).state = AddProductStep.voice,
        );
      case AddProductStep.voice:
        return _VoiceStep(
          productId: _productId ?? "",
          onTranscriptReady: (t) => _generateCatalog(t),
        );
      case AddProductStep.catalog:
        return _CatalogStep(
          catalogData: _catalogData ?? {},
          isLoading: _isLoading,
          onSaveDraft: _saveCatalogDraft,
          onSaveAndContinue: _saveCatalogAndProceed,
          onRegenerate: () => _generateCatalog(_lastVoiceTranscript ?? "Handcrafted artisan product"),
        );
      case AddProductStep.pricing:
        return _PricingStep(
          priceData: _priceData,
          isLoading: _isLoading,
          onGetRecommendation: _getRecommendation,
          onPublish: _publishProduct,
        );
      case AddProductStep.publish:
        return _PublishStep(
          onDone: () {
            ref.read(addProductStepProvider.notifier).state = AddProductStep.photo;
            context.go("/my-products");
          },
        );
    }
  }
}

// --- Step 1: Photo ---
class _PhotoStep extends StatelessWidget {
  final VoidCallback onCamera, onGallery;
  const _PhotoStep({required this.onCamera, required this.onGallery});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.photo_camera_outlined, size: 56, color: AppTheme.primary),
            ),
            const SizedBox(height: 24),
            Text("Capture Your Product", style: AppTheme.h2, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              "Take a clear photo of your product.\nAI will enhance it automatically.",
              style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),
            ElevatedButton.icon(
              icon: const Icon(Icons.camera_alt),
              label: const Text("Open Camera"),
              onPressed: onCamera,
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text("Choose from Gallery"),
              onPressed: onGallery,
            ),
          ],
        ),
      );
}

// --- Step 2: AI Studio ---
class _AIStudioStep extends StatefulWidget {
  final File? image;
  final String? processedBase64;
  final String? processedUrl;
  final bool useProcessed;
  final ValueChanged<bool> onSelectUseProcessed;
  final Future<void> Function() onEnhance;
  final VoidCallback onChangePhoto;
  final VoidCallback onContinue;

  const _AIStudioStep({
    required this.image,
    required this.processedBase64,
    required this.processedUrl,
    required this.useProcessed,
    required this.onSelectUseProcessed,
    required this.onEnhance,
    required this.onChangePhoto,
    required this.onContinue,
  });

  @override
  State<_AIStudioStep> createState() => _AIStudioStepState();
}

class _AIStudioStepState extends State<_AIStudioStep> {
  bool _enhancing = false;
  String? _error;
  String _statusText = "Enhancing product photo with AI Studio...";

  @override
  void initState() {
    super.initState();
    if (widget.processedBase64 == null && widget.processedUrl == null) {
      _runEnhancement();
    }
  }

  Future<void> _runEnhancement() async {
    setState(() {
      _enhancing = true;
      _error = null;
      _statusText = "Analyzing product and removing background...";
    });

    try {
      await widget.onEnhance();
      if (mounted) {
        setState(() {
          _enhancing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _enhancing = false;
          _error = "Enhancement failed: ${e.toString()}";
        });
      }
    }
  }

  Widget _buildProcessedImage() {
    if (widget.processedBase64 != null && widget.processedBase64!.isNotEmpty) {
      try {
        final raw = widget.processedBase64!.contains(',')
            ? widget.processedBase64!.split(',').last
            : widget.processedBase64!;
        final bytes = base64Decode(raw);
        return Image.memory(bytes, fit: BoxFit.contain);
      } catch (_) {}
    }

    if (widget.processedUrl != null && widget.processedUrl!.isNotEmpty) {
      final url = widget.processedUrl!;
      if (url.startsWith('http')) {
        return Image.network(url, fit: BoxFit.contain);
      }
      final file = File(url);
      if (file.existsSync()) {
        return Image.file(file, fit: BoxFit.contain);
      }
    }

    return Container(
      color: Colors.white,
      child: const Center(
        child: Icon(Icons.auto_awesome, size: 48, color: AppTheme.primary),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasEnhanced = (widget.processedBase64 != null || widget.processedUrl != null) && !_enhancing;

    return Padding(
      padding: const EdgeInsets.all(AppTheme.paddingLG),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("AI Image Studio", style: AppTheme.h2),
                    const SizedBox(height: 2),
                    Text(
                      _enhancing
                          ? _statusText
                          : (hasEnhanced
                              ? "Before and After comparison ready"
                              : "Product photo enhancement"),
                      style: AppTheme.caption.copyWith(color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              if (!_enhancing)
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: "Reprocess",
                  onPressed: _runEnhancement,
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Main Comparison Area
          Expanded(
            child: _enhancing
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          width: 60,
                          height: 60,
                          child: CircularProgressIndicator(
                            color: AppTheme.primary,
                            strokeWidth: 3.5,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text("Studio AI Enhancement", style: AppTheme.h3),
                        const SizedBox(height: 8),
                        Text(
                          "• Clean studio background\n• 1:1 marketplace framing\n• Lighting & exposure optimization",
                          textAlign: TextAlign.center,
                          style: AppTheme.bodySmall.copyWith(
                            color: AppTheme.textSecondary,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  )
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 56, color: AppTheme.errorRed),
                            const SizedBox(height: 16),
                            Text("Enhancement Failed", style: AppTheme.h3.copyWith(color: AppTheme.errorRed)),
                            const SizedBox(height: 8),
                            Text(_error!, style: AppTheme.caption, textAlign: TextAlign.center),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.refresh),
                              label: const Text("Retry Enhancement"),
                              onPressed: _runEnhancement,
                            ),
                            const SizedBox(height: 10),
                            TextButton(
                              onPressed: widget.onContinue,
                              child: const Text("Continue with Original Photo"),
                            ),
                          ],
                        ),
                      )
                    : Row(
                        children: [
                          // Before Card
                          Expanded(
                            child: GestureDetector(
                              onTap: () => widget.onSelectUseProcessed(false),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: !widget.useProcessed
                                        ? AppTheme.primary
                                        : AppTheme.borderLight,
                                    width: !widget.useProcessed ? 2.5 : 1,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.04),
                                      blurRadius: 6,
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      width: double.infinity,
                                      decoration: BoxDecoration(
                                        color: !widget.useProcessed
                                            ? AppTheme.primary.withOpacity(0.08)
                                            : Colors.grey.withOpacity(0.05),
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                      ),
                                      child: Center(
                                        child: Text(
                                          "Original Photo",
                                          style: AppTheme.caption.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: !widget.useProcessed
                                                ? AppTheme.primary
                                                : AppTheme.textSecondary,
                                          ),
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                                        child: widget.image != null
                                            ? Image.file(widget.image!, fit: BoxFit.cover, width: double.infinity)
                                            : const Center(child: Icon(Icons.image)),
                                      ),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.all(8),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            !widget.useProcessed
                                                ? Icons.radio_button_checked
                                                : Icons.radio_button_unchecked,
                                            size: 16,
                                            color: !widget.useProcessed
                                                ? AppTheme.primary
                                                : AppTheme.textSecondary,
                                          ),
                                          const SizedBox(width: 4),
                                          Text("Use Original", style: AppTheme.caption),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),

                          // After Card
                          Expanded(
                            child: GestureDetector(
                              onTap: () => widget.onSelectUseProcessed(true),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: widget.useProcessed
                                        ? AppTheme.successGreen
                                        : AppTheme.borderLight,
                                    width: widget.useProcessed ? 2.5 : 1,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.04),
                                      blurRadius: 6,
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      width: double.infinity,
                                      decoration: BoxDecoration(
                                        color: widget.useProcessed
                                            ? AppTheme.successGreen.withOpacity(0.1)
                                            : Colors.grey.withOpacity(0.05),
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                      ),
                                      child: Center(
                                        child: Text(
                                          "AI Studio Enhanced",
                                          style: AppTheme.caption.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: widget.useProcessed
                                                ? AppTheme.successGreen
                                                : AppTheme.textSecondary,
                                          ),
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                                        child: _buildProcessedImage(),
                                      ),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.all(8),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            widget.useProcessed
                                                ? Icons.radio_button_checked
                                                : Icons.radio_button_unchecked,
                                            size: 16,
                                            color: widget.useProcessed
                                                ? AppTheme.successGreen
                                                : AppTheme.textSecondary,
                                          ),
                                          const SizedBox(width: 4),
                                          Text("Use Enhanced", style: AppTheme.caption.copyWith(fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
          ),

          if (!_enhancing && _error == null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.06),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, size: 16, color: AppTheme.successGreen),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.useProcessed
                          ? "Selected: AI Enhanced (Clean studio background & 1:1 framing)"
                          : "Selected: Original unenhanced photo",
                      style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.photo_camera_outlined, size: 18),
                  label: const Text("Retake"),
                  onPressed: widget.onChangePhoto,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: widget.onContinue,
                    child: const Text("Continue with Selected Photo"),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
// --- Step 3: Voice ---
// _VoiceStep delegates entirely to VoiceRecorderWidget (voice_cataloger/).
// All recording state, permission handling, ElevenLabs upload, and
// transcript display are managed inside VoiceRecorderWidget.
class _VoiceStep extends StatelessWidget {
  final String productId;
  final Future<void> Function(String transcript) onTranscriptReady;
  const _VoiceStep({required this.productId, required this.onTranscriptReady});

  @override
  Widget build(BuildContext context) => VoiceRecorderWidget(
        productId: productId,
        onTranscriptReady: onTranscriptReady,
      );
}

// --- Step 4: Catalog Edit ---
class _CatalogFieldModel {
  final String key;
  final String label;
  final String hint;
  final int maxLines;
  final String initialAiValue;
  final TextEditingController controller;

  _CatalogFieldModel({
    required this.key,
    required this.label,
    required this.hint,
    required this.initialAiValue,
    this.maxLines = 1,
  }) : controller = TextEditingController(text: initialAiValue);

  bool get isEdited => controller.text.trim() != initialAiValue.trim();

  void revert() {
    controller.text = initialAiValue;
  }

  void dispose() {
    controller.dispose();
  }
}

class _CatalogStep extends StatefulWidget {
  final Map<String, dynamic> catalogData;
  final bool isLoading;
  final Future<void> Function(Map<String, dynamic>) onSaveDraft;
  final Future<void> Function(Map<String, dynamic>) onSaveAndContinue;
  final VoidCallback onRegenerate;

  const _CatalogStep({
    required this.catalogData,
    required this.isLoading,
    required this.onSaveDraft,
    required this.onSaveAndContinue,
    required this.onRegenerate,
  });

  @override
  State<_CatalogStep> createState() => _CatalogStepState();
}

class _CatalogStepState extends State<_CatalogStep> {
  late final List<_CatalogFieldModel> _fields;
  late List<String> _tags;
  late List<String> _initialAiTags;
  final _newTagCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final d = widget.catalogData;

    _fields = [
      _CatalogFieldModel(
        key: "title",
        label: "Title (English)",
        hint: "e.g. Blue Floral Pottery Vase",
        initialAiValue: d["title"] as String? ?? "",
      ),
      _CatalogFieldModel(
        key: "title_hindi",
        label: "Title (Hindi)",
        hint: "e.g. नीले फूलों का हस्तनिर्मित मिट्टी का फूलदान",
        initialAiValue: d["title_hindi"] as String? ?? "",
      ),
      _CatalogFieldModel(
        key: "category",
        label: "Product Category",
        hint: "e.g. Pottery & Ceramics",
        initialAiValue: d["category"] as String? ?? "",
      ),
      _CatalogFieldModel(
        key: "material",
        label: "Primary Material",
        hint: "e.g. Clay, Natural Quartz, Glaze",
        initialAiValue: d["material"] as String? ?? "",
      ),
      _CatalogFieldModel(
        key: "craft",
        label: "Craft Technique / Style",
        hint: "e.g. Traditional Blue Pottery",
        initialAiValue: d["craft"] as String? ?? "",
      ),
      _CatalogFieldModel(
        key: "origin",
        label: "Place of Origin",
        hint: "e.g. Jaipur, Rajasthan",
        initialAiValue: d["origin"] as String? ?? "",
      ),
      _CatalogFieldModel(
        key: "region",
        label: "State / Region",
        hint: "e.g. Rajasthan",
        initialAiValue: d["region"] as String? ?? "",
      ),
      _CatalogFieldModel(
        key: "description",
        label: "Description (English)",
        hint: "Detailed artisan description of the product...",
        initialAiValue: d["description"] as String? ?? "",
        maxLines: 4,
      ),
      _CatalogFieldModel(
        key: "description_hindi",
        label: "Description (Hindi)",
        hint: "उत्पाद का विस्तृत विवरण...",
        initialAiValue: d["description_hindi"] as String? ?? "",
        maxLines: 4,
      ),
      _CatalogFieldModel(
        key: "care_instructions",
        label: "Care & Cleaning Instructions",
        hint: "e.g. Wipe with dry soft cloth. Hand wash gently.",
        initialAiValue: (d["care_instructions"] ?? d["careInstructions"]) as String? ?? "",
        maxLines: 2,
      ),
    ];

    final rawTags = d["tags"];
    _tags = rawTags is List ? List<String>.from(rawTags.map((e) => e.toString())) : <String>[];
    _initialAiTags = List<String>.from(_tags);

    // Listen to changes to trigger re-renders for badges
    for (final f in _fields) {
      f.controller.addListener(() {
        if (mounted) setState(() {});
      });
    }
  }

  @override
  void dispose() {
    _newTagCtrl.dispose();
    for (final f in _fields) f.dispose();
    super.dispose();
  }

  bool get _tagsEdited {
    if (_tags.length != _initialAiTags.length) return true;
    for (int i = 0; i < _tags.length; i++) {
      if (_tags[i] != _initialAiTags[i]) return true;
    }
    return false;
  }

  int get _editedCount {
    int c = _fields.where((f) => f.isEdited).length;
    if (_tagsEdited) c++;
    return c;
  }

  bool get _hasUnsavedChanges => _editedCount > 0;

  Map<String, dynamic> _buildPayload() {
    final payload = <String, dynamic>{};
    for (final f in _fields) {
      payload[f.key] = f.controller.text.trim();
    }
    payload["tags"] = _tags;
    return payload;
  }

  void _resetAllToAi() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Reset All to AI Suggestion?"),
        content: const Text("This will discard all your edits and restore the original AI-generated catalog."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                for (final f in _fields) f.revert();
                _tags = List<String>.from(_initialAiTags);
              });
            },
            child: const Text("Reset All"),
          ),
        ],
      ),
    );
  }

  void _confirmRegenerate() {
    if (!_hasUnsavedChanges) {
      widget.onRegenerate();
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Regenerate Catalog?"),
        content: const Text("Regenerating with Gemini AI will replace your current edits. Do you wish to continue?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              widget.onRegenerate();
            },
            child: const Text("Regenerate"),
          ),
        ],
      ),
    );
  }

  void _addTag() {
    final tag = _newTagCtrl.text.trim();
    if (tag.isNotEmpty && !_tags.contains(tag)) {
      setState(() {
        _tags.add(tag);
        _newTagCtrl.clear();
      });
    }
  }

  void _removeTag(String tag) {
    setState(() {
      _tags.remove(tag);
    });
  }

  @override
  Widget build(BuildContext context) {
    final editedCount = _editedCount;
    final titleField = _fields.firstWhere((f) => f.key == "title");
    final descField = _fields.firstWhere((f) => f.key == "description");

    return PopScope(
      canPop: !_hasUnsavedChanges,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldLeave = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text("Unsaved Edits"),
            content: const Text("You have unsaved changes in your product catalog. Do you want to save a draft before leaving?"),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, true), // Discard & pop
                child: const Text("Discard"),
              ),
              ElevatedButton(
                onPressed: () async {
                  await widget.onSaveDraft(_buildPayload());
                  if (ctx.mounted) Navigator.pop(ctx, true);
                },
                child: const Text("Save Draft"),
              ),
            ],
          ),
        );
        if (shouldLeave == true && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Product Catalog Editor", style: AppTheme.h2),
                      const SizedBox(height: 2),
                      Text(
                        editedCount == 0
                            ? "All fields matching AI suggestion"
                            : "$editedCount field${editedCount > 1 ? 's' : ''} edited by you",
                        style: AppTheme.caption.copyWith(
                          color: editedCount > 0 ? AppTheme.primary : AppTheme.textSecondary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.auto_awesome, size: 20, color: AppTheme.secondary),
                  tooltip: "Regenerate with AI",
                  onPressed: widget.isLoading ? null : _confirmRegenerate,
                ),
                if (editedCount > 0)
                  IconButton(
                    icon: const Icon(Icons.undo, size: 20, color: AppTheme.textSecondary),
                    tooltip: "Reset All to AI",
                    onPressed: _resetAllToAi,
                  ),
              ],
            ),
            const SizedBox(height: 8),

            // Spoken TTS Summary Preview
            TtsPlayerWidget(
              text: "Your product catalog is ready: ${titleField.controller.text}. ${descField.controller.text}",
              label: "Listen to AI Summary",
            ),
            const SizedBox(height: 12),

            // Form Fields List
            Expanded(
              child: ListView(
                children: [
                  ..._fields.map((f) => _FieldCard(field: f)),

                  // Tags Section
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _tagsEdited ? AppTheme.primary.withOpacity(0.5) : AppTheme.borderLight,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Search Keywords & Tags", style: AppTheme.caption.copyWith(fontWeight: FontWeight.w700)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: _tagsEdited
                                    ? AppTheme.primary.withOpacity(0.1)
                                    : AppTheme.successGreen.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _tagsEdited ? "User Edited" : "AI Generated",
                                style: AppTheme.caption.copyWith(
                                  color: _tagsEdited ? AppTheme.primary : AppTheme.successGreen,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: _tags.map((t) => Chip(
                            label: Text(t, style: const TextStyle(fontSize: 12)),
                            deleteIcon: const Icon(Icons.close, size: 14),
                            onDeleted: () => _removeTag(t),
                            backgroundColor: AppTheme.primary.withOpacity(0.08),
                          )).toList(),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _newTagCtrl,
                                decoration: const InputDecoration(
                                  hintText: "Add custom tag (e.g. handmade, blue)",
                                  isDense: true,
                                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                                onSubmitted: (_) => _addTag(),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.add_circle, color: AppTheme.primary),
                              onPressed: _addTag,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Actions Bar
            Row(
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.save_outlined, size: 18),
                  label: const Text("Save Draft"),
                  onPressed: widget.isLoading ? null : () => widget.onSaveDraft(_buildPayload()),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: widget.isLoading
                        ? null
                        : () {
                            final title = titleField.controller.text.trim();
                            if (title.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Please provide at least a product title."),
                                  backgroundColor: AppTheme.errorRed,
                                ),
                              );
                              return;
                            }
                            widget.onSaveAndContinue(_buildPayload());
                          },
                    child: const Text("Looks Good - Set Price"),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldCard extends StatelessWidget {
  final _CatalogFieldModel field;
  const _FieldCard({required this.field});

  @override
  Widget build(BuildContext context) {
    final isEdited = field.isEdited;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isEdited ? AppTheme.primary.withOpacity(0.5) : AppTheme.borderLight,
          width: isEdited ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                field.label,
                style: AppTheme.caption.copyWith(fontWeight: FontWeight.w700),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isEdited
                          ? AppTheme.primary.withOpacity(0.1)
                          : AppTheme.successGreen.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isEdited ? Icons.edit : Icons.auto_awesome,
                          size: 10,
                          color: isEdited ? AppTheme.primary : AppTheme.successGreen,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isEdited ? "User Edited" : "AI Generated",
                          style: AppTheme.caption.copyWith(
                            color: isEdited ? AppTheme.primary : AppTheme.successGreen,
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isEdited) ...[
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: field.revert,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: Text(
                          "Revert",
                          style: AppTheme.caption.copyWith(
                            color: AppTheme.errorRed,
                            fontWeight: FontWeight.w600,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: field.controller,
            maxLines: field.maxLines,
            decoration: InputDecoration(
              hintText: field.hint,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
        ],
      ),
    );
  }
}
// --- Step 5: Pricing ---
class _PricingStep extends StatefulWidget {
  final Map<String, dynamic>? priceData;
  final bool isLoading;
  final Future<void> Function({
    required double materialCost,
    required double laborCost,
    double? otherCost,
    double? marginPercent,
  }) onGetRecommendation;
  final Future<void> Function(double priceMin, double priceMax, {bool isOverride}) onPublish;

  const _PricingStep({
    required this.priceData,
    required this.isLoading,
    required this.onGetRecommendation,
    required this.onPublish,
  });

  @override
  State<_PricingStep> createState() => _PricingStepState();
}

class _PricingStepState extends State<_PricingStep> {
  final _matCtrl = TextEditingController();
  final _labCtrl = TextEditingController();
  final _othCtrl = TextEditingController();
  final _marCtrl = TextEditingController(text: "30");

  final _overrideMinCtrl = TextEditingController();
  final _overrideMaxCtrl = TextEditingController();

  double? _selectedMin;
  double? _selectedMax;
  bool _isOverride = false;
  bool _accepted = false;
  String? _validationError;

  @override
  void dispose() {
    _matCtrl.dispose();
    _labCtrl.dispose();
    _othCtrl.dispose();
    _marCtrl.dispose();
    _overrideMinCtrl.dispose();
    _overrideMaxCtrl.dispose();
    super.dispose();
  }

  void _calculate() {
    final matText = _matCtrl.text.trim();
    final labText = _labCtrl.text.trim();
    final othText = _othCtrl.text.trim();
    final marText = _marCtrl.text.trim();

    final mat = double.tryParse(matText);
    final lab = double.tryParse(labText);
    final oth = othText.isEmpty ? 0.0 : double.tryParse(othText);
    final margin = marText.isEmpty ? 30.0 : double.tryParse(marText);

    if ((matText.isNotEmpty && mat == null) ||
        (labText.isNotEmpty && lab == null) ||
        (othText.isNotEmpty && oth == null) ||
        (marText.isNotEmpty && margin == null)) {
      setState(() => _validationError = "Please enter valid numeric values for all costs.");
      return;
    }

    final matVal = mat ?? 0.0;
    final labVal = lab ?? 0.0;
    final othVal = oth ?? 0.0;
    final marginVal = margin ?? 30.0;

    if (matVal < 0 || labVal < 0 || othVal < 0 || marginVal < 0) {
      setState(() => _validationError = "Costs and desired margin cannot be negative.");
      return;
    }

    setState(() {
      _validationError = null;
      _accepted = false;
      _isOverride = false;
      _selectedMin = null;
      _selectedMax = null;
    });

    widget.onGetRecommendation(
      materialCost: matVal,
      laborCost: labVal,
      otherCost: othVal,
      marginPercent: marginVal,
    );
  }

  void _acceptRecommendation() {
    final price = widget.priceData;
    if (price == null) return;
    final minPrice = (price["min_price"] as num?)?.toDouble() ?? 0;
    final maxPrice = (price["max_price"] as num?)?.toDouble() ?? 0;

    setState(() {
      _selectedMin = minPrice;
      _selectedMax = maxPrice;
      _isOverride = false;
      _accepted = true;
    });
  }

  void _showEditPriceDialog() {
    final price = widget.priceData;
    final recMin = (price?["min_price"] as num?)?.toDouble() ?? 1000;
    final recMax = (price?["max_price"] as num?)?.toDouble() ?? 1500;

    _overrideMinCtrl.text = (_selectedMin ?? recMin).toStringAsFixed(0);
    _overrideMaxCtrl.text = (_selectedMax ?? recMax).toStringAsFixed(0);

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
              Text("Edit Price (Override)"),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Set your custom price range. This will override the AI suggestion while keeping recommendation data for your records.",
                  style: AppTheme.caption.copyWith(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 16),
                _PricingInputField(
                  label: "Minimum Price",
                  prefix: "₹ ",
                  ctrl: _overrideMinCtrl,
                  hint: "e.g. 1850",
                ),
                const SizedBox(height: 12),
                _PricingInputField(
                  label: "Maximum Price",
                  prefix: "₹ ",
                  ctrl: _overrideMaxCtrl,
                  hint: "e.g. 2150",
                ),
                if (dialogError != null) ...[
                  const SizedBox(height: 8),
                  Text(dialogError!, style: AppTheme.caption.copyWith(color: AppTheme.errorRed)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                minimumSize: const Size(110, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                final minVal = double.tryParse(_overrideMinCtrl.text.trim());
                final maxVal = double.tryParse(_overrideMaxCtrl.text.trim());

                if (minVal == null || maxVal == null) {
                  setDialogState(() => dialogError = "Please enter valid numbers.");
                  return;
                }
                if (minVal < 0 || maxVal < 0) {
                  setDialogState(() => dialogError = "Prices cannot be negative.");
                  return;
                }
                if (minVal > maxVal) {
                  setDialogState(() => dialogError = "Min price cannot exceed max price.");
                  return;
                }

                Navigator.of(ctx).pop();
                setState(() {
                  _selectedMin = minVal;
                  _selectedMax = maxVal;
                  _isOverride = true;
                  _accepted = true;
                });
              },
              child: const Text("Apply Price"),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final price = widget.priceData;
    final minPrice = (price?["min_price"] as num?)?.toDouble() ?? 0;
    final maxPrice = (price?["max_price"] as num?)?.toDouble() ?? 0;
    final estimatedCost = (price?["estimated_cost"] as num?)?.toDouble() ?? 0;
    final suggestedMargin = (price?["suggested_margin_percent"] as num?)?.toDouble() ?? 30;

    final availabilityRaw = (price?["data_availability"] as String?)?.toUpperCase() ?? "COST_BASED";
    final isMarketData = availabilityRaw.contains("MARKET");
    final availabilityBadge = isMarketData ? "MARKET_DATA" : "COST_BASED";
    final dataTimestamp = price?["data_timestamp"] as String? ?? "";

    final activeMin = _selectedMin ?? minPrice;
    final activeMax = _selectedMax ?? maxPrice;

    return Padding(
      padding: const EdgeInsets.all(AppTheme.paddingLG),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Production Cost", style: AppTheme.h2),
          Text(
            "Enter your production costs to calculate dynamic, fair pricing.",
            style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.borderLight),
                  ),
                  child: Column(
                    children: [
                      _PricingInputField(
                        label: "Material",
                        prefix: "₹ ",
                        ctrl: _matCtrl,
                        hint: "500",
                      ),
                      const SizedBox(height: 12),
                      _PricingInputField(
                        label: "Labor",
                        prefix: "₹ ",
                        ctrl: _labCtrl,
                        hint: "600",
                      ),
                      const SizedBox(height: 12),
                      _PricingInputField(
                        label: "Other",
                        prefix: "₹ ",
                        ctrl: _othCtrl,
                        hint: "100",
                      ),
                      const SizedBox(height: 12),
                      _PricingInputField(
                        label: "Desired Margin",
                        suffix: " %",
                        ctrl: _marCtrl,
                        hint: "30",
                      ),
                    ],
                  ),
                ),
                if (_validationError != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.errorRed.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_validationError!, style: AppTheme.caption.copyWith(color: AppTheme.errorRed)),
                  ),
                ],
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: widget.isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.calculate_outlined),
                  label: Text(widget.isLoading ? "Calculating..." : "Calculate Suggested Price"),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.secondary),
                  onPressed: widget.isLoading ? null : _calculate,
                ),
                if (price != null) ...[
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isMarketData ? AppTheme.successGreen : AppTheme.secondary,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (isMarketData ? AppTheme.successGreen : AppTheme.secondary).withOpacity(0.08),
                          blurRadius: 12,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "Recommended Price",
                              style: AppTheme.caption.copyWith(fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isMarketData
                                    ? AppTheme.successGreen.withOpacity(0.12)
                                    : Colors.blueGrey.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isMarketData ? AppTheme.successGreen : Colors.blueGrey,
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                availabilityBadge,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isMarketData ? AppTheme.successGreen : Colors.blueGrey.shade800,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "₹${minPrice.toStringAsFixed(0)} – ₹${maxPrice.toStringAsFixed(0)}",
                          style: AppTheme.h1.copyWith(
                            color: AppTheme.secondary,
                            fontSize: 30,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 14),
                        // Cost & Margin Summary Row
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text("Estimated Cost", style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                                    const SizedBox(height: 2),
                                    Text("₹${estimatedCost.toStringAsFixed(0)}", style: AppTheme.h3),
                                  ],
                                ),
                              ),
                              Container(width: 1, height: 28, color: AppTheme.borderLight),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text("Suggested Margin", style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                                    const SizedBox(height: 2),
                                    Text("${suggestedMargin.toStringAsFixed(0)}%", style: AppTheme.h3.copyWith(color: AppTheme.secondary)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (price["explanation"] != null) ...[
                          const SizedBox(height: 12),
                          Text(price["explanation"] as String, style: AppTheme.caption),
                        ],
                        const SizedBox(height: 14),
                        Text("Why?", style: AppTheme.body.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        if (price["factors"] is List) ...[
                          ...((price["factors"] as List).cast<String>()).map(
                            (f) => Padding(
                              padding: const EdgeInsets.only(bottom: 3),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("• ", style: TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.bold)),
                                  Expanded(child: Text(f, style: AppTheme.caption)),
                                ],
                              ),
                            ),
                          ),
                        ],
                        if (dataTimestamp.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            "Market data timestamp: $dataTimestamp",
                            style: AppTheme.caption.copyWith(color: AppTheme.textSecondary, fontSize: 11),
                          ),
                        ],
                        const SizedBox(height: 14),
                        TtsPlayerWidget(
                          text: "Recommended price is ₹${minPrice.toStringAsFixed(0)} to ₹${maxPrice.toStringAsFixed(0)}. Total estimated cost is ₹${estimatedCost.toStringAsFixed(0)} with ${suggestedMargin.toStringAsFixed(0)}% margin.",
                          label: "Listen to Price Recommendation",
                        ),
                        if (_accepted) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: _isOverride ? Colors.amber.shade50 : AppTheme.secondary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: _isOverride ? Colors.amber.shade300 : AppTheme.secondary.withOpacity(0.4),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _isOverride ? Icons.edit_note : Icons.check_circle,
                                  color: _isOverride ? Colors.amber.shade900 : AppTheme.secondary,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _isOverride
                                        ? "Artisan Override Applied: ₹${activeMin.toStringAsFixed(0)} – ₹${activeMax.toStringAsFixed(0)}"
                                        : "Recommendation Accepted: ₹${activeMin.toStringAsFixed(0)} – ₹${activeMax.toStringAsFixed(0)}",
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: _isOverride ? Colors.amber.shade900 : AppTheme.secondary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.secondary,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                onPressed: _acceptRecommendation,
                                child: const Text("Accept Recommendation"),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppTheme.primary,
                                  side: const BorderSide(color: AppTheme.primary, width: 1.5),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                onPressed: _showEditPriceDialog,
                                child: const Text("Edit Price"),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: (widget.isLoading || price == null)
                ? null
                : () => widget.onPublish(activeMin, activeMax, isOverride: _isOverride),
            child: const Text("Approve and Publish Listing"),
          ),
          if (price == null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Center(
                child: Text("Calculate a price recommendation first", style: AppTheme.caption),
              ),
            ),
        ],
      ),
    );
  }
}

class _PricingInputField extends StatelessWidget {
  final String label;
  final String? prefix;
  final String? suffix;
  final TextEditingController ctrl;
  final String hint;

  const _PricingInputField({
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
          const SizedBox(height: 4),
          TextField(
            controller: ctrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              prefixText: prefix,
              suffixText: suffix,
              hintText: hint,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      );
}


// --- Step 6: Publish success ---
class _PublishStep extends StatelessWidget {
  final VoidCallback onDone;
  const _PublishStep({required this.onDone});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.paddingLG),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100, height: 100,
                decoration: BoxDecoration(color: AppTheme.successGreen.withOpacity(0.1), shape: BoxShape.circle),
                child: const Icon(Icons.check_circle_outline, size: 64, color: AppTheme.successGreen),
              ),
              const SizedBox(height: 24),
              Text("Product Published!", style: AppTheme.h2, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text("Your product is now live on the marketplace.",
                  style: AppTheme.body.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              const TtsPlayerWidget(
                text: "Congratulations! Your product is now live on the marketplace.",
                label: "Listen to Confirmation",
                compact: true,
              ),
              const SizedBox(height: 32),
              ElevatedButton(onPressed: onDone, child: const Text("View My Products")),
            ],
          ),
        ),
      );
}
