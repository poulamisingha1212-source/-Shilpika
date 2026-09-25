import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:image_picker/image_picker.dart";
import "dart:io";
import "../../../shared/theme/app_theme.dart";
import "../../../core/services/api_service.dart";
import "../../../core/providers/auth_provider.dart";

enum AddProductStep { photo, aiStudio, voice, catalog, pricing, publish }

final addProductStepProvider = StateProvider<AddProductStep>((ref) => AddProductStep.photo);

class AddProductScreen extends ConsumerStatefulWidget {
  const AddProductScreen({super.key});
  @override
  ConsumerState<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends ConsumerState<AddProductScreen> {
  File? _selectedImage;
  String? _productId;
  bool _isLoading = false;
  Map<String, dynamic>? _catalogData;
  bool _isRecording = false;
  String? _transcript;

  final _picker = ImagePicker();

  Future<void> _pickImage() async {
    final xfile = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (xfile != null) {
      setState(() {
        _selectedImage = File(xfile.path);
      });
      await _createProduct();
    }
  }

  Future<void> _pickFromGallery() async {
    final xfile = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (xfile != null) {
      setState(() { _selectedImage = File(xfile.path); });
      await _createProduct();
    }
  }

  Future<void> _createProduct() async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.post("/products", data: {});
      _productId = response.data["id"] as String;
      ref.read(addProductStepProvider.notifier).state = AddProductStep.aiStudio;
    } catch (e) {
      _showError("Failed to create product: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _generateCatalog() async {
    if (_productId == null) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.post("/ai/catalog-generate", data: {
        "productId": _productId,
        "transcript": _transcript ?? "",
      });
      setState(() { _catalogData = Map<String, dynamic>.from(response.data); });
      ref.read(addProductStepProvider.notifier).state = AddProductStep.catalog;
    } catch (e) {
      _showError("AI catalog generation failed: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppTheme.errorRed));
  }

  @override
  Widget build(BuildContext context) {
    final step = ref.watch(addProductStepProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Add Product"),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
      ),
      body: _buildStep(step),
    );
  }

  Widget _buildStep(AddProductStep step) {
    switch (step) {
      case AddProductStep.photo:
        return _PhotoStep(onCamera: _pickImage, onGallery: _pickFromGallery);
      case AddProductStep.aiStudio:
        return _AIStudioStep(image: _selectedImage, onContinue: () => ref.read(addProductStepProvider.notifier).state = AddProductStep.voice);
      case AddProductStep.voice:
        return _VoiceStep(
          onTranscriptReady: (t) {
            setState(() => _transcript = t);
            _generateCatalog();
          },
        );
      case AddProductStep.catalog:
        return _CatalogStep(catalogData: _catalogData ?? {}, onContinue: () => ref.read(addProductStepProvider.notifier).state = AddProductStep.pricing);
      case AddProductStep.pricing:
        return _PricingStep(productId: _productId ?? "", onPublish: () => ref.read(addProductStepProvider.notifier).state = AddProductStep.publish);
      case AddProductStep.publish:
        return _PublishStep(onDone: () => context.go("/my-products"));
    }
  }
}

class _PhotoStep extends StatelessWidget {
  final VoidCallback onCamera, onGallery;
  const _PhotoStep({required this.onCamera, required this.onGallery});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(AppTheme.paddingLG),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.photo_camera_outlined, size: 80, color: AppTheme.primary),
        const SizedBox(height: 16),
        Text("Capture Your Product", style: AppTheme.h2, textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text("Take a clear photo of your product.\nAI will enhance it automatically.", style: AppTheme.body.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
        const SizedBox(height: 48),
        ElevatedButton.icon(icon: const Icon(Icons.camera_alt), label: const Text("Open Camera"), onPressed: onCamera),
        const SizedBox(height: 12),
        OutlinedButton.icon(icon: const Icon(Icons.photo_library_outlined), label: const Text("Choose from Gallery"), onPressed: onGallery),
      ],
    ),
  );
}

class _AIStudioStep extends StatelessWidget {
  final File? image;
  final VoidCallback onContinue;
  const _AIStudioStep({required this.image, required this.onContinue});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(AppTheme.paddingLG),
    child: Column(
      children: [
        Text("AI Image Studio", style: AppTheme.h2),
        const SizedBox(height: 8),
        Text("AI is enhancing your image", style: AppTheme.body.copyWith(color: AppTheme.textSecondary)),
        const SizedBox(height: 24),
        if (image != null) Expanded(
          child: Row(
            children: [
              Expanded(child: Column(children: [
                Text("Original", style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
                const SizedBox(height: 8),
                Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(image!, fit: BoxFit.cover))),
              ])),
              const SizedBox(width: 12),
              Expanded(child: Column(children: [
                Text("Enhanced (AI)", style: AppTheme.bodySmall.copyWith(color: AppTheme.primary)),
                const SizedBox(height: 8),
                Expanded(child: Container(
                  decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.primary.withOpacity(0.3))),
                  child: const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    CircularProgressIndicator(color: AppTheme.primary),
                    SizedBox(height: 8),
                    Text("Processing...", style: TextStyle(color: AppTheme.primary)),
                  ])),
                )),
              ])),
            ],
          ),
        ),
        const SizedBox(height: 24),
        ElevatedButton(onPressed: onContinue, child: const Text("Continue with Image")),
      ],
    ),
  );
}

