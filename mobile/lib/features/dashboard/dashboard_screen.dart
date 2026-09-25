import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "../../shared/theme/app_theme.dart";
import "../../core/providers/auth_provider.dart";

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final isArtisan = auth.role == "artisan";

    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Good morning,", style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary)),
            Text(auth.displayName ?? "Artisan", style: AppTheme.h3),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push("/settings"),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isArtisan) ...[
              // Primary CTA — Add Product
              GestureDetector(
                onTap: () => context.push("/add-product"),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primary, AppTheme.primaryDark],
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(AppTheme.radiusXL),
                    boxShadow: [BoxShadow(color: AppTheme.primary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("+ Add Product", style: AppTheme.h2.copyWith(color: Colors.white)),
                            const SizedBox(height: 4),
                            Text("Photo + voice = professional listing", style: AppTheme.bodySmall.copyWith(color: Colors.white.withOpacity(0.8))),
                          ],
                        ),
                      ),
                      Container(
                        width: 64, height: 64,
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(16)),
                        child: const Icon(Icons.add_a_photo_rounded, size: 32, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text("Quick Actions", style: AppTheme.h3),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _QuickAction(icon: Icons.inventory_2_outlined, label: "My Products", onTap: () => context.push("/my-products"))),
                  const SizedBox(width: 12),
                  Expanded(child: _QuickAction(icon: Icons.store_outlined, label: "Marketplace", onTap: () => context.push("/marketplace"))),
                ],
              ),
            ] else ...[
              // Buyer view
              GestureDetector(
                onTap: () => context.push("/marketplace"),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.secondary, Color(0xFF1A5C44)],
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(AppTheme.radiusXL),
                    boxShadow: [BoxShadow(color: AppTheme.secondary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Browse Marketplace", style: AppTheme.h2.copyWith(color: Colors.white)),
                            const SizedBox(height: 4),
                            Text("Discover unique handcrafted products", style: AppTheme.bodySmall.copyWith(color: Colors.white.withOpacity(0.8))),
                          ],
                        ),
                      ),
                      const Icon(Icons.explore_outlined, size: 48, color: Colors.white),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusLG),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Column(
        children: [
          Icon(icon, size: 28, color: AppTheme.primary),
          const SizedBox(height: 8),
          Text(label, style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
