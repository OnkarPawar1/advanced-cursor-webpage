#!/usr/bin/env bash
set -euo pipefail

# Respect explicit overrides first.
if [[ -n "${FFMPEG_PATH:-}" ]]; then
  export FFMPEG_PATH
  if [[ -z "${FFPROBE_PATH:-}" ]]; then
    candidate_dir="$(dirname "$FFMPEG_PATH")"
    [[ -x "$candidate_dir/ffprobe" ]] && export FFPROBE_PATH="$candidate_dir/ffprobe"
  fi
else
  # Homebrew ffmpeg-full is keg-only. Prefer it automatically because the
  # production renderer requires libass/ASS in addition to the normal codecs.
  candidates=(
    "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
    "/usr/local/opt/ffmpeg-full/bin/ffmpeg"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      export FFMPEG_PATH="$candidate"
      probe="$(dirname "$candidate")/ffprobe"
      [[ -x "$probe" ]] && export FFPROBE_PATH="$probe"
      break
    fi
  done
fi

# Fall back to PATH only when ffmpeg-full/explicit paths are unavailable.
export FFMPEG_PATH="${FFMPEG_PATH:-$(command -v ffmpeg || true)}"
export FFPROBE_PATH="${FFPROBE_PATH:-$(command -v ffprobe || true)}"

if [[ -z "$FFMPEG_PATH" || ! -x "$FFMPEG_PATH" ]]; then
  echo "✗ FFmpeg was not found." >&2
  echo "  macOS: brew install ffmpeg-full" >&2
  exit 127
fi
if [[ -z "$FFPROBE_PATH" || ! -x "$FFPROBE_PATH" ]]; then
  echo "✗ ffprobe was not found." >&2
  exit 127
fi

echo "Using FFmpeg: $FFMPEG_PATH"
echo "Using ffprobe: $FFPROBE_PATH"

exec "$@"
