import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_secure_storage/flutter_secure_storage.dart";

class AuthState {
  final bool isAuthenticated;
  final String? userId;
  final String? token;
  final String? role;
  final String? displayName;

  const AuthState({
    this.isAuthenticated = false,
    this.userId,
    this.token,
    this.role,
    this.displayName,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    String? userId,
    String? token,
    String? role,
    String? displayName,
  }) => AuthState(
    isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    userId: userId ?? this.userId,
    token: token ?? this.token,
    role: role ?? this.role,
    displayName: displayName ?? this.displayName,
  );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final FlutterSecureStorage _storage;

  AuthNotifier(this._storage) : super(const AuthState()) {
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final token = await _storage.read(key: "auth_token");
    final userId = await _storage.read(key: "user_id");
    final role = await _storage.read(key: "user_role");
    final displayName = await _storage.read(key: "display_name");
    if (token != null) {
      state = AuthState(isAuthenticated: true, token: token, userId: userId, role: role, displayName: displayName);
    }
  }

  Future<void> setSession({ required String token, required String userId, String? role, String? displayName }) async {
    await _storage.write(key: "auth_token", value: token);
    await _storage.write(key: "user_id", value: userId);
    if (role != null) await _storage.write(key: "user_role", value: role);
    if (displayName != null) await _storage.write(key: "display_name", value: displayName);
    state = AuthState(isAuthenticated: true, token: token, userId: userId, role: role, displayName: displayName);
  }

  Future<void> signOut() async {
    await _storage.deleteAll();
    state = const AuthState();
  }
}

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) => const FlutterSecureStorage());

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(secureStorageProvider));
});
