const fs = require('fs');

let code = fs.readFileSync('d:/Hacknex/mobile/lib/features/products/add_product/add_product_screen.dart', 'utf8');

// 1. Add _lastVoiceTranscript to state
if (!code.includes('_lastVoiceTranscript')) {
  code = code.replace(
    'bool _useProcessedImage = true;',
    'bool _useProcessedImage = true;\n  String? _lastVoiceTranscript;'
  );
}

// 2. In _generateCatalog, record _lastVoiceTranscript
const genOld = `  Future<void> _generateCatalog(String transcript) async {
    if (_productId == null) return;
    setState(() => _isLoading = true);`;

const genNew = `  Future<void> _generateCatalog(String transcript) async {
    if (_productId == null) return;
    _lastVoiceTranscript = transcript;
    setState(() => _isLoading = true);`;

if (code.includes(genOld) && !code.includes('_lastVoiceTranscript = transcript;')) {
  code = code.replace(genOld, genNew);
}

// 3. Update _saveCatalogAndProceed and add _saveCatalogDraft
const saveOld = `  Future<void> _saveCatalogAndProceed(Map<String, dynamic> edited) async {
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
        "region": edited["region"],
        "tags": edited["tags"] is List ? (edited["tags"] as List).cast<String>() : <String>[],
      });
      setState(() => _catalogData = edited);
      ref.read(addProductStepProvider.notifier).state = AddProductStep.pricing;
    } catch (e) {
      _showError("Failed to save catalog: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }`;

const saveNew = `  Future<void> _saveCatalogAndProceed(Map<String, dynamic> edited) async {
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
  }`;

code = code.replace(saveOld, saveNew);

// 4. Update _buildStep for AddProductStep.catalog
const catalogBuildOld = `      case AddProductStep.catalog:
        return _CatalogStep(
          catalogData: _catalogData ?? {},
          isLoading: _isLoading,
          onSaveAndContinue: _saveCatalogAndProceed,
        );`;

const catalogBuildNew = `      case AddProductStep.catalog:
        return _CatalogStep(
          catalogData: _catalogData ?? {},
          isLoading: _isLoading,
          onSaveDraft: _saveCatalogDraft,
          onSaveAndContinue: _saveCatalogAndProceed,
          onRegenerate: () => _generateCatalog(_lastVoiceTranscript ?? "Handcrafted artisan product"),
        );`;

code = code.replace(catalogBuildOld, catalogBuildNew);

// 5. Replace _CatalogStep and _EditField with new comprehensive implementation
const catalogStepRegex = /\/\/ --- Step 4: Catalog Edit ---[\s\S]*?(?=\/\/ --- Step 5: Pricing ---)/;

const catalogStepNew = `// --- Step 4: Catalog Edit ---
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
                            : "$editedCount field\${editedCount > 1 ? 's' : ''} edited by you",
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
              text: "Your product catalog is ready: \${titleField.controller.text}. \${descField.controller.text}",
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
`;

code = code.replace(catalogStepRegex, catalogStepNew);

fs.writeFileSync('d:/Hacknex/mobile/lib/features/products/add_product/add_product_screen.dart', code, 'utf8');
console.log('Catalog Step updated successfully in add_product_screen.dart!');
