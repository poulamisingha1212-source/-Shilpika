import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "../../shared/theme/app_theme.dart";

final selectedLanguageProvider = StateProvider<String>((ref) => "hi");

const kLanguages = [
  {"code": "hi", "name": "?????", "label": "Hindi", "flag": "????"},
  {"code": "en", "name": "English", "label": "English", "flag": "????"},
  {"code": "ta", "name": "?????", "label": "Tamil", "flag": "????"},
  {"code": "te", "name": "??????", "label": "Telugu", "flag": "????"},
  {"code": "kn", "name": "?????", "label": "Kannada", "flag": "????"},
  {"code": "mr", "name": "?????", "label": "Marathi", "flag": "????"},
  {"code": "bn", "name": "?????", "label": "Bengali", "flag": "????"},
  {"code": "gu", "name": "???????", "label": "Gujarati", "flag": "????"},
];

class LanguageScreen extends ConsumerWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedLang = ref.watch(selectedLanguageProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.paddingLG),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              Text("???? ?????", style: AppTheme.h1),
              Text("Select your language", style: AppTheme.body.copyWith(color: AppTheme.textSecondary)),
              const SizedBox(height: 32),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2, childAspectRatio: 2.2, crossAxisSpacing: 12, mainAxisSpacing: 12,
                  ),
                  itemCount: kLanguages.length,
                  itemBuilder: (ctx, i) {
                    final lang = kLanguages[i];
                    final isSelected = selectedLang == lang["code"];
                    return GestureDetector(
                      onTap: () => ref.read(selectedLanguageProvider.notifier).state = lang["code"]!,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary : Colors.white,
                          borderRadius: BorderRadius.circular(AppTheme.radiusLG),
                          border: Border.all(
                            color: isSelected ? AppTheme.primary : AppTheme.borderLight,
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: isSelected ? [BoxShadow(color: AppTheme.primary.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 4))] : [],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              Text(lang["flag"]!, style: const TextStyle(fontSize: 24)),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(lang["name"]!, style: AppTheme.body.copyWith(
                                      color: isSelected ? Colors.white : AppTheme.textPrimary,
                                      fontWeight: FontWeight.w600,
                                    )),
                                    Text(lang["label"]!, style: AppTheme.bodySmall.copyWith(
                                      color: isSelected ? Colors.white.withOpacity(0.8) : AppTheme.textSecondary,
                                    )),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go("/auth"),
                child: const Text("Continue / ???? ????"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
