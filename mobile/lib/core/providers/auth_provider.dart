import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:auth0_flutter/auth0_flutter.dart';

// Compile-time environment configuration (defaults to live Auth0 tenant)
const String kAuth0Domain = String.fromEnvironment('AUTH0_DOMAIN', defaultValue: 'dev-3c8eme7wlzr31szt.us.auth0.com');
const String kAuth0ClientId = String.fromEnvironment('AUTH0_CLIENT_ID', defaultValue: 'Bgfa62WQm7xteD0cKOWU3MRsIKKbWwyM');
const String kAuth0Audience = String.fromEnvironment('AUTH0_AUDIENCE', defaultValue: 'https://artisan-marketplace.api');
const String kAuth0Scheme = String.fromEnvironment('AUTH0_SCHEME', defaultValue: 'artisanai');
const bool kIsDevMode = bool.fromEnvironment('DEV_MODE', defaultValue: true);

class AuthState {
  final bool isAuthenticated;
  final String? userId;
  final String? token;
  final String? refreshToken;
  final String? role; // 'artisan', 'buyer', 'admin'
  final String? displayName;
  final String? email;
  final String? avatarUrl;
  final DateTime? expiresAt;
  final bool isAuth0;

  const AuthState({
    this.isAuthenticated = false,
    this.userId,
    this.token,
    this.refreshToken,
    this.role,
    this.displayName,
    this.email,
    this.avatarUrl,
    this.expiresAt,
    this.isAuth0 = false,
  });

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  AuthState copyWith({
    bool? isAuthenticated,
    String? userId,
    String? token,
    String? refreshToken,
    String? role,
    String? displayName,
    String? email,
    String? avatarUrl,
    DateTime? expiresAt,
    bool? isAuth0,
  }) =>
      AuthState(
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        userId: userId ?? this.userId,
        token: token ?? this.token,
        refreshToken: refreshToken ?? this.refreshToken,
        role: role ?? this.role,
        displayName: displayName ?? this.displayName,
        email: email ?? this.email,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        expiresAt: expiresAt ?? this.expiresAt,
        isAuth0: isAuth0 ?? this.isAuth0,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final FlutterSecureStorage _storage;
  Auth0? _auth0;

  AuthNotifier(this._storage) : super(const AuthState()) {
    if (kAuth0Domain.isNotEmpty && kAuth0ClientId.isNotEmpty && kAuth0Domain != 'your-tenant.auth0.com') {
      _auth0 = Auth0(kAuth0Domain, kAuth0ClientId);
    }
    _restoreSession();
  }

  bool get isAuth0Configured => _auth0 != null;

  Future<void> _restoreSession() async {
    try {
      final token = await _storage.read(key: 'auth_token');
      final userId = await _storage.read(key: 'user_id');
      final role = await _storage.read(key: 'user_role');
      final displayName = await _storage.read(key: 'display_name');
      final email = await _storage.read(key: 'email');
      final avatarUrl = await _storage.read(key: 'avatar_url');
      final expiresAtStr = await _storage.read(key: 'expires_at');
      final isAuth0Str = await _storage.read(key: 'is_auth0');

      DateTime? expiresAt;
      if (expiresAtStr != null) {
        expiresAt = DateTime.tryParse(expiresAtStr);
      }

      if (token != null) {
        // Check token expiration on app launch
        if (expiresAt != null && DateTime.now().isAfter(expiresAt)) {
          print('[Auth] Stored session has expired. Clearing session.');
          await signOut();
          return;
        }

        state = AuthState(
          isAuthenticated: true,
          token: token,
          userId: userId,
          role: role ?? 'artisan',
          displayName: displayName,
          email: email,
          avatarUrl: avatarUrl,
          expiresAt: expiresAt,
          isAuth0: isAuth0Str == 'true',
        );
      }
    } catch (e) {
      print('[Auth] Error restoring session: $e');
      await signOut();
    }
  }

  /// Real Auth0 Mobile Web Authentication Flow
  Future<void> loginWithAuth0({String preferredRole = 'artisan'}) async {
    if (_auth0 == null) {
      throw Exception('Auth0 is not configured with domain/clientId. Use Dev Sign In or set AUTH0_DOMAIN.');
    }

    final credentials = await _auth0!.webAuthentication(scheme: kAuth0Scheme).login(
      audience: kAuth0Audience,
      scopes: {'openid', 'profile', 'email', 'offline_access'},
    );

    final token = credentials.accessToken;
    final user = credentials.user;
    final customClaims = user.customClaims ?? {};

    // Extract role from Auth0 custom claims (e.g. from Auth0 Rule/Action)
    String role = preferredRole;
    final roleClaim = customClaims['https://artisan-marketplace.api/roles'] ??
        customClaims['https://artisan-marketplace.api/role'] ??
        customClaims['role'];

    if (roleClaim != null) {
      if (roleClaim is List && roleClaim.isNotEmpty) {
        role = roleClaim.first.toString().toLowerCase();
      } else {
        role = roleClaim.toString().toLowerCase();
      }
    }

    final userId = user.sub;
    final displayName = user.name ?? user.nickname ?? user.email?.split('@').first ?? 'Artisan User';
    final email = user.email;
    final avatarUrl = user.pictureUrl?.toString();
    final expiresAt = credentials.expiresAt;

    await _storage.write(key: 'auth_token', value: token);
    await _storage.write(key: 'user_id', value: userId);
    await _storage.write(key: 'user_role', value: role);
    await _storage.write(key: 'display_name', value: displayName);
    if (email != null) await _storage.write(key: 'email', value: email);
    if (avatarUrl != null) await _storage.write(key: 'avatar_url', value: avatarUrl);
    await _storage.write(key: 'expires_at', value: expiresAt.toIso8601String());
    await _storage.write(key: 'is_auth0', value: 'true');

    state = AuthState(
      isAuthenticated: true,
      token: token,
      userId: userId,
      role: role,
      displayName: displayName,
      email: email,
      avatarUrl: avatarUrl,
      expiresAt: expiresAt,
      isAuth0: true,
    );
  }

  /// Sets session explicitly (Used for dev tokens and testing)
  Future<void> setSession({
    required String token,
    required String userId,
    String? role,
    String? displayName,
    String? email,
    DateTime? expiresAt,
  }) async {
    await _storage.write(key: 'auth_token', value: token);
    await _storage.write(key: 'user_id', value: userId);
    if (role != null) await _storage.write(key: 'user_role', value: role);
    if (displayName != null) await _storage.write(key: 'display_name', value: displayName);
    if (email != null) await _storage.write(key: 'email', value: email);
    if (expiresAt != null) await _storage.write(key: 'expires_at', value: expiresAt.toIso8601String());
    await _storage.write(key: 'is_auth0', value: 'false');

    state = AuthState(
      isAuthenticated: true,
      token: token,
      userId: userId,
      role: role ?? 'artisan',
      displayName: displayName,
      email: email,
      expiresAt: expiresAt,
      isAuth0: false,
    );
  }

  /// Sign out and clear all secure storage
  Future<void> signOut() async {
    try {
      if (_auth0 != null && state.isAuth0) {
        await _auth0!.webAuthentication(scheme: kAuth0Scheme).logout();
      }
    } catch (_) {}
    await _storage.deleteAll();
    state = const AuthState();
  }
}

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) => const FlutterSecureStorage());

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(secureStorageProvider));
});
