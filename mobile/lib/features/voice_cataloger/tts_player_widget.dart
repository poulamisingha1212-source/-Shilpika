import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';
import '../../shared/theme/app_theme.dart';
import '../../core/services/api_service.dart';

enum TtsPlaybackState { idle, synthesizing, playing, paused, error }

/// Reusable Text-to-Speech audio player widget powered by ElevenLabs Multilingual v2.
/// Allows artisans to optionally listen to catalog summaries, price recommendations, and guidance.
class TtsPlayerWidget extends ConsumerStatefulWidget {
  final String text;
  final String? language;
  final String label;
  final bool compact;

  const TtsPlayerWidget({
    super.key,
    required this.text,
    this.language,
    this.label = 'Listen to AI Summary',
    this.compact = false,
  });

  @override
  ConsumerState<TtsPlayerWidget> createState() => _TtsPlayerWidgetState();
}

class _TtsPlayerWidgetState extends ConsumerState<TtsPlayerWidget> {
  TtsPlaybackState _state = TtsPlaybackState.idle;
  AudioPlayer? _player;
  String? _cachedAudioPath;
  String? _errorMessage;
  String _providerName = 'ElevenLabs';
  bool _isMock = false;

  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;

  @override
  void dispose() {
    _player?.stop();
    _player?.dispose();
    super.dispose();
  }

  Future<void> _fetchAndPlay() async {
    if (widget.text.trim().isEmpty) return;

    if (_cachedAudioPath != null && File(_cachedAudioPath!).existsSync()) {
      await _playCachedFile();
      return;
    }

    setState(() {
      _state = TtsPlaybackState.synthesizing;
      _errorMessage = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.post('/ai/voice-synthesize', data: {
        'text': widget.text,
        'language': widget.language ?? 'hi',
      });

      final base64Audio = res.data['audioBase64'] as String?;
      _isMock = res.data['isMock'] == true;
      _providerName = res.data['provider'] as String? ?? 'elevenlabs';

      if (base64Audio == null || base64Audio.isEmpty) {
        throw Exception('Server did not return synthesized audio.');
      }

      final bytes = base64Decode(base64Audio);
      final tempDir = await getTemporaryDirectory();
      final filePath =
          '${tempDir.path}/tts_${DateTime.now().millisecondsSinceEpoch}.mp3';
      final file = File(filePath);
      await file.writeAsBytes(bytes);

      _cachedAudioPath = filePath;
      await _playCachedFile();
    } catch (e) {
      if (mounted) {
        setState(() {
          _state = TtsPlaybackState.error;
          _errorMessage = 'Speech generation failed: $e';
        });
      }
    }
  }

  Future<void> _playCachedFile() async {
    if (_cachedAudioPath == null) return;

    _player ??= AudioPlayer();

    _player!.onDurationChanged.listen((d) {
      if (mounted) setState(() => _duration = d);
    });

    _player!.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });

