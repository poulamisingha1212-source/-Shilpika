const fs = require('fs');

let content = fs.readFileSync('d:/Hacknex/mobile/lib/features/products/add_product/add_product_screen.dart', 'utf8');

// Ensure dart:convert is imported
if (!content.includes('dart:convert')) {
  content = 'import "dart:convert";\n' + content;
}

// Ensure state variables in _AddProductScreenState
const stateVarsOld = `  Map<String, dynamic>? _catalogData;
  Map<String, dynamic>? _priceData;`;

const stateVarsNew = `  Map<String, dynamic>? _catalogData;
  Map<String, dynamic>? _priceData;
  String? _processedImageUrl;
  String? _processedImageBase64;
  bool _useProcessedImage = true;`;

if (content.includes(stateVarsOld) && !content.includes('_processedImageUrl')) {
  content = content.replace(stateVarsOld, stateVarsNew);
}

// Update _enhanceImage method
const enhanceOld = `  Future<void> _enhanceImage() async {
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
      debugPrint("[AddProduct] Image enhancement failed: $e");
    }
  }`;

const enhanceNew = `  Future<void> _enhanceImage() async {
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
  }`;

content = content.replace(enhanceOld, enhanceNew);

// Update _buildStep for aiStudio
const aiStepBuildOld = `      case AddProductStep.aiStudio:
        return _AIStudioStep(
          image: _selectedImage,
          onEnhance: _enhanceImage,
          onContinue: () =>
              ref.read(addProductStepProvider.notifier).state = AddProductStep.voice,
        );`;

const aiStepBuildNew = `      case AddProductStep.aiStudio:
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
        );`;

content = content.replace(aiStepBuildOld, aiStepBuildNew);

// Replace _AIStudioStep implementation
const studioStepOldRegex = /\/\/ --- Step 2: AI Studio ---[\s\S]*?(?=\/\/ --- Step 3: Voice ---)/;

const studioStepNew = `// --- Step 2: AI Studio ---
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
          _error = "Enhancement failed: \${e.toString()}";
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
                          "• Clean studio background\\n• 1:1 marketplace framing\\n• Lighting & exposure optimization",
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
`;

content = content.replace(studioStepOldRegex, studioStepNew);

fs.writeFileSync('d:/Hacknex/mobile/lib/features/products/add_product/add_product_screen.dart', content, 'utf8');
console.log('add_product_screen.dart successfully updated with AI Studio before/after!');
