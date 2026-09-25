import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "providers/auth_provider.dart";
import "../features/onboarding/splash_screen.dart";
import "../features/onboarding/language_screen.dart";
import "../features/auth/auth_screen.dart";
import "../features/dashboard/dashboard_screen.dart";
import "../features/products/add_product/add_product_screen.dart";
import "../features/products/my_products/my_products_screen.dart";
import "../features/marketplace/marketplace_screen.dart";
import "../features/marketplace/product_detail_screen.dart";
import "../features/pricing/pricing_screen.dart";
import "../features/profile/artisan_profile_screen.dart";
import "../features/settings/settings_screen.dart";

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: "/splash",
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final onAuthPage = state.matchedLocation == "/auth";
      final onSplash = state.matchedLocation == "/splash";
      final onLanguage = state.matchedLocation == "/language";

      if (onSplash || onLanguage) return null;
      if (!isLoggedIn && !onAuthPage) return "/auth";
      if (isLoggedIn && onAuthPage) return "/dashboard";
      return null;
    },
    routes: [
      GoRoute(path: "/splash", builder: (c, s) => const SplashScreen()),
      GoRoute(path: "/language", builder: (c, s) => const LanguageScreen()),
      GoRoute(path: "/auth", builder: (c, s) => const AuthScreen()),
      GoRoute(path: "/dashboard", builder: (c, s) => const DashboardScreen()),
      GoRoute(path: "/add-product", builder: (c, s) => const AddProductScreen()),
      GoRoute(path: "/my-products", builder: (c, s) => const MyProductsScreen()),
      GoRoute(path: "/marketplace", builder: (c, s) => const MarketplaceScreen()),
      GoRoute(path: "/products/:id", builder: (c, s) => ProductDetailScreen(productId: s.pathParameters["id"]!)),
      GoRoute(path: "/pricing/:productId", builder: (c, s) => PricingScreen(productId: s.pathParameters["productId"]!)),
      GoRoute(path: "/artisan/:id", builder: (c, s) => ArtisanProfileScreen(artisanId: s.pathParameters["id"]!)),
      GoRoute(path: "/settings", builder: (c, s) => const SettingsScreen()),
    ],
  );
});