    _player!.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _state = TtsPlaybackState.idle;
          _position = Duration.zero;
        });
      }
    });

    await _player!.play(DeviceFileSource(_cachedAudioPath!));
    if (mounted) {
      setState(() => _state = TtsPlaybackState.playing);
    }
  }

  Future<void> _pause() async {
    if (_player == null) return;
    await _player!.pause();
    if (mounted) {
      setState(() => _state = TtsPlaybackState.paused);
    }
  }

  Future<void> _resume() async {
    if (_player == null) return;
    await _player!.resume();
    if (mounted) {
      setState(() => _state = TtsPlaybackState.playing);
    }
  }

  Future<void> _stop() async {
    if (_player == null) return;
    await _player!.stop();
    if (mounted) {
      setState(() {
        _state = TtsPlaybackState.idle;
        _position = Duration.zero;
      });
    }
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (widget.compact) {
      return _buildCompact(context);
    }
    return _buildCard(context);
  }

  Widget _buildCompact(BuildContext context) {
    switch (_state) {
      case TtsPlaybackState.synthesizing:
        return const SizedBox(
          height: 36,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppTheme.secondary,
                ),
              ),
              SizedBox(width: 8),
              Text('Generating voice...', style: AppTheme.caption),
            ],
          ),
        );

      case TtsPlaybackState.playing:
        return TextButton.icon(
          icon: const Icon(Icons.pause_circle_filled, color: AppTheme.secondary),
          label: Text('Pause (${_formatDuration(_position)})',
              style: const TextStyle(color: AppTheme.secondary)),
          onPressed: _pause,
        );

      case TtsPlaybackState.paused:
        return TextButton.icon(
          icon: const Icon(Icons.play_circle_filled, color: AppTheme.secondary),
          label: const Text('Resume', style: TextStyle(color: AppTheme.secondary)),
          onPressed: _resume,
        );

      case TtsPlaybackState.error:
        return TextButton.icon(
          icon: const Icon(Icons.refresh, color: AppTheme.errorRed, size: 16),
          label: const Text('Retry Voice',
              style: TextStyle(color: AppTheme.errorRed, fontSize: 12)),
          onPressed: _fetchAndPlay,
        );

      case TtsPlaybackState.idle:
        return OutlinedButton.icon(
          icon: const Icon(Icons.volume_up, size: 18, color: AppTheme.secondary),
          label: Text(widget.label,
              style: const TextStyle(color: AppTheme.secondary)),
          onPressed: _fetchAndPlay,
        );
    }
  }

  Widget _buildCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.secondary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.secondary.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppTheme.secondary.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.record_voice_over,
                    size: 18, color: AppTheme.secondary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.label,
                      style: AppTheme.bodySmall
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      _isMock
                          ? 'ElevenLabs (Mock mode)'
                          : 'ElevenLabs Multilingual v2 Voice',
                      style: AppTheme.caption.copyWith(
                        color: AppTheme.secondary,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
              if (_state == TtsPlaybackState.synthesizing)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppTheme.secondary,
                  ),
                )
              else if (_state == TtsPlaybackState.playing)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.pause, color: AppTheme.secondary),
                      onPressed: _pause,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.stop, color: AppTheme.textSecondary),
                      onPressed: _stop,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                )
              else if (_state == TtsPlaybackState.paused)
                IconButton(
                  icon: const Icon(Icons.play_arrow, color: AppTheme.secondary),
                  onPressed: _resume,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                )
              else
                ElevatedButton.icon(
                  icon: const Icon(Icons.volume_up, size: 16),
                  label: const Text('Listen'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.secondary,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: const Size(80, 32),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  onPressed: _fetchAndPlay,
                ),
            ],
          ),
          if (_state == TtsPlaybackState.playing ||
              _state == TtsPlaybackState.paused) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Text(_formatDuration(_position), style: AppTheme.caption),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      thumbShape:
                          const RoundSliderThumbShape(enabledThumbRadius: 4),
                      overlayShape:
                          const RoundSliderOverlayShape(overlayRadius: 8),
                      trackHeight: 2,
                    ),
                    child: Slider(
                      value: _position.inMilliseconds
                          .toDouble()
                          .clamp(0, _duration.inMilliseconds.toDouble()),
                      max: _duration.inMilliseconds > 0
                          ? _duration.inMilliseconds.toDouble()
                          : 1.0,
                      activeColor: AppTheme.secondary,
                      onChanged: (val) {
                        _player
                            ?.seek(Duration(milliseconds: val.toInt()));
                      },
                    ),
                  ),
                ),
                Text(_formatDuration(_duration), style: AppTheme.caption),
              ],
            ),
          ],
          if (_errorMessage != null) ...[
            const SizedBox(height: 4),
            Text(
              _errorMessage!,
              style: AppTheme.caption.copyWith(color: AppTheme.errorRed),
            ),
          ],
        ],
      ),
    );
  }
}
