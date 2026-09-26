import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/auth_provider.dart';

class InquiriesListScreen extends ConsumerStatefulWidget {
  const InquiriesListScreen({super.key});

  @override
  ConsumerState<InquiriesListScreen> createState() => _InquiriesListScreenState();
}

class _InquiriesListScreenState extends ConsumerState<InquiriesListScreen> {
  List<dynamic> _inquiries = [];
  bool _loading = true;
  String? _error;
  String _selectedFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchInquiries();
  }

  Future<void> _fetchInquiries() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final auth = ref.read(authStateProvider);
      final api = ref.read(apiServiceProvider);
      final endpoint = auth.role == 'artisan' ? '/inquiries/received' : '/inquiries/my';

      final res = await api.get(endpoint);
      if (mounted) {
        setState(() {
          _inquiries = (res.data as List?) ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load inquiries: $e';
          _loading = false;
        });
      }
    }
  }

  List<dynamic> get _filteredInquiries {
    if (_selectedFilter == 'ALL') return _inquiries;
    return _inquiries.where((i) {
      final status = (i['status'] as String? ?? '').toUpperCase();
      return status == _selectedFilter;
    }).toList();
  }

  void _openInquiryDetail(Map<String, dynamic> inquiry) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _InquiryDetailSheet(
        inquiry: inquiry,
        onUpdated: _fetchInquiries,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final isArtisan = auth.role == 'artisan';

    return Scaffold(
      appBar: AppBar(
        title: Text(isArtisan ? 'Customer Inquiries' : 'My Inquiries'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _fetchInquiries,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['ALL', 'NEW', 'READ', 'RESPONDED', 'CLOSED'].map((filter) {
                  final isSelected = _selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter, style: AppTheme.caption.copyWith(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.white : AppTheme.textPrimary,
                      )),
                      selected: isSelected,
                      selectedColor: AppTheme.primary,
                      backgroundColor: AppTheme.surfaceLight,
                      onSelected: (val) {
                        if (val) setState(() => _selectedFilter = filter);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Divider(height: 1),

          // Inquiry List View
          Expanded(
            child: _buildBody(isArtisan),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(bool isArtisan) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.errorRed),
              const SizedBox(height: 12),
              Text('Could not load inquiries', style: AppTheme.h3),
              const SizedBox(height: 6),
              Text(_error!, style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                onPressed: _fetchInquiries,
              ),
            ],
          ),
        ),
      );
    }

    final items = _filteredInquiries;

    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.chat_bubble_outline_rounded, size: 36, color: AppTheme.primary),
              ),
              const SizedBox(height: 16),
              Text(
                _selectedFilter == 'ALL' ? 'No Inquiries Yet' : 'No ${_selectedFilter.toLowerCase()} inquiries',
                style: AppTheme.h3,
              ),
              const SizedBox(height: 8),
              Text(
                isArtisan
                    ? 'When buyers ask questions regarding your craft or custom orders, they will appear here.'
                    : 'When you contact artisans about handcrafted products, your inquiries will show here.',
                style: AppTheme.bodySmall.copyWith(color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchInquiries,
      color: AppTheme.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (ctx, index) {
          final item = items[index] as Map<String, dynamic>;
          return _InquiryCard(
            inquiry: item,
            isArtisan: isArtisan,
            onTap: () => _openInquiryDetail(item),
          );
        },
      ),
    );
  }
}

class _InquiryCard extends StatelessWidget {
  final Map<String, dynamic> inquiry;
  final bool isArtisan;
  final VoidCallback onTap;

