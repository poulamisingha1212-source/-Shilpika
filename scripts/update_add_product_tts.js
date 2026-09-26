const fs = require('fs');

// 1. Update add_product_screen.dart
let ap = fs.readFileSync('d:/Hacknex/mobile/lib/features/products/add_product/add_product_screen.dart', 'utf8');

if (!ap.includes('tts_player_widget.dart')) {
  ap = ap.replace(
    'import "../../voice_cataloger/voice_recorder_widget.dart";',
    'import "../../voice_cataloger/voice_recorder_widget.dart";\nimport "../../voice_cataloger/tts_player_widget.dart";'
  );
}

// In _CatalogStep:
const catalogOld = `            Text("Review and edit before publishing",
                style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
            const SizedBox(height: 16),`;

const catalogNew = `            Text("Review and edit before publishing",
                style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
            const SizedBox(height: 12),
            TtsPlayerWidget(
              text: "Your product catalog is ready. \${widget.catalogData['title'] ?? ''}. \${widget.catalogData['description'] ?? ''}",
              label: "Listen to AI Summary",
            ),
            const SizedBox(height: 16),`;

if (ap.includes(catalogOld)) {
  ap = ap.replace(catalogOld, catalogNew);
}

// In _PricingStep:
const priceOld = `                if (price != null) ...[
                  const SizedBox(height: 20),
                  Container(`;

const priceNew = `                if (price != null) ...[
                  const SizedBox(height: 20),
                  TtsPlayerWidget(
                    text: "Your recommended price range is INR \${minPrice.toStringAsFixed(0)} to \${maxPrice.toStringAsFixed(0)}. \${price['explanation'] ?? ''}",
                    label: "Listen to Price Recommendation",
                  ),
                  const SizedBox(height: 12),
                  Container(`;

if (ap.includes(priceOld)) {
  ap = ap.replace(priceOld, priceNew);
}

// In _PublishStep:
const pubOld = `              Text("Your product is now live on the marketplace.",
                  style: AppTheme.body.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
              const SizedBox(height: 48),`;

const pubNew = `              Text("Your product is now live on the marketplace.",
                  style: AppTheme.body.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              const TtsPlayerWidget(
                text: "Congratulations! Your product is now live on the marketplace.",
                label: "Listen to Confirmation",
                compact: true,
              ),
              const SizedBox(height: 32),`;

if (ap.includes(pubOld)) {
  ap = ap.replace(pubOld, pubNew);
}

fs.writeFileSync('d:/Hacknex/mobile/lib/features/products/add_product/add_product_screen.dart', ap, 'utf8');
console.log('add_product_screen.dart updated with TTS player!');

// 2. Update pricing_screen.dart
let ps = fs.readFileSync('d:/Hacknex/mobile/lib/features/pricing/pricing_screen.dart', 'utf8');
if (!ps.includes('tts_player_widget.dart')) {
  ps = ps.replace(
    "import '../../shared/theme/app_theme.dart';",
    "import '../../shared/theme/app_theme.dart';\nimport '../voice_cataloger/tts_player_widget.dart';"
  );
}

const psRecOld = `                    Text(
                      'INR \${recMin.toStringAsFixed(0)} - \${recMax.toStringAsFixed(0)}',
                      style: AppTheme.h1.copyWith(color: AppTheme.secondary, fontSize: 32),
                    ),`;

const psRecNew = `                    Text(
                      'INR \${recMin.toStringAsFixed(0)} - \${recMax.toStringAsFixed(0)}',
                      style: AppTheme.h1.copyWith(color: AppTheme.secondary, fontSize: 32),
                    ),
                    const SizedBox(height: 12),
                    TtsPlayerWidget(
                      text: 'Recommended price range is INR \${recMin.toStringAsFixed(0)} to \${recMax.toStringAsFixed(0)}. \${rec["explanation"] ?? ""}',
                      label: 'Listen to AI Recommendation',
                    ),`;

if (ps.includes(psRecOld)) {
  ps = ps.replace(psRecOld, psRecNew);
}

fs.writeFileSync('d:/Hacknex/mobile/lib/features/pricing/pricing_screen.dart', ps, 'utf8');
console.log('pricing_screen.dart updated with TTS player!');