class _VoiceStep extends StatefulWidget {
  final Function(String) onTranscriptReady;
  const _VoiceStep({required this.onTranscriptReady});
  @override
  State<_VoiceStep> createState() => _VoiceStepState();
}

class _VoiceStepState extends State<_VoiceStep> {
  final _controller = TextEditingController();
  bool _useText = false;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(AppTheme.paddingLG),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.mic_outlined, size: 80, color: AppTheme.primary),
        const SizedBox(height: 16),
        Text("Describe Your Product", style: AppTheme.h2, textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text("Record a short voice description or type it below.", style: AppTheme.body.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
        const SizedBox(height: 32),
        GestureDetector(
          onTap: () => setState(() => _useText = !_useText),
          child: Container(
            width: 100, height: 100,
            decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), shape: BoxShape.circle, border: Border.all(color: AppTheme.primary, width: 3)),
            child: const Icon(Icons.mic, size: 48, color: AppTheme.primary),
          ),
        ),
        const SizedBox(height: 24),
        if (_useText) ...[
          TextField(
            controller: _controller,
            maxLines: 4,
            decoration: const InputDecoration(hintText: "Type your product description here..."),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () { if (_controller.text.isNotEmpty) widget.onTranscriptReady(_controller.text); },
            child: const Text("Generate Catalog with AI"),
          ),
        ] else ...[
          TextButton(onPressed: () => setState(() => _useText = true), child: const Text("Or type description instead")),
        ],
      ],
    ),
  );
}

class _CatalogStep extends StatelessWidget {
  final Map<String, dynamic> catalogData;
  final VoidCallback onContinue;
  const _CatalogStep({required this.catalogData, required this.onContinue});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(AppTheme.paddingLG),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("AI Generated Catalog", style: AppTheme.h2),
        const SizedBox(height: 4),
        Text("Review and edit before publishing", style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
        const SizedBox(height: 16),
        Expanded(
          child: ListView(
            children: [
              _CatalogField(label: "Title", value: catalogData["title"] ?? ""),
              _CatalogField(label: "Title (Hindi)", value: catalogData["title_hindi"] ?? ""),
              _CatalogField(label: "Category", value: catalogData["category"] ?? ""),
              _CatalogField(label: "Material", value: catalogData["material"] ?? ""),
              _CatalogField(label: "Region", value: catalogData["region"] ?? ""),
              _CatalogField(label: "Description", value: catalogData["description"] ?? "", multiline: true),
            ],
          ),
        ),
        ElevatedButton(onPressed: onContinue, child: const Text("Looks Good ? Set Price")),
      ],
    ),
  );
}

class _CatalogField extends StatelessWidget {
  final String label, value;
  final bool multiline;
  const _CatalogField({required this.label, required this.value, this.multiline = false});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        TextFormField(
          initialValue: value.isEmpty ? null : value,
          maxLines: multiline ? 4 : 1,
          decoration: InputDecoration(hintText: value.isEmpty ? "Not detected" : null),
        ),
      ],
    ),
  );
}

class _PricingStep extends StatelessWidget {
  final String productId;
  final VoidCallback onPublish;
  const _PricingStep({required this.productId, required this.onPublish});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(AppTheme.paddingLG),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Pricing Assistant", style: AppTheme.h2),
        Text("AI will suggest a fair price range", style: AppTheme.body.copyWith(color: AppTheme.textSecondary)),
        const SizedBox(height: 24),
        // TODO: cost input fields + price recommendation
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppTheme.secondary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Suggested Price Range", style: AppTheme.bodySmall.copyWith(color: AppTheme.secondary, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text("?500 — ?1,200", style: AppTheme.h1.copyWith(color: AppTheme.secondary)),
              const SizedBox(height: 4),
              Text("Based on your costs and market observations", style: AppTheme.caption),
            ],
          ),
        ),
        const Spacer(),
        ElevatedButton(onPressed: onPublish, child: const Text("Publish Listing ??")),
      ],
    ),
  );
}

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
          Text("Product Published! ??", style: AppTheme.h2, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text("Your product is now live on the marketplace.", style: AppTheme.body.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
          const SizedBox(height: 48),
          ElevatedButton(onPressed: onDone, child: const Text("View My Products")),
        ],
      ),
    ),
  );
}
