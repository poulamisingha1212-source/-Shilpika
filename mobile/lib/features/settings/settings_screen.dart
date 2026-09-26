import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/api_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  String _selectedLang = 'hi';

  static const _languages = [
    {'code': 'hi', 'name': 'Hindi (हिंदी)'},
    {'code': 'en', 'name': 'English'},
    {'code': 'bn', 'name': 'Bengali (বাংলা)'},
    {'code': 'ta', 'name': 'Tamil (தமிழ்)'},
    {'code': 'te', 'name': 'Telugu (తెలుగు)'},
    {'code': 'kn', 'name': 'Kannada (ಕನ್ನಡ)'},
  ];

  Future<void> _switchRole(String newRole) async {
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.post('/auth/dev-token', data: {
        'userId': 'demo-user-$newRole',
        'role': newRole,
      });
      final token = res.data['token'] as String;
      await ref.read(authStateProvider.notifier).setSession(
        token: token,
        userId: 'demo-user-$newRole',
        role: newRole,
        displayName: newRole == 'artisan' ? 'Priya Sharma' : 'Ananya Singh',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Switched to ${newRole == 'artisan' ? 'Artisan' : 'Buyer'} persona'),
            backgroundColor: AppTheme.successGreen,
          ),
        );
        setState(() {});
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to switch persona: $e'), backgroundColor: AppTheme.errorRed),
        );
      }
    }
  }

  Future<void> _signOut() async {
    await ref.read(authStateProvider.notifier).signOut();
    if (mounted) context.go('/auth');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final isArtisan = auth.role == 'artisan';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        children: [
          // User Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.borderLight),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppTheme.primary.withOpacity(0.12),
                  child: Text(
                    auth.displayName?.isNotEmpty == true ? auth.displayName![0].toUpperCase() : 'U',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primary),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(auth.displayName ?? 'Demo User', style: AppTheme.h3),
                      const SizedBox(height: 2),
                      Text(auth.userId ?? 'ID: unknown', style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isArtisan ? AppTheme.primary.withOpacity(0.1) : AppTheme.secondary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isArtisan ? 'Artisan' : 'Buyer',
                    style: AppTheme.caption.copyWith(
                      color: isArtisan ? AppTheme.primary : AppTheme.secondary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          Text('Persona Switcher', style: AppTheme.caption.copyWith(fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.storefront_outlined, color: AppTheme.primary),
                  title: const Text('Artisan Persona (Priya Sharma)'),
                  subtitle: const Text('Full product upload, voice & pricing studio'),
                  trailing: isArtisan ? const Icon(Icons.check_circle, color: AppTheme.primary) : null,
                  onTap: isArtisan ? null : () => _switchRole('artisan'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.shopping_bag_outlined, color: AppTheme.secondary),
                  title: const Text('Buyer Persona (Ananya Singh)'),
                  subtitle: const Text('Marketplace feed, product details & inquiry messaging'),
                  trailing: !isArtisan ? const Icon(Icons.check_circle, color: AppTheme.secondary) : null,
                  onTap: !isArtisan ? null : () => _switchRole('buyer'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          Text('Language Preference', style: AppTheme.caption.copyWith(fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedLang,
                isExpanded: true,
                items: _languages.map((l) {
                  return DropdownMenuItem<String>(
                    value: l['code'],
                    child: Text(l['name']!),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedLang = val);
                },
              ),
            ),
          ),

          const SizedBox(height: 24),
          Text('Platform & AI Capabilities', style: AppTheme.caption.copyWith(fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StatusRow(
                  icon: Icons.mic_rounded,
                  title: 'ElevenLabs Speech-to-Text',
                  status: 'Active (Scribe)',
                ),
                const SizedBox(height: 12),
                _StatusRow(
                  icon: Icons.auto_awesome_rounded,
                  title: 'Gemini 1.5 Flash Catalog AI',
                  status: 'Active',
                ),
                const SizedBox(height: 12),
                _StatusRow(
                  icon: Icons.camera_alt_outlined,
                  title: 'AI Image Enhancement Studio',
                  status: 'Active',
                ),
                const SizedBox(height: 12),
                _StatusRow(
                  icon: Icons.trending_up_rounded,
                  title: 'Dynamic Cost & Market Pricing',
                  status: 'Active',
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),
          ElevatedButton.icon(
            icon: const Icon(Icons.logout),
            label: const Text('Sign Out'),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            onPressed: _signOut,
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String status;
  const _StatusRow({required this.icon, required this.title, required this.status});

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.primary),
          const SizedBox(width: 12),
          Expanded(child: Text(title, style: AppTheme.bodySmall)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.successGreen.withOpacity(0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              status,
              style: AppTheme.caption.copyWith(color: AppTheme.successGreen, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      );
}
