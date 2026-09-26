import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';

class ApiService {
  late final Dio _dio;

  ApiService({
    required String baseUrl,
    String? token,
    Future<void> Function()? onUnauthorized,
  }) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ));

    // Handle 401 Unauthorized / Token Expiration automatically
    _dio.interceptors.add(InterceptorsWrapper(
      onError: (DioException error, ErrorInterceptorHandler handler) async {
        if (error.response?.statusCode == 401) {
          print('[API] 401 Unauthorized detected — session expired or invalid token');
          if (onUnauthorized != null) {
            await onUnauthorized();
          }
        }
        return handler.next(error);
      },
    ));

    _dio.interceptors.add(LogInterceptor(
      requestBody: false,
      responseBody: false,
      logPrint: (o) => print('[API] $o'),
    ));
  }

  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);

  Future<Response> delete(String path, {dynamic data}) =>
      _dio.delete(path, data: data);

  Future<Response> postFormData(String path, FormData data) =>
      _dio.post(path, data: data);
}

final apiBaseUrlProvider = Provider<String>(
  (_) => const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000/api/v1'),
);

final apiServiceProvider = Provider<ApiService>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);
  final auth = ref.watch(authStateProvider);
  return ApiService(
    baseUrl: baseUrl,
    token: auth.token,
    onUnauthorized: () async {
      await ref.read(authStateProvider.notifier).signOut();
    },
  );
});
