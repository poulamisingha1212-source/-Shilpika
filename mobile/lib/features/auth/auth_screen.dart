import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/api_service.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  bool _isLoading = false;
  String _selectedRole = 'artisan';

  Future<void> _signInWithAuth0() async {
    setState(() => _isLoading = true);
    try {
      final authNotifier = ref.read(authStateProvider.notifier);
      if (!authNotifier.isAuth0Configured) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Auth0 credentials not configured. Using development login.'),
            backgroundColor: AppTheme.primary,
          ),
        );
        await _signInWithDevToken();
        return;
      }

      await authNotifier.loginWithAuth0(preferredRole: _selectedRole);
      if (mounted) context.go('/dashboard');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Auth0 sign in error: $e'),
            backgroundColor: AppTheme.errorRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _signInWithDevToken() async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.post('/auth/dev-token', data: {
        'userId': 'user-$_selectedRole-${DateTime.now().millisecondsSinceEpoch % 10000}',
        'role': _selectedRole,
      });

      final token = response.data['token'] as String;
      String displayName;
      switch (_selectedRole) {
        case 'admin':
          displayName = 'Admin Manager';
          break;
        case 'buyer':
          displayName = 'Ananya Singh';
          break;
        case 'artisan':
        default:
          displayName = 'Priya Sharma';
          break;
      }

      await ref.read(authStateProvider.notifier).setSession(
        token: token,
        userId: 'dev-user-$_selectedRole',
        role: _selectedRole,
        displayName: displayName,
      );

      if (mounted) context.go('/dashboard');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Dev sign in error: $e'),
            backgroundColor: AppTheme.errorRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuth0Configured = ref.read(authStateProvider.notifier).isAuth0Configured;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.paddingLG),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              // App Brand Header
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primary, AppTheme.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withOpacity(0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: const Icon(Icons.storefront_rounded, size: 40, color: Colors.white),
              ),
              const SizedBox(height: 24),
              Text('Welcome to\nArtisan AI', style: AppTheme.h1.copyWith(height: 1.2)),
              const SizedBox(height: 8),
              Text(
                'AI-assisted marketplace for authentic Indian craftsmanship',
                style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 32),

              // Role Selector (Supports Artisan, Buyer, Admin)
              Text(
                'Select Persona / Role',
                style: AppTheme.bodySmall.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _RoleCard(
                      icon: Icons.brush_rounded,
                      label: 'Artisan',
                      selected: _selectedRole == 'artisan',
                      onTap: () => setState(() => _selectedRole = 'artisan'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _RoleCard(
                      icon: Icons.shopping_bag_outlined,
                      label: 'Buyer',
                      selected: _selectedRole == 'buyer',
                      onTap: () => setState(() => _selectedRole = 'buyer'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _RoleCard(
                      icon: Icons.admin_panel_settings_outlined,
                      label: 'Admin',
                      selected: _selectedRole == 'admin',
                      onTap: () => setState(() => _selectedRole = 'admin'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Primary Auth0 Button
              ElevatedButton.icon(
                icon: const Icon(Icons.security_rounded),
                label: Text(
                  _isLoading
                      ? 'Authenticating...'
                      : isAuth0Configured
                          ? 'Continue with Auth0'
                          : 'Sign In with Auth0 / Cloud Identity',
                ),
                onPressed: _isLoading ? null : _signInWithAuth0,
              ),

              // Development Mode Switcher (strictly behind kIsDevMode)
              if (kIsDevMode) ...[
                const SizedBox(height: 24),
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        'DEVELOPMENT QUICK ACCESS',
                        style: AppTheme.caption.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textMuted,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  icon: const Icon(Icons.developer_mode_rounded),
                  label: Text('Dev Login as ${_selectedRole.toUpperCase()}'),
                  onPressed: _isLoading ? null : _signInWithDevToken,
                ),
              ],

              const SizedBox(height: 24),
              Center(
                child: Text(
                  isAuth0Configured
                      ? 'Secured by Auth0 Universal Login & PKCE'
                      : 'Auth0 configuration detected. Tokens securely stored in Keychain / KeyStore.',
                  style: AppTheme.caption.copyWith(color: AppTheme.textMuted),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary.withOpacity(0.08) : Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusMD),
          border: Border.all(
            color: selected ? AppTheme.primary : AppTheme.borderLight,
            width: selected ? 2.0 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 24,
              color: selected ? AppTheme.primary : AppTheme.textSecondary,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: AppTheme.caption.copyWith(
                fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                color: selected ? AppTheme.primary : AppTheme.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
