// voice_recorder_widget.dart
// Self-contained voice recording widget for the Artisan AI Marketplace.
// State machine: ready -> recording -> processing -> transcriptReady -> error
// Backed by the `record` package (v5.x) + ElevenLabs STT via backend proxy.
// API keys never leave the backend.
import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/services/api_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────────────────────────────────────
enum VoiceRecordState { ready, recording, processing, transcriptReady, error }

/// Transcription result from backend (ElevenLabs real or mock).
class TranscriptResult {
  final String transcript;
  final bool isMock;
  final String provider;
  const TranscriptResult({required this.transcript, required this.isMock, required this.provider});
}

// ─────────────────────────────────────────────────────────────────────────────
// Public widget
// ─────────────────────────────────────────────────────────────────────────────

/// Full voice recording + transcription widget.
/// Does NOT send any text to the backend without a real audio recording.
/// If ElevenLabs is not configured server-side, the backend returns isMock=true.
class VoiceRecorderWidget extends ConsumerStatefulWidget {
  final String productId;
  final Future<void> Function(String transcript) onTranscriptReady;

  const VoiceRecorderWidget({
    super.key,
    required this.productId,
    required this.onTranscriptReady,
  });

  @override
  ConsumerState<VoiceRecorderWidget> createState() => _VoiceRecorderWidgetState();
}

