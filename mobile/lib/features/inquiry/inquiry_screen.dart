import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/services/api_service.dart';

/// Buyer sends an inquiry to the artisan about a specific product.
class InquiryScreen extends ConsumerStatefulWidget {
  final String productId;
  final dynamic extra;

  const InquiryScreen({
    super.key,
    required this.productId,
    this.extra,
  });

  @override
  ConsumerState<InquiryScreen> createState() => _InquiryScreenState();
}

class _InquiryScreenState extends ConsumerState<InquiryScreen> {
  final _messageCtrl = TextEditingController();
  bool _sending = false;
  bool _sent = false;
  String? _error;
  String? _productTitle;
  String? _artisanName;

  static const List<String> _quickSuggestions = [
    'Is this item available for delivery?',
    'Can you customize this with custom colors or inscription?',
    'What is the estimated crafting and shipping time?',
    'Can I place a bulk / gift order for this piece?',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.extra is String) {
      _productTitle = widget.extra as String;
    } else if (widget.extra is Map) {
      final map = widget.extra as Map;
      _productTitle = map['title'] as String?;
      _artisanName = map['artisanName'] as String?;
    }
  }

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  void _applySuggestion(String text) {
    if (_messageCtrl.text.isEmpty) {
      _messageCtrl.text = text;
    } else {
      _messageCtrl.text = '${_messageCtrl.text.trim()} $text';
    }
    _messageCtrl.selection = TextSelection.fromPosition(
      TextPosition(offset: _messageCtrl.text.length),
    );
    setState(() {
      _error = null;
    });
  }

  Future<void> _sendInquiry() async {
    final msg = _messageCtrl.text.trim();
    if (msg.length < 5) {
      setState(() => _error = 'Please enter a message of at least 5 characters.');
      return;
    }

    if (_sending) return; // Prevent duplicate rapid taps

    setState(() {
      _sending = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      await api.post('/inquiries', data: {
        'productId': widget.productId,
        'message': msg,
      });

      if (mounted) {
        setState(() {
          _sent = true;
          _sending = false;
        });
      }
    } catch (e) {
      if (mounted) {
        String errMsg = 'Failed to send inquiry. Please try again.';
        final errStr = e.toString();
        if (errStr.contains('409') || errStr.toLowerCase().contains('duplicate')) {
          errMsg = 'You recently sent this identical inquiry. Please wait a moment before sending another message.';
        } else if (errStr.contains('400')) {
          errMsg = 'Invalid inquiry details. Please check your message.';
        }
        setState(() {
          _error = errMsg;
          _sending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contact Artisan'),
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.paddingLG),
          child: _sent
              ? _SuccessView(
                  onBackToProduct: () => context.pop(),
                  onViewInquiries: () {
                    context.pop();
                    context.push('/inquiries');
                  },
                )
              : _FormView(
                  productTitle: _productTitle,
                  artisanName: _artisanName,
                  messageCtrl: _messageCtrl,
                  sending: _sending,
                  error: _error,
                  onSend: _sendInquiry,
                  onSelectSuggestion: _applySuggestion,
                ),
        ),
      ),
    );
  }
}

class _FormView extends StatelessWidget {
  final String? productTitle;
  final String? artisanName;
  final TextEditingController messageCtrl;
  final bool sending;
  final String? error;
  final VoidCallback onSend;
  final ValueChanged<String> onSelectSuggestion;

  const _FormView({
    required this.productTitle,
    required this.artisanName,
    required this.messageCtrl,
    required this.sending,
    required this.error,
    required this.onSend,
    required this.onSelectSuggestion,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Product Context Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.06),
            borderRadius: BorderRadius.circular(AppTheme.radiusMD),
            border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.storefront_outlined, color: AppTheme.primary, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      productTitle ?? 'Handcrafted Artisan Item',
                      style: AppTheme.bodySmall.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      artisanName != null ? 'Crafted by $artisanName' : 'Direct Inquiry to Master Artisan',
                      style: AppTheme.caption.copyWith(color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Quick Suggestion Chips
        Text(
          'Quick Questions',
          style: AppTheme.caption.copyWith(
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _InquiryScreenState._quickSuggestions.map((suggestion) {
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ActionChip(
                  label: Text(suggestion, style: AppTheme.caption),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: AppTheme.borderLight),
                  onPressed: sending ? null : () => onSelectSuggestion(suggestion),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),

        Text(
          'Your Message',
          style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),

        // Text Message Area
        Expanded(
          child: TextField(
            controller: messageCtrl,
            enabled: !sending,
            maxLines: null,
            expands: true,
            textAlignVertical: TextAlignVertical.top,
            decoration: InputDecoration(
              hintText: 'Type your message to the artisan here (customization, availability, bulk orders)...',
              hintStyle: AppTheme.bodySmall.copyWith(color: AppTheme.textMuted),
              alignLabelWithHint: true,
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusMD),
                borderSide: const BorderSide(color: AppTheme.borderLight),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusMD),
                borderSide: const BorderSide(color: AppTheme.borderLight),
              ),
            ),
          ),
        ),

        // Error Display
        if (error != null) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.errorRed.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.errorRed.withOpacity(0.2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, size: 18, color: AppTheme.errorRed),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    error!,
                    style: AppTheme.caption.copyWith(color: AppTheme.errorRed),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 16),

        // Submit Button with Loading Indicator
        ElevatedButton.icon(
          icon: sending
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                )
              : const Icon(Icons.send_rounded),
          label: Text(sending ? 'Sending to Artisan...' : 'Send Inquiry'),
          onPressed: sending ? null : onSend,
        ),
      ],
    );
  }
}

class _SuccessView extends StatelessWidget {
  final VoidCallback onBackToProduct;
  final VoidCallback onViewInquiries;

  const _SuccessView({
    required this.onBackToProduct,
    required this.onViewInquiries,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: AppTheme.successGreen.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              size: 56,
              color: AppTheme.successGreen,
            ),
          ),
          const SizedBox(height: 24),
          Text('Inquiry Sent!', style: AppTheme.h2),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'The artisan has received your message in their inquiry dashboard and will reply soon.',
              style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 36),
          ElevatedButton.icon(
            icon: const Icon(Icons.forum_outlined),
            label: const Text('View Inquiries'),
            onPressed: onViewInquiries,
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: onBackToProduct,
            child: const Text('Back to Product'),
          ),
        ],
      ),
    );
  }
}