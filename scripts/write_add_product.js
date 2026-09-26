const fs = require('fs');

const dart = `import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:image_picker/image_picker.dart";
import "package:record/record.dart";
import "package:path_provider/path_provider.dart";
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

  final _picker = ImagePicker();

  Future<void> _pickImage({bool fromCamera = true}) async {
    final xfile = await _picker.pickImage(
      source: fromCamera ? ImageSource.camera : ImageSource.gallery,
      imageQuality: 85,
    );
    if (xfile == null) return;
    setState(() => _selectedImage = File(xfile.path));
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
      final mediaRes = await api.postFormData("/products/\$_productId/media", formData);
      _mediaId = mediaRes.data["id"] as String;
      ref.read(addProductStepProvider.notifier).state = AddProductStep.aiStudio;
    } catch (e) {
      _showError("Failed to upload image: \$e");
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
      await api.postFormData("/ai/image-enhance", formData);
    } catch (e) {
      debugPrint("[AddProduct] Image enhancement failed: \$e");
    }
  }

  Future<void> _generateCatalog(String transcript) async {
    if (_productId == null) return;
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
      _showError("AI catalog generation failed: \$e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveCatalogAndProceed(Map<String, dynamic> edited) async {
    if (_productId == null) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.patch("/products/\$_productId", data: {
        "title": edited["title"],
        "description": edited["description"],
        "titleHindi": edited["title_hindi"],
        "descriptionHindi": edited["description_hindi"],
        "category": edited["category"],
        "material": edited["material"],
        "craft": edited["craft"],
        "region": edited["region"],
        "tags": edited["tags"] is List ? (edited["tags"] as List).cast<String>() : <String>[],
      });
      setState(() => _catalogData = edited);
      ref.read(addProductStepProvider.notifier).state = AddProductStep.pricing;
    } catch (e) {
      _showError("Failed to save catalog: \$e");
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
      _showError("Price recommendation failed: \$e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _publishProduct(double priceMin, double priceMax) async {
    if (_productId == null) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.patch("/products/\$_productId", data: {
        "priceMin": priceMin,
        "priceMax": priceMax,
        "currency": "INR",
      });
      await api.post("/products/\$_productId/publish", data: {});
      ref.read(addProductStepProvider.notifier).state = AddProductStep.publish;
    } catch (e) {
      _showError("Failed to publish: \$e");
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
          onEnhance: _enhanceImage,
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
          onSaveAndContinue: _saveCatalogAndProceed,
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
              "Take a clear photo of your product.\\nAI will enhance it automatically.",
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
  final Future<void> Function() onEnhance;
  final VoidCallback onContinue;
  const _AIStudioStep({required this.image, required this.onEnhance, required this.onContinue});

  @override
  State<_AIStudioStep> createState() => _AIStudioStepState();
}

class _AIStudioStepState extends State<_AIStudioStep> {
  bool _enhancing = false;
  bool _enhanced = false;

  @override
  void initState() {
    super.initState();
    _runEnhancement();
  }

  Future<void> _runEnhancement() async {
    setState(() => _enhancing = true);
    await widget.onEnhance();
    if (mounted) setState(() { _enhancing = false; _enhanced = true; });
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: Column(
          children: [
            Text("AI Image Studio", style: AppTheme.h2),
            const SizedBox(height: 4),
            Text(
              _enhancing ? "Enhancing your image with AI..." : "Enhancement complete!",
              style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 24),
            if (widget.image != null)
              Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(children: [
                        Text("Original", style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
                        const SizedBox(height: 8),
                        Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(widget.image!, fit: BoxFit.cover))),
                      ]),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(children: [
                        Text("Enhanced (AI)", style: AppTheme.bodySmall.copyWith(color: AppTheme.primary)),
                        const SizedBox(height: 8),
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                            ),
                            child: _enhancing
                                ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                    CircularProgressIndicator(color: AppTheme.primary),
                                    SizedBox(height: 8),
                                    Text("Processing...", style: TextStyle(color: AppTheme.primary)),
                                  ]))
                                : const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                    Icon(Icons.check_circle, color: AppTheme.successGreen, size: 40),
                                    SizedBox(height: 8),
                                    Text("AI Processed", style: TextStyle(color: AppTheme.successGreen)),
                                  ])),
                          ),
                        ),
                      ]),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _enhancing ? null : widget.onContinue,
              child: const Text("Continue with Image"),
            ),
          ],
        ),
      );
}

// --- Step 3: Voice ---
class _VoiceStep extends ConsumerStatefulWidget {
  final String productId;
  final Future<void> Function(String) onTranscriptReady;
  const _VoiceStep({required this.productId, required this.onTranscriptReady});

  @override
  ConsumerState<_VoiceStep> createState() => _VoiceStepState();
}

class _VoiceStepState extends ConsumerState<_VoiceStep> {
  final _textController = TextEditingController();
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;
  bool _isSending = false;
  bool _showText = false;
  String? _recordingPath;

  @override
  void dispose() {
    _textController.dispose();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) { _showErr("Microphone permission denied."); return; }
    final dir = await getTemporaryDirectory();
    _recordingPath = "\${dir.path}/voice_\${DateTime.now().millisecondsSinceEpoch}.m4a";
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: _recordingPath!);
    setState(() => _isRecording = true);
  }

  Future<void> _stopAndTranscribe() async {
    final path = await _recorder.stop();
    setState(() => _isRecording = false);
    if (path == null) { _showErr("Recording failed."); return; }
    setState(() => _isSending = true);
    try {
      final api = ref.read(apiServiceProvider);
      final formData = FormData.fromMap({
        "audio": await MultipartFile.fromFile(path, filename: "voice.m4a", contentType: DioMediaType("audio", "mp4")),
        "productId": widget.productId,
        "language": "hi",
      });
      final res = await api.postFormData("/ai/transcribe", formData);
      final transcript = res.data["transcript"] as String? ?? "";
      if (transcript.isNotEmpty) {
        await widget.onTranscriptReady(transcript);
      } else {
        _showErr("No speech detected. Try again or type below.");
      }
    } catch (e) {
      _showErr("Transcription failed: \$e");
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _submitText() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    setState(() => _isSending = true);
    try {
      final api = ref.read(apiServiceProvider);
      final formData = FormData.fromMap({
        "productId": widget.productId,
        "manualTranscript": text,
        "language": "hi",
      });
      final res = await api.postFormData("/ai/transcribe", formData);
      final transcript = res.data["transcript"] as String? ?? text;
      await widget.onTranscriptReady(transcript);
    } catch (e) {
      await widget.onTranscriptReady(text);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _showErr(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppTheme.errorRed));
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.mic_outlined, size: 64, color: AppTheme.primary),
            const SizedBox(height: 16),
            Text("Describe Your Product", style: AppTheme.h2, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              "Record a voice description.\\nAI will transcribe and generate a catalog.",
              style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            if (!_showText) ...[
              GestureDetector(
                onTap: () async {
                  if (_isRecording) { await _stopAndTranscribe(); } else { await _startRecording(); }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 100, height: 100,
                  decoration: BoxDecoration(
                    color: _isRecording ? AppTheme.errorRed.withOpacity(0.15) : AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                    border: Border.all(color: _isRecording ? AppTheme.errorRed : AppTheme.primary, width: 3),
                  ),
                  child: Icon(_isRecording ? Icons.stop : Icons.mic, size: 48, color: _isRecording ? AppTheme.errorRed : AppTheme.primary),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _isRecording ? "Recording... tap to stop" : _isSending ? "Sending to AI..." : "Tap to start recording",
                style: AppTheme.bodySmall.copyWith(color: _isRecording ? AppTheme.errorRed : AppTheme.textSecondary),
              ),
              if (_isSending) const Padding(padding: EdgeInsets.only(top: 12), child: CircularProgressIndicator(color: AppTheme.primary)),
              const SizedBox(height: 24),
              TextButton(
                onPressed: (_isRecording || _isSending) ? null : () => setState(() => _showText = true),
                child: const Text("Or type description instead"),
              ),
            ] else ...[
              TextField(
                controller: _textController,
                maxLines: 5,
                decoration: const InputDecoration(hintText: "Describe your product in detail...", alignLabelWithHint: true),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _isSending ? null : _submitText,
                child: _isSending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text("Generate Catalog with AI"),
              ),
              TextButton(
                onPressed: () => setState(() => _showText = false),
                child: const Text("Back to voice recording"),
              ),
            ],
          ],
        ),
      );
}

// --- Step 4: Catalog Edit ---
class _CatalogStep extends StatefulWidget {
  final Map<String, dynamic> catalogData;
  final bool isLoading;
  final Future<void> Function(Map<String, dynamic>) onSaveAndContinue;
  const _CatalogStep({required this.catalogData, required this.isLoading, required this.onSaveAndContinue});

  @override
  State<_CatalogStep> createState() => _CatalogStepState();
}

class _CatalogStepState extends State<_CatalogStep> {
  late final Map<String, TextEditingController> _ctrls;

  @override
  void initState() {
    super.initState();
    _ctrls = {
      "title": TextEditingController(text: widget.catalogData["title"] as String? ?? ""),
      "title_hindi": TextEditingController(text: widget.catalogData["title_hindi"] as String? ?? ""),
      "category": TextEditingController(text: widget.catalogData["category"] as String? ?? ""),
      "material": TextEditingController(text: widget.catalogData["material"] as String? ?? ""),
      "craft": TextEditingController(text: widget.catalogData["craft"] as String? ?? ""),
      "region": TextEditingController(text: widget.catalogData["region"] as String? ?? ""),
      "description": TextEditingController(text: widget.catalogData["description"] as String? ?? ""),
      "description_hindi": TextEditingController(text: widget.catalogData["description_hindi"] as String? ?? ""),
    };
  }

  @override
  void dispose() {
    for (final c in _ctrls.values) c.dispose();
    super.dispose();
  }

  Map<String, dynamic> _buildEdited() {
    final out = <String, dynamic>{};
    for (final e in _ctrls.entries) out[e.key] = e.value.text.trim();
    out["tags"] = widget.catalogData["tags"] ?? <String>[];
    return out;
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("AI Generated Catalog", style: AppTheme.h2),
            Text("Review and edit before publishing",
                style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: [
                  _EditField(label: "Title (English)", ctrl: _ctrls["title"]!),
                  _EditField(label: "Title (Hindi)", ctrl: _ctrls["title_hindi"]!),
                  _EditField(label: "Category", ctrl: _ctrls["category"]!),
                  _EditField(label: "Material", ctrl: _ctrls["material"]!),
                  _EditField(label: "Craft Type", ctrl: _ctrls["craft"]!),
                  _EditField(label: "Region", ctrl: _ctrls["region"]!),
                  _EditField(label: "Description (English)", ctrl: _ctrls["description"]!, maxLines: 4),
                  _EditField(label: "Description (Hindi)", ctrl: _ctrls["description_hindi"]!, maxLines: 4),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: widget.isLoading ? null : () => widget.onSaveAndContinue(_buildEdited()),
              child: const Text("Looks Good - Set Price"),
            ),
          ],
        ),
      );
}

class _EditField extends StatelessWidget {
  final String label;
  final TextEditingController ctrl;
  final int maxLines;
  const _EditField({required this.label, required this.ctrl, this.maxLines = 1});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            TextField(controller: ctrl, maxLines: maxLines,
                decoration: const InputDecoration(hintText: "Not detected by AI")),
          ],
        ),
      );
}

// --- Step 5: Pricing ---
class _PricingStep extends StatefulWidget {
  final Map<String, dynamic>? priceData;
  final bool isLoading;
  final Future<void> Function({required double materialCost, required double laborCost, double? otherCost, double? marginPercent}) onGetRecommendation;
  final Future<void> Function(double, double) onPublish;
  const _PricingStep({required this.priceData, required this.isLoading, required this.onGetRecommendation, required this.onPublish});

  @override
  State<_PricingStep> createState() => _PricingStepState();
}

class _PricingStepState extends State<_PricingStep> {
  final _matCtrl = TextEditingController();
  final _labCtrl = TextEditingController();
  final _othCtrl = TextEditingController();
  final _marCtrl = TextEditingController(text: "30");

  @override
  void dispose() {
    _matCtrl.dispose(); _labCtrl.dispose(); _othCtrl.dispose(); _marCtrl.dispose();
    super.dispose();
  }

  void _recommend() {
    widget.onGetRecommendation(
      materialCost: double.tryParse(_matCtrl.text) ?? 0,
      laborCost: double.tryParse(_labCtrl.text) ?? 0,
      otherCost: double.tryParse(_othCtrl.text),
      marginPercent: double.tryParse(_marCtrl.text),
    );
  }

  @override
  Widget build(BuildContext context) {
    final price = widget.priceData;
    final minPrice = (price?["min_price"] as num?)?.toDouble() ?? 0;
    final maxPrice = (price?["max_price"] as num?)?.toDouble() ?? 0;

    return Padding(
      padding: const EdgeInsets.all(AppTheme.paddingLG),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Pricing Assistant", style: AppTheme.h2),
          Text("Enter your production costs for an AI price suggestion",
              style: AppTheme.body.copyWith(color: AppTheme.textSecondary)),
          const SizedBox(height: 20),
          Expanded(
            child: ListView(
              children: [
                _CostField(label: "Material Cost (INR)", ctrl: _matCtrl, hint: "e.g. 120"),
                _CostField(label: "Labor Cost (INR)", ctrl: _labCtrl, hint: "e.g. 300"),
                _CostField(label: "Other Costs (INR, optional)", ctrl: _othCtrl, hint: "e.g. 50"),
                _CostField(label: "Desired Margin (%)", ctrl: _marCtrl, hint: "e.g. 30"),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text("Get AI Price Recommendation"),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.secondary),
                  onPressed: widget.isLoading ? null : _recommend,
                ),
                if (price != null) ...[
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.secondary.withOpacity(0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          price["data_availability"] == "market_data" ? "Market-Informed Range" : "Cost-Based Estimate",
                          style: AppTheme.bodySmall.copyWith(color: AppTheme.secondary, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        Text("INR \${minPrice.toStringAsFixed(0)} - \${maxPrice.toStringAsFixed(0)}",
                            style: AppTheme.h1.copyWith(color: AppTheme.secondary)),
                        if (price["explanation"] != null) ...[
                          const SizedBox(height: 8),
                          Text(price["explanation"] as String, style: AppTheme.caption),
                        ],
                        if (price["factors"] is List) ...[
                          const SizedBox(height: 8),
                          ...((price["factors"] as List).cast<String>())
                              .map((f) => Padding(padding: const EdgeInsets.only(top: 2), child: Text("- \$f", style: AppTheme.caption))),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: (widget.isLoading || price == null) ? null : () => widget.onPublish(minPrice, maxPrice),
            child: const Text("Approve and Publish Listing"),
          ),
          if (price == null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Center(child: Text("Get a price recommendation first", style: AppTheme.caption)),
            ),
        ],
      ),
    );
  }
}

class _CostField extends StatelessWidget {
  final String label, hint;
  final TextEditingController ctrl;
  const _CostField({required this.label, required this.ctrl, required this.hint});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            TextField(
              controller: ctrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(hintText: hint),
            ),
          ],
        ),
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
              const SizedBox(height: 48),
              ElevatedButton(onPressed: onDone, child: const Text("View My Products")),
            ],
          ),
        ),
      );
}
`;

fs.writeFileSync(
  'd:/Hacknex/mobile/lib/features/products/add_product/add_product_screen.dart',
  dart,
  { encoding: 'utf8' }
);
console.log('Written successfully. Size:', dart.length);