class _VoiceRecorderWidgetState extends ConsumerState<VoiceRecorderWidget>
    with SingleTickerProviderStateMixin {

  VoiceRecordState _state = VoiceRecordState.ready;

  final AudioRecorder _recorder = AudioRecorder();
  AudioPlayer? _player;

  Timer? _recordingTimer;
  int _recordingSeconds = 0;
  static const int _maxSeconds = 180; // 3 minutes auto-stop

  String? _recordingPath;
  TranscriptResult? _result;
  String? _errorMessage;
  bool _isPlaying = false;

  // Amplitude visualization
  late final AnimationController _pulseCtrl;
  double _amplitude = 0.0; // 0.0 – 1.0 normalised
  StreamSubscription<Amplitude>? _ampSub;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _recordingTimer?.cancel();
    _ampSub?.cancel();
    _pulseCtrl.dispose();
    _recorder.dispose();
    _player?.dispose();
    super.dispose();
  }

  // ── Recording control ─────────────────────────────────────────────────────

  Future<void> _startRecording() async {
    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      _setError(
        'Microphone permission denied.\n'
        'Please enable microphone access in your device Settings.',
      );
      return;
    }

    try {
      final dir = await getTemporaryDirectory();
      _recordingPath = '${dir.path}/voice_${widget.productId}_${DateTime.now().millisecondsSinceEpoch}.m4a';

      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
          numChannels: 1,
        ),
        path: _recordingPath!,
      );

      // Amplitude stream → drive pulse animation
      _ampSub?.cancel();
      _ampSub = _recorder
          .onAmplitudeChanged(const Duration(milliseconds: 150))
          .listen((amp) {
        if (mounted) {
          // amp.current is dBFS (typically -60 to 0); normalise to 0..1
          final normalised = ((amp.current + 60) / 60).clamp(0.0, 1.0);
          setState(() => _amplitude = normalised);
        }
      });

      // Countdown timer
      _recordingSeconds = 0;
      _recordingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _recordingSeconds++);
        if (_recordingSeconds >= _maxSeconds) _stopAndTranscribe();
      });

      setState(() => _state = VoiceRecordState.recording);
    } catch (e) {
      _setError('Failed to start recording: $e');
    }
  }

  Future<void> _cancelRecording() async {
    _stopTimers();
    await _recorder.cancel();
    setState(() {
      _state = VoiceRecordState.ready;
      _recordingSeconds = 0;
      _recordingPath = null;
      _amplitude = 0;
    });
  }

  Future<void> _stopAndTranscribe() async {
    _stopTimers();

    if (_recordingSeconds < 1) {
      await _recorder.cancel();
      _setError('Recording too short — please speak for at least 1 second.');
      return;
    }

    setState(() { _state = VoiceRecordState.processing; _amplitude = 0; });

    final path = await _recorder.stop();
    if (path == null) {
      _setError('Recording could not be saved. Please try again.');
      return;
    }
    _recordingPath = path;
    await _uploadAndTranscribe(path);
  }

  Future<void> _uploadAndTranscribe(String path) async {
    // Sanity-check the file before uploading
    final file = File(path);
    if (!await file.exists() || await file.length() == 0) {
      _setError('Empty or missing recording file. Please try again.');
      return;
    }

    try {
      final api = ref.read(apiServiceProvider);
      final formData = FormData.fromMap({
        'audio': await MultipartFile.fromFile(
          path,
          filename: 'voice.m4a',
          // m4a is AAC in MPEG-4 container; ElevenLabs Scribe accepts this
          contentType: DioMediaType('audio', 'mp4'),
        ),
        'productId': widget.productId,
        'language': 'hi',
      });

      final res = await api
          .postFormData('/ai/transcribe', formData)
          .timeout(const Duration(seconds: 60));

      final transcript = res.data['transcript'] as String? ?? '';
      final isMock = res.data['isMock'] == true || res.data['provider'] == 'mock';
      final provider = res.data['provider'] as String? ?? 'unknown';

      if (transcript.trim().isEmpty) {
        _setError('No speech detected in the recording. Please speak clearly and try again.');
        return;
      }

      setState(() {
        _state = VoiceRecordState.transcriptReady;
        _result = TranscriptResult(transcript: transcript, isMock: isMock, provider: provider);
      });
    } on TimeoutException {
      _setError('Upload timed out (60 s). Please check your network connection and try again.');
    } on DioException catch (e) {
      final msg = switch (e.type) {
        DioExceptionType.connectionTimeout => 'Connection timed out.',
        DioExceptionType.receiveTimeout    => 'Server response timed out.',
        DioExceptionType.connectionError   => 'Network error — check your connection.',
        _                                   => 'Upload failed: ${e.message ?? e.type.name}',
      };
      _setError(msg);
    } catch (e) {
      _setError('Transcription error: $e');
    }
  }

  void _reset() {
    _player?.stop();
    setState(() {
      _state = VoiceRecordState.ready;
      _result = null;
      _errorMessage = null;
      _recordingSeconds = 0;
      _recordingPath = null;
      _amplitude = 0;
      _isPlaying = false;
    });
  }

  void _stopTimers() {
    _recordingTimer?.cancel();
    _recordingTimer = null;
    _ampSub?.cancel();
    _ampSub = null;
  }

  void _setError(String msg) {
    if (!mounted) return;
    setState(() { _state = VoiceRecordState.error; _errorMessage = msg; });
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  Future<void> _togglePlayback() async {
    if (_recordingPath == null) return;
    _player ??= AudioPlayer();
    if (_isPlaying) {
      await _player!.pause();
      setState(() => _isPlaying = false);
    } else {
      _player!.onPlayerComplete.listen((_) {
        if (mounted) setState(() => _isPlaying = false);
      });
      await _player!.play(DeviceFileSource(_recordingPath!));
      setState(() => _isPlaying = true);
    }
  }

  // ── Timer helper ─────────────────────────────────────────────────────────

  String get _timerLabel {
    final m = _recordingSeconds ~/ 60;
    final s = _recordingSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(AppTheme.paddingLG),
        child: switch (_state) {
          VoiceRecordState.ready => _ReadyView(onStart: _startRecording),
          VoiceRecordState.recording => _RecordingView(
            timerLabel: _timerLabel,
            amplitude: _amplitude,
            pulseCtrl: _pulseCtrl,
            onStop: _stopAndTranscribe,
            onCancel: _cancelRecording,
          ),
          VoiceRecordState.processing => const _ProcessingView(),
          VoiceRecordState.transcriptReady => _TranscriptView(
            result: _result!,
            recordingPath: _recordingPath,
            isPlaying: _isPlaying,
            onTogglePlayback: _togglePlayback,
            onReRecord: _reset,
            onContinue: () => widget.onTranscriptReady(_result!.transcript),
          ),
          VoiceRecordState.error => _ErrorView(
            message: _errorMessage ?? 'An unexpected error occurred.',
            onRetry: _reset,
          ),
        },
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// State-specific sub-widgets
// ─────────────────────────────────────────────────────────────────────────────

/// STATE: ready — large glowing mic CTA
class _ReadyView extends StatelessWidget {
  final VoidCallback onStart;
  const _ReadyView({required this.onStart});

  @override
  Widget build(BuildContext context) => Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.mic_none_rounded, size: 56, color: AppTheme.primary),
          const SizedBox(height: 16),
          Text('Describe Your Product', style: AppTheme.h2, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(
            'Speak naturally in your language.\nAI will create a professional catalog.',
            style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),
          GestureDetector(
            onTap: onStart,
            child: Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF8C42), AppTheme.primary],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(
                  color: AppTheme.primary.withOpacity(0.4),
                  blurRadius: 24, offset: const Offset(0, 8),
                )],
              ),
              child: const Icon(Icons.mic, size: 56, color: Colors.white),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Tap to Start Speaking',
            style: AppTheme.bodySmall.copyWith(
              color: AppTheme.textSecondary, fontWeight: FontWeight.w600,
            ),
          ),
        ],
      );
}