  const _InquiryCard({
    required this.inquiry,
    required this.isArtisan,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final status = (inquiry['status'] as String? ?? 'new').toUpperCase();
    final message = inquiry['message'] as String? ?? '';
    final createdAtStr = inquiry['createdAt'] as String? ?? '';
    final product = inquiry['product'] as Map<String, dynamic>?;
    final productTitle = product?['title'] as String? ?? 'Handcrafted Item';
    final buyer = inquiry['buyer'] as Map<String, dynamic>?;
    final buyerName = buyer?['displayName'] as String? ?? buyer?['email'] ?? 'Buyer';
    final reply = inquiry['reply'] as String?;

    Color statusColor;
    Color statusBg;
    switch (status) {
      case 'NEW':
        statusColor = const Color(0xFF1E5BEE);
        statusBg = const Color(0xFFE8F0FE);
        break;
      case 'READ':
        statusColor = const Color(0xFF8E24AA);
        statusBg = const Color(0xFFF3E5F5);
        break;
      case 'RESPONDED':
        statusColor = AppTheme.successGreen;
        statusBg = const Color(0xFFE8F5E9);
        break;
      case 'CLOSED':
      default:
        statusColor = Colors.blueGrey;
        statusBg = const Color(0xFFECEFF1);
        break;
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusLG),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusLG),
          border: Border.all(
            color: status == 'NEW' ? AppTheme.primary.withOpacity(0.4) : AppTheme.borderLight,
            width: status == 'NEW' ? 1.5 : 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: User + Status badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppTheme.primary.withOpacity(0.12),
                        child: Text(
                          isArtisan ? buyerName[0].toUpperCase() : 'A',
                          style: AppTheme.caption.copyWith(fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          isArtisan ? buyerName : 'Artisan Inquiry',
                          style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (status == 'NEW') ...[
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(color: Color(0xFF1E5BEE), shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        status,
                        style: AppTheme.caption.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Product Title
            Row(
              children: [
                const Icon(Icons.inventory_2_outlined, size: 14, color: AppTheme.textSecondary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    productTitle,
                    style: AppTheme.caption.copyWith(
                      color: AppTheme.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Message Snippet
            Text(
              message,
              style: AppTheme.bodySmall,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),

            if (reply != null && reply.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.reply, size: 14, color: AppTheme.successGreen),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Artisan: $reply',
                        style: AppTheme.caption.copyWith(color: const Color(0xFF2E7D32)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 8),
            // Timestamp
            Align(
              alignment: Alignment.bottomRight,
              child: Text(
                _formatTimestamp(createdAtStr),
                style: AppTheme.caption.copyWith(color: AppTheme.textMuted, fontSize: 10),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _InquiryDetailSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic> inquiry;
  final VoidCallback onUpdated;

  const _InquiryDetailSheet({
    required this.inquiry,
    required this.onUpdated,
  });

  @override
  ConsumerState<_InquiryDetailSheet> createState() => _InquiryDetailSheetState();
}

class _InquiryDetailSheetState extends ConsumerState<_InquiryDetailSheet> {
  final _replyCtrl = TextEditingController();
  bool _sendingReply = false;
  bool _updatingStatus = false;
  late Map<String, dynamic> _currentInquiry;

  @override
  void initState() {
    super.initState();
    _currentInquiry = Map<String, dynamic>.from(widget.inquiry);
    _markReadIfArtisan();
  }

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _markReadIfArtisan() async {
    final auth = ref.read(authStateProvider);
    final status = (_currentInquiry['status'] as String? ?? '').toUpperCase();
    if (auth.role == 'artisan' && status == 'NEW') {
      try {
        final api = ref.read(apiServiceProvider);
        final id = _currentInquiry['id'];
        final res = await api.get('/inquiries/$id');
        if (mounted && res.data != null) {
          setState(() {
            _currentInquiry = Map<String, dynamic>.from(res.data);
          });
          widget.onUpdated();
        }
      } catch (_) {}
    }
  }

  Future<void> _sendReply() async {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty) return;

    setState(() => _sendingReply = true);
    try {
      final api = ref.read(apiServiceProvider);
      final id = _currentInquiry['id'];
      final res = await api.post('/inquiries/$id/reply', data: {'reply': text});
      if (mounted) {
        setState(() {
          _currentInquiry = Map<String, dynamic>.from(res.data);
          _replyCtrl.clear();
          _sendingReply = false;
        });
        widget.onUpdated();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _sendingReply = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send reply: $e')),
        );
      }
    }
  }

  Future<void> _closeInquiry() async {
    setState(() => _updatingStatus = true);
    try {
      final api = ref.read(apiServiceProvider);
      final id = _currentInquiry['id'];
      final res = await api.patch('/inquiries/$id/status', data: {'status': 'closed'});
      if (mounted) {
        setState(() {
          _currentInquiry = Map<String, dynamic>.from(res.data);
          _updatingStatus = false;
        });
        widget.onUpdated();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _updatingStatus = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to close inquiry: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final isArtisan = auth.role == 'artisan';
    final product = _currentInquiry['product'] as Map<String, dynamic>?;
    final productTitle = product?['title'] as String? ?? 'Handcrafted Item';
    final buyer = _currentInquiry['buyer'] as Map<String, dynamic>?;
    final buyerName = buyer?['displayName'] as String? ?? buyer?['email'] ?? 'Buyer';
    final message = _currentInquiry['message'] as String? ?? '';
    final status = (_currentInquiry['status'] as String? ?? 'NEW').toUpperCase();
    final reply = _currentInquiry['reply'] as String?;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusXL)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(productTitle, style: AppTheme.h3, maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Text('From $buyerName', style: AppTheme.caption.copyWith(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
                Chip(
                  label: Text(status, style: AppTheme.caption.copyWith(fontWeight: FontWeight.bold)),
                  backgroundColor: AppTheme.surfaceLight,
                ),
              ],
            ),
            const Divider(height: 24),

            // Message Bubble
            Text('Buyer Inquiry:', style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.borderLight),
              ),
              child: Text(message, style: AppTheme.body),
            ),
            const SizedBox(height: 16),

            // Existing Reply Bubble
            if (reply != null && reply.isNotEmpty) ...[
              Text('Artisan Response:', style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600, color: AppTheme.successGreen)),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.successGreen.withOpacity(0.3)),
                ),
                child: Text(reply, style: AppTheme.body.copyWith(color: const Color(0xFF1B5E20))),
              ),
              const SizedBox(height: 16),
            ],

            // Artisan Reply Composer
            if (isArtisan && status != 'CLOSED') ...[
              Text('Respond to Buyer:', style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _replyCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Type your reply...',
                        isDense: true,
                      ),
                      maxLines: 3,
                      minLines: 1,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _sendingReply ? null : _sendReply,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    child: _sendingReply
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.send, size: 18),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],

            // Close inquiry action
            if (status != 'CLOSED')
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  icon: const Icon(Icons.check_circle_outline, size: 16),
                  label: Text(_updatingStatus ? 'Closing...' : 'Close Inquiry'),
                  onPressed: _updatingStatus ? null : _closeInquiry,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
