import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "../../shared/theme/app_theme.dart";
import "../../core/providers/auth_provider.dart";
import "../../core/services/api_service.dart";

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});
  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  bool _isLoading = false;
  String _selectedRole = "artisan";

  Future<void> _signIn() async {
    // For demo: use dev token endpoint
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.post("/auth/dev-token", data: {
        "userId": "demo-user-${_selectedRole}",
        "role": _selectedRole,
      });
      final token = response.data["token"] as String;
      await ref.read(authStateProvider.notifier).setSession(
        token: token,
        userId: "demo-user-$_selectedRole",
        role: _selectedRole,
        displayName: _selectedRole == "artisan" ? "Priya Sharma" : "Ananya Singh",
      );
      if (mounted) context.go("/dashboard");
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Sign in error: $e"), backgroundColor: AppTheme.errorRed),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.paddingLG),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                child: const Icon(Icons.storefront_rounded, size: 40, color: AppTheme.primary),
              ),
              const SizedBox(height: 24),
              Text("Welcome to\nArtisan AI", style: AppTheme.h1.copyWith(height: 1.2)),
              const SizedBox(height: 8),
              Text("Sign in to continue", style: AppTheme.body.copyWith(color: AppTheme.textSecondary)),
              const SizedBox(height: 40),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Demo Mode — Select Role", style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _RoleChip(label: "?? Artisan", value: "artisan", selected: _selectedRole == "artisan", onTap: () => setState(() => _selectedRole = "artisan"))),
                        const SizedBox(width: 8),
                        Expanded(child: _RoleChip(label: "?? Buyer", value: "buyer", selected: _selectedRole == "buyer", onTap: () => setState(() => _selectedRole = "buyer"))),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _signIn,
                child: _isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text("Sign In"),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  "In production, this uses Auth0 authentication.\nSet AUTH0_DOMAIN in your .env to enable.",
                  textAlign: TextAlign.center,
                  style: AppTheme.caption,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  final String label, value;
  final bool selected;
  final VoidCallback onTap;
  const _RoleChip({required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: selected ? AppTheme.primary : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: selected ? AppTheme.primary : AppTheme.borderLight),
      ),
      child: Center(
        child: Text(label, style: AppTheme.bodySmall.copyWith(
          color: selected ? Colors.white : AppTheme.textPrimary,
          fontWeight: FontWeight.w600,
        )),
      ),
    ),
  );
}