/// STATE: recording — pulsing circle, live timer, stop / cancel
class _RecordingView extends StatelessWidget {
  final String timerLabel;
  final double amplitude;
  final AnimationController pulseCtrl;
  final AsyncCallback onStop;
  final AsyncCallback onCancel;
  const _RecordingView({
    required this.timerLabel,
    required this.amplitude,
    required this.pulseCtrl,
    required this.onStop,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) => Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Pulsing mic ring driven by amplitude
          AnimatedBuilder(
            animation: pulseCtrl,
            builder: (_, __) {
              final scale = 1.0 + (amplitude.clamp(0.0, 1.0) * 0.25 * pulseCtrl.value);
              return Transform.scale(
                scale: scale,
                child: Container(
                  width: 120, height: 120,
                  decoration: BoxDecoration(
                    color: AppTheme.errorRed.withOpacity(0.12),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.errorRed, width: 3),
                  ),
                  child: const Icon(Icons.mic, size: 56, color: AppTheme.errorRed),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 10, height: 10,
                decoration: const BoxDecoration(
                  color: AppTheme.errorRed, shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Recording  $timerLabel',
                style: AppTheme.h3.copyWith(color: AppTheme.errorRed),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Speak clearly about your product',
            style: AppTheme.caption.copyWith(color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 40),
          ElevatedButton.icon(
            icon: const Icon(Icons.stop_rounded),
            label: const Text('Stop Recording'),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            onPressed: onStop,
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            icon: const Icon(Icons.close, size: 18),
            label: const Text('Cancel'),
            style: TextButton.styleFrom(foregroundColor: AppTheme.textSecondary),
            onPressed: onCancel,
          ),
        ],
      );
}

/// STATE: processing — spinner while audio uploads + ElevenLabs transcribes
class _ProcessingView extends StatelessWidget {
  const _ProcessingView();

  @override
  Widget build(BuildContext context) => Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 60, height: 60,
            child: CircularProgressIndicator(color: AppTheme.primary, strokeWidth: 4),
          ),
          const SizedBox(height: 24),
          Text('Processing voice...', style: AppTheme.h3),
          const SizedBox(height: 8),
          Text(
            'Uploading audio and running AI transcription',
            style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      );
}

/// STATE: transcriptReady — shows transcript, playback, re-record, continue
class _TranscriptView extends StatelessWidget {
  final TranscriptResult result;
  final String? recordingPath;
  final bool isPlaying;
  final AsyncCallback onTogglePlayback;
  final VoidCallback onReRecord;
  final VoidCallback onContinue;
  const _TranscriptView({
    required this.result,
    required this.recordingPath,
    required this.isPlaying,
    required this.onTogglePlayback,
    required this.onReRecord,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: AppTheme.successGreen, size: 22),
              const SizedBox(width: 8),
              Text('Transcript Ready', style: AppTheme.h3.copyWith(color: AppTheme.successGreen)),
              const Spacer(),
              if (result.isMock)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.amber),
                  ),
                  child: const Text(
                    'MOCK — set ELEVENLABS_API_KEY for real STT',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700),
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.successGreen.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    result.provider,
                    style: AppTheme.caption.copyWith(color: AppTheme.successGreen, fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Transcript box
          Expanded(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.borderLight),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)],
              ),
              child: SingleChildScrollView(
                child: Text(result.transcript, style: AppTheme.body.copyWith(height: 1.6)),
              ),
            ),
          ),
          // Playback row
          if (recordingPath != null) ...[
            const SizedBox(height: 10),
            InkWell(
              onTap: onTogglePlayback,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                child: Row(
                  children: [
                    Icon(
                      isPlaying ? Icons.pause_circle_outline : Icons.play_circle_outline,
                      color: AppTheme.primary, size: 24,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isPlaying ? 'Pause playback' : 'Play recording',
                      style: AppTheme.bodySmall.copyWith(color: AppTheme.primary),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Record Again'),
                  onPressed: onReRecord,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.arrow_forward, size: 18),
                  label: const Text('Continue'),
                  onPressed: onContinue,
                ),
              ),
            ],
          ),
        ],
      );
}

/// STATE: error — clear message + retry
class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              color: AppTheme.errorRed.withOpacity(0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.mic_off_rounded, size: 44, color: AppTheme.errorRed),
          ),
          const SizedBox(height: 20),
          Text('Recording Error', style: AppTheme.h3.copyWith(color: AppTheme.errorRed)),
          const SizedBox(height: 12),
          Text(
            message,
            style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            icon: const Icon(Icons.refresh),
            label: const Text('Try Again'),
            onPressed: onRetry,
          ),
        ],
      );
}